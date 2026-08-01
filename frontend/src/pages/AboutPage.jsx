import * as React from "react"
import { Link } from "react-router-dom"

export default function AboutPage() {
  return (
    <div className="w-full min-h-[100dvh] bg-[#0F0464] flex flex-col font-space">
      {/* Top Bar — identical to LandingPage */}
      <header className="w-full px-4 sm:px-6 py-4 flex items-center justify-between select-none">
        {/* Left: Mascot Icon + Wordmark */}
        <Link to="/" className="flex items-center gap-2 sm:gap-2.5">
          <img
            src="/mascot-avatar-256.png"
            alt="Mascot"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain bg-white/10 p-0.5 border border-white/20"
          />
          <span className="font-bold text-[#F5F5F0] text-xs sm:text-sm tracking-wide">
            AIESEC Assistant
          </span>
        </Link>

        {/* Right: Navigation Links */}
        <nav className="flex items-center gap-4 sm:gap-6">
          <Link
            to="/about"
            className="text-xs sm:text-sm font-semibold text-[#F5F5F0] hover:underline transition-all"
            aria-current="page"
          >
            About
          </Link>
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

      {/* About Content */}
      <main className="w-full flex-1 flex flex-col items-center justify-center px-6 py-12 select-none">
        <div className="max-w-xl mx-auto flex flex-col gap-6">
          <p className="text-sm sm:text-base text-[#B8B8D9] font-normal leading-relaxed">
            I built this because I was tired of watching people (myself included) dig through a 77-page compendium, APIP, and other long documents, or ping five different people across portfolios just to get one document. So this solves two problems: the Docs page gives you direct access to every important AIESEC document in one place, and the chatbot lets you just ask, covering Finance &amp; Legalities, Business Development, Exchange, and MXP, with answers pulled straight from whatever's been fed into it so far, plus a confidence level and source so you're never just taking its word for it.
          </p>
          <p className="text-sm sm:text-base text-[#B8B8D9] font-normal leading-relaxed">
            AI can make mistakes, so always cross check anything financial, legal, or disciplinary with your respective LCVP before acting on it. If there's a document you think should be added to the Docs page and fed into the bot, or you've got a question, bug, or idea, send it to{" "}
            <a
              href="mailto:ali.kashif@aiesec.net"
              className="underline hover:text-[#F5F5F0] transition-colors duration-150"
            >
              ali.kashif@aiesec.net
            </a>
            , I'll be happy to help.
          </p>
        </div>
      </main>

      {/* Footer — identical to LandingPage */}
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
          Made by Ali Kashif - TL Education, Research &amp; Reporting, AIESEC in NUST
        </a>
      </footer>
    </div>
  )
}
