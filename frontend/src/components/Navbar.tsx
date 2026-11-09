"use client"

import React, { useState } from "react"
import { Sparkles, Key, CheckCircle2, Sliders, ExternalLink, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface NavbarProps {
  apiKey: string;
  setApiKey: (key: string) => void;
  provider: string;
  setProvider: (p: string) => void;
  isBackendHealthy: boolean;
  hasActiveLlm?: boolean;
}

export function Navbar({
  apiKey,
  setApiKey,
  provider,
  setProvider,
  isBackendHealthy,
  hasActiveLlm = false
}: NavbarProps) {
  const [showSettings, setShowSettings] = useState(false);
  const isLlmReady = Boolean(apiKey && apiKey.trim()) || hasActiveLlm;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 shadow-md shadow-indigo-500/20 text-white font-bold">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-zinc-900 via-indigo-950 to-zinc-800 dark:from-white dark:via-zinc-200 dark:to-zinc-400 bg-clip-text text-transparent">
                InterviewScorer<span className="text-indigo-600 dark:text-indigo-400">AI</span>
              </span>
              <Badge variant="outline" className="text-[10px] font-medium tracking-wide uppercase px-1.5 py-0 border-indigo-200 text-indigo-700 bg-indigo-50/50 dark:border-indigo-800 dark:text-indigo-300 dark:bg-indigo-950/30">
                LangGraph Powered
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:block">
              Objective Candidate Scoring & Interviewer Bias Auditor
            </p>
          </div>
        </div>

        {/* Status & Settings */}
        <div className="flex items-center gap-3">
          {/* LLM Engine Status Indicator */}
          <div
            onClick={() => setShowSettings(true)}
            className={`hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs cursor-pointer transition-all ${
              isLlmReady
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${isLlmReady ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            <span className="font-medium">
              {isLlmReady ? `Live LLM Active (${provider})` : "Offline Demo Mode"}
            </span>
          </div>

          {/* Model provider toggle / settings */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 text-xs font-medium border-zinc-300 dark:border-zinc-700"
          >
            <Key className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Settings</span>
            {isLlmReady ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-1 rounded font-bold">Key</span>
            )}
          </Button>
        </div>
      </div>

      {/* Settings Modal / Dropdown */}
      {showSettings && (
        <div className="border-t border-zinc-200 bg-zinc-50/95 dark:border-zinc-800 dark:bg-zinc-900/95 px-4 py-4 backdrop-blur-md">
          <div className="container mx-auto max-w-7xl">
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Sliders className="h-4 w-4 text-indigo-600" />
                  <span>LLM Provider & API Configuration</span>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  ✕ Close
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div>
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                    LLM Provider
                  </label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    <option value="gemini">Google Gemini (gemini-2.5-flash) - Recommended</option>
                    <option value="openai">OpenAI (gpt-4o-mini / gpt-4o)</option>
                  </select>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Powered by LangGraph multi-agent workflow orchestration.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                    Custom API Key (Optional)
                  </label>
                  <input
                    type="password"
                    placeholder={provider === "gemini" ? "AIzaSy... (Leave empty to use server .env)" : "sk-... (Leave empty to use server .env)"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Keys are kept in your browser session or backend environment.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
