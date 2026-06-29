/* Typing indicator — three animated bouncing dots */
export default function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 mb-4">
      {/* Bot avatar */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ring-2 shadow-md"
        style={{ background: "#140586", ringColor: "#63B2FB", border: "2px solid #63B2FB" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#63B2FB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          <circle cx="12" cy="16" r="1" fill="#63B2FB"/>
        </svg>
      </div>

      {/* Bubble with bouncing dots */}
      <div
        className="rounded-2xl rounded-tl-sm px-5 py-3 flex items-center gap-1.5 border border-[#140586]/10 shadow-sm"
        style={{ background: "#ffffff" }}
      >
        <span className="typing-dot" style={{ animationDelay: "0ms" }} />
        <span className="typing-dot" style={{ animationDelay: "160ms" }} />
        <span className="typing-dot" style={{ animationDelay: "320ms" }} />
      </div>
    </div>
  )
}
