"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/store";

const LANG_LABEL: Record<string, string> = {
  en: "English", es: "Español", no: "Norsk", id: "Bahasa",
  fr: "Français", pt: "Português", hi: "हिन्दी",
};

/**
 * Floating live-transcript panel. Shows the running conversation with Nereus.
 * When a reply came in a non-English language, also shows the English translation
 * beneath in a subtler style.
 *
 * Collapsible — a floating chip in the corner opens/closes it.
 */
export default function TranscriptPanel() {
  const history = useStore((s) => s.history);
  const language = useStore((s) => s.language);
  const [open, setOpen] = useState(true);
  const endRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to the newest turn
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history.length]);

  const toggle = () => setOpen((v) => !v);

  if (!open) {
    return (
      <button
        onClick={toggle}
        className="fixed bottom-[120px] left-4 z-40
                   text-[10px] px-2.5 py-1 rounded-full
                   bg-panel/90 border border-white/25
                   text-white/80 hover:text-white
                   font-mono uppercase tracking-[0.2em]
                   backdrop-blur-md
                   shadow-[0_0_20px_-5px_rgba(160,255,190,0.35)]"
        title="Show live transcript"
      >
        📜 transcript ({history.length})
      </button>
    );
  }

  return (
    <aside className="fixed bottom-[120px] left-4 w-[440px] max-h-[40vh]
                      bg-panel/95 border border-white/25 ring-1 ring-inset ring-white/5
                      rounded-2xl
                      shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6),0_0_30px_-12px_rgba(160,255,190,0.25)]
                      backdrop-blur-xl
                      flex flex-col z-40">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/15">
        <div className="flex items-center gap-2">
          <span className="text-emerald-300">📜</span>
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-200 font-semibold">
            Transcript
          </div>
          <div className="text-[9px] font-mono text-white/40 ml-1">
            · {LANG_LABEL[language] || language}
          </div>
        </div>
        <button
          onClick={toggle}
          className="text-white/35 hover:text-white/85
                     text-base leading-none w-6 h-6 rounded
                     flex items-center justify-center transition"
          aria-label="Hide transcript"
        >×</button>
      </div>

      {/* Turns */}
      <div className="flex-1 overflow-y-auto scroll-thin px-4 py-3 space-y-3 text-[11.5px]">
        {history.length === 0 && (
          <div className="text-[11px] text-white/40 text-center italic">
            No turns yet. Ask Nereus anything.
          </div>
        )}
        {history.map((t, i) => (
          <div key={i}>
            {t.role === "user" ? (
              <div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 mb-0.5">you</div>
                <div className="text-white/90 leading-relaxed">{t.content}</div>
              </div>
            ) : (
              <div className="pl-2 border-l-2 border-emerald-400/40">
                <div className="text-[9px] uppercase tracking-[0.2em] text-emerald-300 mb-0.5">
                  Nereus{t.language && t.language !== "en" ? ` · ${LANG_LABEL[t.language] || t.language}` : ""}
                </div>
                <div className="text-white leading-relaxed">{t.content}</div>
                {t.content_en && t.language && t.language !== "en" && (
                  <div className="mt-1.5 pt-1.5 border-t border-white/10">
                    <div className="text-[9px] uppercase tracking-[0.2em] text-white/35 mb-0.5">
                      English
                    </div>
                    <div className="text-white/60 italic leading-relaxed">{t.content_en}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </aside>
  );
}
