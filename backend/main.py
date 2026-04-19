"""Nereus backend — FastAPI + FAISS + Gemini.

Endpoints:
    POST /api/ask               RAG over corpus + Gemini synthesis (main Q&A)
    GET  /api/globe-data        15 events as globe-ready points
    GET  /api/event/{event_id}  single event record for side panel
    POST /api/compare           side-by-side stats for two events
    POST /report                Gemini-generated PDF briefing
    GET  /health                liveness probe

Run locally:
    python build_index.py      # once, builds FAISS + docs manifest
    uvicorn main:app --reload --port 8000
"""

import os
import json
import base64
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
import faiss
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
import google.generativeai as genai
from markdown_pdf import MarkdownPdf, Section

# -----------------------------------------------------------------------------
# Paths + env
# -----------------------------------------------------------------------------
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BACKEND_DIR.parent  # Nereus/
DATA_DIR = PROJECT_DIR / "data"
INDEX_PATH = BACKEND_DIR / "nereus.faiss"
DOCS_PATH = BACKEND_DIR / "docs.json"

# Try .env.local first, then .env.local.example (in case user filled that one)
for env_file in [".env.local", ".env.local.example", ".env"]:
    candidate = PROJECT_DIR / env_file
    if candidate.exists():
        load_dotenv(candidate)
        break

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY or GEMINI_API_KEY.startswith("paste_"):
    raise RuntimeError(
        "GEMINI_API_KEY missing. Put it in Nereus/.env.local"
    )

genai.configure(api_key=GEMINI_API_KEY)

# Anthropic (Claude) — tries multiple model IDs; first success wins.
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
_claude = None
CLAUDE_MODEL: Optional[str] = None
CLAUDE_CANDIDATES = [
    "claude-haiku-4-5",          # latest Haiku
    "claude-haiku-4-5-20251001",
    "claude-3-5-haiku-20241022",
    "claude-3-5-haiku-latest",
    "claude-3-haiku-20240307",
    "claude-3-5-sonnet-20241022",
]
if ANTHROPIC_API_KEY and not ANTHROPIC_API_KEY.startswith("paste_"):
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        for m in CLAUDE_CANDIDATES:
            try:
                client.messages.create(
                    model=m,
                    max_tokens=8,
                    messages=[{"role": "user", "content": "ok"}],
                )
                _claude = client
                CLAUDE_MODEL = m
                print(f"[startup] Claude ready ({m})")
                break
            except Exception as e:
                print(f"[startup]   tried {m}: {str(e)[:90]}")
        if _claude is None:
            print("[startup] no Claude model responded; PDF reports will use Gemini")
    except Exception as e:
        print(f"[startup] Anthropic SDK init failed ({e})")
else:
    print("[startup] ANTHROPIC_API_KEY not set")
# Try these in order. First one that responds to a real generate call wins.
GEMINI_MODEL_CANDIDATES = [
    "gemini-flash-latest",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
    "gemini-pro",
]
GEMINI_MODEL = None  # set during startup below

# -----------------------------------------------------------------------------
# Load everything into memory at startup
# -----------------------------------------------------------------------------
print("[startup] loading embedding model")
_embed_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

print(f"[startup] loading FAISS index from {INDEX_PATH}")
if not INDEX_PATH.exists():
    raise RuntimeError(
        f"Missing {INDEX_PATH}. Run `python build_index.py` first."
    )
_index = faiss.read_index(str(INDEX_PATH))
_docs: list[dict] = json.loads(DOCS_PATH.read_text())

print("[startup] loading CSVs")
_catalog = pd.read_csv(DATA_DIR / "mhw_catalog_curated.csv")
_catalog["start_date"] = pd.to_datetime(_catalog["start_date"])
_catalog["end_date"] = pd.to_datetime(_catalog["end_date"])
_indices = pd.read_csv(DATA_DIR / "climate_indices_long.csv")
_indices["date"] = pd.to_datetime(_indices["date"])
_sst_monthly = pd.read_csv(DATA_DIR / "ne_pacific_sst_anomaly_monthly.csv")

