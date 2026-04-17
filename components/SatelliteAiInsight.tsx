/**
 * SatelliteAiInsight
 *
 * Drop-in AI analyst panel for any satellite-reading card.
 * Sends the raw readings + project context to Gemini and renders
 * a plain-English analysis. Users can also ask follow-up questions.
 *
 * Usage:
 *   <SatelliteAiInsight domain="water" data={satelliteData} project={projectCtx} />
 */

import React, { useState, useRef, useEffect } from "react";
import { Bot, Send, RefreshCw, ChevronDown, ChevronUp, Sparkles } from "./icons";
import { runGeminiPrompt, isAiEnabled } from "../services/geminiService";

export type SatelliteDomain = "water" | "carbon" | "offset";

export interface SatelliteAiInsightProps {
  domain: SatelliteDomain;
  /** Arbitrary satellite readings object — will be serialised into the prompt */
  data: Record<string, unknown>;
  /** Project name, type, location context */
  project?: {
    name?: string;
    type?: string;
    city?: string;
    country?: string;
    lat?: number;
    lng?: number;
  } | null;
  /** Auto-run analysis as soon as data arrives */
  autoAnalyze?: boolean;
}

// ── Prompt builders ─────────────────────────────────────────────────────────

function buildPrompt(
  domain: SatelliteDomain,
  data: Record<string, unknown>,
  project: SatelliteAiInsightProps["project"],
  followUp?: string
): string {
  const loc = project
    ? [project.name, project.city, project.country].filter(Boolean).join(", ")
    : "the monitored area";

  const projectType = project?.type
    ? `Project type: ${project.type.replace(/_/g, " ")}.`
    : "";

  const readingsJson = JSON.stringify(data, null, 2);

  if (followUp) {
    return `You are a satellite data analyst helping a non-expert understand environmental readings for a project called "${loc}".

Here are the latest satellite readings:
${readingsJson}

The user is asking: "${followUp}"

Answer in 2-4 sentences. Be specific to the numbers shown. Use plain English — no jargon. If a number indicates a problem, say so clearly and suggest what the user should do.`;
  }

  const domainContext: Record<SatelliteDomain, string> = {
    water: `This is a water conservation / water monitoring project. Focus on: water availability, drought risk, soil moisture for irrigation, surface water levels, and the Sentinel-1 SAR flood/pooling signal if present.`,
    carbon: `This is a carbon sequestration / reforestation project. Focus on: NDVI vegetation health and trend, deforestation risk, land cover type, and what the carbon credit potential looks like based on vegetation condition.`,
    offset: `This is a carbon offset / land-use project. Focus on: vegetation health (NDVI), soil moisture, drought stress, and what the readings suggest about the credibility and permanence of carbon offsets from this land.`,
  };

  return `You are a satellite data analyst. Your job is to help a non-expert project owner understand what their satellite readings mean in plain English.

Project: ${loc}
${projectType}
Domain: ${domainContext[domain]}

Latest satellite readings:
${readingsJson}

Write a clear, friendly analysis in 4-6 sentences. Structure it as:
1. One sentence: the overall picture ("Your land is doing well / has some stress / needs attention").
2. 2-3 sentences highlighting the most important readings and what they mean practically.
3. One sentence: the single most important action the project owner should consider right now (or "no action needed" if everything looks healthy).

Use plain English. Never use variable names or JSON keys directly — translate them (e.g. "soil moisture index 0.62" → "soil moisture is 62%, which is healthy"). Be direct. If something is concerning, say so.`;
}

// ── Component ────────────────────────────────────────────────────────────────

interface Message {
  role: "assistant" | "user";
  text: string;
}

