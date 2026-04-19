"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useStore } from "@/store";
import { fetchGlobeData } from "@/lib/api";
import SidePanel from "@/components/SidePanel";
import VoiceWidget from "@/components/VoiceWidget";
import ThinkingEffect from "@/components/ThinkingEffect";
import AgentActivity from "@/components/AgentActivity";

// Globe dynamically imported inside its component
const Globe = dynamic(() => import("@/components/Globe"), { ssr: false });

export default function Home() {
  const setEvents = useStore((s) => s.setEvents);
  const events    = useStore((s) => s.events);

  useEffect(() => {
    fetchGlobeData()
      .then((d) => setEvents(d.events))
      .catch((e) => console.error("globe-data load failed", e));
  }, [setEvents]);

  return (
    <main className="relative w-screen h-screen overflow-hidden">
      {/* 3D Earth globe */}
      <Globe />

      {/* Title badge — top center so the left panel can own the left edge */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 z-40 select-none
                         bg-panel/80 border border-white/20 backdrop-blur
                         px-5 py-2 rounded-full
                         flex items-center gap-4
                         shadow-[0_0_30px_-10px_rgba(255,255,255,0.2)]">
        <div className="text-xl font-extrabold tracking-tight text-white">
          Nereus
        </div>
        <div className="h-4 w-px bg-white/25" />
        <span className="text-[11px] font-mono text-teal uppercase tracking-[0.25em] font-semibold">
          marine-heatwave intel
        </span>
        <div className="h-4 w-px bg-white/25" />
        <div className="text-[11px] text-white/75 font-mono">
          {events.length > 0
            ? `${events.length} events`
            : "loading…"}
        </div>
      </header>

      {/* Floating side panel (right) */}
      <SidePanel />

      {/* Oceanic ripple overlay while Nereus is composing */}
      <ThinkingEffect />

      {/* Real-time agent pipeline activity (top-right) */}
      <AgentActivity />

      {/* Voice widget (bottom center) — transcript now lives inside it */}
      <VoiceWidget />

      {/* Attribution footer */}
      <footer className="absolute bottom-2 right-3 text-[9px] text-white/20 font-mono">
        Scripps EasyOneArgo · CCE1 · iNaturalist · NOAA
      </footer>
    </main>
  );
}

