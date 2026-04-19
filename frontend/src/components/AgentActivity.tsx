"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store";

type Stage = {
  id: string;
  label: string;
  detail: string;
  icon: string;
};

const STAGES: Stage[] = [
  { id: "embed",    label: "Embedding query",          detail: "sentence-transformers · MiniLM-L6",    icon: "🧭" },
  { id: "search",   label: "Searching vector DB",      detail: "FAISS · 30 docs · top-5 retrieval",    icon: "🔍" },
  { id: "retrieve", label: "Pulling event intel",      detail: "Scripps · iNat · Hobday catalog",      icon: "📚" },
  { id: "gemini",   label: "Invoking Gemini Flash",    detail: "RAG context window · temp 0.3",        icon: "⚡" },
  { id: "compose",  label: "Composing briefing",       detail: "Nereus voice · 400 token limit",       icon: "✍️" },
];

/**
 * Real-time agent activity feed (top-right).
 * Progressively fills in pipeline stages while isThinking is true.
 * Each stage advances ~350 ms after the previous.  Gives the viewer a
 * visceral sense of the RAG pipeline actually running.
 */
export default function AgentActivity() {
  const isThinking = useStore((s) => s.isThinking);
  const [activeIdx, setActiveIdx] = useState<number>(-1);
  const [completedIdx, setCompletedIdx] = useState<number>(-1);

  useEffect(() => {
    if (!isThinking) {
      // Snap the remaining stages to complete, then fade the component out
      setActiveIdx(STAGES.length);
      setCompletedIdx(STAGES.length);
      return;
    }
    // Reset + start advancing
    setActiveIdx(0);
    setCompletedIdx(-1);
    const timers: number[] = [];
    STAGES.forEach((_, i) => {
      const t = window.setTimeout(() => {
        setCompletedIdx(i);
        setActiveIdx(i + 1);
      }, (i + 1) * 380);
      timers.push(t);
    });
    return () => timers.forEach(clearTimeout);
  }, [isThinking]);

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed top-4 right-4 z-50 w-[320px]
                  transition-opacity duration-500
                  ${isThinking ? "opacity-100" : "opacity-0"}`}
    >
      <div className="rounded-xl bg-panel/95 border border-teal/30 backdrop-blur
                      shadow-[0_0_30px_rgba(90,200,230,0.3)] p-3">
        <div className="flex items-center gap-2 mb-3 border-b border-border/60 pb-2">
          <div className="h-2 w-2 rounded-full bg-teal animate-pulse" />
          <div className="text-[10px] uppercase tracking-[0.25em] text-teal font-semibold">
            Agent pipeline
          </div>
          <div className="ml-auto text-[10px] text-white/40 font-mono">
            {Math.max(0, Math.min(STAGES.length, completedIdx + 1))}/{STAGES.length}
          </div>
        </div>

        <ul className="space-y-1.5">
          {STAGES.map((s, i) => {
            const done = i <= completedIdx;
            const active = i === activeIdx;
            return (
              <li key={s.id}
                  className={`flex items-start gap-2.5 rounded-md px-2 py-1.5 transition
                              ${active ? "bg-teal/10 border border-teal/30"
                                       : done ? "opacity-70"
                                              : "opacity-40"}`}>
                <div className={`mt-0.5 text-sm leading-none ${active ? "animate-pulse" : ""}`}>
                  {done ? "✓" : s.icon}
                </div>
                <div className="flex-1">
                  <div className={`text-[11.5px] leading-tight ${done ? "text-white/90" : "text-white/70"}`}>
                    {s.label}
                  </div>
                  <div className="text-[9.5px] font-mono text-white/35 mt-0.5">
                    {s.detail}
                  </div>
                </div>
                {active && <div className="mt-1 h-1.5 w-1.5 rounded-full bg-teal animate-ping" />}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
