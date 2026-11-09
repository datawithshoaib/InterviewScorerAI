import json
import logging
from typing import Dict, Any, List
from langchain_core.messages import SystemMessage, HumanMessage

from app.graph.state import InterviewGraphState
from app.services.parser import parse_transcript
from app.services.llm_factory import get_llm_client
from app.schemas import (
    CandidateFeedback,
    CriterionEvaluation,
    InterviewerFeedback,
    InterviewAnalysisResponse
)

logger = logging.getLogger(__name__)

# --- NODE 1: Transcript Parser Node ---
def parse_transcript_node(state: InterviewGraphState) -> Dict[str, Any]:
    raw_text = state.get("transcript_raw", "")
    utterances, stats = parse_transcript(raw_text)
    
    log_msg = f"Parsed {len(utterances)} conversational turns. Candidate talk ratio: {int(stats.candidate_talk_ratio * 100)}%."
    current_logs = state.get("logs", [])
    current_logs.append(log_msg)
    
    return {
        "utterances": utterances,
        "stats": stats,
        "current_step": "transcript_parsed",
        "progress_percentage": 25,
        "logs": current_logs
    }


# --- NODE 2: Candidate Evaluator Node ---
def candidate_evaluator_node(state: InterviewGraphState) -> Dict[str, Any]:
    utterances = state.get("utterances", [])
    stats = state.get("stats")
    role_title = state.get("role_title", "Software Engineer")
    seniority = state.get("seniority_level", "Senior")
    job_desc = state.get("job_description", "")
    provider = state.get("provider", "gemini")
    api_key = state.get("api_key")
    current_logs = state.get("logs", [])
    
    llm, resolved_model, resolved_provider, status_msg = get_llm_client(
        provider=provider,
        api_key=api_key
    )
    
    # Format dialogue for LLM
    formatted_dialogue = "\n".join(
        [f"[Turn {u.turn_number}] {u.speaker}: {u.text}" for u in utterances]
    )
    
    candidate_feedback = None
    llm_called = False
    llm_eval_status = status_msg
    
    if llm:
        print(f"\n=======================================================")
        print(f"🤖 [LangGraph] INVOKING LIVE LLM: {resolved_provider.upper()} ({resolved_model})")
        print(f"Evaluating candidate for: {role_title} ({seniority})")
        print(f"=======================================================\n")
        
        current_logs.append(f"🤖 Invoking live LLM: {resolved_provider.upper()} ({resolved_model})...")
        
        system_prompt = f"""You are an elite Executive Hiring Bar Raiser and Technical Assessment Expert.
Your task is to objectively evaluate the Candidate's performance based strictly on the provided interview transcript.

Target Role: {role_title} ({seniority})
Job Description Context:
{job_desc or 'Standard high-caliber industry expectations for this role.'}

Evaluate the candidate across these 5 core dimensions:
1. Technical & Domain Competence (depth, correct architecture/methodologies, problem framing)
2. Problem Solving & Analytical Rigor (structured approach, trade-off analysis, edge cases, root-cause reasoning)
3. Communication & Articulation (clarity, conciseness, structured narrative like STAR where applicable)
4. Behavioral & Culture Fit (ownership, cross-functional collaboration, accountability, resilience)
5. Confidence & Composure (handling ambiguity, receptiveness to hints, admitting unknowns without defensiveness)

For each dimension, assign a score from 1.0 to 10.0 (where 1=Deficient, 5=Adequate, 7=Proficient, 9-10=Exceptional), an assessment rationale, and 1-2 exact quote citations from the candidate.

Also provide:
- overall_score: 1 to 100
- recommendation: Exactly one of ["Strong Hire", "Hire", "Lean Hire", "Lean Reject", "Strong Reject"]
- next_round_verdict: Exactly one of ["Advance to Next Round", "Needs Committee Review", "Reject"]
- executive_summary: 2-3 sentences synthesizing the hiring decision for the VP/Director
- key_strengths: list of 3-4 bullet points
- areas_for_improvement: list of 2-3 bullet points
- recommended_follow_up_questions: list of 3 targeted technical/behavioral probe questions for the next round

OUTPUT FORMAT: Return ONLY valid, raw JSON matching this schema with no markdown code fences:
{{
  "overall_score": 88,
  "recommendation": "Strong Hire",
  "next_round_verdict": "Advance to Next Round",
  "executive_summary": "...",
  "key_strengths": ["...", "..."],
  "areas_for_improvement": ["...", "..."],
  "criteria_breakdown": [
    {{
      "name": "Technical & Domain Competence",
      "score": 9.0,
      "weight": 1.0,
      "status": "Exceptional",
      "assessment": "...",
      "evidence_quotes": ["..."]
    }}
  ],
  "recommended_follow_up_questions": ["...", "..."]
}}"""

        # Attempt structured output first
        try:
            structured_llm = llm.with_structured_output(CandidateFeedback)
            candidate_feedback = structured_llm.invoke(
                f"{system_prompt}\n\nTranscript to evaluate:\n{formatted_dialogue}"
            )
            llm_called = True
            llm_eval_status = f"Live LLM scored candidate using {resolved_provider} ({resolved_model})"
            print(f"✅ [LangGraph] Live LLM Candidate Evaluation Succeeded!")
        except Exception as e_struct:
            logger.warning(f"with_structured_output failed ({e_struct}), falling back to direct prompt invoke...")
            try:
                messages = [
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=f"Transcript to evaluate:\n\n{formatted_dialogue}")
                ]
                response = llm.invoke(messages)
                content = response.content if hasattr(response, "content") else str(response)
                
                # Clean json fences
                clean_json = content.strip()
                if clean_json.startswith("```json"):
                    clean_json = clean_json[7:]
                if clean_json.startswith("```"):
                    clean_json = clean_json[3:]
                if clean_json.endswith("```"):
                    clean_json = clean_json[:-3]
                clean_json = clean_json.strip()
                
                data = json.loads(clean_json)
                candidate_feedback = CandidateFeedback(**data)
                llm_called = True
                llm_eval_status = f"Live LLM scored candidate using {resolved_provider} ({resolved_model})"
                print(f"✅ [LangGraph] Direct Prompt Candidate Evaluation Succeeded!")
            except Exception as e_direct:
                logger.error(f"Live LLM direct prompt invocation failed: {e_direct}")
                llm_eval_status = f"LLM invocation error: {str(e_direct)}"
                candidate_feedback = None
    else:
        print(f"ℹ️ [LangGraph] No live LLM configured ({status_msg}). Using heuristic demo engine.")
        current_logs.append(f"ℹ️ Offline Demo Engine: {status_msg}")

    # Fallback to calibrated analytical engine if no API key or call failed
    if not candidate_feedback:
        candidate_feedback = generate_heuristic_candidate_eval(utterances, stats, role_title, seniority)

    current_logs.append(
        f"Candidate scored {candidate_feedback.overall_score}/100. Verdict: {candidate_feedback.recommendation}."
    )

    return {
        "candidate_eval": candidate_feedback,
        "current_step": "candidate_evaluated",
        "progress_percentage": 60,
        "logs": current_logs,
        "llm_called": llm_called,
        "evaluation_mode": "live_llm" if llm_called else "heuristic_preview",
        "model_used": resolved_model if llm_called else "Offline Calibration Engine",
        "llm_status_message": llm_eval_status
    }


