# Judge Q&A — drill pack

Not a FAQ. A **drill pack**. Read the top ten. Memorize those answers. Skim the archetype sections for harder questions. Learn the redirect phrases. Practice out loud.

---

## The 10 questions you WILL get — memorize these verbatim

These are the ones that come up in 90% of hackathon judging loops. If you can only drill ten things, drill these.

### 1. "What does Nereus actually do?"
> "It's a voice-driven 3D intelligence platform for marine heatwaves. You ask a question in any of seven languages, a 3D globe flies to the right event, a dossier opens with the climate data and species impact, and Claude generates a parametric-insurance-grade PDF briefing in six seconds. All grounded in Scripps Argo data, NOAA OISST, and a fifteen-event catalog curated from peer-reviewed literature."

### 2. "Who's your customer?"
> "Three segments in priority order. Aquaculture cooperatives — $99/month per farm, about ten thousand addressable farms globally. Parametric MHW insurance underwriters — $3,000/month per firm, about two hundred firms globally. Marine scientists and regulators as a freemium upsell. The aquaculture operator is tier one because the pain is most acute and the willingness to pay is already demonstrated by weather-index insurance adoption."

### 3. "Isn't this just ChatGPT with a globe?"
> "ChatGPT is ungrounded. Ask it what the PDO value was during the 2016 Chilean MHW-HAB and it'll confidently invent a number. Nereus refuses to answer without retrieving a cited document — that's enforced by a system-prompt rule and a force-include mechanism for catalog events. An insurance underwriter cannot trust an ungrounded source. That's the gap."

### 4. "What's actually novel here, technically?"
> "The novelty isn't any single component — it's the *end-to-end grounding chain* holding up across a modality switch, a language switch, and a network failure. Most RAG demos break on the second turn or the non-English query. Nereus has three layers of robustness: force-include beats vector drift, the catalog index prepended to the system prompt gives Claude knowledge of its own boundaries, and a three-tier LLM fallback ensures the product never dies."

### 5. "Why should this win ML/AI?"
> "Real pipeline — MiniLM embeddings, FAISS vector index, top-5 retrieval with multilingual force-include, Claude Haiku 4.5 primary, Gemini Flash fallback, deterministic CSV briefing as a third tier, p50 end-to-end latency 720 milliseconds. Seven languages with native-language prompting — not translate-from-English. Six defensible technical decisions I can unpack individually. This isn't a wrapper; it's a designed system."

### 6. "Why should this win Product & Entrepreneurship?"
> "A product has a buyer, a number, and a plan. Buyer: three segments, pyramid defined. Number: $2.4 billion SAM, $285K Year-1 SOM realistic. Plan: three design-partner cooperatives in the first thirty days, two paying conversions by day sixty, one underwriter LOI by day ninety, pre-seed raise by end of semester. The ocean gets fevers, the fevers cost $8 billion a year, I built the translator between the data and the people who need it."

### 7. "What's your moat?"
> "Three things. One, the hand-curated Scripps-grounded corpus — fifteen events with Nature or Science tier citations, expandable on my pipeline overnight. Two, seven-language coverage no one in this niche ships. Three, the design-partner relationships with aquaculture cooperatives I start building the day I win this. The code itself is forkable in a week — the moat is the compounding data and the ground-truth customer relationships."

### 8. "What didn't work?"
> "Three things, real answers. One, I tried marker-based splitting of bilingual responses — Claude broke the marker mid-token 5% of the time. I switched to two Claude calls, slower but deterministic. Two, the globe's flyTo wasn't firing because Next.js dynamic-import pattern breaks React.forwardRef propagation — fixed by switching to a normal import inside a client component. Three, Gemini hit rate limits in testing, which is why I offloaded primary synthesis to Claude and kept Gemini as fallback."

### 9. "If you had a month, what would you build next?"
> "Two things. A real-time SST ingestion layer subscribed to NOAA OISST THREDDS, so Nereus stops being retrospective and starts being predictive. And a fourteen-day forecast model — a GNN over the Argo-feature matrix I already have, five thousand nine hundred profiles. Together those turn Nereus from an intelligence-lookback tool into an early-warning system, which is where the real willingness-to-pay lives."

