import json
import logging
from typing import List
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse

from app.schemas import ScoreRequest, InterviewAnalysisResponse, SampleTranscriptItem
from app.graph.workflow import run_interview_scoring, stream_interview_scoring
from app.services.samples import SAMPLE_TRANSCRIPTS, get_sample_by_id
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")

@router.get("/health")
def health_check():
    import os
    gemini_key = os.getenv("GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY", settings.GEMINI_API_KEY))
    openai_key = os.getenv("OPENAI_API_KEY", settings.OPENAI_API_KEY)
    has_gemini = bool(gemini_key and gemini_key.strip())
    has_openai = bool(openai_key and openai_key.strip())
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "providers": {
            "gemini": has_gemini,
            "openai": has_openai
        },
        "default_provider": settings.DEFAULT_PROVIDER,
        "has_active_llm": has_gemini or has_openai
    }

@router.get("/samples", response_model=List[SampleTranscriptItem])
def list_samples():
    """Lists preloaded realistic interview transcripts."""
    return SAMPLE_TRANSCRIPTS

@router.get("/samples/{sample_id}", response_model=SampleTranscriptItem)
def get_sample(sample_id: str):
    """Retrieves a single sample transcript by ID."""
    return get_sample_by_id(sample_id)

@router.post("/score", response_model=InterviewAnalysisResponse)
async def score_interview(request: ScoreRequest):
    """Scores an interview transcript using the LangGraph assessment pipeline."""
    if not request.transcript or not request.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript text cannot be empty.")
    
    try:
        result = await run_interview_scoring(request)
        return result
    except Exception as e:
        logger.error(f"Error during interview scoring: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Interview assessment failed: {str(e)}")

@router.post("/score/stream")
async def score_interview_stream(request: ScoreRequest):
    """
    Streams LangGraph step-by-step progress via Server-Sent Events (SSE).
    Allows frontend to show live status updates for each graph node.
    """
    if not request.transcript or not request.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript text cannot be empty.")

    async def event_generator():
        try:
            async for event in stream_interview_scoring(request):
                data = json.dumps(event)
                yield f"data: {data}\n\n"
        except Exception as e:
            logger.error(f"Streaming error: {e}", exc_info=True)
            err_data = json.dumps({"type": "error", "message": str(e)})
            yield f"data: {err_data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.post("/upload")
async def upload_transcript_file(file: UploadFile = File(...)):
    """Accepts uploaded transcript files (.txt, .vtt, .srt, .json, .md) and extracts text."""
    filename = file.filename or "transcript.txt"
    try:
        content_bytes = await file.read()
        # Decode text
        try:
            text = content_bytes.decode("utf-8")
        except UnicodeDecodeError:
            text = content_bytes.decode("latin-1")
            
        return {
            "filename": filename,
            "char_count": len(text),
            "content": text
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")
