import BotAvatar from "./BotAvatar"

/* Typing indicator — three animated bouncing dots */
export default function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 mb-4">
      {/* Bot avatar */}
      <BotAvatar />

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