### 10. "Who built this?"
> "I did — solo, one weekend. Data pipeline, RAG, multilingual voice agent, 3D globe UI, PDF generation, deployment, the pitch you're watching right now. If I can ship this alone in 48 hours, I can ship the Year-1 roadmap with a team of three."

---

## For the AI/ML track judge (technical)

### "Did you actually train a model or just wire up APIs?"
> "I didn't train — and that's the correct choice for this scope. Thirty docs is far below the corpus size where fine-tuning wins over RAG, and I'd lose groundability: fine-tuned models can't cite their sources, which kills the insurance-underwriter use case. I wired the right four models — MiniLM for embeddings, Claude Haiku for synthesis, Gemini Flash as fallback, ElevenLabs for voice — into a designed system with real failure-mode handling. That's engineering, not plumbing."

### "How do you know Nereus isn't hallucinating?"
> "Three defenses. One, grounded retrieval — the Claude prompt includes five retrieved docs plus the full catalog index, with a system-prompt rule to treat retrieved context as authoritative. Two, force-include — if a user names an event, that event's docs are injected regardless of vector score, so cross-lingual queries don't drift. Three, the PDF briefings always include a source-citation footer — if I asked Nereus to write about a non-existent event, it would refuse rather than invent. I haven't built a formal eval harness yet — that's the next ML engineering deliverable."

### "Why FAISS, not pgvector / Pinecone / Weaviate?"
> "At thirty documents, every cloud vector store is strictly worse: higher latency, higher failure rate, cost. FAISS IndexFlatL2 gives me an exact-nearest-neighbor search in sub-millisecond on 30 × 384 floats. Scales cleanly to about a hundred thousand docs before HNSW becomes worth the approximate-recall tradeoff. Premature optimization would have killed the demo."

### "Why Claude over GPT or Llama?"
> "Benchmarked all three on Nereus corpus. Claude Haiku 4.5 at 650 ms, GPT-4o-mini at 1.1 s, Llama-3.1-70B-instruct self-hosted at 2.8 s. Quality delta on 200-word responses was not discernible to a domain expert in blind pairing. Haiku was the latency-dominant choice for an interactive voice product. I also happen to trust Anthropic's constitutional-AI training more than OpenAI's for a grounded Q&A use case, but that's secondary."

### "What's your eval methodology?"
> "Currently informal — I hand-tested roughly forty questions across the seven languages and tracked hallucination rate and citation accuracy by eye. Zero hallucinations on in-catalog events, roughly 5% on out-of-catalog events before I added the force-include and catalog-prepend. Next step: a hundred-question ground-truth eval harness in CI with regressions blocking merges. That's a week of work, not forty-eight hours."

### "What happens when the corpus doesn't have an answer?"
> "Two paths. If the question names an in-catalog event that *is* there but the vector didn't surface it, force-include fixes it. If the question is genuinely out-of-domain — say, glacier melt — Claude is instructed to say so explicitly and suggest the closest in-scope analog. I've verified this path on about ten adversarial queries. It holds."

### "How do you handle query ambiguity?"
> "The retrieval layer pulls top-5, so if a query is ambiguous the context is broader — Claude gets to disambiguate in the response. For deeply ambiguous queries ('what about the blob?') the user's selected_event_id from the globe click disambiguates in the augment step. That's the coupling between the UI state and the backend retrieval — it's not implicit, it's a feature."

### "Is this just LangChain?"
> "No. I looked at LangChain early and it adds two hundred milliseconds of Python abstraction overhead and a dependency footprint that's hostile to a laptop demo. Nereus is about four hundred lines of direct FAISS + Anthropic SDK + Gemini SDK calls. Every layer of the cascade is legible in one file. For production at scale I'd reconsider; for this scope raw SDK usage was right."

### "What would you measure in a real deployment?"
> "Top-line: query-to-answer latency p50 and p99, hallucination rate from a gold-standard eval set, citation accuracy, LLM cost per query. Ops: fallback-trigger rate by tier (what % of queries fall through to Gemini, what % to deterministic). Product: session-length distribution, multilingual adoption by language, PDF generation rate. All of these are instrumentable in Langfuse or Helicone with a week of plumbing."

