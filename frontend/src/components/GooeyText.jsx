import * as React from "react";
import { cn } from "@/lib/utils";

export function GooeyText({
  texts,
  morphTime = 1,
  cooldownTime = 0.25,
  className,
  textClassName
}) {
  const text1Ref = React.useRef(null);
  const text2Ref = React.useRef(null);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    setIsMobile(media.matches);
    const listener = (e) => setIsMobile(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  React.useEffect(() => {
    if (!texts || texts.length === 0) return;

    let textIndex = texts.length - 1;
    let time = new Date();
    let morph = 0;
    let cooldown = cooldownTime;

    const setMorph = (fraction) => {
      if (text1Ref.current && text2Ref.current) {
        const blurAmount = isMobile ? 0 : Math.min(8 / fraction - 8, 100);
        text2Ref.current.style.filter = blurAmount > 0 ? `blur(${blurAmount}px)` : "";
        text2Ref.current.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`;

        fraction = 1 - fraction;
        const blurAmount1 = isMobile ? 0 : Math.min(8 / fraction - 8, 100);
        text1Ref.current.style.filter = blurAmount1 > 0 ? `blur(${blurAmount1}px)` : "";
        text1Ref.current.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`;
      }
    };

    const doCooldown = () => {
      morph = 0;
      if (text1Ref.current && text2Ref.current) {
        text2Ref.current.style.filter = "";
        text2Ref.current.style.opacity = "100%";
        text1Ref.current.style.filter = "";
        text1Ref.current.style.opacity = "0%";
      }
    };

    const doMorph = () => {
      morph -= cooldown;
      cooldown = 0;
      let fraction = morph / morphTime;

      if (fraction > 1) {
        cooldown = cooldownTime;
        fraction = 1;
      }

      setMorph(fraction);
    };

    let animationFrameId;

    function animate() {
      animationFrameId = requestAnimationFrame(animate);
      const newTime = new Date();
      const shouldIncrementIndex = cooldown > 0;
      const dt = (newTime.getTime() - time.getTime()) / 1000;
      time = newTime;

      cooldown -= dt;

      if (cooldown <= 0) {
        if (shouldIncrementIndex) {
          textIndex = (textIndex + 1) % texts.length;
          if (text1Ref.current && text2Ref.current) {
            text1Ref.current.textContent = texts[textIndex % texts.length];
            text2Ref.current.textContent = texts[(textIndex + 1) % texts.length];
          }
        }
        doMorph();
      } else {
        doCooldown();
      }
    }

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [texts, morphTime, cooldownTime, isMobile]);

  return (
    <div className={cn("relative", className)}>
      <svg className="absolute h-0 w-0" aria-hidden="true" focusable="false">
        <defs>
          <filter id="threshold">
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 255 -140"
            />
          </filter>
        </defs>
      </svg>

      <div
        className="flex items-center justify-center"
        style={{ filter: isMobile ? "none" : "url(#threshold)" }}
      >
        <span
          ref={text1Ref}
          className={cn(
            "absolute inline-block select-none text-center",
            "text-foreground",
            textClassName
          )}
        />
        <span
          ref={text2Ref}
          className={cn(
            "absolute inline-block select-none text-center",
            "text-foreground",
            textClassName
          )}
        />
      </div>
    </div>
  );
}
