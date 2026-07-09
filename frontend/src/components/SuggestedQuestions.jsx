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
      <div className="text-center">
        <p className="text-sm font-medium animate-fade-in" style={{ color: "rgba(20, 5, 134, 0.6)" }}>
          What would you like to know?
        </p>
      </div>

      {/* Suggestion cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
        {SUGGESTIONS.map((s, i) => (
          <button
            key={i}
            onClick={() => onSelect(s.text)}
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
