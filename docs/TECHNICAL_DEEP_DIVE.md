# Nereus — Technical deep dive

Audience: ML engineer, data scientist, platform architect, CTO-type judge. Purpose: defend every choice in the stack and show the end-to-end path a single question takes.

---

## One-paragraph overview

Nereus is a retrieval-augmented question-answering system over a hand-curated marine-heatwave corpus, wrapped in a voice-driven 3D visualisation. It runs entirely on a laptop: FastAPI backend, Next.js frontend, FAISS vector index, Claude Haiku 4.5 for synthesis (Gemini Flash as fallback, deterministic CSV-based briefings as a last line of defence), ElevenLabs Conversational AI for voice, react-globe.gl for the Three.js-backed globe. Seven languages, six REST endpoints, fifteen Hobday-standard events, ~$0.002 per query.

---

## System topology

```
┌─────────────── Browser (localhost:3000) ────────────────┐
│  Next.js 14 + React 18 + TypeScript                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  Globe   │  │ SidePanel│  │ AgentAct │  │  Voice  │ │
│  │ (3D)     │  │ (dossier)│  │ (5 stages│  │ Widget  │ │
│  │          │  │          │  │   card)  │  │  (EL)   │ │
│  └────┬─────┘  └────┬─────┘  └──────────┘  └────┬────┘ │
│       │             │                            │      │
│       └─── Zustand global store ─────────────────┘      │
└──────────┼──────────┼────────────────────────────┼──────┘
           │          │                            │
           ▼          ▼                            ▼
   POST /api/ask    GET /api/event/{id}    WebRTC audio stream
   GET  /api/globe-data                          │
   GET  /api/compare                             │
   GET  /report                                  ▼
                                          ElevenLabs Cloud
                                          ┌────────────────┐
                                          │ Nereus agent   │
                                          │ Claude Haiku   │
                                          │ + 5 client     │
                                          │   tools        │
                                          └────┬───────────┘
                                               │ tool calls
                                               ▼
┌──────────── FastAPI backend (localhost:8000) ───────────┐
│  main.py — 6 endpoints                                  │
│                                                         │
│  query ──► augment ──► FAISS retrieval ──► LLM          │
│                        (30 × 384-dim)     cascade       │
│                                                         │
│                                        ┌──────────────┐ │
│                                        │ Claude Haiku │ │
│                                        │      ↓       │ │
│                                        │ Gemini Flash │ │
│                                        │      ↓       │ │
│                                        │ Deterministic│ │
│                                        │ CSV briefing │ │
│                                        └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## End-to-end path of a single question

What happens between a user saying *"Tell me about the Pacific Blob"* and the answer arriving in the side panel.

### Stage 0 — Voice transduction (optional)

The ElevenLabs Conversational AI widget runs a WebRTC stream. The agent is configured with a system prompt and five client tools (`fly_to_event`, `ask_nereus`, `compare_events`, `generate_report`, `reset_view`). When the user speaks, ElevenLabs transcribes, decides which tool to call, and fires the tool over the data channel back to the browser. If the user typed instead, we skip this stage and directly call `ask_nereus` as a local function.

### Stage 1 — Frontend dispatch

`VoiceWidget.tsx` receives the `ask_nereus` tool call with `{question, language, selected_event_id}`. It augments the payload with `history` (the last three turns from the Zustand store) and POSTs to `/api/ask`. The Agent Pipeline card starts animating stage 1 (🧭 embed).

### Stage 2 — Query augmentation (backend)

`main.py::ask()` does three things before retrieval:

1. **Event-keyword detection.** A hand-authored multilingual keyword map (English + Hindi Devanagari + Spanish) looks for event names like *"Pacific Blob"*, *"चिली"*, *"Chile"*, *"Mediterráneo"*. If a match is found, the matching `event_id` is flagged for force-include.
2. **Selected-event coupling.** If `selected_event_id` is set (user clicked the globe), that event's documents are also flagged.
3. **Query reshape.** The raw question is concatenated with `language=xx` and a short event hint (`context: this concerns <event_name>`) to nudge embedding similarity toward the right cluster.

### Stage 3 — Embedding + FAISS retrieval

- Model: `sentence-transformers/all-MiniLM-L6-v2` (384-dim, normalized to unit L2).
- Index: `faiss.IndexFlatL2`, 30 vectors, 46 KB on disk.
- Query embedding: ~12 ms on CPU.
- Top-k retrieval: k=5, ~0.3 ms.

**Force-include logic.** Any `event_id` flagged in stage 2 is resolved to its corresponding docs. If those docs are not already in the top-5, they are *prepended* to the retrieval result, bumping lower-ranked docs out. This guarantees Claude sees the user's named event regardless of vector-space drift across languages.

### Stage 4 — LLM synthesis (cascade)

The prompt to Claude is structured:

```
SYSTEM: You are Nereus, an AI oceanographer...
        CORE RULE: Treat retrieved context as authoritative.
        AVAILABLE EVENTS IN YOUR CATALOG:
          - Pacific Blob (phase 1) [MHW_BLOB_PHASE1]
          - ... 14 more ...
        Respond in {language_name}.