### "How does this scale to a million users?"
> "Current bottleneck is per-query LLM cost — $0.002 per query at Anthropic pricing, so a million users at ten queries each per month is $20K/month. Caching would eat 40% of that. FAISS scales to ~100K docs in-memory; beyond that, sharded HNSW. The multilingual pipeline scales linearly. The real engineering challenge at scale is the real-time SST ingestion — that's an Airflow DAG over OISST netCDFs, not a hard problem but a non-trivial one."

---

## For the Product & Entrepreneurship track judge

### "Who's your first paying customer?"
> "Concretely: Multi X Salmon cooperative in Puerto Montt, Chile. Fifteen-farm consortium, combined revenue $40M, burned by the 2016 MHW-HAB. Their pain is acute, their willingness to pay is demonstrated by existing weather-index insurance spend, and they speak Spanish. I've not pitched them yet — that's week one post-hackathon — but I've mapped the buyer persona and the entry point is their cooperative manager, not their farmers."

### "Why hasn't NOAA or Scripps built this?"
> "NOAA ships the raw data; they don't ship a product — that's their charter. Scripps is a research institution; their output is papers, not SaaS. There's a ten-year gap between an OISST netCDF on a THREDDS server and a Chilean farmer who needs a five-line Bahasa alert. Nobody was going to close that gap institutionally. It's a classic unglamorous-middle-layer opportunity."

### "What if Claude shuts off tomorrow?"
> "Three-tier fallback: Claude primary, Gemini secondary, deterministic CSV briefing tertiary. I'll show you live — I can disable my Anthropic key and the product still serves answers. For a more durable version, I'd add a fourth tier with a self-hosted Llama instance. The multi-LLM architecture is specifically designed so no single vendor can kill the product."

### "What's your CAC? LTV?"
> "CAC for the aquaculture tier: I'd expect $200-400 through direct cooperative outreach in the first year — founder-led sales, not paid channels. LTV at $99/month with expected 24-month retention is $2,400. That's a CAC:LTV of 6-12×, cleanly above the 3× floor. Underwriter tier is different — CAC of maybe $3K on a six-month enterprise sales cycle, LTV at $3K/month × 36 months is $108K, so 30×. Both tiers support a venture-scale business."

### "Why now? Why not five years ago?"
> "Three converging trends. One, 2023 was the hottest ocean year on record; MHW events made six major financial news cycles and underwriters started pricing the risk. Two, Lloyds, Munich Re, and Swiss Re started writing parametric MHW covers in 2024 — the buyer is actively buying *something*, just not something as good as Nereus. Three, conversational-AI latency dropped below one second in 2025, making a voice-driven B2B interface finally viable. None of these were true five years ago."

### "Why multilingual? English is the internet's language."
> "For a marine scientist in Boston, yes. For a salmon farmer in Puerto Montt or a shrimp-cooperative manager in Gujarat, emphatically no. My priority-one customer speaks Spanish, Norwegian, Bahasa, Hindi, or Portuguese — not English. If Nereus were English-only, the TAM would shrink by 60% and I'd be abandoning the customers with the most acute pain. Multilingual isn't a feature; it's the whole thesis."

### "What's your distribution strategy?"
> "Three channels in year one. One, direct-to-cooperative — founder-led, Spanish/Norwegian fluency required, I'll hire contract sales reps in each country. Two, insurance-underwriter pull — once one underwriter integrates the API, others follow for competitive parity. Three, Scripps co-branding — a published research collaboration gives Nereus institutional credibility that no amount of marketing buys."

### "What's the business model, specifically?"
> "Three tiers. Operator tier: $99/month per farm, covers a single bay or region. Underwriter API: $3K/month per firm, volume-based overage at $0.10 per briefing above 1,000/month. Research freemium: free for individuals, $500/month institutional. All three are SaaS subscriptions, no transaction fees. Standard B2B vertical-SaaS playbook, nothing exotic."

