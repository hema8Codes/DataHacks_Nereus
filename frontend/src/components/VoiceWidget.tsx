"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useConversation } from "@elevenlabs/react";
import { useStore } from "@/store";
import { askNereus, fetchEvent, compareEvents, downloadReport } from "@/lib/api";

const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || "";

export default function VoiceWidget() {
  const events             = useStore((s) => s.events);
  const setSelected        = useStore((s) => s.setSelectedEvent);
  const setFlyTo           = useStore((s) => s.setFlyTo);
  const setComparison      = useStore((s) => s.setComparison);
  const setAskAnswer       = useStore((s) => s.setAskAnswer);
  const appendTurn         = useStore((s) => s.appendTurn);
  const resetAll           = useStore((s) => s.resetAll);
  const history            = useStore((s) => s.history);
  const selectedEventId    = useStore((s) => s.selectedEventId);
  const setIsThinking      = useStore((s) => s.setIsThinking);
  const setIsSpeaking      = useStore((s) => s.setIsSpeaking);
  const voiceReplyEnabled  = useStore((s) => s.voiceReplyEnabled);
  const setVoiceReplyEnabled = useStore((s) => s.setVoiceReplyEnabled);
  const language           = useStore((s) => s.language);
  const setLanguage        = useStore((s) => s.setLanguage);
  const extendKg           = useStore((s) => s.extendKnowledgeGraph);

  // Browser speech synthesis for text-input answers (ElevenLabs handles voice session answers).
  const speakWithBrowser = useCallback((text: string) => {
    if (!voiceReplyEnabled) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.02;
      u.pitch = 1.0;

      // Map our ISO code to a BCP-47 tag the browser understands
      const langTagMap: Record<string, string> = {
        en: "en-US", es: "es-ES", no: "nb-NO", id: "id-ID",
        fr: "fr-FR", pt: "pt-BR", hi: "hi-IN",
      };
      const targetLang = langTagMap[language] || "en-US";
      u.lang = targetLang;

      const voices = window.speechSynthesis.getVoices();
      // First: pick a voice whose language matches (exact or prefix).
      const langPrefix = targetLang.split("-")[0];
      const matching = voices.filter(v =>
        v.lang === targetLang || v.lang.startsWith(langPrefix + "-") || v.lang === langPrefix
      );
      const preferred =
        matching.find(v => /female/i.test(v.name)) ||
        matching[0] ||
        voices.find(v => /Samantha|Karen|Google UK English Female/i.test(v.name)) ||
        voices[0];
      if (preferred) u.voice = preferred;

      u.onstart = () => setIsSpeaking(true);
      u.onend   = () => setIsSpeaking(false);
      u.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(u);
    } catch {
      setIsSpeaking(false);
    }
  }, [voiceReplyEnabled, setIsSpeaking, language]);

  const [textInput, setTextInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fuzzy event resolver: tries exact id, short_name, suffix, and name-substring match
  const resolveEvent = useCallback((id: string) => {
    if (!id) return null;
    const norm = id.toUpperCase().replace(/\s+/g, "_");
    const bare = norm.replace(/^MHW_/, "");
    return (
      // exact event_id
      events.find((e) => e.event_id.toUpperCase() === norm) ||
      // MHW_ prefix added/dropped
      events.find((e) => e.event_id.toUpperCase() === "MHW_" + bare) ||
      // short_name
      events.find((e) => e.short_name.toUpperCase() === norm) ||
      events.find((e) => e.short_name.toUpperCase() === bare) ||
      // suffix match (handles "BLOB" matching MHW_BLOB_PHASE1 etc.)
      events.find((e) => e.event_id.toUpperCase().includes(bare)) ||
      // full name contains
      events.find((e) => e.name.toUpperCase().includes(bare)) ||
      null
    );
  }, [events]);

  // Client tools — these get called by the ElevenLabs agent
  const conversation = useConversation({
    clientTools: {
      fly_to_event: async ({ event_id }: { event_id: string }) => {
        const ev = resolveEvent(event_id);
        if (!ev) return `Event not found: ${event_id}`;
        setSelected(ev.event_id);
        setFlyTo({ lat: ev.lat_center, lng: ev.lon_center, altitude: 1.2 });
        try {
          const detail = await fetchEvent(ev.event_id);
          setSelected(ev.event_id, detail);
        } catch {}
        return `Showing ${ev.name}.`;
      },

      ask_nereus: async ({ question }: { question: string }) => {
        appendTurn({ role: "user", content: question });
        setIsThinking(true);
        try {
          const data = await askNereus(question, selectedEventId, history, language);
          setAskAnswer({ question, answer: data.answer, sources: data.sources });
          appendTurn({ role: "assistant", content: data.answer, content_en: data.answer_en || undefined, language });
          extendKg(question, data.answer, data.sources, selectedEventId);
          if (data.suggested_event_id) {
            const ev = resolveEvent(data.suggested_event_id);
            if (ev) {
              setSelected(ev.event_id);
              setFlyTo({ lat: ev.lat_center, lng: ev.lon_center, altitude: 1.4 });
            }
          }
          return data.answer;
        } catch (e: any) {
          return `Sorry, I couldn't reach the knowledge base. ${e?.message || ""}`;
        } finally {
          setIsThinking(false);
        }
      },

      compare_events: async ({ event_a, event_b }: { event_a: string; event_b: string }) => {
        const a = resolveEvent(event_a); const b = resolveEvent(event_b);
        if (!a || !b) return `Could not resolve both events.`;
        try {
          const data = await compareEvents(a.event_id, b.event_id);
          setComparison(data);
          setFlyTo({ lat: (a.lat_center + b.lat_center) / 2, lng: (a.lon_center + b.lon_center) / 2, altitude: 2.5 });
          return `Comparing ${a.name} and ${b.name}.`;
        } catch (e: any) {
          return `Comparison failed. ${e?.message || ""}`;
        }
      },

      generate_report: async ({ event_id }: { event_id?: string }) => {
        try {
          const ev = event_id ? resolveEvent(event_id) : null;
          await downloadReport(ev?.event_id || (selectedEventId ?? undefined));
          return `Generating PDF briefing now. It will download in a moment.`;
        } catch (e: any) {
          return `Report generation failed. ${e?.message || ""}`;
        }
      },

      reset_view: async () => {
        resetAll();
        return `View reset.`;
      },
    },
  });

  const isConnected = conversation.status === "connected";

  // Mirror ElevenLabs speaking state into the aurora trigger
  useEffect(() => {
    setIsSpeaking(!!conversation.isSpeaking);
  }, [conversation.isSpeaking, setIsSpeaking]);

  const startVoice = useCallback(async () => {
    setError(null);
    if (!AGENT_ID) {
      setError("Set NEXT_PUBLIC_ELEVENLABS_AGENT_ID in .env.local");
      return;
    }
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({ agentId: AGENT_ID });
    } catch (e: any) {
      setError(e?.message || "Failed to start voice session.");
    }
  }, [conversation]);

  const endVoice = useCallback(() => {
    conversation.endSession();
  }, [conversation]);

  // Send text question (works whether or not voice is connected)
  const sendText = useCallback(async () => {
    const q = textInput.trim();
    if (!q) return;
    setTextInput("");
    setBusy(true);
    setIsThinking(true);
    appendTurn({ role: "user", content: q });
    try {
      const data = await askNereus(q, selectedEventId, history, language);
      setAskAnswer({ question: q, answer: data.answer, sources: data.sources });
      appendTurn({ role: "assistant", content: data.answer, content_en: data.answer_en || undefined, language });
      extendKg(q, data.answer, data.sources, selectedEventId);
      if (data.suggested_event_id) {
        const ev = resolveEvent(data.suggested_event_id);
        if (ev) {
          setSelected(ev.event_id);
          setFlyTo({ lat: ev.lat_center, lng: ev.lon_center, altitude: 1.4 });
        }
      }
      // Speak the answer aloud (only when voice session is NOT active —
      // ElevenLabs will handle spoken replies during a live voice session)
      if (!isConnected) {
        speakWithBrowser(data.answer);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to ask.");
    } finally {
      setBusy(false);
      // Small linger so the oceanic bloom doesn't snap off the instant the text appears
      setTimeout(() => setIsThinking(false), 350);
    }
  }, [textInput, selectedEventId, history, language, appendTurn, setAskAnswer, setSelected, setFlyTo, resolveEvent, setIsThinking, isConnected, speakWithBrowser, extendKg]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[min(680px,92vw)] z-50">
      {/* Outer glow ring */}
      <div className={`absolute -inset-1 rounded-[22px] pointer-events-none
                       bg-gradient-to-r from-teal/30 via-cyan-400/30 to-teal/30 blur-xl
                       transition-opacity duration-500
                       ${isConnected || conversation.isSpeaking ? "opacity-80" : "opacity-0"}`} />

      <div className="relative bg-panel/95
                      border border-white/25
                      ring-1 ring-inset ring-white/5
                      rounded-2xl
                      shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5),0_0_30px_-12px_rgba(255,255,255,0.15)]
                      backdrop-blur-md p-3.5">
        <div className="flex items-center gap-3">
          {/* Voice button — click to start/end session */}
          <button
            onClick={isConnected ? endVoice : startVoice}
            className={`shrink-0 relative w-14 h-14 rounded-full flex items-center justify-center text-2xl
                        transition-all duration-300 cursor-pointer
                        ${isConnected
                          ? "bg-gradient-to-br from-accent to-red-400 text-white shadow-[0_0_30px_rgba(224,122,95,0.6)]"
                          : "bg-gradient-to-br from-teal/80 to-deep text-white hover:scale-105 shadow-[0_0_25px_rgba(17,122,139,0.5)]"}`}
            title={isConnected ? "End voice session" : "Start talking to Nereus"}
          >
            {isConnected && <span className="absolute inset-0 rounded-full pulse-ring" />}
            <span className="relative">{isConnected ? "■" : "🎙"}</span>
          </button>

          {/* Text input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") sendText(); }}
              placeholder={(() => {
                const placeholders: Record<string, string> = {
                  en: "Ask Nereus about marine heatwaves  ·  press Enter",
                  es: "Pregunta a Nereus sobre olas de calor marinas  ·  Enter",
                  no: "Spør Nereus om marine hetebølger  ·  trykk Enter",
                  id: "Tanya Nereus tentang gelombang panas laut  ·  Enter",
                  fr: "Demandez à Nereus sur les canicules marines  ·  Entrée",
                  pt: "Pergunte a Nereus sobre ondas de calor marinhas  ·  Enter",
                  hi: "नेरेउस से समुद्री लू के बारे में पूछें  ·  Enter दबाएं",
                };
                if (isConnected) return placeholders[language] || placeholders.en;
                return placeholders[language] || placeholders.en;
              })()}
              className="w-full bg-ink/70 border border-border rounded-xl px-4 py-3 pr-12 text-sm text-white
                         placeholder:text-white/30 focus:outline-none focus:border-teal/60
                         focus:shadow-[0_0_0_2px_rgba(17,122,139,0.2)]
                         transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <kbd className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-border text-white/40 font-mono">↵</kbd>
            </div>
          </div>

          <button
            onClick={sendText}
            disabled={busy || !textInput.trim()}
            className="px-5 py-3 text-sm font-semibold
                       bg-gradient-to-r from-teal to-cyan-600 hover:from-teal hover:to-cyan-500
                       text-white rounded-xl
                       disabled:opacity-30 disabled:cursor-not-allowed
                       transition-all shadow-[0_4px_20px_-4px_rgba(17,122,139,0.5)]
                       hover:shadow-[0_6px_25px_-4px_rgba(17,122,139,0.7)]"
          >
            {busy ? "···" : "Ask"}
          </button>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between mt-3 px-1">
          <div className="flex items-center gap-3 text-[10px]">
            <div className="flex items-center gap-1.5">
              <div className={`h-1.5 w-1.5 rounded-full ${
                isConnected ? "bg-accent animate-pulse"
                : conversation.isSpeaking ? "bg-teal animate-pulse"
                : "bg-white/30"}`} />
              <span className={isConnected ? "text-accent" : "text-white/50"}>
                {conversation.status === "disconnected" ? "ready" : conversation.status}
              </span>
            </div>
            {conversation.isSpeaking && (
              <span className="text-teal font-mono">· Nereus speaking</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Language selector */}
            <LanguagePicker value={language} onChange={setLanguage} />

            <button
              onClick={() => {
                setVoiceReplyEnabled(!voiceReplyEnabled);
                if (voiceReplyEnabled && typeof window !== "undefined") {
                  window.speechSynthesis?.cancel();
                }
              }}
              className={`text-[10px] px-2.5 py-1 rounded-full border transition
                ${voiceReplyEnabled
                  ? "border-teal/50 text-teal bg-teal/10 hover:bg-teal/20"
                  : "border-border text-white/40 hover:text-white/60"}`}
              title="Toggle spoken replies for text questions"
            >
              {voiceReplyEnabled ? "🔊 voice on" : "🔇 muted"}
            </button>
            {error && <div className="text-[10px] text-red-300">{error}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Inline transcript — appears above the chat bar when there is history */
/* ------------------------------------------------------------------ */

const LANG_LABEL: Record<string, string> = {
  en: "English", es: "Español", no: "Norsk", id: "Bahasa",
  fr: "Français", pt: "Português", hi: "हिन्दी",
};

function InlineTranscript({ history, language }: { history: any[]; language: string }) {
  const [expanded, setExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [history.length]);

  // Always render the panel — empty state first, turns after the first question
  const turns = expanded ? history : history.slice(-2);

  return (
    <div className="mb-2 relative bg-panel/95 border border-white/25 ring-1 ring-inset ring-white/5
                    rounded-2xl backdrop-blur-md
                    shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5),0_0_25px_-10px_rgba(160,255,190,0.25)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-2.5 pb-1.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-emerald-300 text-sm">📜</span>
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-emerald-200 font-semibold">
            Live transcript
          </div>
          <div className="text-[9px] font-mono text-white/40">· {LANG_LABEL[language] || language}</div>
          <div className="text-[9px] font-mono text-white/40">· {history.length} turn{history.length !== 1 ? "s" : ""}</div>
        </div>
        <button onClick={() => setExpanded(!expanded)}
                className="text-[9px] font-mono text-white/40 hover:text-white/80">
          {expanded ? "collapse" : "expand"}
        </button>
      </div>

      {/* Turns */}
      <div ref={scrollRef}
           className="overflow-y-auto scroll-thin px-4 py-3 space-y-3 text-[11.5px]"
           style={{ maxHeight: expanded ? "38vh" : "80px", minHeight: "52px" }}>
        {turns.length === 0 && (
          <div className="text-[11px] text-white/40 italic text-center py-1">
            Transcript will appear here as you converse with Nereus.
          </div>
        )}
        {turns.map((t, i) => (
          t.role === "user" ? (
            <div key={i}>
              <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 mb-0.5">you</div>
              <div className="text-white/90 leading-relaxed">{t.content}</div>
            </div>
          ) : (
            <div key={i} className="pl-2 border-l-2 border-emerald-400/50">
              <div className="text-[9px] uppercase tracking-[0.2em] text-emerald-300 mb-0.5">
                Nereus{t.language && t.language !== "en" ? ` · ${LANG_LABEL[t.language] || t.language}` : ""}
              </div>
              <div className="text-white leading-relaxed">{t.content}</div>
              {t.content_en && t.language && t.language !== "en" && (
                <div className="mt-1.5 pt-1.5 border-t border-white/10">
                  <div className="text-[9px] uppercase tracking-[0.2em] text-white/35 mb-0.5">English</div>
                  <div className="text-white/60 italic leading-relaxed">{t.content_en}</div>
                </div>
              )}
            </div>
          )
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Language picker — compact pill with 6 supported languages           */
/* ------------------------------------------------------------------ */

const LANGS: { code: any; label: string; flag: string; sample: string }[] = [
  { code: "en", label: "English",    flag: "🇺🇸", sample: "Ask Nereus…" },
  { code: "hi", label: "हिन्दी",       flag: "🇮🇳", sample: "नेरेउस से पूछें…" },
  { code: "es", label: "Español",    flag: "🇪🇸", sample: "Preguntar a Nereus…" },
  { code: "no", label: "Norsk",      flag: "🇳🇴", sample: "Spør Nereus…" },
  { code: "id", label: "Bahasa",     flag: "🇮🇩", sample: "Tanya Nereus…" },
  { code: "fr", label: "Français",   flag: "🇫🇷", sample: "Demander à Nereus…" },
  { code: "pt", label: "Português",  flag: "🇧🇷", sample: "Perguntar a Nereus…" },
];

function LanguagePicker({ value, onChange }: { value: string; onChange: (v: any) => void }) {
  const [open, setOpen] = useState(false);
  const current = LANGS.find(l => l.code === value) || LANGS[0];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-[10px] px-2.5 py-1 rounded-full border border-border
                   text-white/70 bg-white/5 hover:bg-white/10 hover:border-teal/60
                   flex items-center gap-1.5 transition"
        title="Response language"
      >
        <span>{current.flag}</span>
        <span className="font-mono">{current.label}</span>
        <span className="text-white/40 text-[9px]">▾</span>
      </button>
      {open && (
        <div className="absolute bottom-full mb-2 right-0 w-48 rounded-lg bg-panel
                        border border-teal/30 shadow-2xl backdrop-blur
                        overflow-hidden z-50">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => { onChange(l.code); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left transition
                ${value === l.code
                  ? "bg-teal/20 text-teal"
                  : "text-white/80 hover:bg-white/5"}`}
            >
              <span className="text-base">{l.flag}</span>
              <div className="flex-1">
                <div className="text-[11px] font-semibold">{l.label}</div>
                <div className="text-[9px] text-white/40 font-mono">{l.sample}</div>
              </div>
              {value === l.code && <span className="text-teal text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
