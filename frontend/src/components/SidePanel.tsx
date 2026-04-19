"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store";
import { fetchEvent, downloadReport } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function SidePanel() {
  const selectedEventId = useStore((s) => s.selectedEventId);
  const selectedDetail  = useStore((s) => s.selectedEventDetail);
  const askAnswer       = useStore((s) => s.askAnswer);
  const setSelected     = useStore((s) => s.setSelectedEvent);
  const comparison      = useStore((s) => s.comparison);
  const setComparison   = useStore((s) => s.setComparison);

  const [loading, setLoading] = useState(false);
  const [genPdf, setGenPdf]   = useState(false);

  // Load detail whenever selected event changes (and we don't already have it)
  useEffect(() => {
    if (!selectedEventId) return;
    if (selectedDetail && selectedDetail.event_id === selectedEventId) return;
    setLoading(true);
    fetchEvent(selectedEventId)
      .then((d) => setSelected(selectedEventId, d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedEventId, selectedDetail, setSelected]);

  const open = selectedEventId || comparison || askAnswer;

  if (!open) return null;

  // Prefer "Nereus response" label whenever there IS an answer, even if an event is selected.
  const panelLabel = comparison
    ? "Comparison"
    : askAnswer
      ? "Nereus response"
      : "Event dossier";
  const panelIcon = comparison ? "⇄" : askAnswer ? "✦" : "◈";

  return (
    <aside className="fixed top-4 right-4 w-[400px] max-h-[calc(100vh-2rem)] overflow-y-auto scroll-thin
                      bg-gradient-to-b from-panel/98 to-panel/92
                      border border-white/25
                      ring-1 ring-inset ring-white/5
                      rounded-2xl
                      shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6),0_0_40px_-12px_rgba(255,255,255,0.15)]
                      backdrop-blur-xl
                      p-5 text-sm
                      z-30">
      {/* Top status bar */}
      <div className="flex items-center justify-between -mt-1 mb-3 pb-2 border-b border-white/20">
        <div className="flex items-center gap-2">
          <span className="text-teal text-sm">{panelIcon}</span>
          <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-teal font-bold">
            {panelLabel}
          </div>
        </div>
        <button
          onClick={() => {
            setSelected(null);
            setComparison(null);
            useStore.getState().setAskAnswer(null);
          }}
          className="text-white/50 hover:text-white hover:bg-white/10
                     text-lg leading-none w-7 h-7 rounded
                     flex items-center justify-center transition"
          aria-label="Close panel"
        >×</button>
      </div>

      {/* Comparison view */}
      {comparison && (
        <ComparisonCard data={comparison} />
      )}

      {/* Ask Nereus answer view */}
      {askAnswer && !comparison && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/55 mb-1 font-semibold">YOU</div>
          <div className="text-white text-[14px] italic leading-relaxed mb-4">
            &ldquo;{askAnswer.question}&rdquo;
          </div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-300 mb-1 font-semibold">NEREUS</div>
          <div className="text-white text-[14.5px] leading-[1.65]">{askAnswer.answer}</div>
        </div>
      )}

      {/* Event detail view */}
      {selectedDetail && !comparison && (
        <EventCard detail={selectedDetail} onReport={() => {
          setGenPdf(true);
          downloadReport(selectedDetail.event_id).finally(() => setGenPdf(false));
        }} reporting={genPdf} />
      )}

      {loading && (
        <div className="text-white/50 text-xs">loading&hellip;</div>
      )}
    </aside>
  );
}

