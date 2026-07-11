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
            "Generating income and building strategic partnerships",
            "Managing the sales process from prospecting to closing",
            "Overseeing partner financial processes and contracts",
            "Stakeholder management and cross-portfolio synergies",
        ],
    },
    "exchange": {
        "display_name": "Exchange",
        "scope_bullets": [
            "Preparation, experience, and post-experience standards for Exchange Participants",
            "Outgoing and incoming logistics (visa, accommodation, arrival/departure support)",
            "Job description, working hours, duration, and opportunity benefits",
            "Review checkpoints and debrief processes",
        ],
    },
    "mxp": {
        "display_name": "MXP",
        "scope_bullets": [
            "Member experience standards across Job Design, Job Support, Community, Community Engagement, Environment & Well-being, and Team Practices",
            "The MX Funnel — a member's journey from Lead through Applicant, Accepted, Approved, Realization, Finished, Completed, to Alumni",
            "Team leader responsibilities and timelines for delivering standards",
            "Recruitment, onboarding, transitions, and team closing processes",
            "Code of ethics subdocument and case-solving flow",
        ],
    },
}

DEFAULT_PORTFOLIO = "finance_legal"
