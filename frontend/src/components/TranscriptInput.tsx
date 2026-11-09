"use client"

import React, { useState, useRef } from "react"
import { Upload, FileText, Sparkles, ChevronDown, ChevronUp, BookOpen, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SampleTranscriptItem } from "@/types/interview"

interface TranscriptInputProps {
  samples: SampleTranscriptItem[];
  selectedSample: string | null;
  onSelectSample: (sample: SampleTranscriptItem) => void;
  transcript: string;
  setTranscript: (text: string) => void;
  roleTitle: string;
  setRoleTitle: (role: string) => void;
  seniority: string;
  setSeniority: (s: string) => void;
  jobDescription: string;
  setJobDescription: (jd: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

export function TranscriptInput({
  samples,
  selectedSample,
  onSelectSample,
  transcript,
  setTranscript,
  roleTitle,
  setRoleTitle,
  seniority,
  setSeniority,
  jobDescription,
  setJobDescription,
  onAnalyze,
  isAnalyzing
}: TranscriptInputProps) {
  const [activeTab, setActiveTab] = useState<"paste" | "upload">("paste")
  const [showJd, setShowJd] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (content) {
        setTranscript(content)
        setActiveTab("paste")
      }
    }
    reader.onerror = () => {
      setUploadError("Failed to read file. Please ensure it is a valid text, VTT, or SRT file.")
    }
    reader.readAsText(file)
  }

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0

  return (
    <div className="space-y-6">
      {/* Sample Presets Selector */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-pink-50/20 p-5 dark:border-indigo-950/60 dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-zinc-950">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
              Quick Test: Real-World Interview Presets
            </span>
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Click any preset to load transcript & rubric</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {samples.map((sample) => {
            const isSelected = selectedSample === sample.id
            return (
              <button
                key={sample.id}
                onClick={() => onSelectSample(sample)}
                className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                  isSelected
                    ? "border-indigo-500 bg-white shadow-md ring-2 ring-indigo-500/20 dark:bg-zinc-900 dark:border-indigo-500"
                    : "border-zinc-200 bg-white/70 hover:bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:bg-zinc-900"
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2.5 right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white text-[10px]">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                )}
                <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 pr-5">
                  {sample.title}
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <Badge
                    variant={
                      sample.expected_verdict.includes("Strong Hire")
                        ? "success"
                        : sample.expected_verdict.includes("Reject")
                        ? "destructive"
                        : "warning"
                    }
                    className="text-[10px] py-0 px-1.5"
                  >
                    Expected: {sample.expected_verdict}
                  </Badge>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                  {sample.description}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Role & Context Settings */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
              Target Role Title
            </label>
            <input
              type="text"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder="e.g. Senior Distributed Systems Engineer"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
              Seniority Level
            </label>
            <select
              value={seniority}
              onChange={(e) => setSeniority(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="Junior / Associate">Junior / Associate (L3)</option>
              <option value="Mid-Level">Mid-Level (L4)</option>
              <option value="Senior">Senior (L5)</option>
              <option value="Staff / Principal">Staff / Principal (L6+)</option>
              <option value="Lead / Manager">Lead / Manager / Director</option>
            </select>
          </div>
        </div>

        {/* Collapsible Job Description */}
        <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setShowJd(!showJd)}
            className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer"
          >
            {showJd ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            <span>{showJd ? "Hide" : "Add / Edit"} Job Description & Hiring Rubric Context</span>
          </button>

          {showJd && (
            <div className="mt-3">
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste key responsibilities, requirements, and competencies..."
                rows={4}
                className="w-full rounded-lg border border-zinc-300 bg-white p-3 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 font-mono"
              />
            </div>
          )}
        </div>
      </div>

      {/* Transcript Input Container */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden dark:border-zinc-800 dark:bg-zinc-950">
        {/* Header Tabs */}
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50/80 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("paste")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "paste"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Paste Transcript</span>
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "upload"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload Transcript File</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {wordCount.toLocaleString()} words
            </span>
            {transcript && (
              <button
                onClick={() => setTranscript("")}
                className="text-xs text-rose-500 hover:text-rose-600 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-5">
          {activeTab === "paste" ? (
            <div>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste the raw dialogue transcript here...&#10;&#10;Example:&#10;Interviewer: Welcome! Can you explain how you ensure idempotency in distributed APIs?&#10;Candidate: Sure! We generate client UUID idempotency keys and perform conditional DynamoDB writes..."
                rows={12}
                className="w-full rounded-xl border border-zinc-200 p-4 text-sm text-zinc-800 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200 font-mono leading-relaxed"
              />
              <p className="text-[11px] text-zinc-400 mt-2">
                Format tip: Speaker prefixes like &quot;Interviewer:&quot;, &quot;Candidate:&quot;, &quot;Speaker 1:&quot;, or timestamps like &quot;[00:04:12]&quot; are automatically parsed.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 rounded-xl p-8 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20">
              <Upload className="h-10 w-10 text-indigo-500 mb-3 stroke-[1.5]" />
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                Upload interview transcript file
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 text-center max-w-sm">
                Supports .txt, .vtt, .srt, .json, and .md transcript exports from Zoom, Google Meet, Teams, Otter.ai, etc.
              </p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".txt,.vtt,.srt,.json,.md"
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer"
              >
                Choose File
              </Button>
              {uploadError && (
                <p className="text-xs text-rose-500 mt-3">{uploadError}</p>
              )}
            </div>
          )}
        </div>

        {/* Submit Action Bar */}
        <div className="border-t border-zinc-200 bg-zinc-50/60 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/40 flex items-center justify-between">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {transcript ? "Ready for LangGraph evaluation" : "Enter transcript text to start"}
          </span>

          <Button
            type="button"
            variant="gradient"
            size="lg"
            disabled={!transcript.trim() || isAnalyzing}
            onClick={onAnalyze}
            className="flex items-center gap-2 font-semibold shadow-lg shadow-indigo-500/25"
          >
            <Sparkles className="h-4 w-4" />
            <span>{isAnalyzing ? "Executing LangGraph Pipeline..." : "Score & Audit Interview"}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
