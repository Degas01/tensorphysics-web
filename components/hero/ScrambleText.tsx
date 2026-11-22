"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/providers/AppProvider";

const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=<>/\\";

export interface Segment {
  text: string;
  className?: string;
}

/**
 * Decoding headline. The server renders the final text (no hydration mismatch, readable
 * without JS); after mount, characters resolve left to right from random glyphs.
 */
export function ScrambleText({
  segments,
  className,
  duration = 1300,
  as: Tag = "h1",
}: {
  segments: Segment[];
  className?: string;
  duration?: number;
  as?: "h1" | "h2" | "p" | "span";
}) {
  const { motionOff } = useApp();
  const full = segments.map((s) => s.text).join("");
  const [shown, setShown] = useState<string>(full);
  const raf = useRef<number>(0);

  useEffect(() => {
    if (motionOff) {
      setShown(full);
      return;
    }
    const start = performance.now();
    let lastSwap = 0;
    let rnd = full.split("").map(() => GLYPHS[(Math.random() * GLYPHS.length) | 0]);
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const revealed = Math.floor(p * full.length);
      if (now - lastSwap > 45) {
        rnd = rnd.map(() => GLYPHS[(Math.random() * GLYPHS.length) | 0]);
        lastSwap = now;
      }
      let out = "";
      for (let i = 0; i < full.length; i++) {
        const c = full[i];
        out += i < revealed || c === " " || c === "." ? c : rnd[i];
      }
      setShown(out);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [full, duration, motionOff]);

  // Re-split the animated string back into the styled segments
  let offset = 0;
  return (
    <Tag className={className} aria-label={full}>
      <span aria-hidden="true">
        {segments.map((s, i) => {
          const part = shown.slice(offset, offset + s.text.length);
          offset += s.text.length;
          return (
            <span key={i} className={s.className}>
              {part}
            </span>
          );
        })}
      </span>
    </Tag>
  );
}