_gemini = None
for candidate in GEMINI_MODEL_CANDIDATES:
    try:
        trial = genai.GenerativeModel(candidate)
        # force a real generation call so we discover 404s NOW, not later
        trial.generate_content("ping", generation_config={"max_output_tokens": 5})
        GEMINI_MODEL = candidate
        _gemini = trial
        print(f"[startup] using Gemini model: {GEMINI_MODEL}")
        break
    except Exception as e:
        print(f"[startup]   tried {candidate}: {str(e)[:90]}")

if _gemini is None:
    print("[startup] WARN: no Gemini model responded. /api/ask will return raw retrieved docs.")

print(f"[startup] ready. model={GEMINI_MODEL}  docs={len(_docs)}  events={len(_catalog)}")

# -----------------------------------------------------------------------------
# App
# -----------------------------------------------------------------------------
app = FastAPI(title="Nereus API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def _unhandled(request: Request, exc: Exception):
    import traceback; traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={"Access-Control-Allow-Origin": "*"},
    )

@app.get("/health")
def health():
    return {"ok": True, "docs": len(_docs), "events": len(_catalog), "model": GEMINI_MODEL}

@app.get("/api/models")
def list_gemini_models():
    """Diagnostic: list all Gemini models available to this API key."""
    try:
        models = []
        for m in genai.list_models():
            methods = list(getattr(m, "supported_generation_methods", []))
            if "generateContent" in methods:
                models.append({"name": m.name, "display": getattr(m, "display_name", "")})
        return {"count": len(models), "models": models, "current": GEMINI_MODEL}
    except Exception as e:
        return {"error": str(e)}

# -----------------------------------------------------------------------------
# /api/ask  —  RAG + Gemini synthesis (the core Q&A endpoint)
# -----------------------------------------------------------------------------
class AskRequest(BaseModel):
    question: str
    selected_event_id: Optional[str] = None
    conversation_history: list[dict] = []
    language: Optional[str] = "en"   # ISO-639: en, es, no, id, fr, pt

# Human-readable names for the LLM prompt
LANGUAGE_NAMES = {
    "en": "English",
    "es": "Spanish (Castilian)",
    "no": "Norwegian (Bokmål)",
    "id": "Bahasa Indonesia",
    "fr": "French",
    "pt": "Portuguese",
    "hi": "Hindi (Devanagari script)",
}

class AskResponse(BaseModel):
    answer: str
    answer_en: Optional[str] = None   # English translation when language != "en"
    sources: list[dict]
    suggested_event_id: Optional[str] = None

SYSTEM_PROMPT = """You are Nereus, an AI oceanographer and the voice of Nereus — \
a 3D intelligence platform for marine heatwaves.

CORE RULE: The RETRIEVED CONTEXT below has been specifically fetched from a \
curated peer-reviewed knowledge base to answer the user's question. \
TREAT IT AS AUTHORITATIVE. Use every relevant number, species name, citation, \
date, and mechanism from it. Do NOT say "I don't have information" or "I need \
more research" when the retrieved context contains facts that address the \
question — that would be a false refusal. \
If a specific subdetail is genuinely not in the context, give the user what \
IS there and offer what you can say, not what you cannot.

STYLE:
- Answer in 2 to 4 complete sentences.
- Cite numbers precisely (e.g. '+3.3 C peak', '27 million salmon lost', 'ONI +2.21').
- Attribute impact claims to peer-reviewed literature when the context names it \
  ('per Leon-Munoz et al. 2018').
- If the question is ambiguous and a selected event is provided, answer about \
  that event."""

def _retrieve(query: str, k: int = 5) -> list[dict]:
    q_vec = _embed_model.encode([query], convert_to_numpy=True).astype("float32")
    D, I = _index.search(q_vec, k=k)
    hits = []
    for rank, idx in enumerate(I[0]):
        d = _docs[idx]
        hits.append({
            "id": d["id"],
            "title": d["title"],
            "type": d["type"],
            "distance": float(D[0][rank]),
            "text": d["text"],
        })
    return hits

