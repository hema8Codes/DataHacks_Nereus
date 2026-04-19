# Nereus — Question catalog

Full reference of what Nereus can and cannot answer, organised by intent. Use this to brief a demo judge, hand to a customer, or stress-test the product before show time.

---

## Scope at a glance

Nereus is a **closed-domain RAG system**. It is very good at anything grounded in its corpus (15 curated marine heatwave events, 5 regions, 5 species, 2 science primers, 3 persona docs). It will politely decline questions that fall outside.

**In-domain events.** Pacific Blob (2013–15 phase 1), Pacific Blob (2015 phase 2), NE Pacific 2019 "Blob 2.0", Chile/SE Pacific 2016 MHW-HAB, Tasman Sea 2015-16, Tasman Sea 2017-18, Mediterranean 2022, Mediterranean 2003, North Atlantic 2023, NW Atlantic 2012, Gulf of Maine 2016 (ongoing), Great Barrier Reef 2016 bleaching, Great Barrier Reef 2017 bleaching, Peru 2017 Coastal Niño, Ningaloo Niño 2011.

**In-domain regions.** Northeast Pacific, Southeast Pacific (Chilean coast), Tasman Sea, Mediterranean, North Atlantic, Gulf of Maine, Great Barrier Reef, Peruvian coast, Ningaloo coast.

**In-domain species classes.** Salmon (Atlantic and Pacific), sea lions, sardine, Humboldt squid, Cassin's auklet, common murre, kelp, coral (Acropora and Porites), anchoveta.

**In-domain climate modes.** El Niño / La Niña (via ONI), Pacific Decadal Oscillation (PDO), North Atlantic Oscillation (NAO), Atlantic Multidecadal Oscillation (AMO).

---

## Category 1 — Event-identification and lookup

Nereus can name any event in its catalog, state its dates, its Hobday category, and its peak anomaly.

**Example questions that work:**
- "Tell me about the Pacific Blob."
- "What was the Chile 2016 marine heatwave?"
- "When did the Mediterranean 2022 MHW start and end?"
- "How severe was the Gulf of Maine 2016 event?"
- "What was the peak anomaly during Ningaloo Niño 2011?"

**Example follow-ups that also work:**
- "How long did it last?"
- "Where exactly did it peak?"
- "Was it a Hobday Category III or IV event?"

**Why this works reliably.** The event catalog is hand-curated from peer-reviewed literature. Each event has a dedicated markdown document that Claude retrieves directly, plus the catalog index is prepended to every Claude prompt so the model knows the full list of 15 events it can answer about.

---

## Category 2 — Physical mechanism and subsurface signature

Nereus can describe the physical driver of each event: atmospheric blocking, coastal Kelvin wave, advective heat transport, stratification anomaly, mixed-layer-depth collapse.

**Example questions that work:**
- "What caused the Pacific Blob?"
- "Was the Chile 2016 event driven by El Niño?"
- "What was the mixed-layer depth during the Blob?"
- "How deep did the warming extend in the Mediterranean 2022 event?"
- "Why did the Tasman Sea 2017 event persist so long?"

**Example follow-ups that work:**
- "What was the role of the atmospheric high?"
- "Did heat content increase at depth?"
- "How is this different from a surface-only skin warming?"

---

## Category 3 — Climate-mode attribution

Nereus can state the concurrent ONI, PDO, NAO, and AMO values for each event's period and explain whether they were aligned with the event or orthogonal.

**Example questions that work:**
- "What was the ONI during the Blob?"
- "Was PDO positive or negative during Chile 2016?"
- "How did the NAO relate to the Mediterranean 2022 event?"
- "Which climate mode is most associated with Gulf of Maine MHWs?"
- "Explain the climate state during Peru 2017."

**Example follow-ups that work:**
- "Why does that combination matter?"
- "Would you expect another event of this type in the next La Niña?"

---

## Category 4 — Ecological impact

Nereus can list documented species impacts, mortality counts, fishery closures, and HAB events tied to specific heatwaves, all sourced from the species corpus + iNaturalist observations (10,860 total).

**Example questions that work:**
- "Which species were affected by the Pacific Blob?"
- "What marine life died during Chile 2016?"
- "Did the Great Barrier Reef bleach more in 2016 or 2017?"
- "How many sea lions were impacted by the Blob?"
- "What happened to Humboldt squid during the NE Pacific MHW?"
- "Which fisheries collapsed during the Tasman 2017 event?"

**Example follow-ups that work:**
- "How long does a reef take to recover from that level of bleaching?"
- "Is this pattern of auklet mortality new?"
- "Which trophic levels were hit hardest?"

---

## Category 5 — Economic and industrial impact

Nereus can cite documented economic losses, fishery closures, aquaculture shocks, and insurance-payout reference points.

**Example questions that work:**
- "How much money did Chile 2016 cost the salmon industry?"
- "What were the economic losses from the Pacific Blob?"
- "Did the Mediterranean 2022 event affect tourism or fisheries?"
- "How much did Gulf of Maine lobster decline?"
- "What was the total loss from the 2016 GBR bleaching?"

**Example follow-ups that work:**
- "Was any of this covered by parametric insurance?"
- "Who bore the cost — producers, insurers, or consumers?"

---

## Category 6 — Comparative and analog

