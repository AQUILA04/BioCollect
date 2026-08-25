import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export function CursorGlow() {
  const reduceMotion = useReducedMotion();
  const glowRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const desktop = window.matchMedia("(min-width: 768px)").matches;
    setEnabled(finePointer && desktop && !reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    if (!enabled) return;

    const glow = glowRef.current;
    if (!glow) return;

    let frame = 0;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 3;
    let currentX = targetX;
    let currentY = targetY;

    function onMove(event: MouseEvent) {
      targetX = event.clientX;
      targetY = event.clientY;
      if (!frame) {
        frame = window.requestAnimationFrame(tick);
      }
    }

    function tick() {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      glow!.style.transform = `translate3d(${currentX - 280}px, ${currentY - 280}px, 0)`;
      if (Math.abs(targetX - currentX) > 0.5 || Math.abs(targetY - currentY) > 0.5) {
        frame = window.requestAnimationFrame(tick);
      } else {
        frame = 0;
      }
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={glowRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-0 h-[560px] w-[560px] rounded-full opacity-60 mix-blend-screen will-change-transform"
      style={{
        background:
          "radial-gradient(circle, rgba(37,99,235,0.28) 0%, rgba(16,185,129,0.12) 38%, transparent 68%)",
      }}
    />
  );
}