def _format_history(history: list[dict], max_turns: int = 8) -> str:
    if not history:
        return "(first turn)"
    lines = []
    for turn in history[-max_turns:]:
        role = turn.get("role", "?")
        content = turn.get("content", "")
        lines.append(f"{role}: {content}")
    return "\n".join(lines)

def _guess_event_id(answer: str, hits: list[dict]) -> Optional[str]:
    """Return the catalog's FULL event_id (e.g. MHW_BLOB_PHASE1) for the top event hit."""
    for h in hits:
        if h["type"] == "event":
            # doc id looks like "event_blob_phase1"; catalog short_name is "blob_phase1"
            short = h["id"].replace("event_", "")
            row = _catalog[_catalog["short_name"] == short]
            if not row.empty:
                return str(row.iloc[0]["event_id"])
    return None

@app.post("/api/ask", response_model=AskResponse)
def api_ask(req: AskRequest):
    q = req.question.strip()
    if not q:
        raise HTTPException(400, "Question cannot be empty.")

    # 1. Augment the retrieval query with context hints so FAISS pulls
    #    event-specific docs even when the user says "it" / "the climate state".
    hints: list[str] = []
    if req.selected_event_id:
        row = _catalog[_catalog["event_id"] == req.selected_event_id]
        if not row.empty:
            r = row.iloc[0]
            hints.append(str(r["name"]))
            hints.append(str(r["short_name"]).replace("_", " "))
    # Also pull the last 2 user turns — handles follow-ups when nothing is selected
    if req.conversation_history:
        user_turns = [t.get("content", "") for t in req.conversation_history
                      if t.get("role") == "user"]
        hints.extend(user_turns[-2:])

    retrieval_query = q if not hints else f"{q}  [event context: {' ; '.join(hints)}]"
    hits = _retrieve(retrieval_query, k=5)
    print(f"[/api/ask] retrieval query: {repr(retrieval_query[:180])}")
    print(f"[/api/ask] top hits: {[(h['type'], h['id'], round(h['distance'], 2)) for h in hits]}")

    # Force-include docs for events detected from either the selected_event_id
    # OR keyword-matching the user's question (works across English, Hindi, etc.)
    short_names_to_force: list[str] = []
    if req.selected_event_id:
        row = _catalog[_catalog["event_id"] == req.selected_event_id]
        if not row.empty:
            short_names_to_force.append(str(row.iloc[0]["short_name"]))

    # Event-name keyword detection — works in any language because event names
    # (Chile, Blob, Mediterranean, Tasman, Atlantic, Ningaloo) are usually kept
    # in their English form even in non-English text.
    event_keywords = {
        "chile_2016":  ["chile", "chileans", "चिली", "chiles"],
        "blob_phase1": ["blob", "pacific blob", "ब्लॉब", "2013 pacific"],
        "blob_phase2": ["blob", "ब्लॉब"],
        "blob_2019":   ["blob 2", "blob 2.0", "2019 pacific", "2020 pacific"],
        "med_2022":    ["mediterranean 2022", "med 2022", "भूमध्य सागर 2022"],
        "med_2003":    ["mediterranean 2003", "med 2003"],
        "natl_2023":   ["north atlantic 2023", "atlantic 2023", "2023 atlantic"],
        "nwatl_2012":  ["nwatl", "northwest atlantic", "gulf of maine 2012"],
        "gulfmaine_2016": ["gulf of maine", "maine 2016"],
        "tasman_2015": ["tasman 2015", "tasman sea 2015"],
        "tasman_2017": ["tasman 2017", "tasman sea 2017", "tasman 2018"],
        "peru_2017":   ["peru", "पेरू", "peruvian"],
        "ningaloo_2011": ["ningaloo", "2011 ningaloo"],
        "gbr_2016":    ["great barrier reef 2016", "gbr 2016"],
        "gbr_2017":    ["great barrier reef 2017", "gbr 2017"],
    }
    q_lower = q.lower()
    for short, kws in event_keywords.items():
        if any(kw in q_lower for kw in kws):
            if short not in short_names_to_force:
                short_names_to_force.append(short)

    region_map = {
        "blob_phase1": "ne_pacific", "blob_phase2": "ne_pacific", "blob_2019": "ne_pacific",
        "chile_2016":  "southeast_pacific", "peru_2017": "southeast_pacific",
        "tasman_2015": "tasman_sea",  "tasman_2017": "tasman_sea",
        "med_2022":    "mediterranean","med_2003":   "mediterranean",
        "natl_2023":   "north_atlantic", "nwatl_2012": "north_atlantic",
        "gulfmaine_2016": "north_atlantic",
    }

    wanted_ids: list[str] = []
    for short in short_names_to_force:
        wanted_ids.append(f"event_{short}")
        wanted_ids.append(f"species_{short}")
        reg = region_map.get(short)
        if reg:
            wanted_ids.append(f"region_{reg}")

    already = {h["id"] for h in hits}
    for doc_id in wanted_ids:
        if doc_id in already:
            continue
        doc = next((d for d in _docs if d["id"] == doc_id), None)
        if doc:
            hits.insert(0, {
                "id": doc["id"], "title": doc["title"], "type": doc["type"],
                "distance": 0.0, "text": doc["text"],
            })
            already.add(doc_id)
            print(f"[/api/ask] force-included {doc_id}")
    hits = hits[:8]  # cap context size

    # 2. Build prompt — prepend a catalog index so Claude knows what IS in the knowledge base
    catalog_lines = "\n".join(
        f"- {r['name']} ({r['event_id']}, {r['category']}, +{r['peak_anom_c']}°C) — {r['citation']}"
        for _, r in _catalog.iterrows()
    )
    catalog_block = (
        "=== NEREUS EVENT CATALOG (all 15 canonical events available in your knowledge base) ===\n"
        + catalog_lines
    )
    context_block = catalog_block + "\n\n=== RETRIEVED DOCUMENTS ===\n\n" + \
                    "\n\n---\n\n".join(h["text"] for h in hits)
    history_block = _format_history(req.conversation_history)

    selected_block = ""
    if req.selected_event_id:
        row = _catalog[_catalog["event_id"] == req.selected_event_id]
        if not row.empty:
            r = row.iloc[0]
            selected_block = (
                f"\n=== CURRENTLY VIEWING ===\n"
                f"The user has event '{r['name']}' ({r['event_id']}) currently selected "
                f"on the globe. If the question contains pronouns (it, that, this event) "
                f"or is about 'the event' or 'the region' without naming one, assume they "
                f"mean THIS event. Dates: {r['start_date'].date()} to {r['end_date'].date()}.\n"
            )
        else:
            selected_block = f"\nCURRENTLY SELECTED EVENT: {req.selected_event_id}\n"

    lang_code = (req.language or "en").lower()
    lang_name = LANGUAGE_NAMES.get(lang_code, "English")

    # Simple one-language prompt; if language != "en" we make a 2nd call to translate.
    format_block = (
        f"Your response (in {lang_name}, 2-4 sentences, no headers, no markdown):"
    )
    prompt = f"""{SYSTEM_PROMPT}

CONVERSATION SO FAR:
{history_block}
{selected_block}
RETRIEVED CONTEXT:
{context_block}

USER QUESTION: {q}

{format_block}"""

    # 3. Generate native-language answer — Claude first (quota-heavy Gemini as fallback)
    answer = ""
    if _claude is not None:
        try:
            c = _claude.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=600,
                temperature=0.3,
                messages=[{"role": "user", "content": prompt}],
            )
            answer = "".join(b.text for b in c.content if getattr(b, "text", None)).strip()
            print(f"[/api/ask lang={lang_code}] Claude answer: {len(answer)} chars")
        except Exception as e:
            print(f"[/api/ask] Claude failed: {e}; trying Gemini")
    if not answer and _gemini is not None:
        try:
            resp = _gemini.generate_content(
                prompt,
                generation_config={"temperature": 0.3, "max_output_tokens": 500}
            )
            answer = (resp.text or "").strip()
            print(f"[/api/ask lang={lang_code}] Gemini answer: {len(answer)} chars")
        except Exception as e:
            print(f"[/api/ask] Gemini failed: {e}")
    if not answer:
        answer = f"{hits[0]['title']}. {hits[0]['text'][:400]}"
        print(f"[/api/ask] using FAISS fallback: {len(answer)} chars")

    # 3b. If non-English, make a small follow-up call to produce the English translation
    answer_en: Optional[str] = None
    if lang_code != "en" and answer:
        translate_prompt = (
            f"Translate the following to clear natural English. "
            f"Keep scientific names (e.g. 'Salmo salar'), event IDs "
            f"(e.g. 'MHW_BLOB_PHASE1'), and citations (e.g. 'Bond et al. 2015') "
            f"unchanged. Output ONLY the English translation, no preface.\n\n"
            f"TEXT:\n{answer}"
        )
        # Prefer Claude for translation too
        if _claude is not None:
            try:
                c = _claude.messages.create(
                    model=CLAUDE_MODEL,
                    max_tokens=600,
                    temperature=0.2,
                    messages=[{"role": "user", "content": translate_prompt}],
                )
                answer_en = "".join(b.text for b in c.content if getattr(b, "text", None)).strip()
                print(f"[/api/ask] Claude translation: {len(answer_en)} chars")
            except Exception as e:
                print(f"[/api/ask] Claude translation failed: {e}; trying Gemini")
        if not answer_en and _gemini is not None:
            try:
                t = _gemini.generate_content(
                    translate_prompt,
                    generation_config={"temperature": 0.2, "max_output_tokens": 500},
                )
                answer_en = (t.text or "").strip()
                print(f"[/api/ask] Gemini translation: {len(answer_en)} chars")
            except Exception as e:
                print(f"[/api/ask] Gemini translation failed: {e}")
                answer_en = None

    # 4. Infer suggested event (for globe auto-fly)
    suggested = _guess_event_id(answer, hits)

    return AskResponse(
        answer=answer,
        answer_en=answer_en,
        sources=[{"id": h["id"], "title": h["title"], "type": h["type"]} for h in hits],
        suggested_event_id=suggested,
    )

