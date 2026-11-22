"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";

/**
 * ⓘ popover for method notes. Opens on hover, focus or tap; closes on Esc, blur or outside tap.
 * Content is plain text in mono so the cards themselves stay clean.
 */
export function InfoTip({
  children,
  label = "About this",
  side = "top",
  align = "center",
  className,
}: {
  children: React.ReactNode;
  label?: string;
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrap = useRef<HTMLSpanElement>(null);
  const closeTimer = useRef<number>(0);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const show = () => {
    window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hide = () => {
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  };

  return (
    <span ref={wrap} className={clsx("relative inline-flex align-middle", className)} onPointerEnter={show} onPointerLeave={hide}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onFocus={show}
        onBlur={hide}
        className="inline-flex size-5 items-center justify-center rounded-full border border-white/20 font-mono text-[10px] leading-none text-mute transition-colors hover:border-white/40 hover:text-fg"
      >
        i
      </button>
      <AnimatePresence>
        {open && (
          <motion.span
            id={id}
            role="tooltip"
            initial={{ opacity: 0, y: side === "top" ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: side === "top" ? 4 : -4 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className={clsx(
              "absolute z-50 w-[280px] rounded-lg border border-white/12 bg-[#0c0e13] p-3 text-left font-mono text-[11px] font-normal normal-case leading-[1.55] tracking-normal text-soft shadow-[0_16px_48px_rgba(0,0,0,0.55)]",
              side === "top" ? "bottom-[calc(100%+8px)]" : "top-[calc(100%+8px)]",
              align === "center" && "left-1/2 -translate-x-1/2",
              align === "start" && "left-0",
              align === "end" && "right-0",
            )}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
