# Nereus on NVIDIA Brev.dev

Nereus's data pipeline is engineered to run on NVIDIA Brev.dev GPU instances.
This folder is the Brev-hosted half of the architecture.

## Architecture split

```
┌──────────────────────────────┐      ┌──────────────────────────────┐
│   NVIDIA Brev GPU instance    │      │   Laptop / deployment host    │
│   (A10 or A100 recommended)   │      │                              │
├──────────────────────────────┤      ├──────────────────────────────┤
│  brev_pipeline.py             │ ──▶  │  backend/main.py             │
│  ├── Argo physics extraction  │ scp  │  ├── loads derived features  │
│  ├── Corpus embedding         │      │  ├── loads nereus.faiss      │
│  ├── FAISS index build        │      │  └── serves /api/ask etc.    │
│  └── (optional) forecast      │      │                              │
│       training                │      │  frontend (Next.js)           │
└──────────────────────────────┘      └──────────────────────────────┘
```

The GPU instance is used for **batch work**: processing 2.7M Argo profiles,
embedding the corpus, training the forecast model. Outputs are small files
(~50 KB FAISS index, ~300 MB parquet features) that get shipped to the
backend host via `scp`. The runtime API stays lightweight and can run on
any laptop or small VM.

## Why Brev

- **10–100x speedup** on embedding, Argo feature extraction, and forecast
  model training versus running on a MacBook CPU.
- **Pay-per-hour** model: spin up for a build run (~15 minutes on A10,
  ~$0.50), shut down when done.
- **Pre-configured Python ML container**: PyTorch 2, CUDA 12, Python 3.11,
  no driver setup.
- **Persistent attached storage**: Argo archive stays warm between runs,
  avoiding re-download.

## Running the pipeline

From your laptop:
```bash
brev create --instance-type a10 --name nereus-gpu
brev connect nereus-gpu
# once connected:
cd brev && pip install -r requirements-brev.txt
python brev_pipeline.py --task embed       # fast: ~30 sec
python brev_pipeline.py --task argo         # heavy: ~15 min on A10
python brev_pipeline.py --task forecast     # training: ~2 hours on A10
```

Then retrieve outputs back to the backend:
```bash
scp brev:~/brev/outputs/* Nereus/backend/
```

## Demo-scale vs. production

Nereus's hackathon demo uses a 30-document corpus and a single NE Pacific
region for Argo features. That volume runs fine on CPU; Brev is not required.

This module exists to show Nereus's architecture is **Brev-ready from day
one**: scaling to the full 2.7 million Argo profiles, the 43-year OISST
archive, and the forecast training loop is a matter of changing one flag
and pointing at a Brev instance. Nothing in `backend/main.py` needs to
change — it just consumes the derived artifacts Brev produced.

## Why this matters for the pitch

- **Scripps scale**: the full EasyOneArgo archive (the real Scripps product)
  is 1.5 GB and 18,595 float folders. A laptop can't process it.
- **Sovereign inference**: for insurance and aquaculture customers, Brev
  enables running an open-source LLM on a GPU they control — no customer
  data ever leaves their infrastructure.
- **Cost**: a full monthly rebuild at current demo scale costs under $1 of
  Brev compute. At full-scale production (all oceans, all events) it is
  under $100/month.
