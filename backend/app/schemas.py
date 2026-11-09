from pydantic import BaseModel, Field
from typing import List, Optional

class Utterance(BaseModel):
    speaker: str
    text: str
    turn_number: int = 0
    word_count: int = 0

class TranscriptStats(BaseModel):
    total_turns: int = 0
    interviewer_turns: int = 0
    candidate_turns: int = 0
    interviewer_word_count: int = 0
    candidate_word_count: int = 0
    candidate_talk_ratio: float = 0.0  # e.g. 0.65 for 65%
    questions_asked_count: int = 0
    average_candidate_response_words: float = 0.0

class CriterionEvaluation(BaseModel):
    name: str
    score: float = Field(..., ge=1.0, le=10.0, description="Score from 1 to 10")
    weight: float = 1.0
    assessment: str
    evidence_quotes: List[str] = Field(default_factory=list)
    status: str = "Proficient"  # Exceptional, Proficient, Adequate, Deficient

class CandidateFeedback(BaseModel):
    overall_score: float = Field(..., ge=1.0, le=100.0, description="Scaled overall score out of 100")
    recommendation: str = "Hire"  # Strong Hire, Hire, Lean Hire, Lean Reject, Strong Reject
    next_round_verdict: str = "Advance to Next Round"  # Advance to Next Round, Committee Review, Reject
    executive_summary: str
    key_strengths: List[str] = Field(default_factory=list)
    areas_for_improvement: List[str] = Field(default_factory=list)
    criteria_breakdown: List[CriterionEvaluation] = Field(default_factory=list)
    recommended_follow_up_questions: List[str] = Field(default_factory=list)

class InterviewerFeedback(BaseModel):
    fairness_score: float = Field(..., ge=1.0, le=10.0, description="Score from 1 to 10")
    question_quality_score: float = Field(..., ge=1.0, le=10.0, description="Score from 1 to 10")
    talk_time_balance: str = "Balanced"  # Balanced, Interviewer Dominant, Candidate Dominant
    bias_detected: bool = False
    bias_flags: List[str] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    coaching_tips: List[str] = Field(default_factory=list)

class InterviewAnalysisResponse(BaseModel):
    job_role: str
    seniority_level: str
    stats: TranscriptStats
    candidate: CandidateFeedback
    interviewer: InterviewerFeedback
    dialogue: List[Utterance] = Field(default_factory=list)
    evaluation_mode: str = "live_llm"  # "live_llm" | "heuristic_preview"
    model_used: str = "gemini-2.5-flash"
    llm_called: bool = True
    llm_status_message: str = "Successfully evaluated with live LLM"

class ScoreRequest(BaseModel):
    transcript: str
    role_title: Optional[str] = "Senior Software Engineer"
    job_description: Optional[str] = ""
    seniority_level: Optional[str] = "Senior"
    model_provider: Optional[str] = "gemini"  # "gemini" | "openai"
    api_key: Optional[str] = None
    custom_rubrics: Optional[List[str]] = None

class SampleTranscriptItem(BaseModel):
    id: str
    title: str
    role: str
    seniority: str
    description: str
    job_description: str
    expected_verdict: str
    transcript: str
