import { create } from "zustand";

export type GlobeEvent = {
  event_id: string;
  short_name: string;
  name: string;
  lat_min: number; lat_max: number; lon_min: number; lon_max: number;
  lat_center: number; lon_center: number;
  start_date: string; end_date: string;
  peak_anom_c: number;
  category: string;
  duration_days: number;
  citation: string;
};

export type EventDetail = {
  event_id: string;
  name: string;
  short_name: string;
  start_date: string; end_date: string;
  duration_days: number;
  peak_anom_c: number;
  category: string;
  citation: string;
  bbox: { lat_min: number; lat_max: number; lon_min: number; lon_max: number };
  climate_state: { ONI: number | null; PDO: number | null; NAO: number | null; AMO: number | null };
  top_species: { scientific_name: string; baseline_obs: number; event_obs: number; impact_ratio: number }[];
};

export type ComparisonData = {
  event_a: any; event_b: any;
  delta: { peak_anom_c: number; duration_days: number };
};

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
  content_en?: string;        // English mirror for non-English Nereus replies
  language?: string;          // ISO code when language != en
};

type StoreState = {
  events: GlobeEvent[];
  setEvents: (e: GlobeEvent[]) => void;

  selectedEventId: string | null;
  selectedEventDetail: EventDetail | null;
  setSelectedEvent: (id: string | null, detail?: EventDetail | null) => void;

  flyTo: { lat: number; lng: number; altitude: number } | null;
  setFlyTo: (ft: { lat: number; lng: number; altitude: number } | null) => void;

  comparison: ComparisonData | null;
  setComparison: (c: ComparisonData | null) => void;

  history: ChatTurn[];
  appendTurn: (t: ChatTurn) => void;
  resetHistory: () => void;

  askAnswer: { question: string; answer: string; sources: any[] } | null;
  setAskAnswer: (a: { question: string; answer: string; sources: any[] } | null) => void;

  isThinking: boolean;
  setIsThinking: (t: boolean) => void;

  isSpeaking: boolean;
  setIsSpeaking: (s: boolean) => void;

  voiceReplyEnabled: boolean;
  setVoiceReplyEnabled: (v: boolean) => void;

  language: "en" | "es" | "no" | "id" | "fr" | "pt" | "hi";
  setLanguage: (lang: "en" | "es" | "no" | "id" | "fr" | "pt" | "hi") => void;

  // --- Knowledge graph (causal / impact chain) -----------------------------
  kgNodes: { id: string; label: string; type: string; turn: number; isQuery?: boolean }[];
  kgEdges: { source: string; target: string; kind: string; turn: number }[];
  kgTurn: number;
  extendKnowledgeGraph: (question: string, answer: string,
                        sources: { id: string; title: string; type: string }[],
                        selectedEventId?: string | null) => void;
  resetKnowledgeGraph: () => void;

  resetAll: () => void;
};

export const useStore = create<StoreState>((set) => ({
  events: [],
  setEvents: (e) => set({ events: e }),

  selectedEventId: null,
  selectedEventDetail: null,
  setSelectedEvent: (id, detail = null) =>
    set({ selectedEventId: id, selectedEventDetail: detail }),

  flyTo: null,
  setFlyTo: (ft) => set({ flyTo: ft }),

  comparison: null,
  setComparison: (c) => set({ comparison: c }),

  history: [],
  appendTurn: (t) => set((s) => ({ history: [...s.history.slice(-7), t] })),
  resetHistory: () => set({ history: [] }),

  askAnswer: null,
  setAskAnswer: (a) => set({ askAnswer: a }),

  isThinking: false,
  setIsThinking: (t) => set({ isThinking: t }),

  isSpeaking: false,
  setIsSpeaking: (s) => set({ isSpeaking: s }),

  voiceReplyEnabled: true,
  setVoiceReplyEnabled: (v) => set({ voiceReplyEnabled: v }),

  language: "en",
  setLanguage: (lang) => set({ language: lang }),

  kgNodes: [],
  kgEdges: [],
  kgTurn: 0,
  extendKnowledgeGraph: (question, answer, sources, selectedEventId) =>
    set((s) => {
      console.log("[kg] extend called", {
        turn: s.kgTurn + 1,
        question,
        sourcesCount: sources?.length,
        sources,
        selectedEventId,
      });
      const turn = s.kgTurn + 1;
      const existing = new Map(s.kgNodes.map(n => [n.id, n]));
      const newNodes = [...s.kgNodes];
      const newEdges = [...s.kgEdges];

      // Central query node for this turn
      const qId = `q${turn}`;
      const qLabel = question.length > 46 ? question.slice(0, 44) + "…" : question;
      newNodes.push({ id: qId, label: qLabel, type: "query", turn, isQuery: true });

      // Each retrieved source becomes a node (or links to existing if repeated)
      sources.slice(0, 5).forEach((src) => {
        if (!existing.has(src.id)) {
          newNodes.push({ id: src.id, label: src.title, type: src.type, turn });
          existing.set(src.id, { id: src.id, label: src.title, type: src.type, turn });
        }
        // Edge from query to each source
        newEdges.push({ source: qId, target: src.id, kind: "retrieved", turn });
      });

      // Event-to-event, event-to-species, event-to-climate causal chains
      const events   = sources.filter(s => s.type === "event").map(s => s.id);
      const species  = sources.filter(s => s.type === "species").map(s => s.id);
      const regions  = sources.filter(s => s.type === "region").map(s => s.id);
      const sciences = sources.filter(s => s.type === "science").map(s => s.id);
      events.forEach((e) => {
        species.forEach ((sp) => newEdges.push({ source: e, target: sp, kind: "IMPACTED",        turn }));
        regions.forEach ((r)  => newEdges.push({ source: e, target: r,  kind: "OCCURRED_IN",     turn }));
        sciences.forEach((sc) => newEdges.push({ source: e, target: sc, kind: "EXPLAINED_BY",    turn }));
      });
      // Analog edges between co-retrieved events
      for (let i = 0; i < events.length; i++)
        for (let j = i + 1; j < events.length; j++)
          newEdges.push({ source: events[i], target: events[j], kind: "ANALOG_OF", turn });

      // Bias the first turn's central topic toward the currently selected event
      if (selectedEventId && turn === 1) {
        const ev = `event_${selectedEventId.toLowerCase().replace(/^mhw_/, "")}`;
        if (!existing.has(ev)) {
          newNodes.push({ id: ev, label: selectedEventId, type: "event", turn });
        }
      }

      console.log("[kg] after extend", {
        totalNodes: newNodes.length,
        totalEdges: newEdges.length,
      });
      return { kgNodes: newNodes, kgEdges: newEdges, kgTurn: turn };
    }),
  resetKnowledgeGraph: () => set({ kgNodes: [], kgEdges: [], kgTurn: 0 }),

  resetAll: () =>
    set({
      selectedEventId: null,
      selectedEventDetail: null,
      flyTo: { lat: 15, lng: 0, altitude: 2.5 },
      comparison: null,
      askAnswer: null,
    }),
}));
