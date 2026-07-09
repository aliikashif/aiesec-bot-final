export default function BotAvatar() {
  return (
    <div
      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ring-2 shadow-md"
      style={{ background: "#140586", ringColor: "#63B2FB", border: "2px solid #63B2FB" }}
    >
      <img src="/mascot-avatar-256.png" width="16" height="16" className="object-contain rounded-full" alt="Bot Avatar" />
    </div>
  )
}
