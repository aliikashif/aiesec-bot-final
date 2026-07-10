"""
portfolios.py — Portfolio registry for the AIESEC NUST RAG assistant.

Each entry defines:
  display_name  : Human-readable name injected into the system prompt and greeting.
  scope_bullets : Bullet points shown in the greeting and used in the system prompt
                  to declare the assistant's scope to the LLM.

Add a new portfolio by inserting a new key here — no other file needs changing
until main.py wires in the portfolio selector on the API side.
"""

PORTFOLIOS: dict[str, dict] = {
    "finance_legal": {
        "display_name": "Finance & Legal",
        "scope_bullets": [
            "Financial policies and reimbursement procedures",
            "MoU and contract signing processes",
            "GDPR and legal compliance",
            "Governance and legislative procedures",
        ],
    },
    "business_development": {
        "display_name": "Business Development",
        "scope_bullets": [
            "[PLACEHOLDER - topic 1]",
            "[PLACEHOLDER - topic 2]",
            "[PLACEHOLDER - topic 3]",
            "[PLACEHOLDER - topic 4]",
        ],
    },
}

DEFAULT_PORTFOLIO = "finance_legal"