# --- NODE 3: Interviewer Auditor Node ---
def interviewer_auditor_node(state: InterviewGraphState) -> Dict[str, Any]:
    utterances = state.get("utterances", [])
    stats = state.get("stats")
    role_title = state.get("role_title", "Software Engineer")
    provider = state.get("provider", "gemini")
    api_key = state.get("api_key")
    current_logs = state.get("logs", [])
    
    llm, resolved_model, resolved_provider, _ = get_llm_client(
        provider=provider,
        api_key=api_key
    )
    formatted_dialogue = "\n".join(
        [f"[Turn {u.turn_number}] {u.speaker}: {u.text}" for u in utterances]
    )

    interviewer_feedback = None

    if llm:
        print(f"🤖 [LangGraph] Auditing interviewer via live LLM {resolved_provider} ({resolved_model})...")
        current_logs.append(f"🤖 Auditing interviewer with {resolved_model}...")
        
        system_prompt = f"""You are an Expert Interview Calibration Auditor and Talent Quality Coach.
Your task is to audit the INTERVIEWER in this interview transcript.

Candidate Role being interviewed: {role_title}
Quantitative Talk Stats:
- Total Interviewer Word Count: {stats.interviewer_word_count if stats else 0}
- Total Candidate Word Count: {stats.candidate_word_count if stats else 0}
- Candidate Talk Ratio: {int(stats.candidate_talk_ratio * 100) if stats else 50}%

Audit the interviewer for:
1. Question Quality & Relevance (Were questions open-ended, clear, probing deep thought, or simplistic?)
2. Bias & Fairness:
   - Confirmation bias or leading questions (e.g. 'Don't you think X is the obvious solution?')
   - Premature interruptions or aggressive impatience
   - Monologuing / excessive interviewer talk time (Ideal candidate talk ratio is 65-80%)
   - Inappropriate or discriminatory queries
3. Actionable Coaching Tips for the Interviewer to improve their interviewing craft

OUTPUT FORMAT: Return ONLY valid, raw JSON with no markdown code fences:
{{
  "fairness_score": 8.5,
  "question_quality_score": 8.0,
  "talk_time_balance": "Balanced",
  "bias_detected": false,
  "bias_flags": ["Leading prompt detected at turn 3"],
  "strengths": ["Clear scenario setup", "Probed error cases effectively"],
  "coaching_tips": ["Allow candidate 5-10 seconds of silence to think before jumping in", "Avoid phrasing questions with preferred answers"]
}}"""
        try:
            structured_llm = llm.with_structured_output(InterviewerFeedback)
            interviewer_feedback = structured_llm.invoke(
                f"{system_prompt}\n\nTranscript to audit:\n{formatted_dialogue}"
            )
            print(f"✅ [LangGraph] Live LLM Interviewer Audit Succeeded!")
        except Exception:
            try:
                messages = [
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=f"Transcript to audit:\n\n{formatted_dialogue}")
                ]
                response = llm.invoke(messages)
                content = response.content if hasattr(response, "content") else str(response)
                
                clean_json = content.strip()
                if clean_json.startswith("```json"):
                    clean_json = clean_json[7:]
                if clean_json.startswith("```"):
                    clean_json = clean_json[3:]
                if clean_json.endswith("```"):
                    clean_json = clean_json[:-3]
                clean_json = clean_json.strip()
                
                data = json.loads(clean_json)
                interviewer_feedback = InterviewerFeedback(**data)
                print(f"✅ [LangGraph] Direct Prompt Interviewer Audit Succeeded!")
            except Exception as e_audit:
                logger.warning(f"LLM interviewer audit direct invoke failed ({e_audit}). Falling back to heuristic audit.")
                interviewer_feedback = None

    if not interviewer_feedback:
        interviewer_feedback = generate_heuristic_interviewer_audit(utterances, stats)

    current_logs.append(
        f"Interviewer fairness score: {interviewer_feedback.fairness_score}/10. Bias detected: {interviewer_feedback.bias_detected}."
    )

    return {
        "interviewer_eval": interviewer_feedback,
        "current_step": "interviewer_audited",
        "progress_percentage": 85,
        "logs": current_logs
    }