function EventCard({ detail, onReport, reporting }: any) {
  const climateRows = ["ONI", "PDO", "NAO", "AMO"].map((k) => ({
    mode: k,
    value: detail.climate_state[k] ?? 0,
  }));
  const speciesRows = detail.top_species.map((s: any) => ({
    name: s.scientific_name.split(" ").slice(0, 2).join(" "),
    impact: s.impact_ratio,
    event: s.event_obs,
    baseline: s.baseline_obs,
  }));

  const catColor = categoryColor(detail.category);

  return (
    <>
      {/* Hero header — sharpened */}
      <div className="mb-4 -mt-1">
        <div className="flex items-center gap-2 mb-2">
          <CategoryBadge category={detail.category} color={catColor} />
          <div className="ml-auto flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-teal animate-pulse" />
            <div className="text-[9px] font-mono tracking-wider text-white/50 uppercase">live</div>
          </div>
        </div>
        <h2 className="text-[22px] font-extrabold leading-[1.1] text-white tracking-tight">
          {detail.name}
        </h2>
        <div className="flex items-center gap-2 mt-2 text-[11px] font-mono text-white/65">
          <span>{detail.event_id}</span>
        </div>
        <div className="flex items-center gap-2 mt-1.5 text-[12px] font-mono">
          <span className="text-white/85">{detail.start_date}</span>
          <span className="text-white/35">→</span>
          <span className="text-white/85">{detail.end_date}</span>
          <span className="ml-auto px-2 py-0.5 rounded bg-teal/20 text-teal text-[11px] font-semibold tracking-wider">
            {detail.duration_days}d
          </span>
        </div>
      </div>

      {/* Hero stat — more dramatic */}
      <div className="relative mb-5 rounded-xl overflow-hidden
                      bg-gradient-to-br from-accent/25 via-accent/10 to-transparent
                      border border-accent/40
                      shadow-[0_0_40px_-8px_rgba(224,122,95,0.4)]">
        <div className="absolute inset-0 opacity-20"
             style={{ background:"radial-gradient(circle at 30% 30%, rgba(255,180,140,0.6), transparent 60%)" }} />
        <div className="relative p-4">
          <div className="flex items-center justify-between">
            <div className="text-[9.5px] uppercase tracking-[0.3em] text-accent/90 font-semibold">Peak SST anomaly</div>
            <div className="text-[9px] font-mono text-accent/60">vs. 1982–2011</div>
          </div>
          <div className="flex items-baseline gap-1 mt-1.5">
            <div className="text-[38px] font-black text-accent leading-none tracking-tighter tabular-nums">
              +{detail.peak_anom_c}
            </div>
            <div className="text-xl font-bold text-accent/90">°C</div>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <SeverityBar value={detail.peak_anom_c} />
          </div>
        </div>
      </div>

      {/* Climate-mode grid */}
      <div className="mb-5">
        <SectionLabel>Climate-mode state at onset</SectionLabel>
        <div className="grid grid-cols-4 gap-1.5 mb-2">
          {climateRows.map((r) => (
            <ClimatePill key={r.mode} mode={r.mode} value={r.value} />
          ))}
        </div>
        <div className="h-[72px] rounded-md bg-white/[0.02] border border-border/60 p-1">
          <ResponsiveContainer>
            <BarChart data={climateRows} layout="vertical" margin={{ top: 4, right: 10, left: -18, bottom: 0 }}>
              <XAxis type="number" domain={[-3, 3]} tick={{ fill: "#ffffff40", fontSize: 8.5 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="mode" tick={{ fill: "#ffffffcc", fontSize: 9.5, fontWeight: 700 }} width={30} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#0a0e15ee", border: "1px solid #117A8B66", fontSize: 11, borderRadius: 6, padding: 6 }}
                labelStyle={{ color: "#5aa8c0", fontWeight: 600, fontSize: 10 }}
                itemStyle={{ color: "#eef2f6" }}
                cursor={{ fill: "rgba(17,122,139,0.08)" }}
              />
              <Bar dataKey="value" radius={[2,2,2,2]}>
                {climateRows.map((r, i) => (
                  <Cell key={i} fill={r.value > 0 ? "#E07A5F" : "#5aa8c0"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Species impact */}
      {speciesRows.length > 0 && (
        <div className="mb-5">
          <SectionLabel>Top species impact</SectionLabel>
          <div className="h-[130px] mt-1.5 rounded-md bg-white/[0.02] border border-border/60 p-1">
            <ResponsiveContainer>
              <BarChart data={speciesRows} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fill: "#ffffff40", fontSize: 8.5 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#ffffffbb", fontSize: 9, fontStyle: "italic" }} width={120} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#0a0e15ee", border: "1px solid #C9A22766", fontSize: 11, borderRadius: 6, padding: 6 }}
                  labelStyle={{ color: "#C9A227", fontSize: 10, fontStyle: "italic" }}
                  itemStyle={{ color: "#eef2f6" }}
                  cursor={{ fill: "rgba(201,162,39,0.08)" }}
                />
                <Bar dataKey="impact" fill="#C9A227" radius={[0,3,3,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[9px] text-white/35 mt-1 font-mono leading-tight">
            impact ratio = event observations ÷ (baseline + 1)  ·  source iNaturalist
          </div>
        </div>
      )}

      {/* Action — sharper CTA */}
      <button
        onClick={onReport}
        disabled={reporting}
        className="w-full py-3 text-[12px] font-bold tracking-wide uppercase
                   bg-gradient-to-r from-accent via-red-400 to-accent
                   hover:brightness-110
                   text-white rounded-lg
                   disabled:opacity-50 disabled:cursor-wait
                   shadow-[0_6px_20px_-6px_rgba(224,122,95,0.6)]
                   hover:shadow-[0_8px_25px_-6px_rgba(224,122,95,0.8)]
                   transition-all
                   flex items-center justify-center gap-2"
      >
        {reporting ? (
          <>
            <span className="inline-block h-3 w-3 rounded-full border-2 border-white/50 border-t-white animate-spin" />
            <span>Composing briefing</span>
          </>
        ) : (
          <>
            <span>⬇</span>
            <span>Intelligence briefing (PDF)</span>
          </>
        )}
      </button>

      {/* Citation — sharper separator */}
      <div className="mt-4 pt-3 relative">
        <div className="absolute top-0 left-0 right-0 h-px
                        bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        <div className="text-[10px] uppercase tracking-[0.3em] text-white/60 mb-1 font-semibold">Primary source</div>
        <div className="text-[12.5px] text-white/90 italic leading-snug">{detail.citation}</div>
      </div>
    </>
  );
}

/** Thin gradient bar visualizing anomaly severity within 0-5°C scale */
function SeverityBar({ value }: { value: number }) {
  const pct = Math.min(100, (value / 5.0) * 100);
  return (
    <div className="flex-1 relative h-[3px] rounded-full bg-white/10 overflow-hidden">
      <div
        className="absolute top-0 left-0 h-full rounded-full"
        style={{
          width: `${pct}%`,
          background: "linear-gradient(90deg, #ffbf1f 0%, #ff8a1f 40%, #ff5f1f 70%, #ff2a1f 100%)",
          boxShadow: "0 0 8px rgba(255,138,31,0.6)",
        }}
      />
      <div className="absolute top-1/2 -translate-y-1/2 flex w-full justify-between px-[1px] text-[7px] text-white/20 font-mono">
        <span>0</span><span>5°C</span>
      </div>
    </div>
  );
}

function SectionLabel({ children }: any) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="h-[1px] w-3 bg-teal/60" />
      <div className="text-[9.5px] uppercase tracking-[0.3em] text-teal font-bold">
        {children}
      </div>
      <div className="h-[1px] flex-1 bg-gradient-to-r from-teal/40 to-transparent" />
    </div>
  );
}

function CategoryBadge({ category, color }: { category: string; color: string }) {
  return (
    <div className="text-[9.5px] font-extrabold uppercase tracking-[0.15em] px-2.5 py-1 rounded
                    border shadow-sm flex items-center gap-1.5"
         style={{
           background: color + "22",
           borderColor: color + "aa",
           color: color,
           boxShadow: `0 0 12px -3px ${color}60`,
         }}>
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {category}
    </div>
  );
}

function ClimatePill({ mode, value }: { mode: string; value: number }) {
  const v = Number(value ?? 0);
  const pos = v > 0;
  const sign = pos ? "+" : "";
  const bar = Math.min(100, Math.abs(v) / 3 * 100);
  return (
    <div className="relative rounded-md bg-white/[0.04] border border-border px-2 py-1.5 overflow-hidden">
      {/* Magnitude bar at bottom */}
      <div
        className="absolute left-0 bottom-0 h-[2px] rounded-r"
        style={{
          width: `${bar}%`,
          background: pos ? "#E07A5F" : "#5aa8c0",
          opacity: 0.7,
        }}
      />
      <div className="text-[9px] text-white/40 uppercase tracking-[0.2em] font-semibold">{mode}</div>
      <div className={`text-[13px] font-mono font-bold tabular-nums ${pos ? "text-accent" : "text-cyan-300"}`}>
        {sign}{v.toFixed(2)}
      </div>
    </div>
  );
}

function categoryColor(cat: string) {
  switch (cat.toLowerCase()) {
    case "extreme": return "#ff2a1f";
    case "severe":  return "#ff8a1f";
    case "strong":  return "#C9A227";
    case "moderate":return "#5aa8c0";
    default:        return "#5aa8c0";
  }
}

function ComparisonCard({ data }: any) {
  const rows = [
    { label: "Peak anomaly",  a: `+${data.event_a.peak_anom_c}°C`, b: `+${data.event_b.peak_anom_c}°C` },
    { label: "Duration (d)",  a: `${data.event_a.duration_days}`,  b: `${data.event_b.duration_days}` },
    { label: "Category",      a: data.event_a.category,            b: data.event_b.category },
    { label: "ONI (onset)",   a: fmt(data.event_a.climate_state.ONI), b: fmt(data.event_b.climate_state.ONI) },
    { label: "PDO (onset)",   a: fmt(data.event_a.climate_state.PDO), b: fmt(data.event_b.climate_state.PDO) },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-[10px] text-white/40">EVENT A</div>
          <div className="text-white font-semibold text-sm">{data.event_a.name}</div>
        </div>
        <div>
          <div className="text-[10px] text-white/40">EVENT B</div>
          <div className="text-white font-semibold text-sm">{data.event_b.name}</div>
        </div>
      </div>
      <table className="w-full text-xs">
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white/5" : ""}>
              <td className="py-1.5 px-2 text-white/50 w-1/3">{r.label}</td>
              <td className="py-1.5 px-2 text-accent">{r.a}</td>
              <td className="py-1.5 px-2 text-gold">{r.b}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 text-[11px] text-white/50">
        &Delta; peak anomaly:  <span className="text-white">{data.delta.peak_anom_c >= 0 ? "+" : ""}{data.delta.peak_anom_c}°C</span>
        &nbsp; &nbsp;
        &Delta; duration:  <span className="text-white">{data.delta.duration_days >= 0 ? "+" : ""}{data.delta.duration_days} days</span>
      </div>
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-md px-2 py-1.5 ${accent ? "bg-accent/20 border border-accent/40" : "bg-white/5 border border-border"}`}>
      <div className="text-[10px] text-white/50 tracking-wider uppercase">{label}</div>
      <div className={`text-sm font-semibold ${accent ? "text-accent" : "text-white"}`}>{value}</div>
    </div>
  );
}

function fmt(v: number | null) {
  if (v === null || v === undefined) return "—";
  return (v >= 0 ? "+" : "") + v.toFixed(2);
}
