"use client";

import { useRef } from "react";
import clsx from "clsx";

/**
 * Glass card with a cursor-following light. The light is a CSS radial gradient driven by
 * two custom properties, so moving the mouse never re-renders React.
 */
export function GlowCard({
  children,
  className,
  glow = "rgba(0,229,255,0.14)",
}: {
  children: React.ReactNode;
  className?: string;
  glow?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      className={clsx("glass group/glow relative overflow-hidden rounded-[2px]", className)}
      style={{ ["--glow" as string]: glow }}
    >
      <div className="relative h-full">{children}</div>
    </div>
  );
}