export function SatelliteAiInsight({
  domain,
  data,
  project,
  autoAnalyze = false,
}: SatelliteAiInsightProps) {
  const [open, setOpen] = useState(autoAnalyze);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const didAutoRun = useRef(false);

  const aiEnabled = isAiEnabled();

  const runAnalysis = async (followUp?: string) => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const prompt = buildPrompt(domain, data, project, followUp);
      const text = await runGeminiPrompt(prompt);
      setMessages((prev) => [...prev, { role: "assistant", text: text.trim() }]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "AI analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    if (messages.length === 0 && !loading) {
      runAnalysis();
    }
  };

  const handleFollowUp = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    await runAnalysis(q);
  };

  // Auto-analyze when data arrives (if opted-in)
  useEffect(() => {
    if (autoAnalyze && !didAutoRun.current && Object.keys(data).length > 0) {
      didAutoRun.current = true;
      setOpen(true);
      runAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAnalyze, JSON.stringify(data)]);

  // Scroll to bottom when new message arrives
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const domainLabel: Record<SatelliteDomain, string> = {
    water:  "Water Satellite Analyst",
    carbon: "Carbon & Vegetation Analyst",
    offset: "Carbon Offset Analyst",
  };

  const domainColor: Record<SatelliteDomain, string> = {
    water:  "text-cyan-400 border-cyan-700/40 bg-cyan-900/10",
    carbon: "text-emerald-400 border-emerald-700/40 bg-emerald-900/10",
    offset: "text-green-400 border-green-700/40 bg-green-900/10",
  };

  const buttonColor: Record<SatelliteDomain, string> = {
    water:  "bg-cyan-600 hover:bg-cyan-500",
    carbon: "bg-emerald-600 hover:bg-emerald-500",
    offset: "bg-green-600 hover:bg-green-500",
  };

  if (!aiEnabled) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700/50 bg-slate-800/20 px-4 py-3 flex items-center gap-3">
        <Bot className="w-4 h-4 text-slate-600 shrink-0" />
        <p className="text-xs text-slate-600">
          AI analysis requires <span className="font-mono">VITE_GEMINI_API_KEY</span> or <span className="font-mono">VITE_USE_SERVER_AI=true</span>
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${domainColor[domain]} overflow-hidden`}>
      {/* ── Header / trigger ── */}
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/5 transition text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Bot className="w-4 h-4 shrink-0" style={{ color: "currentColor" }} />
            {loading && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            )}
          </div>
          <div>
            <p className="text-xs font-bold">{domainLabel[domain]}</p>
            <p className="text-[10px] opacity-60 mt-0.5">
              {messages.length === 0
                ? "Click to get an AI explanation of these readings"
                : `${messages.filter((m) => m.role === "assistant").length} analysis · ask follow-up below`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {messages.length === 0 && !open && (
            <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-white ${buttonColor[domain]} transition`}>
              <Sparkles className="w-3 h-3" />
              Analyze
            </span>
          )}
          {open ? <ChevronUp className="w-3.5 h-3.5 opacity-50" /> : <ChevronDown className="w-3.5 h-3.5 opacity-50" />}
        </div>
      </button>

      {/* ── Body ── */}
      {open && (
        <div className="border-t border-slate-700/30 px-4 pb-4 pt-3 space-y-3">

          {/* Loading first analysis */}
          {loading && messages.length === 0 && (
            <div className="flex items-center gap-2.5 py-4 text-xs text-slate-400">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Reading satellite data…
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Message thread */}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`rounded-xl px-3.5 py-2.5 text-[12px] leading-relaxed ${
                msg.role === "assistant"
                  ? "bg-slate-800/60 border border-slate-700/40 text-slate-200"
                  : "bg-slate-700/40 text-slate-300 text-right ml-8"
              }`}
            >
              {msg.role === "assistant" && (
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-40 block mb-1">
                  AI Analysis
                </span>
              )}
              {/* Render newlines as line breaks */}
              {msg.text.split("\n").map((line, li) => (
                <span key={li}>
                  {line}
                  {li < msg.text.split("\n").length - 1 && <br />}
                </span>
              ))}
            </div>
          ))}

          {/* Loading follow-up */}
          {loading && messages.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-500 pl-1">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Thinking…
            </div>
          )}

          <div ref={bottomRef} />

          {/* Re-analyze button (after first analysis) */}
          {messages.length > 0 && !loading && (
            <button
              onClick={() => runAnalysis()}
              className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-slate-300 transition"
            >
              <RefreshCw className="w-3 h-3" />
              Re-analyze with latest data
            </button>
          )}

          {/* Follow-up input */}
          {messages.length > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFollowUp()}
                placeholder="Ask a follow-up question…"
                className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-slate-500 transition"
              />
              <button
                onClick={handleFollowUp}
                disabled={!input.trim() || loading}
                className={`p-1.5 rounded-lg text-white ${buttonColor[domain]} disabled:opacity-40 transition`}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
