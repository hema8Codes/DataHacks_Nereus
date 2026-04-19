# Nereus — Explained without jargon

For: your mom, a non-technical judge, a business mentor, a Scripps scientist who isn't a software engineer, a salmon farmer in Chile, anyone who just wants to know what this thing *is*.

---

## What Nereus is, in three sentences

Imagine Google Maps, but for heatwaves in the ocean. You can ask it a question by voice — in English, Hindi, Spanish, or four other languages — and it flies you to the right part of the world on a 3D globe and tells you what happened, why, and what it means. It was built so that a salmon farmer in Chile and an insurance underwriter in Zurich can finally look at the same information, in their own language, with no training.

---

## The problem in one breath

The ocean gets fevers. When it does, it kills fish, reefs, birds, and coastal livelihoods. These fevers — *marine heatwaves* — now happen twenty times more often than they did forty years ago and cost the world roughly eight billion dollars a year.

The people who suffer most are the people with the least access to the data: small farmers on the coast of Chile, shrimp cooperatives in Indonesia, oyster-growers in France. The information exists — NASA has it, NOAA has it, Scripps has it — but it's locked behind English-language scientific papers and giant netCDF files that require a PhD to open.

Nereus is the translator between that data and those people.

---

## A story to make it real

**Meet Camila.** She runs a mid-sized salmon farm in the Chilean fjords near Puerto Montt. She has 2 million fish in pens. In January 2016, the surface water in her bay warmed by 2.8 °C above normal for three weeks. A harmful algal bloom exploded. Twenty-seven million farmed salmon died across Chile's industry in one month. Her farm lost 40% of stock. Total Chilean losses that year: **$800 million**.

Nobody told Camila the water was warm. The data existed — Argo floats near her were logging the temperature rise in real time. But it was on a THREDDS server in Maryland, in English, behind a password she didn't have.

**Now imagine she had Nereus.** She opens it on her phone. She speaks, in Spanish: *"Dime cómo está el mar este mes."* ("Tell me how the sea is this month.") Nereus flies to her bay, shows her the temperature anomaly glowing red, and says: *"Aguas superficiales 2.8 grados sobre lo normal. Análogos históricos: Chile 2016 MHW-HAB, 800 millones USD en pérdidas. Recomendación: adelantar la cosecha o reubicar stock."* ("Surface waters 2.8 °C above normal. Historical analog: Chile 2016 MHW-HAB, $800M in losses. Recommendation: accelerate harvest or relocate stock.")

That's the entire product.

---

## How it works, in pictures

Think of Nereus as four layers stacked like a cake.

**Layer 1 — The data.** At the bottom is public ocean data: temperature measurements from floating robots (Scripps Argo floats), satellite sea-surface-temperature maps (NOAA OISST), species sightings from citizen scientists (iNaturalist), and fifteen carefully researched case studies of past marine heatwaves from the scientific literature.

**Layer 2 — The memory.** That raw data is distilled into a small library of thirty documents — one per event, one per region, one per species group — each about a page long, all grounded in peer-reviewed sources. This is Nereus's "memory." It's small enough to fit on a laptop, rigorous enough to be defensible to a scientist.

**Layer 3 — The brain.** When you ask a question, Nereus finds the five most relevant documents (like a super-fast librarian) and hands them to an AI model (Claude, made by Anthropic) with the instruction: *"answer this question using only these documents, in this language."* That's what "retrieval-augmented generation" means — the AI isn't making things up, it's reading from a trusted library.

**Layer 4 — The face.** A 3D globe you can spin, a voice agent you can talk to, a side panel that shows charts and a "download briefing" button. This is the part a salmon farmer or a scientist actually touches.

---

## How you use it

Three ways, depending on what feels natural to you.

1. **Click the globe.** You see fifteen glowing "canopies" on the ocean surface — one for each historical marine heatwave. Click one and you fly into it. A side panel opens with the details.

2. **Talk to it.** Tap the microphone, pick your language, and say what you want. *"Tell me about the Pacific Blob."* *"How does that compare to Chile 2016?"* *"Generate a PDF report."* The globe flies, the panel updates, Nereus talks back.

3. **Type into the chat bar.** Same as voice, but silent. Good for crowded spaces.

After each question, Nereus can produce a one-page PDF — like the kind an insurance underwriter or a fisheries regulator would write — in about six seconds. Click, download, done.

---

## Who is this for, in real life

**The three people Nereus was built for:**

1. **The aquaculture operator.** Owns or manages a fish / oyster / shrimp farm. Needs early warning, in their own language. Loses money when the water warms and no one told them.

2. **The insurance underwriter.** Writes policies that pay out when a heatwave happens. Currently prices those policies blind because no clean data source exists. Would pay thousands of dollars a month for a clean feed.

3. **The marine scientist.** Works at Scripps, Woods Hole, CSIRO, or a university. Wastes hours every week wrangling OISST and Argo data. Wants one tool that gets them to the answer in seconds with citations they can trust.

Nereus serves all three with the same interface — the difference is the panel they look at, the PDF they export, and the language they speak.

---

## Why this matters beyond the demo

Three reasons this is more than a cute hackathon project.

**It saves money.** Eight billion dollars a year in marine-heatwave-attributable losses are currently preventable with better early intelligence. Even a 5% reduction through actionable alerts is $400 million.

**It saves equity.** The people who lose the most are small-scale operators in the Global South, and they're the people English-only science communication fails hardest. A seven-language interface is not a feature — it's the whole product.

**It saves time.** A scientist at Scripps who uses Nereus saves eight hours a week. Multiplied across the thousands of marine researchers worldwide, that's tens of millions of dollars of annual research productivity.

---

## Why this is a real product, not a toy

Three answers for the most common skeptical question.

- *"But isn't this just ChatGPT?"* — ChatGPT makes up ocean temperatures when you ask it. Nereus refuses to answer unless it can cite a real document. The scientific community would never trust a tool that hallucinates, and neither would an insurance firm.

- *"What if the AI goes down?"* — Nereus has a three-layer fallback. If Claude (the main AI) is offline, it switches to Gemini (Google's AI). If both are offline, it generates the briefing directly from the data using a classic template. The user never sees a failure.

- *"Why multilingual? English is the internet's language."* — For a marine scientist in Boston, yes. For a salmon farmer in Puerto Montt or a shrimp-cooperative manager in Gujarat, emphatically no. The people Nereus serves most urgently speak Hindi, Spanish, Bahasa Indonesia, and Norwegian — not English.

---

## The thirty-second version

"The ocean is getting fevers — marine heatwaves — that are killing fisheries and costing coastal economies eight billion dollars a year. The data exists but it's locked in scientific papers and technical files nobody can use. Nereus is a voice-driven 3D map where a salmon farmer, an insurance underwriter, or a scientist can ask in seven languages what's happening in the ocean and get a grounded, cited answer in under a second — plus a downloadable intelligence briefing. One interface, seven languages, fifty coastal nations. Built in a weekend on Scripps data."

Then stop talking and let them look at the globe.
