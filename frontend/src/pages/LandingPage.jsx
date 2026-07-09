import * as React from "react"
import { Link } from "react-router-dom"
import HeroSection from "@/components/HeroSection"

export default function LandingPage() {
  return (
    <div className="w-full min-h-screen bg-[#FCFBF4] flex flex-col font-space">
      {/* Minimal Top Bar */}
      <header className="w-full px-6 py-4 flex items-center justify-between select-none">
        {/* Left: Mascot Icon + Wordmark */}
        <div className="flex items-center gap-2.5">
          <img 
            src="/mascot-avatar-256.png" 
            alt="Mascot" 
            className="w-8 h-8 rounded-lg object-contain"
          />
          <span className="font-bold text-[#1A041C] text-sm tracking-wide">
            AIESEC F&L Assistant
          </span>
        </div>

        {/* Right: Navigation Links */}
        <nav className="flex items-center gap-6">
          <Link 
            to="/documents" 
            className="text-sm font-semibold text-[#1A041C] hover:underline transition-all"
          >
            Documents
          </Link>
          <Link 
            to="/chat" 
            className="text-sm font-semibold text-[#1A041C] hover:underline transition-all"
          >
            Open chatbot
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <HeroSection />
    </div>
  )
}
