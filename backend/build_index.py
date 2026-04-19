"""One-time script. Embeds the 30 corpus docs and saves a FAISS index.

Run once before starting the server:
    python build_index.py

Re-run whenever you edit files in corpus/.
"""

import json
from pathlib import Path
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer

ROOT = Path(__file__).resolve().parent.parent  # Nereus/
CORPUS = ROOT / "corpus"
INDEX_PATH = Path(__file__).resolve().parent / "nereus.faiss"
DOCS_PATH = Path(__file__).resolve().parent / "docs.json"

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"  # 80 MB, 384-dim, fast

def main():
    print(f"Loading embedding model: {MODEL_NAME}")
    model = SentenceTransformer(MODEL_NAME)

    md_files = sorted(CORPUS.glob("*.md"))
    print(f"Found {len(md_files)} corpus documents in {CORPUS}")
    if not md_files:
        raise SystemExit("No documents to index. Check Nereus/corpus/.")

    docs = []
    texts = []
    for f in md_files:
        text = f.read_text()
        first_line = text.split("\n", 1)[0].lstrip("# ").strip()
        docs.append({
            "id": f.stem,
            "file": f.name,
            "title": first_line,
            "text": text,
            "type": f.stem.split("_")[0],  # event | region | species | persona | science
        })
        texts.append(text)

    print(f"Embedding {len(texts)} documents...")
    vectors = model.encode(texts, convert_to_numpy=True, show_progress_bar=True)
    vectors = vectors.astype("float32")

    print(f"Building FAISS index (dim={vectors.shape[1]})...")
    index = faiss.IndexFlatL2(vectors.shape[1])
    index.add(vectors)

    print(f"Saving index to {INDEX_PATH}")
    faiss.write_index(index, str(INDEX_PATH))

    print(f"Saving docs manifest to {DOCS_PATH}")
    DOCS_PATH.write_text(json.dumps(docs, indent=2))

    print("\nDone. Sanity check:")
    q = "tell me about the Pacific Blob"
    qv = model.encode([q], convert_to_numpy=True).astype("float32")
    D, I = index.search(qv, k=3)
    print(f"  Query: '{q}'")
    for rank, idx in enumerate(I[0]):
        print(f"  #{rank+1}  {docs[idx]['file']}  (distance={D[0][rank]:.3f})")

if __name__ == "__main__":
    main()
