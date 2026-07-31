import { useState, useEffect } from "react"

const SUGGESTIONS_BY_PORTFOLIO = {
  finance_legal: [
    {
      icon: "",
      text: "What quorum is required for a national legislative meeting to proceed?",
    },
    {
      icon: "",
      text: "How to organize EFB proofs?",
    },
    {
      icon: "",
      text: "What is the maximum cash-in-hand limit for a Local Committee?",
    },
    {
      icon: "",
      text: "What are the consequences if a Local Committee fails to meet the membership criteria?",
    },
  ],
  business_development: [
    {
      icon: "",
      text: "What criteria must an organization meet to qualify for a Business Development Partnership with AIESEC?",
    },
    {
      icon: "",
      text: "What is the role of the Business Development portfolio in AIESEC?",
    },
    {
      icon: "",
      text: "What criteria does AIESEC use when selecting partners for its CSR initiatives?",
    },
    {
      icon: "",
      text: "What unique added value does AIESEC provide to companies?",
    },
  ],
  exchange: [
    {
      icon: "",
      text: "What are the 18 Quality Standards?",
    },
    {
      icon: "",
      text: "What happens if fewer than 16 standards are met?",
    },
    {
      icon: "",
      text: "What happens during the debrief with AIESEC after the exchange ends?",
    },
    {
      icon: "",
      text: "What specific information should I include in a detailed buyer persona?",
    },
  ],
  mxp: [
    {
      icon: "",
      text: "What types of evidence must be submitted within 72 hours for a complaint to be accepted?",
    },
    {
      icon: "",
      text: "What are the MX Standards",
    },
    {
      icon: "",
      text: "What are the MX KPIs?",
    },
    {
      icon: "",
      text: "Explain the case solving flow",
      query: "Explain the case solving flow in detail",
    },
  ],
}

export default function SuggestedQuestions({ portfolio, onSelect }) {
  const [isMobile, setIsMobile] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)")
    setIsMobile(media.matches)
    const listener = (e) => setIsMobile(e.matches)
    media.addEventListener("change", listener)
    return () => media.removeEventListener("change", listener)
  }, [])

  const suggestions = SUGGESTIONS_BY_PORTFOLIO[portfolio] || []

  return (
    <div className={`flex flex-col items-center justify-center flex-1 px-4 h-full ${isMobile ? 'py-0' : 'py-12 gap-4'}`}>
      {/* Hero section */}
      <div className="text-center">
        <p className="text-xl md:text-sm font-bold md:font-medium animate-fade-in" style={{ color: "rgba(20, 5, 134, 0.6)" }}>
          What would you like to know?
        </p>
      </div>

      {/* Suggestion cards grid */}
      {!isMobile && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-xl">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onSelect(s.query || s.text)}
              className="group text-left rounded-xl px-4 py-4 transition-all duration-150 border-t border-r border-b border-l-4 cursor-pointer shadow-sm hover:scale-[1.02] hover:shadow-md"
              style={{
                background: "#ffffff",
                borderColor: "rgba(20, 5, 134, 0.1) rgba(20, 5, 134, 0.1) rgba(20, 5, 134, 0.1) #037EF3",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "rgba(99, 178, 251, 0.3) rgba(99, 178, 251, 0.3) rgba(99, 178, 251, 0.3) #037EF3"
                e.currentTarget.style.background = "rgba(99, 178, 251, 0.05)"
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "rgba(20, 5, 134, 0.1) rgba(20, 5, 134, 0.1) rgba(20, 5, 134, 0.1) #037EF3"
                e.currentTarget.style.background = "#ffffff"
              }}
            >
              {s.icon && <span className="text-xl mb-2 block">{s.icon}</span>}
              <span className="text-sm font-semibold text-[#140586] leading-snug">{s.text}</span>
              <span className="block mt-1 text-xs font-medium" style={{ color: "rgba(20, 5, 134, 0.5)" }}>
                Click to ask →
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Mobile-only collapsible "Try asking" toggle */}
      {isMobile && (
        <div className="w-full max-w-xl mt-3">
          {/* Toggle pill */}
          <button
            onClick={() => setExpanded(prev => !prev)}
            style={{
              width: "100%",
              background: "transparent",
              border: "1px solid rgba(20, 5, 134, 0.15)",
              borderRadius: "20px",
              padding: "10px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: 600, color: "rgba(20, 5, 134, 0.55)" }}>
              Try asking
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(20, 5, 134, 0.55)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {expanded
                ? <polyline points="18 15 12 9 6 15" />
                : <polyline points="6 9 12 15 18 9" />
              }
            </svg>
          </button>

          {/* Expanded suggestion list */}
          {expanded && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => onSelect(s.query || s.text)}
                  style={{
                    background: "#ffffff",
                    borderTop: "1px solid rgba(20, 5, 134, 0.1)",
                    borderRight: "1px solid rgba(20, 5, 134, 0.1)",
                    borderBottom: "1px solid rgba(20, 5, 134, 0.1)",
                    borderLeft: "4px solid #037EF3",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#140586",
                    lineHeight: "1.4",
                    width: "100%",
                  }}
                >
                  {s.text}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
