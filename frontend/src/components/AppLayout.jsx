import { useState, useEffect } from "react"
import { Outlet, Link, useLocation } from "react-router-dom"
import { Menu, X, Home } from "lucide-react"
import Sidebar from "@/components/Sidebar"

export default function AppLayout() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const location = useLocation()

  // Close drawer when path changes (item is tapped)
  useEffect(() => {
    setIsDrawerOpen(false)
  }, [location.pathname])

  const menuItems = [
    { path: "/chat", label: "Chat", icon: "💬" },
    { path: "/documents", label: "Documents", icon: "📄" },
    { path: "/admin", label: "Admin", icon: "🔒" },
  ]

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-[#FCFBF4] overflow-hidden text-[#0d0d1a] font-sans">
      
      {/* Mobile Top Header Bar */}
      <header className="md:hidden flex items-center gap-3 px-4 py-2.5 shadow-md bg-[#0F0464] border-b border-white/10 flex-shrink-0 z-20">
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="p-1.5 rounded-lg hover:bg-white/10 text-[#F5F5F0] transition-colors duration-150 cursor-pointer"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        
        {/* Mascot icon */}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center border animate-fade-in" style={{ background: "rgba(255, 255, 255, 0.12)", borderColor: "rgba(255, 255, 255, 0.15)" }}>
          <img src="/mascot-avatar-256.png" width="18" height="18" className="object-contain rounded-md" alt="Bot Avatar" />
        </div>

        <div>
          <h1 className="text-[#F5F5F0] font-bold text-sm leading-tight">AIESEC Assistant</h1>
          <p className="text-[10px] sm:text-xs font-medium text-[#B8B8D9]">Ask me anything about AIESEC</p>
        </div>
      </header>

      {/* Mobile Drawer (Left Slide-in Panel) */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 transition-opacity duration-200 md:hidden"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      <div
        className={`fixed top-0 left-0 bottom-0 w-[240px] bg-[#0F0464] text-[#F5F5F0] z-50 transform transition-transform duration-300 md:hidden flex flex-col ${
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between h-[60px] px-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <img src="/mascot-avatar-256.png" width="22" height="22" className="object-contain rounded-md" alt="Bot Avatar" />
            <span className="font-bold text-sm tracking-wider uppercase text-[#F5F5F0]">AIESEC Assistant</span>
          </div>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors duration-150 cursor-pointer"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Navigation items */}
        <nav className="flex-1 px-2 py-4 space-y-1.5 overflow-y-auto">
          {/* Home Link */}
          <Link
            to="/"
            aria-label="Back to home"
            className="flex items-center rounded-xl transition-all duration-200 px-4 gap-3 justify-start h-11 w-full text-[#B8B8D9] hover:bg-white/10 hover:text-white"
          >
            <span className="text-xl flex items-center justify-center flex-shrink-0 opacity-80">
              <Home className="w-5 h-5" />
            </span>
            <span className="text-sm font-medium whitespace-nowrap">
              Home
            </span>
          </Link>

          {/* Divider */}
          <div className="border-t border-white/20 my-2" />

          {/* Menu items */}
          {menuItems.map(item => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center rounded-xl transition-all duration-200 px-4 gap-3 justify-start h-11 w-full ${
                  isActive
                    ? "text-white bg-white/15 font-semibold shadow-sm"
                    : "text-[#B8B8D9] hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="text-lg flex items-center justify-center flex-shrink-0 w-5">
                  {item.icon}
                </span>
                <span className="text-sm font-medium whitespace-nowrap">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Desktop Left: Collapsible Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Right: Main content area taking remaining width, scrollable */}
      <main className="flex-1 h-full overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