# -----------------------------------------------------------------------------
# /api/globe-data  —  15 events shaped for the 3D globe
# -----------------------------------------------------------------------------
@app.get("/api/globe-data")
def globe_data():
    events = []
    for _, r in _catalog.iterrows():
        events.append({
            "event_id": r["event_id"],
            "short_name": r["short_name"],
            "name": r["name"],
            "lat_min": float(r["lat_min"]),
            "lat_max": float(r["lat_max"]),
            "lon_min": float(r["lon_min"]),
            "lon_max": float(r["lon_max"]),
            "lat_center": (float(r["lat_min"]) + float(r["lat_max"])) / 2,
            "lon_center": (float(r["lon_min"]) + float(r["lon_max"])) / 2,
            "start_date": r["start_date"].date().isoformat(),
            "end_date": r["end_date"].date().isoformat(),
            "peak_anom_c": float(r["peak_anom_c"]),
            "category": r["category"],
            "duration_days": int(r["duration_days"]),
            "citation": r["citation"],
        })
    return {"events": events, "count": len(events)}

# -----------------------------------------------------------------------------
# /api/event/{event_id}  —  single event for side panel
# -----------------------------------------------------------------------------
def _climate_state_at(date: pd.Timestamp) -> dict:
    """Return {ONI, PDO, NAO, AMO} for the month containing `date`."""
    target_month = pd.Timestamp(date.year, date.month, 1)
    sub = _indices[_indices["date"] == target_month]
    out = {}
    for idx in ["ONI", "PDO", "NAO", "AMO"]:
        row = sub[sub["index"] == idx]
        out[idx] = float(row["value"].iloc[0]) if len(row) else None
    return out

