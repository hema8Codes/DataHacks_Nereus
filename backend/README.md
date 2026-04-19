# Nereus Backend

FastAPI service: FAISS RAG over 30 corpus docs, Gemini synthesis, PDF reports.

## Setup (one time)

```bash
cd Nereus/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Build the vector index (one time, ~30 sec)

```bash
python build_index.py
```

Downloads the MiniLM model (80 MB, cached after first run), embeds the 30 corpus
documents, saves `nereus.faiss` + `docs.json` in this directory.

## Run the server

```bash
uvicorn main:app --reload --port 8000
```

Server comes up on `http://localhost:8000`. Check liveness:

```bash
curl http://localhost:8000/health
```

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/ask` | RAG + Gemini synthesis (main Q&A) |
| GET | `/api/globe-data` | 15 events shaped for the 3D globe |
| GET | `/api/event/{event_id}` | Single event for side panel |
| POST | `/api/compare` | Side-by-side stats for two events |
| GET | `/report?scope=event&event_id=MHW_BLOB_PHASE1` | Gemini-generated PDF |
| GET | `/health` | Liveness + stats |

## Smoke test

```bash
curl -X POST http://localhost:8000/api/ask \
    -H "Content-Type: application/json" \
    -d '{"question": "Tell me about the Pacific Blob"}'

curl http://localhost:8000/api/globe-data | head

curl http://localhost:8000/api/event/MHW_CHILE_2016

curl -X POST http://localhost:8000/api/compare \
    -H "Content-Type: application/json" \
    -d '{"event_a": "MHW_BLOB_PHASE1", "event_b": "MHW_CHILE_2016"}'

curl "http://localhost:8000/report?scope=event&event_id=MHW_BLOB_PHASE1" -o test.pdf
```

## Environment variables

Loaded from `../.env.local` (fallback `../.env.local.example`):

- `GEMINI_API_KEY` — required (Google AI Studio)
- `ELEVENLABS_AGENT_ID` — frontend only, backend ignores

## Architecture notes

- All state in-memory at process start:
  - `_embed_model` — sentence-transformers MiniLM
  - `_index` — FAISS IndexFlatL2
  - `_docs` — list of 30 doc records
  - `_catalog`, `_indices`, `_sst_monthly` — pandas DataFrames
- No database, no cache, no file writes at request time (except the transient
  `_last_report.pdf` used only to stream PDF bytes back to the client).
- Gemini is the only external call per `/api/ask`. Typical latency 1-2 sec.
