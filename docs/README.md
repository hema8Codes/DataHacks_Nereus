# Nereus — `/docs` index

The documents in this folder are the complete pitch and demo pack for DataHacks 2026. Open them in this order the day of the demo.

| File | Use it when | Time to read |
|---|---|---|
| [`PITCH_REHEARSAL.md`](./PITCH_REHEARSAL.md) | **Rehearsing the pitch out loud** (cheat card + 3 versions + recovery moves) | 8 min |
| [`JUDGE_QA.md`](./JUDGE_QA.md) | **Drilling judge Q&A** (top-10 must-memorize + by-archetype hard questions) | 15 min |
| [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md) | Right before you walk to the stage | 4 min |
| [`PITCH.md`](./PITCH.md) | Reference: long-form pitch structure, market math, defensibility | 10 min |
| [`QUESTIONS_SUPPORTED.md`](./QUESTIONS_SUPPORTED.md) | Reference: full scope of what Nereus answers | 8 min |
| [`TECHNICAL_DEEP_DIVE.md`](./TECHNICAL_DEEP_DIVE.md) | Reference: for an ML/AI track judge's deep questions | 12 min |
| [`PLAIN_ENGLISH_EXPLAINER.md`](./PLAIN_ENGLISH_EXPLAINER.md) | Reference: for a P&E judge, a mentor, a customer | 6 min |

## Companion script

`../scripts/generate_demo_pdfs.py` pre-bakes all 15 event-briefing PDFs so the demo never waits on a live LLM call. Run it once the morning of the demo while you're testing the rest of the stack.

```bash
# from the Nereus root:
python3 scripts/generate_demo_pdfs.py
# -> demo_outputs/pdfs/MHW_BLOB_PHASE1.pdf, MHW_CHILE_2016.pdf, ...
```

## The "I have ninety seconds" shortlist

If a judge, mentor, or investor grabs you in the hallway and you have ninety seconds:

1. Open `PITCH_REHEARSAL.md` → *THE CHEAT CARD* at the top. Memorise the 60-second version.
2. Keep `JUDGE_QA.md` → *The 10 questions you WILL get* on your phone for the walk to the stage.
3. Keep `DEMO_SCRIPT.md` → *Opening (30 s)* ready as the hook.

That's everything you need for the moment before stage.

## What to do in the 30 minutes before you present

1. **Read `PITCH_REHEARSAL.md` once** — especially the cheat card and the recovery moves.
2. **Say the 60-second version out loud three times.** Time yourself. Aim for 58-62 seconds each.
3. **Read `JUDGE_QA.md` → top-10 answers out loud**, twice. Don't skim — speak them.
4. **Open `DEMO_SCRIPT.md`** — skim the 7-turn walkthrough so the order is fresh.
5. **Do the pre-stage checklist** at the bottom of `PITCH_REHEARSAL.md`: breath, water, posture, face.
6. **Run** `python3 scripts/generate_demo_pdfs.py` once in the background to confirm PDFs cache successfully.
7. **Walk on stage.**
