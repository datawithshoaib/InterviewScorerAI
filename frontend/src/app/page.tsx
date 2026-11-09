"use client"

import React, { useState, useEffect } from "react"
import { Navbar } from "@/components/Navbar"
import { TranscriptInput } from "@/components/TranscriptInput"
import { LiveProgress } from "@/components/LiveProgress"
import { ScorecardDashboard } from "@/components/ScorecardDashboard"
import {
  SampleTranscriptItem,
  InterviewAnalysisResponse,
  StreamProgressEvent
} from "@/types/interview"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8001"

export default function Home() {
  const [apiKey, setApiKey] = useState<string>("")
  const [provider, setProvider] = useState<string>("gemini")
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean>(false)
  const [hasActiveLlm, setHasActiveLlm] = useState<boolean>(false)

  // Presets and form state
  const [samples, setSamples] = useState<SampleTranscriptItem[]>([])
  const [selectedSample, setSelectedSample] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<string>("")
  const [roleTitle, setRoleTitle] = useState<string>("Senior Distributed Systems Engineer")
  const [seniority, setSeniority] = useState<string>("Senior")
  const [jobDescription, setJobDescription] = useState<string>("")

  // Analysis / LangGraph execution state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false)
  const [currentStep, setCurrentStep] = useState<string>("started")
  const [progress, setProgress] = useState<number>(0)
  const [logs, setLogs] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<InterviewAnalysisResponse | null>(null)

  // 1. Health check & Fetch sample presets on load
  useEffect(() => {
    async function init() {
      try {
        const healthRes = await fetch(`${BACKEND_URL}/api/health`)
        if (healthRes.ok) {
          const healthData = await healthRes.json()
          setIsBackendHealthy(true)
          setHasActiveLlm(Boolean(healthData.has_active_llm))
          if (healthData.default_provider) {
            setProvider(healthData.default_provider)
          }
        }
      } catch (err) {
        console.warn("Backend not reachable yet at", BACKEND_URL)
        setIsBackendHealthy(false)
      }

      try {
        const samplesRes = await fetch(`${BACKEND_URL}/api/samples`)
        if (samplesRes.ok) {
          const sampleData = await samplesRes.json()
          setSamples(sampleData)
          // Default load the first sample
          if (sampleData && sampleData.length > 0) {
            handleSelectSample(sampleData[0])
          }
        }
      } catch (err) {
        console.warn("Failed to fetch samples from backend:", err)
      }
    }
    init()
  }, [])

  const handleSelectSample = (sample: SampleTranscriptItem) => {
    setSelectedSample(sample.id)
    setTranscript(sample.transcript)
    setRoleTitle(sample.role)
    setSeniority(sample.seniority)
    setJobDescription(sample.job_description)
    setError(null)
  }

  // 2. Execute LangGraph Scoring Workflow (Streaming or Direct)
  const handleAnalyze = async () => {
    if (!transcript.trim()) return

    setIsAnalyzing(true)
    setError(null)
    setProgress(10)
    setCurrentStep("started")
    setLogs(["Initiating LangGraph multi-agent pipeline..."])
    setResult(null)

    const requestPayload = {
      transcript,
      role_title: roleTitle,
      job_description: jobDescription,
      seniority_level: seniority,
      model_provider: provider,
      api_key: apiKey ? apiKey.trim() : undefined,
    }

    try {
      // Attempt SSE streaming first
      const response = await fetch(`${BACKEND_URL}/api/score/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      })

      if (!response.ok || !response.body) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed.startsWith("data: ")) {
            try {
              const event: StreamProgressEvent = JSON.parse(trimmed.slice(6))
              if (event.type === "progress") {
                if (event.step) setCurrentStep(event.step)
                if (event.progress !== undefined) setProgress(event.progress)
                if (event.message) {
                  setLogs((prev) => [...prev, event.message!])
                }
              } else if (event.type === "complete" && event.result) {
                setProgress(100)
                setCurrentStep("completed")
                setResult(event.result)
                setIsAnalyzing(false)
                return
              } else if (event.type === "error") {
                throw new Error(event.message || "Pipeline execution failed.")
              }
            } catch (jsonErr) {
              console.warn("Error parsing stream chunk:", jsonErr)
            }
          }
        }
      }
    } catch (streamErr) {
      console.warn("Streaming encountered an issue, falling back to direct POST:", streamErr)
      setLogs((prev) => [...prev, "Stream closed. Falling back to direct analysis..."])

      try {
        const directRes = await fetch(`${BACKEND_URL}/api/score`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload),
        })

        if (!directRes.ok) {
          const errorData = await directRes.json()
          throw new Error(errorData.detail || "Scoring request failed.")
        }

        const data: InterviewAnalysisResponse = await directRes.json()
        setProgress(100)
        setCurrentStep("completed")
        setResult(data)
      } catch (directErr: unknown) {
        const errorMsg = directErr instanceof Error ? directErr.message : "Unknown error occurred"
        setError(errorMsg)
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setProgress(0)
    setLogs([])
    setCurrentStep("started")
  }

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans selection:bg-indigo-500 selection:text-white">
      <Navbar
        apiKey={apiKey}
        setApiKey={setApiKey}
        provider={provider}
        setProvider={setProvider}
        isBackendHealthy={isBackendHealthy}
        hasActiveLlm={hasActiveLlm}
      />

      <main className="container mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Error notification */}
        {error && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Live Progress Banner during analysis */}
        {isAnalyzing && (
          <div className="mb-8">
            <LiveProgress
              currentStep={currentStep}
              progress={progress}
              logs={logs}
            />
          </div>
        )}

        {/* If result is available, show ScorecardDashboard; otherwise show input */}
        {result ? (
          <ScorecardDashboard data={result} onReset={handleReset} />
        ) : (
          <div className="space-y-6">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-900 via-indigo-950 to-zinc-700 dark:from-white dark:via-zinc-200 dark:to-zinc-400 bg-clip-text text-transparent">
                Interview Performance & Bias Scorer
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2.5 leading-relaxed">
                Analyze real human-to-human interview transcripts. Evaluates candidate technical & behavioral competence, audits interviewer fairness & bias, and outputs calibrated hiring committee scorecards.
              </p>

              {!hasActiveLlm && !apiKey && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50/90 px-4 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-200 shadow-sm text-left">
                  <span className="text-base shrink-0">💡</span>
                  <div>
                    <strong>LLM Setup:</strong> Set <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded text-[11px]">GEMINI_API_KEY</code> in <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded text-[11px]">backend/.env</code> or click <strong>Settings</strong> (top right) to execute live LLM calls.
                  </div>
                </div>
              )}
            </div>

            <TranscriptInput
              samples={samples}
              selectedSample={selectedSample}
              onSelectSample={handleSelectSample}
              transcript={transcript}
              setTranscript={setTranscript}
              roleTitle={roleTitle}
              setRoleTitle={setRoleTitle}
              seniority={seniority}
              setSeniority={setSeniority}
              jobDescription={jobDescription}
              setJobDescription={setJobDescription}
              onAnalyze={handleAnalyze}
              isAnalyzing={isAnalyzing}
            />
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 mt-16 text-center text-xs text-zinc-400">
        <p>
          InterviewScorerAI • Built with LangGraph, FastAPI, Next.js & Shadcn UI.
        </p>
      </footer>
    </div>
  )
}