Nereus can compare any two events in its catalog on physical mechanism, climate state, ecological response, or economic footprint.

**Example questions that work:**
- "Compare the Pacific Blob to Chile 2016."
- "How does Mediterranean 2022 compare to Mediterranean 2003?"
- "Which is worse: GBR 2016 or GBR 2017?"
- "Is Tasman Sea 2015 analogous to Tasman Sea 2017?"
- "What's the closest historical analog to North Atlantic 2023?"

**Example follow-ups that work:**
- "Which lasted longer?"
- "Which had the higher peak anomaly?"
- "Which climate mode aligned in both cases?"

**Why this works reliably.** The voice agent has a dedicated `compare_events` client tool that draws an arc between the two events on the globe and forces both event documents into the retrieval context simultaneously.

---

## Category 7 — Operator-relevant advisory

Nereus can answer "what should an aquaculture operator / fisheries manager / insurance underwriter *do* about this" questions, grounded in the persona documents and the intelligence-briefing template.

**Example questions that work:**
- "What should a Chilean salmon farm do after an MHW like 2016?"
- "What does this event imply for parametric MHW underwriters?"
- "Which early indicators should a fishery manager watch?"
- "How early could the Blob have been forecast?"
- "Who uses Nereus?"

**Example follow-ups that work:**
- "What's the 14-day look-ahead proxy?"
- "What triggers an alert threshold in practice?"

---

## Category 8 — Definitions and science primers

Nereus has two science primer docs that cover foundational concepts.

**Example questions that work:**
- "What is a marine heatwave?"
- "Explain the Hobday 2016 framework."
- "What is mixed-layer depth?"
- "What's the difference between SST and heat content?"
- "How is a Hobday Category IV event defined?"

---

## Category 9 — Multilingual versions of the above

Every question in categories 1–8 works in any of the seven supported languages. Response language matches the language picker, independent of input language.

**Example questions that work:**
- "प्रशांत ब्लॉब के बारे में बताइए" (Hindi)
- "Cuéntame sobre el evento de Chile 2016" (Spanish)
- "Ceritakan tentang gelombang panas laut Pasifik" (Bahasa Indonesia)
- "Parle-moi de la canicule marine de 2022 en Méditerranée" (French)
- "Fortell meg om Tasmanhavet 2017" (Norwegian)
- "Me fale sobre o evento do Pacífico" (Portuguese)

**Why this works reliably.** Claude is prompted directly in the target language (no translate-from-English). Keyword detection handles non-Latin event names (e.g. `चिली`, `पेरू`, `भूमध्य सागर`, `ब्लॉब`) so force-include still fires.

---

## Category 10 — Generative deliverables

Nereus can produce artefacts, not just prose.

**Example requests that work:**
- "Generate a report."
- "Give me an intelligence briefing on this event."
- "Export a PDF summary."
- "Write the underwriter briefing for Chile 2016."

Each produces a 500–650-word structured PDF with executive summary, physical signature, ecological and economic impact, analog events, recommended action, and a peer-reviewed citation footer. Delivery time: 4–7 seconds via Claude; 180 ms via the deterministic fallback if the LLMs are unavailable.

---

## What Nereus cannot answer

Honest scope disclosure — important for credibility with judges and customers.

**Out of scope today:**

1. **Forecasts of future marine heatwaves.** Nereus is a *retrospective-intelligence* system. It answers "what happened" and "what does that imply." It does not say "the Blob will return next March." That requires a forecasting model (SOM-based heatwave predictor or a GNN over Argo profiles) which is on the Year-1 roadmap.
2. **Real-time SST readings.** The data backing Nereus is pre-computed up to the last catalog refresh. For live SST, Nereus would need a streaming OISST ingestion layer (also Year-1 roadmap).
3. **Events not in the curated catalog.** If someone asks about "the 1997–98 El Niño MHW in Galápagos," Nereus will say it doesn't have that specific event catalogued, then offer the closest analog (Peru 2017). It will not confabulate a detailed answer.
4. **Non-marine climate questions.** Drought, wildfires, atmospheric heatwaves, glacier melt — outside scope. Nereus politely redirects.
5. **Policy recommendations with legal force.** Nereus produces intelligence briefings, not binding regulatory guidance. The PDFs include a source-citation footer so users can take the primary literature to their regulator.

**Graceful-failure path.** When a question falls outside the corpus, Claude is instructed to say so explicitly and suggest the closest in-domain analog, rather than inventing content. This is enforced by the "treat retrieved context as authoritative" system-prompt rule.

---

## Edge cases worth demo-testing

The following have been spot-checked and known to behave well. Keep them in your back pocket if a judge hands you the mic.

- *"What's the most dangerous MHW in your catalog?"* — resolves via `peak_anom_c` ranking in the catalog.
- *"How does the Blob compare to a regular El Niño?"* — combines science primer + Blob docs.
- *"What should I tell my boss about MHW risk to our salmon farm?"* — pulls persona doc + recommended-action section.
- *"Is climate change causing these?"* — returns a grounded, calibrated answer with citations (Hobday 2018, Oliver et al. 2019).
- *"Will there be another Blob?"* — honest answer: Nereus doesn't forecast, but here's what increases the odds (PDO phase, atmospheric blocking frequency).
