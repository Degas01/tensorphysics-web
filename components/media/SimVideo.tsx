"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";
import { useApp } from "@/components/providers/AppProvider";

/**
 * Full-bleed background footage rendered from our own MuJoCo runs (scripts in the main repo).
 * It is always captioned as simulation. With motion off it shows the still poster and never plays.
 */
export function SimVideo({ src, poster, className }: { src: string; poster: string; className?: string }) {
  const { motionOff } = useApp();
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (motionOff) {
      v.pause();
      return;
    }
    v.play().catch(() => {});
  }, [motionOff]);

  return (
    <div aria-hidden="true" className={clsx("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <video
        ref={ref}
        className="h-full w-full object-cover"
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        autoPlay={!motionOff}
        preload="metadata"
      />
      {/* flat scrim for text contrast, then a straight fade into the page colour; no radial glow */}
      <div className="absolute inset-0 bg-obsidian/70" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-obsidian" />
    </div>
  );
}

/** One-line caption that says what the footage is. Sits on top of the scrim. */
export function SimCaption({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={clsx("font-mono text-[10px] uppercase tracking-[0.14em] text-mute", className)}>
      <span className="mr-2 border border-mute/60 px-1.5 py-px text-fg">simulation</span>
      {children}
    </p>
  );
}
