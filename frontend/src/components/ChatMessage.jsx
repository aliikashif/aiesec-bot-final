import { useState } from "react"

// Confidence badge styles
const CONFIDENCE_STYLES = {
  High: { background: "#c1ff72", color: "#0d0d1a" },
  Medium: { background: "#f0c040", color: "#0d0d1a" },
  Low: { background: "#e05555", color: "#ffffff" },
}

// Bot avatar with lime ring
function BotAvatar() {
  return (
    <div
      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ring-2 shadow-md"
      style={{ background: "#140586", ringColor: "#c1ff72", border: "2px solid #c1ff72" }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c1ff72" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        <circle cx="12" cy="16" r="1" fill="#c1ff72"/>
      </svg>
    </div>
  )
}

// Sources box
function SourcesBox({ sources }) {
  return (
    <div
      className="mt-2 rounded-lg px-3 py-2"
      style={{ border: "1.5px solid #c1ff72", background: "rgba(193,255,114,0.04)" }}
    >
      <p className="text-xs font-semibold mb-1" style={{ color: "#c1ff72" }}>
        📎 Sources
      </p>
      {sources.map((src, i) => (
        <p key={i} className="text-xs leading-5" style={{ color: "rgba(255,255,255,0.55)" }}>
          {src}
        </p>
      ))}
    </div>
  )
}

// Feedback buttons (thumbs up / down)
function FeedbackButtons() {
  const [voted, setVoted] = useState(null)

  const handleVote = (type) => {
    setVoted(type)
    console.log("Feedback:", type)
  }

  return (
    <div className="flex gap-2 mt-2">
      <button
        onClick={() => handleVote("up")}
        title="Helpful"
        className="text-xs rounded-md px-2 py-1 transition-all duration-150 flex items-center gap-1"
        style={{
          background: voted === "up" ? "rgba(193,255,114,0.15)" : "rgba(255,255,255,0.06)",
          color: voted === "up" ? "#c1ff72" : "rgba(255,255,255,0.4)",
          border: voted === "up" ? "1px solid #c1ff72" : "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <span>👍</span>
        <span>Helpful</span>
      </button>
      <button
        onClick={() => handleVote("down")}
        title="Not helpful"
        className="text-xs rounded-md px-2 py-1 transition-all duration-150 flex items-center gap-1"
        style={{
          background: voted === "down" ? "rgba(224,85,85,0.15)" : "rgba(255,255,255,0.06)",
          color: voted === "down" ? "#e05555" : "rgba(255,255,255,0.4)",
          border: voted === "down" ? "1px solid #e05555" : "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <span>👎</span>
        <span>Not helpful</span>
      </button>
    </div>
  )
}

export default function ChatMessage({ message, isLast, onFollowUpClick }) {
  const isUser = message.role === "user"

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div
          className="max-w-[75%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-white"
          style={{ background: "#1a1a3e" }}
        >
          {message.content}
        </div>
      </div>
    )
  }

  // Bot message
  const badgeStyle = CONFIDENCE_STYLES[message.confidence] || CONFIDENCE_STYLES.Medium

  return (
    <div className="flex items-start gap-3 mb-5">
      <BotAvatar />
      <div className="max-w-[78%] flex flex-col">
        {/* Bubble with confidence badge */}
        <div className="relative rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-white" style={{ background: "#1a1a3e" }}>
          {/* Confidence badge — top-right of bubble */}
          {message.confidence && (
            <span
              className="absolute -top-2 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={badgeStyle}
            >
              {message.confidence === "High" ? "✓ High" : message.confidence === "Medium" ? "~ Medium" : "! Low"} confidence
            </span>
          )}
          <p className="leading-relaxed mt-1">{message.content}</p>
        </div>

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <SourcesBox sources={message.sources} />
        )}

        {/* Follow-up suggestions */}
        {isLast && message.followups && message.followups.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {message.followups.map((q, i) => (
              <button
                key={i}
                onClick={() => onFollowUpClick && onFollowUpClick(q)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-all duration-150 cursor-pointer bg-[#140586]/10 text-[#c1ff72] border-[#c1ff72] hover:bg-[#c1ff72] hover:text-[#0d0d1a]"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Feedback */}
        <FeedbackButtons />
      </div>
    </div>
  )
}