# --- NODE 4: Final Synthesizer Node ---
def synthesizer_node(state: InterviewGraphState) -> Dict[str, Any]:
    role_title = state.get("role_title", "Software Engineer")
    seniority = state.get("seniority_level", "Senior")
    stats = state.get("stats")
    candidate_eval = state.get("candidate_eval")
    interviewer_eval = state.get("interviewer_eval")
    utterances = state.get("utterances", [])
    
    evaluation_mode = state.get("evaluation_mode", "heuristic_preview")
    model_used = state.get("model_used", "Offline Calibration Engine")
    llm_called = state.get("llm_called", False)
    llm_status_message = state.get("llm_status_message", "")

    # If interviewer had severe bias or interruptions, cross-calibrate candidate verdict
    if interviewer_eval and interviewer_eval.bias_detected and candidate_eval:
        if candidate_eval.next_round_verdict == "Reject" and interviewer_eval.fairness_score < 6.0:
            candidate_eval.next_round_verdict = "Needs Committee Review"
            candidate_eval.executive_summary += " (Note: Interviewer exhibited marked bias or frequent interruptions; committee review strongly advised before final rejection)."

    final_response = InterviewAnalysisResponse(
        job_role=role_title,
        seniority_level=seniority,
        stats=stats,
        candidate=candidate_eval,
        interviewer=interviewer_eval,
        dialogue=utterances,
        evaluation_mode=evaluation_mode,
        model_used=model_used,
        llm_called=llm_called,
        llm_status_message=llm_status_message
    )

    current_logs = state.get("logs", [])
    current_logs.append("Synthesis complete. Final report generated successfully.")

    return {
        "final_response": final_response,
        "current_step": "completed",
        "progress_percentage": 100,
        "logs": current_logs
    }


