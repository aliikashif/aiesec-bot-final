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
          style={{ background: "linear-gradient(135deg, #63B2FB, #140586)" }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
            <path d="M8 12h8M12 8v8"/>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-[#140586]">AIESEC F&amp;L Assistant</h2>
        <p className="text-sm font-medium" style={{ color: "rgba(20, 5, 134, 0.6)" }}>
          Ask me anything about Finance &amp; Legal policies
        </p>
      </div>

      {/* Suggestion cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
        {SUGGESTIONS.map((s, i) => (
          <button
            key={i}
            onClick={() => onSelect(s.text)}
            className="group text-left rounded-xl px-4 py-4 transition-all duration-200 border cursor-pointer shadow-sm"
            style={{
              background: "#ffffff",
              borderColor: "rgba(20, 5, 134, 0.1)",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "#63B2FB"
              e.currentTarget.style.background = "rgba(99, 178, 251, 0.05)"
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "rgba(20, 5, 134, 0.1)"
              e.currentTarget.style.background = "#ffffff"
            }}
          >
            <span className="text-xl mb-2 block">{s.icon}</span>
            <span className="text-sm font-semibold text-[#140586] leading-snug">{s.text}</span>
            <span className="block mt-1 text-xs font-medium" style={{ color: "rgba(20, 5, 134, 0.5)" }}>
              Click to ask →
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