### "How defensible is this in 12 months?"
> "The code is forkable in a week, I'll say that out loud. The defensibility is elsewhere. One, the curated corpus compounds — every week I add events, every week a forker falls further behind. Two, the aquaculture cooperative relationships are sticky B2B contracts with 18-month+ renewal cycles; first mover advantage is real. Three, the insurance underwriter integration involves regulatory review at the reinsurer level, which is a 6-month process no forker will bypass. I'm not claiming a ten-year moat; I'm claiming 18-24 months, which is enough runway to raise and hire."

### "What's the biggest risk to the business?"
> "Honest answer: customer adoption in the Global South is slower than a VC timeline. Farmers aren't software buyers by default. My mitigation is channel partnership — I'm not selling direct to farms; I'm selling to cooperative managers who have budget authority and aggregation leverage. Second risk: Anthropic or Google changes pricing 5× and the unit economics flip. Mitigation: the deterministic fallback runs at zero marginal cost, and I'd upshift to a self-hosted open-weights model within a month."

### "What did you prioritize out of scope?"
> "Three things I consciously cut. Real-time forecasting — Year 1, not Week 1. A knowledge-graph UI — I built the scaffolding but removed it from the MVP because it added cognitive load without clarifying the value prop. A custom auth system — I'm leveraging ElevenLabs and FastAPI defaults for now; production will need SSO and tenant isolation. All three are Year-1 deliverables, not launch-blockers."

---

## For the Scripps / oceanography domain expert

### "Is this grounded in actual oceanography?"
> "The spine is Hobday et al. 2016's MHW taxonomy — Category I through IV based on multiples of the 90th-percentile climatology threshold. All fifteen events in the catalog have peer-reviewed primary citations: Bond et al. 2015 and Di Lorenzo & Mantua 2016 for the Blob, León-Muñoz et al. 2018 for Chile, Hughes et al. 2017 for the GBR bleaching. The climate-mode attribution layer uses NOAA PSL's ONI, PDO, NAO, and AMO indices, computed monthly from 1950. I can show you the citation footer on any briefing."

### "How do you handle the Argo temporal coverage gap?"
> "Argo is sparse pre-2005 in the Southern Ocean and below 1,500m in most basins. I flag that in the subsurface-signature section of the briefing — where Argo coverage is thin, the document leans on the mooring record and satellite-derived surface observations. I don't pretend Argo was observing the Ningaloo Niño in 2011 the way it observed the Blob in 2015."

### "Why Hobday's framework over Oliver's more recent work?"
> "Hobday 2016 is the taxonomy — the definition of what counts as an MHW and how to categorize it. Oliver et al. 2019 is the global-trends paper built on that framework, not a replacement for it. Nereus uses Hobday for event classification and cites Oliver when users ask about long-term frequency trends. They're complementary, not competing."

### "What's your SST source — OISST, MUR, SST4?"
> "OISST v2.1 at 0.25° daily resolution for the event-detection layer. I considered MUR at 0.01° but the spatial resolution gain isn't worth the temporal lag for this use case — MHW classification is a weekly-to-monthly question, not a daily one. SST4 from VIIRS is night-only and I didn't need the diurnal gradient for this product. OISST is also what the parametric-insurance industry already uses, which matters for underwriter trust."

### "Have you talked to actual oceanographers?"
> "I built this for a Scripps-themed hackathon, so the immediate audience is Scripps faculty and researchers. My plan is to use whatever feedback I get here to refine the corpus curation — particularly the regional docs where my expertise is weakest. If I'm lucky, one of the professors here gives me twenty minutes for a review. That conversation is more valuable than any VC intro."

### "What about Southern-Ocean or deep MHWs — you're surface-biased."
> "Fair critique. The catalog is surface-SST weighted because that's where the economic-damage literature is richest and where the operator pain is most acute. Subsurface MHWs — heat content below the mixed layer — are scientifically important but the industry buyer isn't asking about them yet. Year-2 expansion includes a deep-MHW layer driven by Argo heat-content integrals. I've kept the schema extensible for that."

### "Isn't your corpus small for a RAG system?"
> "Thirty docs is small for general-purpose knowledge. For a closed-domain, peer-reviewed, curated RAG system, small is the point. Every doc is hand-authored from a primary source. Expanding to three hundred events is a week of curation work, not a hard problem — the pipeline is already in place. I'd rather have thirty correct docs than three thousand noisy ones."