# --- HEURISTIC FALLBACKS (Guarantees zero-failure, instant testability) ---
def generate_heuristic_candidate_eval(
    utterances: List[Any],
    stats: Any,
    role: str,
    seniority: str
) -> CandidateFeedback:
    """Intelligent heuristic evaluator that parses answers, quotes, and detects quality signals."""
    cand_turns = [u for u in utterances if "candidate" in u.speaker.lower()]
    all_cand_text = " ".join([u.text for u in cand_turns]).lower()

    # Search for positive depth indicators
    positive_indicators = [
        "idempotency", "kafka", "partition", "dynamodb", "redis", "latency",
        "circuit breaker", "trade-off", "post-mortem", "scale", "consistency",
        "reconciliation", "backoff", "sla", "metric", "framework"
    ]
    # Search for red flag indicators
    negative_indicators = [
        "increase layers", "decrease layers", "shuffle time-series", "normalize before splitting",
        "1-bit", "unlimited threads", "don't know", "just modal", "everyone would use it"
    ]

    pos_hits = sum(1 for w in positive_indicators if w in all_cand_text)
    neg_hits = sum(1 for w in negative_indicators if w in all_cand_text)

    # Sample quotes for evidence
    quote_1 = cand_turns[0].text[:140] + "..." if cand_turns else "No direct quote available."
    quote_2 = cand_turns[1].text[:140] + "..." if len(cand_turns) > 1 else quote_1

    if pos_hits >= 5 and neg_hits == 0:
        overall_score = 92.0
        rec = "Strong Hire"
        verdict = "Advance to Next Round"
        summary = f"Candidate demonstrated outstanding technical mastery and architectural clarity suited for {role} ({seniority}). Proposed robust, production-grade solutions with concrete trade-off awareness."
        tech_score = 9.5
        prob_score = 9.0
        comm_score = 9.0
        beh_score = 9.2
        conf_score = 9.5
        strengths = [
            "In-depth grasp of distributed systems, idempotency keys, and reconciliation pipelines",
            "Demonstrated real-world incident management with calm, structured remediation",
            "Clear, concise articulation with excellent trade-off reasoning"
        ]
        improvements = [
            "Could expand on operational cost modeling and multi-region failover"
        ]
        follow_ups = [
            "How would you handle cross-region multi-primary conflict resolution for the payment intent store?",
            "What metrics would you alert on in Prometheus to catch partial partition degradation early?"
        ]
    elif neg_hits >= 2:
        overall_score = 42.0
        rec = "Strong Reject"
        verdict = "Reject"
        summary = f"Candidate struggled with foundational principles relevant to {role}. Exhibited fundamental misunderstandings regarding data leakage and model capacity."
        tech_score = 3.5
        prob_score = 4.0
        comm_score = 5.0
        beh_score = 5.5
        conf_score = 4.0
        strengths = [
            "Willingness to attempt answers under direct questioning"
        ]
        improvements = [
            "Critical gaps in statistical validation methodology and temporal data leakage",
            "Lack of depth in hardware architecture and inference optimization"
        ]
        follow_ups = [
            "Walk through the mathematical difference between L1 and L2 regularization and their impact on sparsity.",
            "Explain how walk-forward validation works for temporal time series."
        ]
    else:
        overall_score = 74.0
        rec = "Lean Hire"
        verdict = "Needs Committee Review"
        summary = f"Candidate displayed solid user empathy and intuitive problem-solving for {role}, but lacked mathematical rigor in quantitative metrics and engineering constraint management."
        tech_score = 7.0
        prob_score = 7.5
        comm_score = 8.0
        beh_score = 7.5
        conf_score = 7.5
        strengths = [
            "Strong customer empathy and gamification concepting",
            "Pragmatic approach to third-party tooling when engineering bandwidth is limited"
        ]
        improvements = [
            "Needs more rigorous definition of activation metrics and statistical sample sizing",
            "Tendency to agree with leading prompts without independent pushback"
        ]
        follow_ups = [
            "How would you design a multi-variant A/B test with statistical significance checks for this onboarding flow?",
            "What retention cohorts would you inspect to verify that early activation yields long-term LTV?"
        ]

    criteria = [
        CriterionEvaluation(
            name="Technical & Domain Competence",
            score=tech_score,
            weight=1.2,
            assessment="Evaluated based on role-specific correctness, depth of concepts, and system architecture.",
            evidence_quotes=[quote_1],
            status="Exceptional" if tech_score >= 8.5 else ("Proficient" if tech_score >= 6.5 else "Deficient")
        ),
        CriterionEvaluation(
            name="Problem Solving & Analytical Rigor",
            score=prob_score,
            weight=1.0,
            assessment="Ability to deconstruct ambiguous challenges, evaluate trade-offs, and handle edge cases.",
            evidence_quotes=[quote_2],
            status="Exceptional" if prob_score >= 8.5 else ("Proficient" if prob_score >= 6.5 else "Adequate")
        ),
        CriterionEvaluation(
            name="Communication & Structure",
            score=comm_score,
            weight=1.0,
            assessment="Clarity of thought, conciseness, and structured narrative delivery.",
            evidence_quotes=[quote_1],
            status="Exceptional" if comm_score >= 8.5 else "Proficient"
        ),
        CriterionEvaluation(
            name="Behavioral & Cultural Alignment",
            score=beh_score,
            weight=0.8,
            assessment="Accountability, incident ownership, teamwork, and learning from past failures.",
            evidence_quotes=[quote_2],
            status="Exceptional" if beh_score >= 8.5 else "Proficient"
        ),
        CriterionEvaluation(
            name="Confidence & Composure",
            score=conf_score,
            weight=0.8,
            assessment="Handling pressure, receptiveness to feedback, and composure.",
            evidence_quotes=[quote_1],
            status="Exceptional" if conf_score >= 8.5 else "Adequate"
        ),
    ]

    return CandidateFeedback(
        overall_score=overall_score,
        recommendation=rec,
        next_round_verdict=verdict,
        executive_summary=summary,
        key_strengths=strengths,
        areas_for_improvement=improvements,
        criteria_breakdown=criteria,
        recommended_follow_up_questions=follow_ups
    )


