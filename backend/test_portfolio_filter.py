"""
test_portfolio_filter.py — Standalone test for portfolio-based metadata filtering in RAG retrieval.

Run from the backend/ directory:
    python test_portfolio_filter.py

Tests three scenarios:
  1. portfolio="finance_legal"     — should return chunks tagged finance_legal
  2. portfolio="business_development" — should return empty (no docs ingested yet)
  3. no portfolio argument          — should return F&L results (backward compat.)
"""

import sys
from pathlib import Path

# Make sure we can import from backend/
sys.path.insert(0, str(Path(__file__).parent))

from rag import load_vector_store

QUESTION = "What is the reimbursement limit for petty cash expenses?"

SEPARATOR = "-" * 60


def print_results(label: str, docs_with_scores: list):
    print(f"\n{SEPARATOR}")
    print(f"TEST: {label}")
    print(SEPARATOR)
    print(f"  Results returned : {len(docs_with_scores)}")
    if docs_with_scores:
        for i, (doc, score) in enumerate(docs_with_scores, 1):
            src = Path(doc.metadata.get("source", "unknown")).name
            portfolio = doc.metadata.get("portfolio", "NOT SET")
            print(f"  [{i}] source={src!r}  portfolio={portfolio!r}  score={score:.4f}")
    else:
        print("  (no results — expected for empty portfolio)")


def main():
    print("Loading vector store...")
    try:
        vs = load_vector_store()
    except Exception as e:
        print(f"[ERROR] Could not load vector store: {e}")
        sys.exit(1)
    print("Vector store loaded.\n")

    # ── Test 1: finance_legal filter ─────────────────────────────────────────
    try:
        docs_with_scores_fl = vs.similarity_search_with_relevance_scores(
            query=QUESTION,
            k=6,
            filter={"portfolio": "finance_legal"},
        )
        print_results('portfolio="finance_legal"', docs_with_scores_fl)
    except Exception as e:
        print(f"[ERROR] Test 1 failed: {e}")

    # ── Test 2: business_development filter (empty portfolio) ─────────────────
    try:
        docs_with_scores_bd = vs.similarity_search_with_relevance_scores(
            query=QUESTION,
            k=6,
            filter={"portfolio": "business_development"},
        )
        print_results('portfolio="business_development"', docs_with_scores_bd)
        if docs_with_scores_bd:
            print("  [WARN] Expected 0 results but got some — check ingestion!")
        else:
            print("  [OK] Correctly returned 0 results for empty portfolio.")
    except Exception as e:
        print(f"[ERROR] Test 2 failed: {e}")

    # ── Test 3: No portfolio filter (backward compatibility) ──────────────────
    try:
        docs_with_scores_all = vs.similarity_search_with_relevance_scores(
            query=QUESTION,
            k=6,
        )
        print_results("no portfolio filter (all portfolios)", docs_with_scores_all)
        portfolios_seen = {doc.metadata.get("portfolio") for doc, _ in docs_with_scores_all}
        print(f"  Portfolios in results: {portfolios_seen}")
    except Exception as e:
        print(f"[ERROR] Test 3 failed: {e}")

    print(f"\n{SEPARATOR}")
    print("All tests complete.")
    print(SEPARATOR)


if __name__ == "__main__":
    main()
