# Nereus — `/docs` index

The documents in this folder are the complete pitch and demo pack for DataHacks 2026. Open them in this order the day of the demo.

| File | Use it when | Time to read |
|---|---|---|
| [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md) | Right before you walk to the stage | 4 min |
| [`PITCH.md`](./PITCH.md) | Preparing for the 3-min track pitch | 10 min |
| [`QUESTIONS_SUPPORTED.md`](./QUESTIONS_SUPPORTED.md) | Prepping for judge Q&A | 8 min |
| [`TECHNICAL_DEEP_DIVE.md`](./TECHNICAL_DEEP_DIVE.md) | Talking to an ML/AI track judge | 12 min |
| [`PLAIN_ENGLISH_EXPLAINER.md`](./PLAIN_ENGLISH_EXPLAINER.md) | Talking to a P&E judge, a mentor, a customer | 6 min |

## Companion script

`../scripts/generate_demo_pdfs.py` pre-bakes all 15 event-briefing PDFs so the demo never waits on a live LLM call. Run it once the morning of the demo while you're testing the rest of the stack.

```bash
# from the Nereus root:
python3 scripts/generate_demo_pdfs.py
# -> demo_outputs/pdfs/MHW_BLOB_PHASE1.pdf, MHW_CHILE_2016.pdf, ...
```

## The "I have ninety seconds" shortlist

If a judge, mentor, or investor grabs you in the hallway and you have ninety seconds:

1. Open `PITCH.md` → *The 60-second elevator*. Memorise it.
2. Keep `DEMO_SCRIPT.md` → *Opening (30 s)* on your phone for the hook.
3. Keep `QUESTIONS_SUPPORTED.md` → *Category 10 — Generative deliverables* ready as the "what can I show you right now" answer.

That's everything you need.