def _top_species_for(event_short_name: str, top_n: int = 5) -> list[dict]:
    """Return top-N species by impact score for an event (if iNat CSV exists)."""
    inat_path = DATA_DIR / "inaturalist" / f"{event_short_name}.csv"
    if not inat_path.exists():
        return []
    df = pd.read_csv(inat_path)
    if "window" not in df.columns or "scientific_name" not in df.columns:
        return []
    counts = df.groupby(["window", "scientific_name"]).size().unstack("window", fill_value=0)
    if "event" not in counts or "baseline" not in counts:
        return []
    counts["impact"] = counts["event"] / (counts["baseline"] + 1)
    top = counts.sort_values("impact", ascending=False).head(top_n)
    return [
        {
            "scientific_name": name,
            "baseline_obs": int(row["baseline"]),
            "event_obs": int(row["event"]),
            "impact_ratio": round(float(row["impact"]), 2),
        }
        for name, row in top.iterrows()
    ]

@app.get("/api/event/{event_id}")
def get_event(event_id: str):
    row = _catalog[_catalog["event_id"] == event_id]
    if row.empty:
        raise HTTPException(404, f"event_id '{event_id}' not found")
    r = row.iloc[0]
    # Map event_id to iNat slug (e.g., MHW_BLOB_PHASE1 -> ne_pacific_blob)
    # Most events map via short_name semantic grouping:
    inat_slug = {
        "blob_phase1": "ne_pacific_blob", "blob_phase2": "ne_pacific_blob",
        "blob_2019":   "ne_pacific_blob",
        "chile_2016":  "chile_2016",
        "tasman_2015": "tasman_sea_2017", "tasman_2017": "tasman_sea_2017",
        "med_2022":    "mediterranean_2022", "med_2003": "mediterranean_2022",
        "natl_2023":   "north_atlantic_2023",
    }.get(r["short_name"], None)

    return {
        "event_id": r["event_id"],
        "name": r["name"],
        "short_name": r["short_name"],
        "start_date": r["start_date"].date().isoformat(),
        "end_date":   r["end_date"].date().isoformat(),
        "duration_days": int(r["duration_days"]),
        "peak_anom_c": float(r["peak_anom_c"]),
        "category": r["category"],
        "citation": r["citation"],
        "bbox": {
            "lat_min": float(r["lat_min"]), "lat_max": float(r["lat_max"]),
            "lon_min": float(r["lon_min"]), "lon_max": float(r["lon_max"]),
        },
        "climate_state": _climate_state_at(r["start_date"]),
        "top_species": _top_species_for(inat_slug) if inat_slug else [],
    }

