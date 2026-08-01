import * as React from "react"
import { useRef } from "react"
import { Link } from "react-router-dom"
import { motion, useMotionValue, useTransform, useVelocity, animate } from "framer-motion"

const MASCOT_W = 110 // px — rendered width

export default function AboutPage() {
  // Ref for the full-page container — used as dragConstraints so the
  // mascot can never be dragged fully outside the viewport
  const constraintsRef = useRef(null)

  // Track x velocity so we can derive tilt rotation while dragging
  const dragX  = useMotionValue(0)
  const dragY  = useMotionValue(0)
  const velX   = useVelocity(dragX)
  // Map horizontal velocity (±400 px/s → ±38 deg) — narrower range so normal
  // drag speeds produce clearly visible tilt; capped so it never spins wildly
  const rotate = useTransform(velX, [-400, 0, 400], [-38, 0, 38], { clamp: true })

  const handleDragEnd = () => {
    // 1. Animate Y back to 0 (= bottom of viewport) with a weighted gravity spring
    //    Low stiffness = visible acceleration on the way down; moderate damping +
    //    a slight negative overshoot gives the soft landing bounce feel.
    animate(dragY, 0, {
      type: "spring",
      stiffness: 55,
      damping: 9,
      mass: 1.6,
    })
    // 2. Level the rotation back to upright in sync with the fall
    animate(rotate, 0, { type: "spring", stiffness: 100, damping: 16 })
  }

  return (
    <div ref={constraintsRef} className="w-full min-h-[100dvh] bg-[#0F0464] flex flex-col font-space">
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

      {/* ── Decorative draggable mascot (Framer Motion) ── */}
      <motion.div
        role="img"
        aria-label="Drag me around"
        drag
        dragConstraints={constraintsRef}
        dragElastic={0.08}
        onDragEnd={handleDragEnd}
        // Stop FM's built-in inertia immediately on release so our gravity
        // spring (in onDragEnd) takes over cleanly without competition
        dragTransition={{ power: 0, timeConstant: 0 }}
        style={{
          x: dragX,
          y: dragY,
          rotate,
          position: "fixed",
          bottom: 0,
          right: 24,
          width: MASCOT_W,
          lineHeight: 0,
          zIndex: 50,
          touchAction: "none",
          userSelect: "none",
          cursor: "grab",
        }}
        whileDrag={{ cursor: "grabbing" }}
      >
        <img
          src="/mascot-avatar-512.png"
          alt=""
          draggable={false}
          style={{ width: "100%", height: "auto", display: "block",
                   userSelect: "none", pointerEvents: "none" }}
        />
      </motion.div>
    </div>
  )
}
