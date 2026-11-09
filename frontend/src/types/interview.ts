export interface Utterance {
  speaker: string;
  text: string;
  turn_number: number;
  word_count: number;
}

export interface TranscriptStats {
  total_turns: number;
  interviewer_turns: number;
  candidate_turns: number;
  interviewer_word_count: number;
  candidate_word_count: number;
  candidate_talk_ratio: number;
  questions_asked_count: number;
  average_candidate_response_words: number;
}

export interface CriterionEvaluation {
  name: string;
  score: number;
  weight: number;
  assessment: string;
  evidence_quotes: string[];
  status: "Exceptional" | "Proficient" | "Adequate" | "Deficient";
}

export interface CandidateFeedback {
  overall_score: number;
  recommendation: "Strong Hire" | "Hire" | "Lean Hire" | "Lean Reject" | "Strong Reject";
  next_round_verdict: "Advance to Next Round" | "Needs Committee Review" | "Reject";
  executive_summary: string;
  key_strengths: string[];
  areas_for_improvement: string[];
  criteria_breakdown: CriterionEvaluation[];
  recommended_follow_up_questions: string[];
}

export interface InterviewerFeedback {
  fairness_score: number;
  question_quality_score: number;
  talk_time_balance: string;
  bias_detected: boolean;
  bias_flags: string[];
  strengths: string[];
  coaching_tips: string[];
}

export interface InterviewAnalysisResponse {
  job_role: string;
  seniority_level: string;
  stats: TranscriptStats;
  candidate: CandidateFeedback;
  interviewer: InterviewerFeedback;
  dialogue: Utterance[];
  evaluation_mode?: "live_llm" | "heuristic_preview";
  model_used?: string;
  llm_called?: boolean;
  llm_status_message?: string;
}

export interface SampleTranscriptItem {
  id: string;
  title: string;
  role: string;
  seniority: string;
  description: string;
  job_description: string;
  expected_verdict: string;
  transcript: string;
}

export interface StreamProgressEvent {
  type: "progress" | "complete" | "error";
  node?: string;
  step?: string;
  progress?: number;
  message?: string;
  result?: InterviewAnalysisResponse;
}