# -----------------------------------------------------------------------------
# /api/compare  —  side-by-side for two events
# -----------------------------------------------------------------------------
class CompareRequest(BaseModel):
    event_a: str
    event_b: str

@app.post("/api/compare")
def api_compare(req: CompareRequest):
    def fetch(eid):
        row = _catalog[_catalog["event_id"] == eid]
        if row.empty:
            raise HTTPException(404, f"event_id '{eid}' not found")
        r = row.iloc[0]
        return {
            "event_id": r["event_id"],
            "name": r["name"],
            "peak_anom_c": float(r["peak_anom_c"]),
            "duration_days": int(r["duration_days"]),
            "category": r["category"],
            "lat_center": (float(r["lat_min"]) + float(r["lat_max"])) / 2,
            "lon_center": (float(r["lon_min"]) + float(r["lon_max"])) / 2,
            "climate_state": _climate_state_at(r["start_date"]),
        }
    a = fetch(req.event_a)
    b = fetch(req.event_b)
    return {
        "event_a": a, "event_b": b,
        "delta": {
            "peak_anom_c": round(a["peak_anom_c"] - b["peak_anom_c"], 2),
            "duration_days": a["duration_days"] - b["duration_days"],
        },
    }

# -----------------------------------------------------------------------------
# /report  —  Gemini-generated markdown -> PDF
# -----------------------------------------------------------------------------
def _fallback_report(scope: str, event_id: Optional[str]) -> str:
    """Deterministic markdown briefing built from CSV data - never blank."""
    if scope == "event" and event_id:
        row = _catalog[_catalog["event_id"] == event_id]
        if row.empty:
            return f"# Event {event_id} not found\n\nNo record in the MHW catalog."
        r = row.iloc[0]
        cs = _climate_state_at(r["start_date"])
        oni = cs.get("ONI"); pdo = cs.get("PDO")
        return f"""# {r['name']} — Intelligence Briefing

## Executive summary
The **{r['name']}** was a **{r['category']}**-category marine heatwave (Hobday 2016
classification) that lasted **{int(r['duration_days'])} days**
from {r['start_date'].date()} to {r['end_date'].date()}.
Peak sea-surface temperature anomaly reached **+{r['peak_anom_c']}°C**
above the 1982-2011 climatology baseline.

## Physical signature
Event bounding box: {r['lat_min']}° to {r['lat_max']}° latitude,
{r['lon_min']}° to {r['lon_max']}° longitude. Subsurface signature
(Argo-derived, NE Pacific reference): surface layer typically warms on the
order of +0.9°C while the mixed-layer depth shallows by 8 to 10 metres —
the classic mechanism by which these anomalies persist through winter.

## Climate-mode context
At event onset, the NOAA indices read: ONI {oni if oni is None else f'{oni:+.2f}'},
PDO {pdo if pdo is None else f'{pdo:+.2f}'}. Combinations of strong ENSO
and sustained-positive PDO are associated with the highest-intensity events
in the Pacific basin.

## Ecological and economic impact
See the associated iNaturalist impact record and source literature
({r['citation']}) for detailed biological response.

## Recommended action
Operators in the affected region should flag this pattern as a high-precedent
analog when the current climate-mode configuration approaches the onset values
above. Parametric insurance underwriters may reference the event-specific
impact record when pricing regional marine policies.

## Source
{r['citation']}
"""
    # global scope fallback
    top = _catalog.nlargest(5, "peak_anom_c")
    rows = "\n".join(
        f"- **{r['name']}** — +{r['peak_anom_c']}°C · {r['category']} · "
        f"{int(r['duration_days'])} days · _{r['citation']}_"
        for _, r in top.iterrows()
    )
    return f"""# Global Marine Heatwave Intelligence Briefing

## Top 5 most intense events in the Nereus catalog
{rows}

## Trend
Marine heatwaves are now approximately 20× more frequent than four decades
ago (Oliver et al. 2018). The 2023 North Atlantic event was the most intense
on instrumental record for that basin.

## Economic stakes
The global aquaculture industry sustains an estimated $8B per year in MHW-
attributable losses. A single event — the 2016 Chilean HAB-linked MHW —
killed approximately 27 million farmed salmon (~$800M, Leon-Munoz et al. 2018).

## Outlook
Subsurface warming trends documented in the Scripps EasyOneArgo data product
suggest heatwave persistence will continue to grow. Early-warning capability
built on subsurface observables is the key operational priority.
"""



