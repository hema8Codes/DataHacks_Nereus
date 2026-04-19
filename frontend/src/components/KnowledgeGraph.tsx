"use client";

import { useMemo } from "react";
import { useStore } from "@/store";

/**
 * Left-side floating knowledge graph that grows with the conversation.
 *
 *   - Query (user question) nodes are circles along a central vertical spine.
 *   - Retrieved entity nodes (events, species, regions, etc.) fan out as
 *     connected leaves around each query node.
 *   - Edges are coloured by relationship type (IMPACTED, OCCURRED_IN, ...).
 *
 * Pure SVG, no layout library — simple custom radial-per-turn placement.
 */

type NodePos = { id: string; x: number; y: number; label: string; type: string; isQuery?: boolean; turn: number };

const TYPE_COLOR: Record<string, string> = {
  query:    "#E07A5F",   // accent orange
  event:    "#ff6e3c",
  region:   "#5aa8c0",
  species:  "#C9A227",
  persona:  "#a9ccf5",
  science:  "#8fd8f5",
  default:  "#ffffff",
};

const EDGE_COLOR: Record<string, string> = {
  retrieved:    "rgba(255,255,255,0.20)",
  IMPACTED:     "rgba(201,162,39,0.55)",
  OCCURRED_IN:  "rgba(90,168,192,0.55)",
  EXPLAINED_BY: "rgba(143,216,245,0.55)",
  ANALOG_OF:    "rgba(224,122,95,0.55)",
};

export default function KnowledgeGraph() {
  const nodes = useStore((s) => s.kgNodes);
  const edges = useStore((s) => s.kgEdges);
  const turn  = useStore((s) => s.kgTurn);
  const reset = useStore((s) => s.resetKnowledgeGraph);

  // Compute positions — queries on a central spine, their retrieved nodes
  // fan out in a semicircle to the right of each query node.
  const positions = useMemo<NodePos[]>(() => {
    const W = 430;
    const spineX = 110;
    const turnHeight = 150;
    const pos: NodePos[] = [];
    const seen = new Set<string>();

    // 1) place the query nodes on the central spine (y increases per turn)
    const queriesByTurn = new Map<number, string>();
    nodes.filter(n => n.isQuery).forEach(n => {
      queriesByTurn.set(n.turn, n.id);
      pos.push({ ...n, x: spineX, y: 70 + (n.turn - 1) * turnHeight });
      seen.add(n.id);
    });

    // 2) For each non-query node, stack in a vertical column to the right of its query
    const fanIndex = new Map<number, number>();   // turn -> next slot
    nodes.filter(n => !n.isQuery).forEach((n) => {
      if (seen.has(n.id)) return;
      const slot = fanIndex.get(n.turn) ?? 0;
      fanIndex.set(n.turn, slot + 1);
      const qY = 70 + (n.turn - 1) * turnHeight;
      const col = 290;                 // wider spread
      const y = qY - 52 + slot * 28;   // bigger vertical spacing between siblings
      pos.push({
        ...n,
        x: col,
        y: Math.max(30, Math.min(y, 70 + turn * turnHeight)),
      });
      seen.add(n.id);
    });

    return pos;
  }, [nodes]);

  const posMap = useMemo(() => new Map(positions.map(p => [p.id, p])), [positions]);
  const height = Math.max(300, 70 + turn * 150 + 50);

  return (
    <aside className="fixed top-4 left-4 w-[440px] max-h-[calc(55vh)]
                      bg-gradient-to-b from-panel/98 to-panel/92
                      border border-white/25 ring-1 ring-inset ring-white/5
                      rounded-2xl
                      shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6),0_0_40px_-12px_rgba(255,255,255,0.15)]
                      backdrop-blur-xl
                      p-5 text-sm z-30
                      overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/15">
        <div className="flex items-center gap-2">
          <span className="text-teal">⊛</span>
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-teal/90 font-semibold">
            Causal graph
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-white/40 font-mono">
          <span>{turn} turn{turn !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span>{nodes.length} nodes</span>
          <button
            onClick={reset}
            className="ml-1 text-white/30 hover:text-white/80 text-[14px] leading-none"
            title="Clear graph"
          >⟲</button>
        </div>
      </div>

      {/* Debug banner — always visible so we know the panel is alive */}
      <div className="mb-2 text-[10px] font-mono text-emerald-400">
        status: {turn === 0 ? "idle (waiting for first question)" : `${turn} turns · ${nodes.length} nodes · ${edges.length} edges`}
      </div>

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="text-[11px] text-white/50 leading-relaxed border border-dashed border-white/20 rounded-lg p-3">
          Ask Nereus anything.  Every answer will extend a live causal graph here —
          events, regions, species, and the relationships between them.
        </div>
      )}

      {/* Graph SVG */}
      {nodes.length > 0 && (
        <div className="overflow-y-auto scroll-thin" style={{ maxHeight: "calc(100vh - 9rem)" }}>
          <svg width="100%" viewBox={`0 0 430 ${height}`} style={{ display: "block" }}>
            {/* Edges first (so they sit under nodes) */}
            {edges.map((e, i) => {
              const a = posMap.get(e.source);
              const b = posMap.get(e.target);
              if (!a || !b) return null;
              const color = EDGE_COLOR[e.kind] || EDGE_COLOR.retrieved;
              // curved path for non-retrieved edges (relationship edges)
              if (e.kind === "retrieved") {
                return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                             stroke={color} strokeWidth={0.7} />;
              }
              const midX = (a.x + b.x) / 2 + 20;
              const midY = (a.y + b.y) / 2;
              return (
                <path key={i}
                      d={`M ${a.x} ${a.y} Q ${midX} ${midY} ${b.x} ${b.y}`}
                      stroke={color} strokeWidth={1.2} fill="none"
                      strokeDasharray={e.kind === "ANALOG_OF" ? "3 3" : undefined} />
              );
            })}

            {/* Nodes */}
            {positions.map((n) => {
              const color = TYPE_COLOR[n.type] || TYPE_COLOR.default;
              const r = n.isQuery ? 10 : 6.5;
              return (
                <g key={n.id}>
                  <circle cx={n.x} cy={n.y} r={r + 5} fill={color} fillOpacity={0.18} />
                  <circle cx={n.x} cy={n.y} r={r} fill={color}
                          stroke="#ffffff" strokeWidth={n.isQuery ? 1.8 : 0.8} />
                  <text x={n.x + r + 7} y={n.y + 4}
                        fill="#ffffffdd"
                        fontSize={n.isQuery ? 11 : 9.5}
                        fontFamily="ui-monospace, Menlo, monospace"
                        style={{ pointerEvents: "none" }}>
                    {truncate(n.label, n.isQuery ? 34 : 24)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Legend */}
      {nodes.length > 0 && (
        <div className="mt-2 pt-2 border-t border-white/10 grid grid-cols-2 gap-1 text-[9px] font-mono text-white/60">
          <LegendItem color={TYPE_COLOR.query}   label="query" />
          <LegendItem color={TYPE_COLOR.event}   label="event" />
          <LegendItem color={TYPE_COLOR.region}  label="region" />
          <LegendItem color={TYPE_COLOR.species} label="species" />
          <LegendItem color={TYPE_COLOR.persona} label="persona" />
          <LegendItem color={TYPE_COLOR.science} label="science" />
        </div>
      )}
    </aside>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}
