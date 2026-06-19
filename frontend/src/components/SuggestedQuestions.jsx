const SUGGESTIONS = [
  {
    icon: "💸",
    text: "What is the reimbursement process?",
  },
  {
    icon: "📄",
    text: "How do I submit an MoU?",
  },
  {
    icon: "🧾",
    text: "What expenses are covered by AIESEC?",
  },
  {
    icon: "⚖️",
    text: "What are the legal requirements for hosting an intern?",
  },
]

export default function SuggestedQuestions({ onSelect }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-12 gap-8">
      {/* Hero section */}
      <div className="text-center space-y-3">
        <div
          className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
          style={{ background: "linear-gradient(135deg, #140586, #2d1b8e)" }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c1ff72" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
            <path d="M8 12h8M12 8v8"/>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white">AIESEC F&amp;L Assistant</h2>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
          Ask me anything about Finance &amp; Legal policies
        </p>
      </div>

      {/* Suggestion cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
        {SUGGESTIONS.map((s, i) => (
          <button
            key={i}
            onClick={() => onSelect(s.text)}
            className="group text-left rounded-xl px-4 py-4 transition-all duration-200 border"
            style={{
              background: "#1a1a3e",
              borderColor: "rgba(193,255,114,0.2)",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "#c1ff72"
              e.currentTarget.style.background = "#1e1e4a"
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "rgba(193,255,114,0.2)"
              e.currentTarget.style.background = "#1a1a3e"
            }}
          >
            <span className="text-xl mb-2 block">{s.icon}</span>
            <span className="text-sm font-medium text-white leading-snug">{s.text}</span>
            <span className="block mt-1 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Click to ask →
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
