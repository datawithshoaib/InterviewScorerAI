from typing import List, Optional, TypedDict
from app.schemas import Utterance, TranscriptStats, CandidateFeedback, InterviewerFeedback, InterviewAnalysisResponse

class InterviewGraphState(TypedDict, total=False):
    transcript_raw: str
    role_title: str
    job_description: str
    seniority_level: str
    custom_rubrics: List[str]
    provider: str
    api_key: Optional[str]
    
    # Processed states
    utterances: List[Utterance]
    stats: Optional[TranscriptStats]
    candidate_eval: Optional[CandidateFeedback]
    interviewer_eval: Optional[InterviewerFeedback]
    final_response: Optional[InterviewAnalysisResponse]
    
    # LLM Tracking
    evaluation_mode: str
    model_used: str
    llm_called: bool
    llm_status_message: str

    # Step tracking for SSE / UI streaming
    current_step: str
    progress_percentage: int
    logs: List[str]
    error: Optional[str]
