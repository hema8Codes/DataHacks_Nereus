"use client";

import { useStore } from "@/store";

/**
 * Crisis-Averted-style oceanic horizon glow from the bottom of the viewport.
 * Fades in whenever Nereus is composing (isThinking) OR speaking (isSpeaking).
 *
 * Layers, bottom to top:
 *   - nereus-aurora-vignette  — subtle top/side darkening to emphasise the glow
 *   - nereus-aurora-drift     — slow left-right waving of soft cyan
 *   - nereus-aurora-bloom     — the main horizon bloom (breathing pulse)
 *   - nereus-aurora-rim       — bright thin horizon line with glow shadow
 *
 * All keyframes are in globals.css so no styled-jsx reliance.
 */
export default function ThinkingEffect() {
  const isThinking = useStore((s) => s.isThinking);
  const isSpeaking = useStore((s) => s.isSpeaking);
  const active = isThinking || isSpeaking;

  return (
    <>
      <div
        aria-hidden
        className={`pointer-events-none fixed inset-0 z-40 transition-opacity duration-700
                    ${active ? "opacity-100" : "opacity-0"}`}
      >
        <div className="nereus-aurora-vignette" />
        <div className="nereus-aurora-drift" />
        <div className="nereus-aurora-bloom" />
        <div className="nereus-aurora-rim" />
      </div>

      {/* Floating status chip — changes label based on state */}
      <div
        className={`pointer-events-none fixed bottom-28 left-1/2 -translate-x-1/2 z-50
                    transition-opacity duration-500
                    ${active ? "opacity-100" : "opacity-0"}`}
      >
        <div className="px-4 py-1.5 rounded-full
                        bg-emerald-500/20 border border-emerald-300/70
                        backdrop-blur text-[11px] uppercase tracking-[0.25em]
                        text-emerald-100
                        shadow-[0_0_25px_rgba(160,255,190,0.55)]">
          {isThinking ? "Nereus · thinking" : "Nereus · speaking"}
        </div>
      </div>
    </>
  );
}
