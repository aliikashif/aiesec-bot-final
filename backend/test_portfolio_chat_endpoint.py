"""
test_portfolio_chat_endpoint.py

Tests the portfolio wiring through get_answer directly (same code path
as /chat and /chat/stream after the main.py change), without needing
the full HTTP server to be running.

Simulates exactly what the two endpoint test cases would send:
  Test A: No portfolio field  → defaults to "finance_legal" (DEFAULT_PORTFOLIO)
  Test B: portfolio = "business_development" → BD persona, empty retrieval expected
"""

import sys
import io
sys.path.insert(0, 'backend')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from rag import get_answer, load_vector_store
from portfolios import DEFAULT_PORTFOLIO

SEP = "=" * 70

def simulate_request(question: str, portfolio: str | None):
    """Mirrors exactly what /chat does after our main.py change."""
    # Equivalent of: portfolio=request.portfolio or DEFAULT_PORTFOLIO
    effective_portfolio = portfolio or DEFAULT_PORTFOLIO
    result = get_answer(question, vs, [], portfolio=effective_portfolio)
    return result

print("Loading vector store...")
vs = load_vector_store()
print("Vector store loaded.\n")

# ── Test A: No portfolio field (frontend sends nothing) ──────────────────
print(SEP)
print("TEST A: request.portfolio = None  (simulates current frontend — no field sent)")
print(f"        effective_portfolio = {None or DEFAULT_PORTFOLIO!r}")
print(SEP)
result_a = simulate_request("Hello", portfolio=None)
print("ANSWER:", result_a["answer"])
print()

# ── Test B: portfolio = "business_development" ───────────────────────────
print(SEP)
print('TEST B: request.portfolio = "business_development"')
print(SEP)
result_b = simulate_request("Hello", portfolio="business_development")
print("ANSWER:", result_b["answer"])
print()

# ── Test C: Substantive question, no portfolio (F&L retrieval) ───────────
print(SEP)
print('TEST C: Substantive question, no portfolio (F&L, retrieval expected)')
print(SEP)
result_c = simulate_request("What is the reimbursement limit?", portfolio=None)
print("ANSWER:", result_c["answer"])
print("CONFIDENCE:", result_c.get("confidence"))
print("SOURCES:", result_c.get("sources"))
print()

# ── Test D: Same question, portfolio="business_development" ──────────────
print(SEP)
print('TEST D: Same question, portfolio="business_development" (empty retrieval expected)')
print(SEP)
result_d = simulate_request("What is the reimbursement limit?", portfolio="business_development")
print("ANSWER:", result_d["answer"])
print("CONFIDENCE:", result_d.get("confidence"))
print("SOURCES:", result_d.get("sources"))
print()

print(SEP)
print("All tests complete.")
print(SEP)
