import * as React from "react";
import { GooeyText } from "./GooeyText";

// Edit this array to change the rotating words in the hero
const ROTATING_WORDS = ["answered", "simplified", "sorted", "instant"];

export default function HeroSection() {
  return (
    <section 
      className="w-full flex-1 flex flex-col items-center justify-center text-center select-none font-space px-6 py-12"
      style={{ backgroundColor: "#FCFBF4" }}
    >
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center gap-6">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight flex flex-col sm:flex-row items-center justify-center gap-y-2 sm:gap-x-4">
          <span className="text-[#1A041C]">Everything AIESEC,</span>
          <GooeyText
            texts={ROTATING_WORDS}
            morphTime={1.2}
            cooldownTime={0.4}
            className="h-14 sm:h-16 md:h-20 w-64 sm:w-72 md:w-80 flex items-center justify-center"
            textClassName="text-[#C1FF72] text-4xl sm:text-5xl md:text-6xl font-bold font-space"
          />
        </h1>

        <p className="text-sm sm:text-base text-[#6B7280] font-normal max-w-xl mx-auto leading-relaxed">
          Built to answer your AIESEC questions on the spot. No more scrolling through docs or waiting on a reply.
        </p>
        
        {/* TODO: tagline + CTA button, added in a later pass */}
      </div>
    </section>
  );
}
