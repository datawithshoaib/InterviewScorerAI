"use client"

import React, { useState } from "react"
import {
  Award,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Scale,
  MessageSquare,
  TrendingUp,
  Quote,
  Copy,
  Check,
  RefreshCw,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  User,
  ShieldCheck,
  Sparkles
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { InterviewAnalysisResponse } from "@/types/interview"

interface ScorecardDashboardProps {
  data: InterviewAnalysisResponse;
  onReset: () => void;
}

export function ScorecardDashboard({ data, onReset }: ScorecardDashboardProps) {
  const [copied, setCopied] = useState(false)
  const [showFullTranscript, setShowFullTranscript] = useState(false)
  const [activeFilter, setActiveFilter] = useState<"all" | "candidate" | "interviewer">("all")

  const { candidate, interviewer, stats, job_role, seniority_level, dialogue } = data

  const isHire = candidate.recommendation.toLowerCase().includes("hire")
  const isReject = candidate.recommendation.toLowerCase().includes("reject")

  const copyMarkdownReport = () => {
    const markdown = `# Interview Assessment Report: ${job_role} (${seniority_level})
Overall Score: ${candidate.overall_score}/100
Verdict: ${candidate.recommendation} (${candidate.next_round_verdict})

## Executive Summary
${candidate.executive_summary}

## Candidate Competencies
${candidate.criteria_breakdown
  .map(
    (c) =>
      `### ${c.name} - ${c.score}/10 (${c.status})
${c.assessment}
Evidence: "${c.evidence_quotes.join('", "')}"`
  )
  .join("\n\n")}

## Strengths
${candidate.key_strengths.map((s) => `- ${s}`).join("\n")}

## Areas for Improvement
${candidate.areas_for_improvement.map((a) => `- ${a}`).join("\n")}

## Interviewer Audit
- Fairness Score: ${interviewer.fairness_score}/10
- Question Quality Score: ${interviewer.question_quality_score}/10
- Bias Detected: ${interviewer.bias_detected ? "YES" : "NO"}
- Talk Balance: ${interviewer.talk_time_balance}
${interviewer.bias_flags.map((f) => `  * [Flag] ${f}`).join("\n")}

## Recommended Follow-up Questions for Next Round
${candidate.recommended_follow_up_questions.map((q) => `1. ${q}`).join("\n")}
`
    navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const filteredDialogue = dialogue.filter((u) => {
    if (activeFilter === "candidate") return u.speaker.toLowerCase().includes("candidate")
    if (activeFilter === "interviewer") return u.speaker.toLowerCase().includes("interviewer")
    return true
  })

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs uppercase font-mono tracking-wider">
              {seniority_level}
            </Badge>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {job_role} Assessment Scorecard
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Synthesized across {stats.total_turns} turns ({stats.interviewer_word_count + stats.candidate_word_count} total words)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={copyMarkdownReport}
            className="flex items-center gap-1.5 text-xs cursor-pointer"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "Copied Report!" : "Copy Report"}</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={onReset}
            className="flex items-center gap-1.5 text-xs cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Score Another</span>
          </Button>
        </div>
      </div>

      {/* Live LLM vs Offline Demo Status Indicator */}
      {data.llm_called ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-emerald-300 bg-emerald-50/80 p-3.5 text-xs text-emerald-950 dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-emerald-200 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="font-bold">Live LLM Assessment Active:</span>
            <span className="font-mono bg-emerald-200/60 dark:bg-emerald-900/60 px-2 py-0.5 rounded text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
              {data.model_used}
            </span>
          </div>
          <span className="text-[11px] opacity-80 font-medium">{data.llm_status_message}</span>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-xs text-amber-950 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-200 shadow-sm">
          <div className="flex items-start sm:items-center gap-2.5">
            <span className="text-base shrink-0">⚠️</span>
            <div>
              <span className="font-bold">Heuristic Preview Engine:</span>
              <span className="ml-1.5 opacity-90">
                No active API key was detected in <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded text-[11px]">backend/.env</code> or request settings.
              </span>
            </div>
          </div>
          <div className="text-[11px] bg-amber-200/70 dark:bg-amber-900/50 px-2.5 py-1 rounded-md text-amber-900 dark:text-amber-200 font-semibold self-start sm:self-auto">
            Provide GEMINI_API_KEY in .env or the Settings dialog for live LLM scoring
          </div>
        </div>
      )}

      {/* 1. Hero Verdict & Executive Summary Banner */}
      <div
        className={`rounded-2xl border p-6 sm:p-8 shadow-sm relative overflow-hidden ${
          candidate.recommendation === "Strong Hire"
            ? "border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 dark:border-emerald-900/60 dark:from-emerald-950/20 dark:via-zinc-950 dark:to-zinc-950"
            : isHire
            ? "border-blue-200 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/40 dark:border-blue-900/60 dark:from-blue-950/20 dark:via-zinc-950 dark:to-zinc-950"
            : isReject
            ? "border-rose-200 bg-gradient-to-br from-rose-50/70 via-white to-red-50/40 dark:border-rose-900/60 dark:from-rose-950/20 dark:via-zinc-950 dark:to-zinc-950"
            : "border-amber-200 bg-gradient-to-br from-amber-50/70 via-white to-yellow-50/40 dark:border-amber-900/60 dark:from-amber-950/20 dark:via-zinc-950 dark:to-zinc-950"
        }`}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge
                variant={
                  candidate.recommendation === "Strong Hire"
                    ? "success"
                    : isHire
                    ? "info"
                    : isReject
                    ? "destructive"
                    : "warning"
                }
                className="text-sm px-3 py-1 font-bold tracking-wide uppercase"
              >
                {candidate.recommendation}
              </Badge>

              <Badge variant="outline" className="text-xs font-semibold">
                Decision: {candidate.next_round_verdict}
              </Badge>
            </div>

            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Executive Committee Synthesis
            </h3>
            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {candidate.executive_summary}
            </p>
          </div>

          {/* Overall Composite Score Dial */}
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white/90 p-6 shadow-md border border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800 min-w-[160px]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1">
              Overall Score
            </span>
            <div className="flex items-baseline gap-1">
              <span
                className={`text-5xl font-black tracking-tight ${
                  candidate.overall_score >= 85
                    ? "text-emerald-600 dark:text-emerald-400"
                    : candidate.overall_score >= 65
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {Math.round(candidate.overall_score)}
              </span>
              <span className="text-sm font-bold text-zinc-400">/100</span>
            </div>
            <div className="mt-2 text-xs font-medium text-zinc-500">
              {candidate.overall_score >= 85
                ? "Top 5% Candidate"
                : candidate.overall_score >= 65
                ? "Calibrated Proficient"
                : "Below Target Bar"}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Conversation Airtime & Pacing Metrics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-indigo-600" />
              Conversation Dynamics & Talk-Time Distribution
            </span>
            <Badge variant="outline" className="text-xs font-mono font-normal">
              Balance: {interviewer.talk_time_balance}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Visual ratio bar */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-indigo-600 dark:text-indigo-400">
                  Candidate: {Math.round(stats.candidate_talk_ratio * 100)}% ({stats.candidate_word_count} words)
                </span>
                <span className="text-zinc-600 dark:text-zinc-400">
                  Interviewer: {Math.round((1 - stats.candidate_talk_ratio) * 100)}% ({stats.interviewer_word_count} words)
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 flex overflow-hidden">
                <div
                  className="bg-indigo-600 dark:bg-indigo-500 h-full transition-all duration-500"
                  style={{ width: `${Math.round(stats.candidate_talk_ratio * 100)}%` }}
                />
                <div
                  className="bg-zinc-400 dark:bg-zinc-600 h-full transition-all duration-500"
                  style={{ width: `${100 - Math.round(stats.candidate_talk_ratio * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Industry benchmark: Ideal candidate airtime is between 65% and 80% to allow adequate depth.
              </p>
            </div>

            {/* Quick Stat Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
                <span className="text-[11px] text-zinc-400 block mb-0.5">Total Dialogue Turns</span>
                <span className="font-bold text-base text-zinc-900 dark:text-zinc-100">{stats.total_turns}</span>
              </div>
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
                <span className="text-[11px] text-zinc-400 block mb-0.5">Questions Probed</span>
                <span className="font-bold text-base text-zinc-900 dark:text-zinc-100">{stats.questions_asked_count}</span>
              </div>
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
                <span className="text-[11px] text-zinc-400 block mb-0.5">Avg Words / Candidate Turn</span>
                <span className="font-bold text-base text-zinc-900 dark:text-zinc-100">{stats.average_candidate_response_words}</span>
              </div>
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
                <span className="text-[11px] text-zinc-400 block mb-0.5">Interviewer Fairness</span>
                <span className="font-bold text-base text-emerald-600 dark:text-emerald-400">{interviewer.fairness_score}/10</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Candidate Rubric Breakdown (5 Dimensions with Evidence Quotes) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Award className="h-5 w-5 text-indigo-600" />
            Candidate Competency Rubric Scores
          </h3>
          <span className="text-xs text-zinc-400">Grounded in direct transcript quotes</span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {candidate.criteria_breakdown.map((criterion, idx) => {
            const isHigh = criterion.score >= 8.0
            const isMid = criterion.score >= 6.0 && criterion.score < 8.0
            return (
              <div
                key={idx}
                className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 font-mono text-xs font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                        {criterion.name}
                      </h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {criterion.assessment}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <Badge
                      variant={isHigh ? "success" : isMid ? "warning" : "destructive"}
                      className="text-xs"
                    >
                      {criterion.status}
                    </Badge>
                    <div className="text-right min-w-[50px]">
                      <span
                        className={`text-xl font-black ${
                          isHigh
                            ? "text-emerald-600 dark:text-emerald-400"
                            : isMid
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {criterion.score.toFixed(1)}
                      </span>
                      <span className="text-xs font-semibold text-zinc-400">/10</span>
                    </div>
                  </div>
                </div>

                {/* Score Bar */}
                <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isHigh ? "bg-emerald-500" : isMid ? "bg-amber-500" : "bg-rose-500"
                    }`}
                    style={{ width: `${(criterion.score / 10) * 100}%` }}
                  />
                </div>

                {/* Direct Evidence Quotes */}
                {criterion.evidence_quotes && criterion.evidence_quotes.length > 0 && (
                  <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-850">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                      <Quote className="h-3 w-3 text-indigo-500" />
                      <span>Transcript Citation</span>
                    </div>
                    {criterion.evidence_quotes.map((quote, qIdx) => (
                      <p
                        key={qIdx}
                        className="text-xs italic text-zinc-700 dark:text-zinc-300 border-l-2 border-indigo-400 pl-2.5 my-1"
                      >
                        &ldquo;{quote}&rdquo;
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 4. Strengths & Areas of Improvement (Two Column) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Strengths */}
        <Card className="border-emerald-200/80 bg-emerald-50/20 dark:border-emerald-950/50 dark:bg-emerald-950/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Key Candidate Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {candidate.key_strengths.map((str, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-zinc-700 dark:text-zinc-300">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold mt-0.5 dark:bg-emerald-900 dark:text-emerald-300">
                    ✓
                  </span>
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Growth Areas */}
        <Card className="border-amber-200/80 bg-amber-50/20 dark:border-amber-950/50 dark:bg-amber-950/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Areas for Improvement & Red Flags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {candidate.areas_for_improvement.map((area, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-zinc-700 dark:text-zinc-300">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold mt-0.5 dark:bg-amber-900 dark:text-amber-300">
                    !
                  </span>
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* 5. Interviewer Audit & Bias Checker (README requirement) */}
      <Card className="border-indigo-200/80 bg-gradient-to-br from-white via-indigo-50/20 to-purple-50/10 dark:border-indigo-900/50 dark:bg-zinc-950">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Scale className="h-5 w-5 text-indigo-600" />
                Interviewer Calibration & Fairness Audit
              </CardTitle>
              <CardDescription className="text-xs">
                Audits question quality, potential confirmation bias, leading prompts, and interruptions.
              </CardDescription>
            </div>

            <Badge
              variant={interviewer.bias_detected ? "destructive" : "success"}
              className="text-xs self-start sm:self-center"
            >
              {interviewer.bias_detected ? "Bias / Friction Detected" : "Fair & Calibrated"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">Interviewer Fairness & Neutrality</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                  {interviewer.fairness_score.toFixed(1)}
                </span>
                <span className="text-xs text-zinc-400">/ 10</span>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">Question Rigor & Relevance</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                  {interviewer.question_quality_score.toFixed(1)}
                </span>
                <span className="text-xs text-zinc-400">/ 10</span>
              </div>
            </div>
          </div>

          {/* Bias flags if detected */}
          {interviewer.bias_flags && interviewer.bias_flags.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-950/60 dark:bg-rose-950/20">
              <span className="text-xs font-bold text-rose-800 dark:text-rose-300 block mb-2">
                Audited Bias & Technique Flags:
              </span>
              <ul className="space-y-1.5">
                {interviewer.bias_flags.map((flag, fIdx) => (
                  <li key={fIdx} className="text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Coaching Tips for Interviewer */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block mb-2">
              Actionable Coaching Tips for the Interviewer:
            </span>
            <ul className="space-y-2">
              {interviewer.coaching_tips.map((tip, tIdx) => (
                <li key={tIdx} className="text-xs text-zinc-600 dark:text-zinc-300 flex items-start gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500 shrink-0 mt-0.5" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 6. Recommended Next Round Follow-Up Questions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-indigo-600" />
            Recommended Probe Questions for Round 2
          </CardTitle>
          <CardDescription className="text-xs">
            Targeted questions designed to test borderline areas and verify candidate depth.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {candidate.recommended_follow_up_questions.map((q, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-lg border border-zinc-100 bg-zinc-50/60 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/40 text-xs text-zinc-800 dark:text-zinc-200"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold dark:bg-indigo-900/60 dark:text-indigo-300">
                  {idx + 1}
                </span>
                <span className="leading-relaxed font-medium">{q}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 7. Collapsible Full Formatted Transcript Dialogue */}
      <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
        <button
          onClick={() => setShowFullTranscript(!showFullTranscript)}
          className="flex w-full items-center justify-between p-5 text-left font-semibold text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-indigo-600" />
            <span>View Full Annotated Transcript ({dialogue.length} Turns)</span>
          </div>
          <span className="text-xs text-indigo-600 flex items-center gap-1">
            {showFullTranscript ? "Collapse" : "Expand"}
            {showFullTranscript ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </button>

        {showFullTranscript && (
          <div className="p-5 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
            {/* Filter buttons */}
            <div className="flex items-center gap-2 pb-2">
              <span className="text-xs text-zinc-400">Filter:</span>
              <button
                onClick={() => setActiveFilter("all")}
                className={`text-xs px-2.5 py-1 rounded-md cursor-pointer ${
                  activeFilter === "all" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600"
                }`}
              >
                All Turns
              </button>
              <button
                onClick={() => setActiveFilter("candidate")}
                className={`text-xs px-2.5 py-1 rounded-md cursor-pointer ${
                  activeFilter === "candidate" ? "bg-indigo-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600"
                }`}
              >
                Candidate Only
              </button>
              <button
                onClick={() => setActiveFilter("interviewer")}
                className={`text-xs px-2.5 py-1 rounded-md cursor-pointer ${
                  activeFilter === "interviewer" ? "bg-zinc-700 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600"
                }`}
              >
                Interviewer Only
              </button>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {filteredDialogue.map((turn, tIdx) => {
                const isCandidate = turn.speaker.toLowerCase().includes("candidate")
                return (
                  <div
                    key={tIdx}
                    className={`rounded-xl p-4 border text-xs leading-relaxed ${
                      isCandidate
                        ? "border-indigo-100 bg-indigo-50/30 ml-4 sm:ml-8 dark:border-indigo-950/60 dark:bg-indigo-950/20"
                        : "border-zinc-200 bg-zinc-50/60 mr-4 sm:mr-8 dark:border-zinc-800 dark:bg-zinc-900/40"
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-[11px] mb-1.5">
                      <span className={isCandidate ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-700 dark:text-zinc-300"}>
                        {turn.speaker} (Turn {turn.turn_number})
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 font-normal">
                        {turn.word_count} words
                      </span>
                    </div>
                    <p className="text-zinc-800 dark:text-zinc-200">{turn.text}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
