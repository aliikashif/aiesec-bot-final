import * as React from "react";
import { cn } from "@/lib/utils";

export function TypewriterText({
  texts,
  typingSpeed = 80,
  deletingSpeed = 50,
  cooldownTime = 1500,
  className,
  textClassName,
}) {
  const [currentText, setCurrentText] = React.useState("");
  const [wordIndex, setWordIndex] = React.useState(0);
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    if (!texts || texts.length === 0) return;

    let timer;
    const fullText = texts[wordIndex % texts.length];

    if (isDeleting) {
      // Deleting character by character
      timer = setTimeout(() => {
        setCurrentText(fullText.substring(0, currentText.length - 1));
      }, deletingSpeed);
    } else {
      // Typing character by character
      timer = setTimeout(() => {
        setCurrentText(fullText.substring(0, currentText.length + 1));
      }, typingSpeed);
    }

    // Handle transition states
    if (!isDeleting && currentText === fullText) {
      timer = setTimeout(() => setIsDeleting(true), cooldownTime);
    } else if (isDeleting && currentText === "") {
      setIsDeleting(false);
      setWordIndex((prev) => prev + 1);
    }

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, wordIndex, texts, typingSpeed, deletingSpeed, cooldownTime]);

  return (
    <div className={cn("inline-flex items-center justify-center select-none", className)}>
      <span className={textClassName}>{currentText}</span>
      <span 
        className="inline-block ml-1 w-[3px] h-[0.8em]"
        style={{
          animation: "blink-caret 0.75s step-end infinite"
        }}
      />
      <style>{`
        @keyframes blink-caret {
          from, to { background-color: transparent }
          50% { background-color: #C1FF72 }
        }
      `}</style>
    </div>
  );
}