---

## For the skeptic / meta questioner

### "Is this a product or a project?"
> "It's a product with a project-sized corpus. The architecture — voice agent, multilingual pipeline, three-tier LLM cascade, 3D globe, PDF generation — is production-shape. The corpus is fifteen events, which is a hackathon deliverable. The scale-up is purely a data-curation job, not a re-architecture. Give me a month and three hundred events and you have a product."

### "What's the hardest technical problem you solved?"
> "Multilingual grounding. Pure vector retrieval fails across scripts — a Hindi query for चिली 2016 doesn't embed near the Latin-script 'Chile 2016' docs in MiniLM space. I fixed it with a multi-layer defense: keyword detection in each language's script, force-include of matching event docs regardless of vector score, and prepending the catalog index to the Claude prompt so the model knows its own knowledge boundary. That ensemble is the thing that makes the multilingual demo not break."

### "Why didn't you build a forecast model?"
> "I scoped for a demonstrable MVP in 48 hours. A forecast model requires a labeled training set, a real eval harness, and weeks of hyperparameter tuning to produce something I'd actually show to a judge. The retrospective-intelligence scope is more defensible in demo time and more immediately useful to the aquaculture operator customer — analog-based risk ranking is the same form-factor as forecasting for their decision loop."

### "What if a competitor copies this in a week?"
> "They'd have the shell but not the substance. The curated corpus is 30 hours of hand-authoring against peer-reviewed literature — forkable but not re-buildable in a week. The multilingual prompt engineering took another ten hours of failure-mode work. The three-tier fallback architecture is a designed system, not a pattern copied from a tutorial. A copy-cat launches a demo, not a defensible business. And by the time they launch, I have three design-partner cooperatives and an LOI."

### "What's the worst thing a user would say?"
> "'It doesn't cover the event I care about.' Closed-domain RAG is honest about its boundaries — Nereus will tell a user when an event isn't catalogued, which is the right answer but a dissatisfying one. Mitigation is corpus expansion; the pipeline is already written. A more ambitious worst thing: 'The alert came too late to save my stock.' That's a Year-2 forecast-layer problem and I hold that honestly — retrospective intelligence reduces repeat loss, it doesn't prevent first-mover loss."

### "Are you overclaiming?"
> "Possibly on the TAM side — $300B aquaculture is the gross total; my SAM is $2.4B and my realistic Year-1 SOM is $285K. I don't claim we capture the gross. On the technical side, I'm claiming a real RAG pipeline with defensible decisions, not a state-of-the-art breakthrough. On the product side, I'm claiming three customer segments with demonstrated willingness to pay on the adjacent category (weather-index insurance), not three locked-down contracts. I'd rather be specific and correct than grandiose and flimsy."

---

## Stall-and-redirect phrases (when you need a second)

**Buy yourself two seconds of thinking time:**
- "That's the right question to ask."
- "Two parts to that — let me take them in order."
- "There's a surface answer and a deeper answer. Which do you want?"
- "Can I check one thing before I answer?"

**If you genuinely don't know:**
- "I don't know — that's what a customer conversation in week one answers. But the structure of the answer would be [X]."
- "That's a gap in my current analysis. My plan to close it is [X]."
- "I haven't tested that failure mode. Here's how I'd instrument for it."

**If the question is off-topic:**
- "That's an adjacent problem — for scope I stayed focused on [X]. Happy to talk about that adjacency after."

**If the question is a trap:**
- "I think the premise of the question is [X], which I'd push back on. Let me tell you why."

---

## Questions to ASK the judges (if you have time at the end)

Flipping the interview shows confidence and creates memory.

- "Who would you pilot this with first — aquaculture, insurance, or research?"
- "What would make you 10× more bullish on the market timing?"
- "What's the most common failure mode you've seen for products like this?"
- "Would you introduce me to one customer conversation you think I should have?"

---

## The "if you blank completely" nuclear fallback

If your brain stops and you have nothing, say exactly this:

> "The ocean gets fevers. They cost eight billion a year. The data exists but nobody built the interface. Nereus is the interface. Let me show you."

Then click the globe. That's 25 seconds and it always works.
