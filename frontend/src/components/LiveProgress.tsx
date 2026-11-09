"use client"

import React from "react"
import { CheckCircle2, Loader2, Sparkles, UserCheck, ShieldAlert, Cpu } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface LiveProgressProps {
  currentStep: string;
  progress: number;
  logs: string[];
}

export function LiveProgress({ currentStep, progress, logs }: LiveProgressProps) {
  const steps = [
    {
      id: "transcript_parsed",
      label: "Parse Transcript",
      desc: "Speaker turns & talk time dynamics",
      icon: Cpu,
    },
    {
      id: "candidate_evaluated",
      label: "Score Candidate",
      desc: "5 Rubric dimensions & evidence quotes",
      icon: UserCheck,
    },
    {
      id: "interviewer_audited",
      label: "Audit Interviewer",
      desc: "Bias, fairness & leading questions",
      icon: ShieldAlert,
    },
    {
      id: "completed",
      label: "Synthesize Decision",
      desc: "Hiring verdict & next round questions",
      icon: Sparkles,
    },
  ]

  const getStepStatus = (index: number) => {
    // Current progress mapping:
    // 0-25 -> step 0 active
    // 25-60 -> step 1 active
    // 60-85 -> step 2 active
    // 85-100 -> step 3 active
    const thresholds = [25, 60, 85, 100]
    if (progress >= thresholds[index]) return "completed"
    if (index === 0 || progress >= thresholds[index - 1]) return "active"
    return "pending"
  }

  return (
    <div className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-lg shadow-indigo-500/5 dark:border-indigo-900/60 dark:bg-zinc-950">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-600"></span>
            </span>
            LangGraph Multi-Stage Assessment in Progress
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Autonomous graph agents orchestrating multi-perspective interview evaluation
          </p>
        </div>
        <div className="text-right">
          <span className="font-mono font-bold text-lg text-indigo-600 dark:text-indigo-400">
            {progress}%
          </span>
        </div>
      </div>

      <Progress value={progress} className="h-2.5 mb-6" />

      {/* Steps visualization */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {steps.map((step, idx) => {
          const status = getStepStatus(idx)
          const Icon = step.icon
          return (
            <div
              key={step.id}
              className={`p-3.5 rounded-xl border transition-all ${
                status === "completed"
                  ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-950/60 dark:bg-emerald-950/15"
                  : status === "active"
                  ? "border-indigo-400 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-400 dark:border-indigo-600 dark:bg-indigo-950/30"
                  : "border-zinc-200 bg-zinc-50/50 opacity-60 dark:border-zinc-800 dark:bg-zinc-900/40"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <Icon className={`h-4 w-4 ${
                  status === "completed" ? "text-emerald-600" : status === "active" ? "text-indigo-600 animate-pulse" : "text-zinc-400"
                }`} />
                {status === "completed" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : status === "active" ? (
                  <Loader2 className="h-4 w-4 text-indigo-600 animate-spin" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                )}
              </div>
              <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                {step.label}
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
                {step.desc}
              </div>
            </div>
          )
        })}
      </div>

      {/* Live Graph Log Feed */}
      <div className="rounded-xl bg-zinc-900 p-3 font-mono text-[11px] text-zinc-300 dark:bg-zinc-900/90 border border-zinc-800">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5 mb-2 text-zinc-500 text-[10px] uppercase tracking-wider">
          <span>LangGraph Execution Log</span>
          <span>Node Updates</span>
        </div>
        <div className="space-y-1 max-h-24 overflow-y-auto">
          {logs.slice(-4).map((log, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-indigo-400">›</span>
              <span className="text-zinc-200">{log}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
