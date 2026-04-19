# Nereus — Demo script

**Total runtime: 4 min 30 s.** Aim to finish a beat *under* your time slot so judges have room to ask questions. Every screen action below has the spoken line directly next to it.

---

## Before you walk to the stage

1. `cd backend && python3 -m uvicorn main:app --reload --port 8000`
   Wait for `ready. docs=30 events=15`.
2. `cd frontend && npm run dev` — open `http://localhost:3000` in a new Chrome window, full-screen (`⌃⌘F`).
3. Dock Chrome DevTools → Network → uncheck "Disable cache". Close DevTools.
4. Run `python3 scripts/generate_demo_pdfs.py` once. This pre-bakes the PDFs so turn 5 is instant.
5. In the Nereus URL bar, load `/?demo=1` if you've wired the demo flag. Otherwise just start on the globe.
6. Allow microphone access in Chrome and confirm the ElevenLabs agent connects (green dot).
7. Silence your phone. Disable Mac notifications: `⌥⌘D` then toggle Do Not Disturb.

**Backup plan if the network dies:** open the pre-generated PDFs from `demo_outputs/pdfs/` in a tab behind the browser. The event panel, globe, and text input still work offline for catalog-only data.

---

## Opening — 30 s

> *(Globe rotating slowly, mint aurora off, title pill visible.)*

"Marine heatwaves have become twenty times more frequent in forty years. They cost the aquaculture industry roughly eight billion dollars a year. A single event off the coast of Chile in 2016 killed 27 million farmed salmon and wiped out 800 million dollars in one month."

> *(Click the Blob canopy on the globe to start zooming in.)*

"The ocean doesn't send evacuation orders. I built one. This is Nereus."

---

## Turn 1 — Event lookup — 30 s

**Type or say:** *"Tell me about the Pacific Blob."*

> *(Globe flies to 45° N, 145° W. Blob canopy rises to 8× altitude with a bright anomaly cap. Side panel opens with +3.3 °C hero card, climate-mode pills, species bar chart.)*

"Nereus is embedding my question through MiniLM, running top-5 retrieval against a FAISS index of 30 hand-authored documents backed by Scripps Argo floats and the curated Hobday event catalog, and asking Claude Haiku to answer in English. That's the five-stage pipeline lighting up in the top right."

---

## Turn 2 — Context resolution — 20 s

**Ask:** *"What was the climate state?"*

> *(Answer appears in side panel. Note it says "the Blob" even though you didn't name the event again.)*

"Notice I never said 'Blob' again. The follow-up resolved against the selected-event context. It's telling me ONI was mildly negative — weak La Niña — and PDO had just flipped positive. That's the causal attribution layer working."

---

## Turn 3 — Species impact — 20 s

**Ask:** *"Which species were affected?"*

> *(Species bar chart updates — sea lions, Cassin's auklets, sardine, Humboldt squid, etc.)*

"Ten thousand eight hundred iNaturalist observations from Scripps, grouped by event region. Nereus is grounded — every answer cites a peer-reviewed paper in the side-panel footer."

---

## Turn 4 — Comparative — 30 s

**Ask:** *"Compare it to Chile 2016."*

> *(Arc animation from Pacific NW to SE Pacific. Both canopies highlight.)*

"Totally different mechanism — Blob was a high-pressure ridge stalling Pacific storms for three winters, Chile was a coastal El-Niño pulse that detonated a harmful algal bloom in two weeks. Same tool, two physically distinct stories. This is the comparative-events tool dispatched by the voice agent."

---

## Turn 5 — PDF briefing — 20 s

**Ask:** *"Generate a report."*

> *(Gradient CTA pulses. PDF downloads. Open it to page 2.)*

"Claude Haiku wrote a six-hundred-word intelligence briefing in about six seconds — executive summary, physical signature, ecological and economic impact, analog events, recommended action, source citation. Parametric insurance underwriters pay analysts three-hundred dollars an hour to do this. Nereus does it for free."

---

## Turn 6 — Multilingual — 40 s

> *(Tap language picker → हिन्दी.)*

**Ask:** *"प्रशांत ब्लॉब के बारे में बताइए"* (Tell me about the Pacific Blob.)

> *(Side panel answer renders in Devanagari. Voice reply reads it aloud in Hindi through ElevenLabs.)*

"Seven languages at launch — English, Hindi, Spanish, Norwegian, Bahasa Indonesia, French, Portuguese. A Norwegian salmon farmer in Bergen, a shrimp-cooperative manager in Gujarat, a mussel-grower on the Chilean Puerto Montt coast — they all get the same intelligence in their own language. That reaches about fifty coastal nations."

---

## Turn 7 — Close the loop — 20 s

**Ask:** *"Who uses Nereus?"*

> *(Persona docs surface — aquaculture operator, parametric insurance underwriter, marine scientist.)*

"Three customer segments. The aquaculture operator loses stock; we give them 14-day look-ahead. The insurance underwriter prices policies blind; we give them a Hobday-standard event catalog with climate-mode conditioning. The marine scientist loses hours to data plumbing; we give them one RAG interface with citations. That's the product triangle."

---

## Closing — 30 s

> *(Reset to globe view. Let it rotate for a beat.)*

"Nereus is built on real Scripps datasets — EasyOneArgo, CCE1 mooring, iNaturalist — plus NOAA OISST and a 15-event catalog curated from 15 peer-reviewed papers. A three-tier resilient LLM stack. Seven languages. Zero cloud databases. The entire intelligence layer runs on my laptop."

"The ocean doesn't send evacuation orders. We just built one. Happy to take questions."

---

## Troubleshooting cues (memorise, don't read)

| If this happens | Do this |
|---|---|
| Voice agent fails to connect | Switch to text input immediately — don't apologise or explain, just keep moving |
| Globe doesn't fly | Click the event canopy directly; the camera will catch up |
| PDF takes > 8 s | Say "pre-generated version" and open the cached PDF from `demo_outputs/pdfs/` |
| Claude rate-limited | Gemini fallback kicks in automatically — no change in demo flow |
| Browser TTS silent | Unmute the laptop (⌘F10), or just let the side-panel text stand in |
| Hindi answer slow | Say: "Here's the English version" — the text tab still renders |

## Post-demo Q&A — one-liners ready to deploy

- *"Why FAISS over Pinecone?"* — 30 documents, 50 KB index, sub-millisecond search on a laptop. No cloud dependency. Demo never fails because a SaaS is down.
- *"Why Claude Haiku 4.5 not Sonnet?"* — Haiku handles structured markdown at ~800 ms per response; Sonnet would be 3–4× slower for no measurable quality lift on this length.
- *"How do you prevent hallucination?"* — Three layers: (1) retrieval-grounded context with force-include, (2) system-prompt rule "treat retrieved context as authoritative," (3) the catalog index prepended to the prompt so Nereus always knows which 15 events it has.
- *"Is this ready to ship?"* — MVP shipped in 36 hours. Production roadmap: real-time OISST ingestion, 14-day forecasting with a GNN on Argo profiles, B2B API for insurance underwriters.
- *"What would you do with more time?"* — Two things: (1) real-time forecast layer instead of historical lookback, (2) integration with Copernicus Marine for direct government data.
