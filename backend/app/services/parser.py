import re
from typing import List, Tuple
from app.schemas import Utterance, TranscriptStats

def parse_transcript(raw_text: str) -> Tuple[List[Utterance], TranscriptStats]:
    """
    Parses a raw transcript string into structured Utterance objects
    and computes conversational statistics.
    """
    lines = raw_text.strip().splitlines()
    utterances: List[Utterance] = []
    
    # Common regex patterns for transcript lines:
    # 1. "Interviewer: ...", "Candidate: ..."
    # 2. "[00:12:34] Interviewer: ..."
    # 3. "John Doe (Interviewer): ..."
    # 4. "Speaker 1: ...", "Speaker 2: ..."
    # 5. "Q: ...", "A: ..."
    
    speaker_pattern = re.compile(
        r'^(?:\[[\d:\.]+\]\s*)?'  # optional timestamp like [00:12]
        r'([\w\s\.\(\)\-]+?)'     # speaker name/role
        r'(?:\s*\[[\d:\.]+\])?'   # optional timestamp after name
        r'[:\-]\s*(.*)$',         # separator : or - followed by dialogue
        re.IGNORECASE
    )
    
    current_speaker: str = "Unknown"
    current_text_parts: List[str] = []
    turn_counter = 0

    def commit_utterance():
        nonlocal turn_counter, current_speaker, current_text_parts
        if not current_text_parts:
            return
        combined_text = " ".join(current_text_parts).strip()
        if combined_text:
            turn_counter += 1
            words = len(combined_text.split())
            
            # Normalize speaker role
            normalized_speaker = normalize_speaker_role(current_speaker)
            
            utterances.append(
                Utterance(
                    speaker=normalized_speaker,
                    text=combined_text,
                    turn_number=turn_counter,
                    word_count=words
                )
            )
        current_text_parts = []

    for line in lines:
        line_str = line.strip()
        if not line_str:
            continue
            
        match = speaker_pattern.match(line_str)
        if match:
            # Commit previous utterance
            commit_utterance()
            raw_speaker = match.group(1).strip()
            content = match.group(2).strip()
            current_speaker = raw_speaker
            if content:
                current_text_parts.append(content)
        else:
            # Continuation of the existing speaker or unlabelled line
            if not current_text_parts and not utterances:
                # First line without explicit speaker
                current_speaker = "Interviewer"
            current_text_parts.append(line_str)

    # Commit the last utterance
    commit_utterance()

    # If no structured turns were extracted (e.g. single block of text), split by paragraphs
    if not utterances and raw_text.strip():
        paragraphs = [p.strip() for p in raw_text.strip().split("\n\n") if p.strip()]
        for idx, p in enumerate(paragraphs):
            speaker = "Interviewer" if idx % 2 == 0 else "Candidate"
            words = len(p.split())
            utterances.append(
                Utterance(
                    speaker=speaker,
                    text=p,
                    turn_number=idx + 1,
                    word_count=words
                )
            )

    # Compute stats
    stats = compute_transcript_stats(utterances)
    return utterances, stats


def normalize_speaker_role(speaker_name: str) -> str:
    """Normalizes various speaker labels to 'Interviewer' or 'Candidate' if possible."""
    lowered = speaker_name.lower()
    if any(k in lowered for k in ["interviewee", "candidate", "applicant", "job seeker", "developer", "engineer", "designer", "pm"]):
        return "Candidate"
    elif any(k in lowered for k in ["interviewer", "hiring manager", "evaluator", "recruiter", "lead"]):
        return "Interviewer"
    elif lowered in ["q", "question"]:
        return "Interviewer"
    elif lowered in ["a", "answer"]:
        return "Candidate"
    elif "speaker 1" in lowered:
        return "Interviewer"
    elif "speaker 2" in lowered:
        return "Candidate"
    return speaker_name.title()


def compute_transcript_stats(utterances: List[Utterance]) -> TranscriptStats:
    total_turns = len(utterances)
    int_turns = 0
    cand_turns = 0
    int_words = 0
    cand_words = 0
    questions_count = 0

    for u in utterances:
        speaker_low = u.speaker.lower()
        if "interviewer" in speaker_low:
            int_turns += 1
            int_words += u.word_count
            if "?" in u.text:
                questions_count += u.text.count("?")
        elif "candidate" in speaker_low:
            cand_turns += 1
            cand_words += u.word_count
        else:
            # Ambiguous speaker, classify based on turn or questions
            if "?" in u.text:
                int_turns += 1
                int_words += u.word_count
                questions_count += u.text.count("?")
            else:
                cand_turns += 1
                cand_words += u.word_count

    total_words = int_words + cand_words
    talk_ratio = round((cand_words / total_words), 2) if total_words > 0 else 0.5
    avg_cand_words = round((cand_words / cand_turns), 1) if cand_turns > 0 else 0.0

    return TranscriptStats(
        total_turns=total_turns,
        interviewer_turns=int_turns,
        candidate_turns=cand_turns,
        interviewer_word_count=int_words,
        candidate_word_count=cand_words,
        candidate_talk_ratio=talk_ratio,
        questions_asked_count=questions_count,
        average_candidate_response_words=avg_cand_words
    )