def generate_heuristic_interviewer_audit(utterances: List[Any], stats: Any) -> InterviewerFeedback:
    all_text = " ".join([u.text for u in utterances]).lower()
    int_turns = [u for u in utterances if "interviewer" in u.speaker.lower()]
    
    # Check for interruptions or impatience
    interrupt_count = sum(1 for u in int_turns if "interrupt" in u.text.lower() or "sigh" in u.text.lower())
    # Check for leading questions
    leading_count = sum(1 for u in int_turns if "don't you think" in u.text.lower() or "obviously" in u.text.lower())
    
    cand_ratio = stats.candidate_talk_ratio if stats else 0.65
    
    bias_detected = False
    bias_flags = []
    
    if interrupt_count > 0:
        bias_detected = True
        bias_flags.append(f"Interviewer interrupted the candidate {interrupt_count} time(s) with signs of impatience.")
    if leading_count > 0:
        bias_detected = True
        bias_flags.append("Interviewer used leading question phrasing ('Don't you think...') that biases candidate answers.")
    if cand_ratio < 0.45:
        bias_detected = True
        bias_flags.append(f"Interviewer dominated conversation airtime (Candidate talk ratio was only {int(cand_ratio*100)}%).")
        balance = "Interviewer Dominant"
    elif cand_ratio > 0.85:
        balance = "Candidate Dominant"
    else:
        balance = "Balanced"

    if bias_detected:
        fairness = 5.5 if interrupt_count >= 2 else 7.0
        q_quality = 6.5
        coaching = [
            "Allow the candidate to complete their reasoning before correcting them.",
            "Avoid leading questions that disclose your own preferred solution.",
            "Maintain an encouraging, objective tone even when candidate struggles."
        ]
    else:
        fairness = 9.2
        q_quality = 9.0
        coaching = [
            "Maintain this balanced pacing and structured question progression.",
            "Continue using open-ended behavioral questions with follow-up SLA probes."
        ]

    return InterviewerFeedback(
        fairness_score=fairness,
        question_quality_score=q_quality,
        talk_time_balance=balance,
        bias_detected=bias_detected,
        bias_flags=bias_flags,
        strengths=["Structured questioning sequence", "Clear topic boundaries"],
        coaching_tips=coaching
    )
