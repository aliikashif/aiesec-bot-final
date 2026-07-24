import { useState } from "react"
import ReactMarkdown from "react-markdown"
import BotAvatar from "./BotAvatar"

// Confidence badge styles
const CONFIDENCE_STYLES = {
  High: { background: "#c1ff72", color: "#0d0d1a" },
  Medium: { background: "#f0c040", color: "#0d0d1a" },
  Low: { background: "#e05555", color: "#ffffff" },
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function getCleanBaseName(str) {
  if (!str) return ""
  const raw = typeof str === "object" ? (str.filename || str.name || str.source || "") : String(str)
  return raw
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    .replace(/\.pdf$/i, "")
    .replace(/(?:#page=|\(p\.|\:)\d+\)?$/i, "")
    .trim()
    .toLowerCase()
}

function formatSourceLabel(src) {
  let rawStr = ""
  let pageNum = null

  if (typeof src === "object" && src !== null) {
    rawStr = src.filename || src.name || src.source || ""
    pageNum = src.page || src.page_number || null
  } else {
    rawStr = String(src || "")
  }

  if (!pageNum) {
    const pageMatch = rawStr.match(/(?:#page=|\(p\.|\:)(\d+)\)?$/i)
    if (pageMatch) {
      pageNum = pageMatch[1]
      rawStr = rawStr.replace(/(?:#page=|\(p\.|\:)\d+\)?$/i, "").trim()
    }
  }

  const cleanName = rawStr
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    .replace(/\.pdf$/i, "")
    .trim()

  if (pageNum) {
    return `${cleanName} — p.${pageNum}`
  }
  return cleanName
}

// Sources box
function SourcesBox({ sources, allDocuments = [] }) {
  return (
    <div
      className="mt-2 rounded-xl px-3 py-2.5"
      style={{ border: "1.5px solid rgba(20, 5, 134, 0.15)", background: "rgba(20, 5, 134, 0.03)" }}
    >
      <p className="text-xs font-semibold mb-1.5" style={{ color: "#140586" }}>
        📎 Sources
      </p>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((src, i) => {
          const targetName = getCleanBaseName(src)
          const matchedDoc = (allDocuments || []).find(
            doc => getCleanBaseName(doc.filename) === targetName
          )

          const isClickable = Boolean(matchedDoc && matchedDoc.filename)

          const handleClick = () => {
            if (isClickable) {
              window.open(
                `${API_BASE_URL}/documents/download/${encodeURIComponent(matchedDoc.filename)}`,
                "_blank"
              )
            }
          }

          return (
            <span
              key={i}
              onClick={isClickable ? handleClick : undefined}
              className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border transition-all duration-150 ${
                isClickable
                  ? "cursor-pointer bg-[#63B2FB]/15 text-[#140586] border-[#63B2FB]/30 hover:bg-[#63B2FB]/30 hover:underline shadow-sm"
                  : "bg-[#63B2FB]/15 text-[#140586] border-[#63B2FB]/30 opacity-80 select-none"
              }`}
            >
              {formatSourceLabel(src)}
            </span>
          )
        })}
      </div>
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
        className="text-xs rounded-md px-2 py-1 transition-all duration-150 flex items-center gap-1 cursor-pointer"
        style={{
          background: voted === "up" ? "rgba(99, 178, 251, 0.15)" : "rgba(20, 5, 134, 0.05)",
          color: voted === "up" ? "#140586" : "rgba(20, 5, 134, 0.6)",
          border: voted === "up" ? "1px solid #63B2FB" : "1px solid rgba(20, 5, 134, 0.1)",
        }}
      >
        <span>👍</span>
        <span>Helpful</span>
      </button>
      <button
        onClick={() => handleVote("down")}
        title="Not helpful"
        className="text-xs rounded-md px-2 py-1 transition-all duration-150 flex items-center gap-1 cursor-pointer"
        style={{
          background: voted === "down" ? "rgba(224,85,85,0.15)" : "rgba(20, 5, 134, 0.05)",
          color: voted === "down" ? "#e05555" : "rgba(20, 5, 134, 0.6)",
          border: voted === "down" ? "1px solid #e05555" : "1px solid rgba(20, 5, 134, 0.1)",
        }}
      >
        <span>👎</span>
        <span>Not helpful</span>
      </button>
    </div>
  )
}

export default function ChatMessage({ message, isLast, onFollowUpClick, allDocuments = [] }) {
  const isUser = message.role === "user"

  if (isUser) {
    return (
      <div className="flex justify-end mb-6">
        <div
          className="max-w-[75%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-[#0d0d1a] border border-[#037EF3]/15 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
          style={{ background: "#E6F2FE" }}
        >
          {message.content}
        </div>
      </div>
    )
  }

  // Bot message
  const badgeStyle = CONFIDENCE_STYLES[message.confidence] || CONFIDENCE_STYLES.Medium

  return (
    <div className="flex items-start gap-3 mb-10">
      <BotAvatar />
      <div className="max-w-[78%] flex flex-col">
        {/* Bubble with confidence badge */}
        <div className="relative rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-[#0d0d1a] border border-[#140586]/10 shadow-[0_1px_3px_rgba(0,0,0,0.08)]" style={{ background: "#ffffff" }}>
          {/* Confidence badge — top-right of bubble */}
          {message.confidence && (
            <span
              className="absolute -top-2 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={badgeStyle}
            >
              {message.confidence === "High" ? "✓ High" : message.confidence === "Medium" ? "~ Medium" : "! Low"} confidence
            </span>
          )}
          <div className="leading-relaxed mt-1 text-sm text-[#0d0d1a]">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-5 mb-2 last:mb-0 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 last:mb-0 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="mb-0.5">{children}</li>,
                strong: ({ children }) => <strong className="font-bold text-[#0d0d1a]">{children}</strong>,
                a: ({ href, children }) => <a href={href} className="text-[#037EF3] hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <SourcesBox sources={message.sources} allDocuments={allDocuments} />
        )}

        {/* Follow-up suggestions */}
        {isLast && message.followups && message.followups.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {message.followups.map((q, i) => (
              <button
                key={i}
                onClick={() => onFollowUpClick && onFollowUpClick(q)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-all duration-150 cursor-pointer bg-[#63B2FB]/10 text-[#140586] border-[#63B2FB] hover:bg-[#63B2FB] hover:text-white"
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
