import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"

export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems = [
    { path: "/", label: "Chat", icon: "💬" },
    { path: "/documents", label: "Documents", icon: "📄" },
    { path: "/admin", label: "Admin", icon: "🔒" },
  ]

  return (
    <div
      className={`flex flex-col h-screen bg-[#63B2FB] text-[#140586] transition-all duration-200 flex-shrink-0 select-none overflow-hidden ${
        isExpanded ? "w-[220px]" : "w-14"
      }`}
    >
      {/* Top Header & Toggle Button */}
      <div
        className={`flex items-center h-[60px] border-b border-[#140586]/15 ${
          isExpanded ? "justify-between px-4" : "justify-center"
        }`}
      >
        {isExpanded && (
          <span className="font-bold text-[#140586] text-sm tracking-wider uppercase">
            AIESEC BOT
          </span>
        )}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 rounded-lg hover:bg-white/20 text-[#140586]/80 hover:text-[#140586] transition-colors duration-150 cursor-pointer"
          title={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
          aria-label={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          {isExpanded ? (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-2 py-4 space-y-1.5">
        {menuItems.map(item => {
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center rounded-xl transition-all duration-200 cursor-pointer h-11 w-full ${
                isExpanded ? "px-4 gap-3 justify-start" : "px-0 justify-center"
              } ${
                isActive
                  ? "text-[#140586] bg-white/50 font-semibold shadow-sm"
                  : "text-[#140586]/80 hover:bg-white/25"
              }`}
            >
              <span className="text-xl flex items-center justify-center flex-shrink-0">
                {item.icon}
              </span>
              <span
                className={`text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  isExpanded
                    ? "opacity-100 max-w-[150px]"
                    : "opacity-0 max-w-0 overflow-hidden pointer-events-none"
                }`}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