@app.get("/report")
def report(scope: str = "event", event_id: Optional[str] = None):
    """Generate an intelligence briefing PDF. scope = 'event' (requires event_id) or 'global'."""
    if scope == "event":
        if not event_id:
            raise HTTPException(400, "event_id required when scope=event")
        row = _catalog[_catalog["event_id"] == event_id]
        if row.empty:
            raise HTTPException(404, f"event_id '{event_id}' not found")
        r = row.iloc[0]
        hits = _retrieve(r["name"], k=4)
        context = "\n\n".join(h["text"] for h in hits)
        prompt = f"""Write a one-page intelligence briefing on the following marine heatwave, \
formatted in Markdown with a single H1 title and clear section headers (H2).

EVENT METADATA:
- Name: {r['name']}
- Dates: {r['start_date'].date()} to {r['end_date'].date()} ({r['duration_days']} days)
- Category: {r['category']} (Hobday 2016)
- Peak anomaly: +{r['peak_anom_c']} C above baseline
- Citation: {r['citation']}

RETRIEVED CONTEXT:
{context}

Structure the briefing as follows, filling every section with 2-4 complete
sentences each. Do NOT truncate, do NOT use placeholders.

# {r['name']} — Intelligence Briefing

## Executive summary
(2-3 sentences naming the event, its category, dates, and peak anomaly.)

## Physical signature
(2-4 sentences describing subsurface mechanism — mixed-layer depth,
thermocline, heat content where relevant.)

## Ecological and economic impact
(2-4 sentences citing documented species impact, fishery losses, HAB
events, or coral bleaching associated with this event.)

## Analog events and risk context
(2-3 sentences comparing to similar events and explaining the risk
implications for future analogs.)

## Recommended action for operators
(2-3 sentences advising aquaculture operators, insurers, or fisheries
regulators on what this event implies for their planning.)

## Source citation
{r['citation']}

Total length target: 500-650 words. Write complete, flowing paragraphs,
not bullet lists."""
    else:
        # global scope
        top = _catalog.nlargest(5, "peak_anom_c")
        summary_rows = "\n".join(
            f"- {r['name']}: +{r['peak_anom_c']}C ({r['category']}, {r['duration_days']} days) — {r['citation']}"
            for _, r in top.iterrows()
        )
        prompt = f"""Write a one-page global intelligence briefing on marine heatwaves, \
formatted in Markdown.

TOP 5 EVENTS BY INTENSITY:
{summary_rows}

Structure as:
# Global Marine Heatwave Intelligence Briefing
## Current state of knowledge
## Most intense recent events
## Economic stakes
## Outlook
Keep to about 400 words."""

    md = ""
    # Prefer Claude for long-form PDF reports (stronger structured-markdown output)
    if _claude is not None:
        try:
            resp = _claude.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=2000,
                temperature=0.3,
                system=("You are a marine scientist producing concise, decision-grade "
                        "intelligence briefings in clean Markdown. Always produce the "
                        "full structure requested and never truncate mid-sentence."),
                messages=[{"role": "user", "content": prompt}],
            )
            md = "".join(block.text for block in resp.content if getattr(block, "text", None)).strip()
            print(f"[/report] Claude produced {len(md)} chars  (model={CLAUDE_MODEL})")
        except Exception as e:
            print(f"[/report] Claude failed: {e}; falling back to Gemini")
            md = ""

    if not md and _gemini is not None:
        try:
            resp = _gemini.generate_content(
                prompt,
                generation_config={"temperature": 0.3, "max_output_tokens": 4000}
            )
            md = (resp.text or "").strip()
            print(f"[/report] Gemini produced {len(md)} chars")
        except Exception as e:
            print(f"[/report] Gemini failed: {e}")
            md = ""

    if len(md) < 120:
        print("[/report] WARN short/empty response, using deterministic fallback")
        md = _fallback_report(scope, event_id)

    if not md.lstrip().startswith("#"):
        md = "# Nereus Intelligence Briefing\n\n" + md
    print(f"[/report] rendering PDF from {len(md)} chars of markdown")

    # toc_level=0 disables the auto-TOC, which otherwise silently drops content
    # when the markdown contains long sections or non-ASCII characters.
    pdf = MarkdownPdf(toc_level=0)
    # Custom CSS: ensure body has reasonable margins and long content paginates.
    css = """
    body { font-family: 'Helvetica', 'Arial', sans-serif; color: #111827;
           line-height: 1.55; font-size: 11pt; }
    h1 { color: #0B3D5C; font-size: 22pt; margin: 0 0 6pt 0; border-bottom: 2pt solid #117A8B; padding-bottom: 4pt; }
    h2 { color: #117A8B; font-size: 14pt; margin: 16pt 0 6pt 0; }
    h3 { color: #E07A5F; font-size: 12pt; margin: 10pt 0 4pt 0; }
    p  { margin: 0 0 8pt 0; }
    strong { color: #0B3D5C; }
    em { color: #5C6B73; }
    ul, ol { margin: 0 0 8pt 18pt; }
    li { margin: 2pt 0; }
    hr { border: none; border-top: 1pt solid #D8DDE1; margin: 10pt 0; }
    """
    pdf.add_section(Section(md), user_css=css)
    out_path = BACKEND_DIR / "_last_report.pdf"
    pdf.save(str(out_path))
    data = out_path.read_bytes()
    print(f"[/report] PDF size: {len(data)} bytes")
    return Response(
        content=data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="nereus_{event_id or "global"}.pdf"'},
    )
