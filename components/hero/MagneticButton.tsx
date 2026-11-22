"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import clsx from "clsx";
import { useApp } from "@/components/providers/AppProvider";

const MotionLink = motion.create(Link);

/** CTA that leans toward the cursor. Transform-only, so it stays on the compositor. */
export function MagneticButton({
  href,
  children,
  variant = "primary",
  strength = 0.35,
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost";
  strength?: number;
  className?: string;
}) {
  const { motionOff } = useApp();
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 260, damping: 18, mass: 0.4 });

  const onMove = (e: React.PointerEvent) => {
    if (motionOff || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <MotionLink
      ref={ref}
      href={href}
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={{ x: sx, y: sy }}
      className={clsx(
        "group relative inline-flex h-11 items-center gap-2 rounded-[2px] px-5 text-[15px] font-semibold transition-colors will-change-transform",
        variant === "primary"
          ? "bg-holds text-obsidian hover:bg-[#5cf0ff]"
          : "glass text-fg hover:border-white/25",
        className,
      )}
    >
      {children}
    </MotionLink>
  );
}
