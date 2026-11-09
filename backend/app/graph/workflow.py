import logging
from typing import AsyncGenerator, Dict, Any
from langgraph.graph import StateGraph, START, END

from app.graph.state import InterviewGraphState
from app.graph.nodes import (
    parse_transcript_node,
    candidate_evaluator_node,
    interviewer_auditor_node,
    synthesizer_node
)
from app.schemas import ScoreRequest, InterviewAnalysisResponse

logger = logging.getLogger(__name__)

def build_interview_graph():
    """Builds and compiles the LangGraph state graph."""
    builder = StateGraph(InterviewGraphState)

    # Add Nodes
    builder.add_node("parse_transcript", parse_transcript_node)
    builder.add_node("candidate_evaluator", candidate_evaluator_node)
    builder.add_node("interviewer_auditor", interviewer_auditor_node)
    builder.add_node("synthesizer", synthesizer_node)

    # Add Edges
    builder.add_edge(START, "parse_transcript")
    builder.add_edge("parse_transcript", "candidate_evaluator")
    builder.add_edge("candidate_evaluator", "interviewer_auditor")
    builder.add_edge("interviewer_auditor", "synthesizer")
    builder.add_edge("synthesizer", END)

    return builder.compile()

# Singleton compiled graph
interview_graph = build_interview_graph()

async def run_interview_scoring(request: ScoreRequest) -> InterviewAnalysisResponse:
    """Executes the full LangGraph pipeline synchronously for a request."""
    initial_state: InterviewGraphState = {
        "transcript_raw": request.transcript,
        "role_title": request.role_title or "Software Engineer",
        "job_description": request.job_description or "",
        "seniority_level": request.seniority_level or "Senior",
        "custom_rubrics": request.custom_rubrics or [],
        "provider": request.model_provider or "gemini",
        "api_key": request.api_key,
        "logs": [],
        "current_step": "started",
        "progress_percentage": 5
    }

    final_state = await interview_graph.ainvoke(initial_state)
    return final_state["final_response"]


async def stream_interview_scoring(request: ScoreRequest) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Streams updates as each node of the LangGraph completes.
    Yields events with current step, logs, and progress percentage.
    """
    initial_state: InterviewGraphState = {
        "transcript_raw": request.transcript,
        "role_title": request.role_title or "Software Engineer",
        "job_description": request.job_description or "",
        "seniority_level": request.seniority_level or "Senior",
        "custom_rubrics": request.custom_rubrics or [],
        "provider": request.model_provider or "gemini",
        "api_key": request.api_key,
        "logs": ["Starting interview evaluation workflow..."],
        "current_step": "started",
        "progress_percentage": 5
    }

    yield {
        "type": "progress",
        "step": "started",
        "progress": 5,
        "message": "Initialized scoring graph..."
    }

    async for chunk in interview_graph.astream(initial_state, stream_mode="updates"):
        for node_name, node_output in chunk.items():
            step = node_output.get("current_step", node_name)
            progress = node_output.get("progress_percentage", 50)
            logs = node_output.get("logs", [])
            latest_log = logs[-1] if logs else f"Completed {node_name}"

            payload: Dict[str, Any] = {
                "type": "progress",
                "node": node_name,
                "step": step,
                "progress": progress,
                "message": latest_log,
            }

            # If node completed final report, include payload
            if "final_response" in node_output and node_output["final_response"]:
                payload["type"] = "complete"
                payload["result"] = node_output["final_response"].model_dump()

            yield payload
