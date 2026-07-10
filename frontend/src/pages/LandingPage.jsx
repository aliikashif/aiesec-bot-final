import * as React from "react"
import { Link } from "react-router-dom"
import HeroSection from "@/components/HeroSection"

export default function LandingPage() {
  return (
    <div className="w-full min-h-[100dvh] bg-[#0F0464] flex flex-col font-space">
      {/* Minimal Top Bar */}
      <header className="w-full px-4 sm:px-6 py-4 flex items-center justify-between select-none">
        {/* Left: Mascot Icon + Wordmark */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <img 
            src="/mascot-avatar-256.png" 
            alt="Mascot" 
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain bg-white/10 p-0.5 border border-white/20"
          />
          <span className="font-bold text-[#F5F5F0] text-xs sm:text-sm tracking-wide">
            AIESEC Assistant
          </span>
        </div>

        {/* Right: Navigation Links */}
        <nav className="flex items-center gap-4 sm:gap-6">
          <Link 
            to="/documents" 
            className="text-xs sm:text-sm font-semibold text-[#F5F5F0] hover:underline transition-all"
          >
            Documents
          </Link>
          <Link 
            to="/chat" 
            className="text-xs sm:text-sm font-semibold text-[#F5F5F0] hover:underline transition-all"
          >
            Open chatbot
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <HeroSection />

      {/* Footer */}
      <footer
        className="w-full mt-auto pt-10 px-6 flex flex-col items-center justify-center gap-2 select-none"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex flex-row items-center justify-center gap-2">
          <span className="text-sm sm:text-base text-[#8888B0] font-normal leading-none">
            Powered by
          </span>
          <img 
            src="/shareef-khandan-logo.png" 
            alt="Shareef Khandan Logo" 
            className="h-4 sm:h-5 w-auto object-contain"
          />
        </div>
        
        {/* Credit line */}
        <a
          href="https://www.linkedin.com/in/ali-kashif0"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] sm:text-[11px] text-[#8888B0] opacity-70 hover:opacity-100 hover:text-white hover:underline transition-all duration-150 font-normal leading-none"
        >
          Made by Ali Kashif - TL Education, Research & Reporting, AIESEC in NUST
        </a>
      </footer>
    </div>
  )
}