USER:   RETRIEVED CONTEXT:
        <doc 1>
        <doc 2>
        ...
        <doc 5>

        QUESTION: {user_question}
```

Synthesis cascade:

| Tier | Model | Typical latency | When used |
|---|---|---|---|
| 1 | `claude-haiku-4-5` | 600–1,200 ms | Primary |
| 2 | `gemini-flash` (2.5-flash) | 400–900 ms | If Claude returns 429, 500, timeout, or empty text |
| 3 | Deterministic CSV briefing | 80–180 ms | If both LLMs fail |

The cascade is **per-request**, not sticky — the next request goes back to Tier 1. This means a single rate-limit bucket doesn't mark the whole demo session degraded.

### Stage 5 — Response shaping + frontend render

The backend returns `{answer, sources, suggested_event_id}`. The frontend:

1. Appends the turn to the Zustand chat history.
2. If `suggested_event_id` changed, dispatches `flyTo` on the globe (ref-forwarded — this was a ref-forwarding bug during development, fixed by removing the double-dynamic-import pattern).
3. Updates the side panel with the answer body, climate pills, species chart, and citation footer.
4. If a voice session is active, streams the answer to ElevenLabs for TTS playback. If not, falls back to the browser `SpeechSynthesis` API with a language-tag map (`en-US`, `es-ES`, `hi-IN`, etc.).

p50 end-to-end latency: **~720 ms** (text path). Voice path adds ~300 ms for TTS first-phoneme.

---

## Data pipeline (how the corpus was built)

Five stages, all scripted, all reproducible.

1. **Raw ingestion.**
   - `argopy` → Scripps EasyOneArgo profiles (5,913 for NE Pacific bounding box).
   - NOAA PSL OPeNDAP → monthly ONI/PDO/NAO/AMO (3,661 rows, 1950–present).
   - NOAA OISST v2.1 THREDDS → monthly SST anomaly at 0.25° grid.
   - iNaturalist v1 REST API → 10,860 observations across 5 event regions.
   - Hobday catalog → 15 events hand-curated from 15 peer-reviewed papers (Bond 2015, Di Lorenzo & Mantua 2016, León-Muñoz 2018, and others).

2. **EDA scripts (5).** Clean, filter, compute derived features. `eda_05_mhw_catalog.py` is where the Hobday curation lives.

3. **Derived CSVs (5).** Single source of truth. ~2.2 MB total.

4. **Markdown corpus (30 docs).** Hand-authored from the CSVs + primary literature. Each event doc ~1 KB; each species doc ~600 bytes. This is where the quality lives.

5. **FAISS index build.** `build_index.py` reads corpus, embeds, writes `nereus.faiss` + `docs.json`. Runs in ~30 s on an M1 Mac. On GPU (NVIDIA Brev.dev pipeline in `brev/`) this runs in ~2 s for larger future corpora.

---

## Key technical decisions and their rationales

**1. Why RAG instead of fine-tuning?**
Corpus is 30 docs. Fine-tuning on this would catastrophically over-fit and still wouldn't be groundable — there'd be no way to cite a source. RAG keeps the model frozen and the corpus swappable.

**2. Why FAISS over pgvector / Pinecone / Weaviate?**
At 30 docs, all cloud vector stores are strictly worse: more latency, more failure modes, more cost. FAISS is in-memory, zero-network, exact nearest-neighbor. This scales to ~100k docs before HNSW becomes necessary.

**3. Why Claude Haiku 4.5 over Sonnet or Opus?**
Benchmarked all three on Nereus corpus: Haiku at 650 ms, Sonnet at 2.2 s, Opus at 5 s. The quality delta on 200-word responses was not discernible to a domain expert in blind pairing. Haiku is the right choice for an interactive voice product where latency dominates perceived quality.

**4. Why the deterministic fallback?**
Two LLM outages in 48 hours of development convinced me the demo could not afford an LLM dependency for structural health. The deterministic fallback assembles a complete briefing from the CSV catalog — executive summary, peak anomaly, duration, climate state, citation — using plain string templating. It produces a legible, accurate PDF in 180 ms. Quality is lower than Claude's output, but the product doesn't die.

**5. Why multilingual at the model level, not via translate?**
Round-trip translation through English introduces register errors and cultural awkwardness. Prompting Claude in the target language directly preserves idiom and technical register (e.g., "coastal Niño" renders correctly in Spanish as "El Niño costero," not as a literal translation).

**6. Why a separate Claude call for the English translation?**
When bilingual display was active, I tried marker-based splitting of a single dual-language response. Unreliable — Claude would break the marker mid-token ~5% of the time. Two calls is slower but deterministic.

**7. Why a catalog-index prepend in the system prompt?**
An early failure mode: in Hindi, a question about Chile 2016 would retrieve the wrong docs (vector drift across language + Devanagari vs. Latin event names), and Claude would confidently say "I don't have information about that event." Prepending the authoritative 15-event list eliminated this — the model now knows the shape of its own knowledge.

**8. Why `react-globe.gl` with a regular (non-dynamic) import?**
Next.js 14's dynamic-import pattern breaks `React.forwardRef` propagation. Programmatic `flyTo` calls from the voice agent kept failing because the ref was `null`. Fix: import `GlobeGL` normally inside a client component. Cost: a slightly larger initial bundle. Benefit: the globe is controllable.

---

## Failure modes I designed around

| Failure | Detection | Response |
|---|---|---|
| Claude 429 rate-limit | HTTP status | Gemini fallback in <100 ms |
| Claude 500 / empty text | status + content check | Gemini fallback |
| Gemini quota exhausted | HTTP 429 | Deterministic CSV briefing |
| FAISS index missing | startup check | Server refuses to start, logs rebuild command |
| Wrong event retrieved | N/A (silent) | Force-include via keyword detection |
| Voice agent fails to connect | frontend event | UI falls back to text input |
| Browser TTS silent | inaudible | User reads the side-panel text — no user-visible error |
| Globe ref null | callback error | Retry loop, up to 3 s |
| PDF library failure | markdown-pdf exception | Return 500 with structured error; caught by frontend toast |

---

## Performance numbers

All measurements on an M1 MacBook Air, 16 GB RAM, local laptop network.

| Operation | p50 | p95 |
|---|---|---|
| Query embed (MiniLM, CPU) | 12 ms | 25 ms |
| FAISS top-5 retrieval | 0.3 ms | 0.8 ms |
| Claude Haiku synthesis (200 w) | 650 ms | 1,200 ms |
| Gemini Flash synthesis (200 w) | 500 ms | 900 ms |
| Deterministic CSV briefing | 120 ms | 180 ms |
| PDF generation (markdown-pdf) | 3.5 s | 6 s |
| End-to-end text query | 720 ms | 1,400 ms |
| End-to-end voice query (add TTS) | 1,050 ms | 1,800 ms |

Total cost per interactive query at Anthropic prices: ~$0.002. Total PDF generation cost: ~$0.01.

---

## Reproducibility

Everything in the repo is reproducible from scratch:

```
cd backend
python3 build_index.py          # rebuilds nereus.faiss + docs.json from corpus/*.md
python3 -m uvicorn main:app     # serves the API
```

```
cd frontend
npm install
npm run dev
```

```
cd scripts
python3 generate_demo_pdfs.py   # pre-bakes all 15 event briefings
```

For GPU corpus embedding at scale (thousands of docs rather than thirty), the `brev/` folder contains a batch pipeline designed for NVIDIA Brev.dev that processes 10,000 docs in ~90 seconds on an A10G.

---

## What's next technically

1. **Real-time SST ingestion.** Subscribe to NOAA OISST THREDDS updates; auto-refresh events monthly.
2. **14-day forecast layer.** SOM-based heatwave predictor or a GNN over Argo profiles. The Argo features CSV (5,913 profiles) is the training set.
3. **Corpus 10×.** Expand to ~300 events globally using the same curation pipeline. Index rebuild is already scripted; Brev pipeline is already in the repo.
4. **Eval harness.** 100 ground-truth QA pairs hand-labelled for correctness + citation accuracy; automatic CI regression gate.
5. **Streaming responses.** Server-sent events from FastAPI → frontend → ElevenLabs for sub-300 ms time-to-first-word.
