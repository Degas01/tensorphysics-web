"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from "framer-motion";
import clsx from "clsx";
import { BREAK_AT } from "@/lib/scrollStress";

const SECTIONS = [
  { id: "top", label: "HERO" },
  { id: "actuatorfit", label: "ACTUATORFIT" },
  { id: "physicsfuzz", label: "PHYSICSFUZZ" },
  { id: "gapcheck", label: "GAPCHECK" },
  { id: "sandbox", label: "SANDBOX" },
  { id: "architecture", label: "ENGINE" },
  { id: "evidence", label: "EVIDENCE" },
];

const MINOR = 50; // minor ticks along the ruler

/**
 * CAD-style depth ruler on the right edge of the home page: section marks, a spring-damped cursor,
 * live depth and the illustrative "error stack" readout. Wide screens only, so it never covers content.
 */
export function TelemetryRail() {
  const pathname = usePathname();
  const { scrollYProgress } = useScroll();
  const cursor = useSpring(scrollYProgress, { stiffness: 220, damping: 32, mass: 0.6 });
  const top = useTransform(cursor, (v) => `${v * 100}%`);
  const [marks, setMarks] = useState<number[]>([]);
  const [active, setActive] = useState(0);
  const depth = useRef<HTMLSpanElement>(null);
  const err = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (pathname !== "/") return;
    const measure = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setMarks(
        SECTIONS.map((s) => {
          const el = document.getElementById(s.id);
          if (!el || max <= 0) return 0;
          return Math.min(1, Math.max(0, (el.getBoundingClientRect().top + window.scrollY - 96) / max));
        }),
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, [pathname]);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    let a = 0;
    marks.forEach((m, i) => {
      if (v >= m - 0.002) a = i;
    });
    if (a !== active) setActive(a);
    if (depth.current) depth.current.textContent = (v * 100).toFixed(1).padStart(5, "0");
    if (err.current) {
      err.current.textContent = `${Math.round(v * 100).toString().padStart(2, "0")}%`;
      err.current.dataset.state = v >= BREAK_AT ? "breaks" : "holds";
    }
  });

  if (pathname !== "/") return null;

  return (
    <aside
      aria-label="Page position"
      className="pointer-events-none fixed right-3 top-1/2 z-40 hidden h-[58vh] -translate-y-1/2 select-none font-mono text-[9px] uppercase tracking-[0.14em] text-dim min-[1360px]:flex"
    >
      {/* active section, vertical */}
      <div className="relative mr-2 w-3">
        <motion.span
          key={active}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="absolute left-0 whitespace-nowrap text-holds [writing-mode:vertical-rl]"
          style={{ top: `${(marks[active] ?? 0) * 100}%` }}
        >
          SEC {String(active).padStart(2, "0")} {"//"} {SECTIONS[active].label}
        </motion.span>
      </div>

      {/* ruler */}
      <div className="relative w-4">
        <div className="absolute inset-y-0 right-0 w-px bg-white/15" />
        {Array.from({ length: MINOR + 1 }, (_, i) => (
          <span
            key={i}
            className={clsx("absolute right-0 h-px bg-white/20", i % 5 === 0 ? "w-2" : "w-1")}
            style={{ top: `${(i / MINOR) * 100}%` }}
          />
        ))}
        {/* break line of the illustrative error stack */}
        <span className="absolute -left-1 right-0 h-px bg-breaks/70" style={{ top: `${BREAK_AT * 100}%` }} />
        {marks.map((m, i) => (
          <a
            key={SECTIONS[i].id}
            href={`#${SECTIONS[i].id}`}
            aria-label={`Go to ${SECTIONS[i].label.toLowerCase()}`}
            className="pointer-events-auto absolute right-0 flex h-3 w-4 -translate-y-1/2 items-center justify-end"
            style={{ top: `${m * 100}%` }}
          >
            <span className={clsx("h-[2px] transition-all", i === active ? "w-4 bg-holds" : "w-3 bg-white/45")} />
          </a>
        ))}
        <motion.span className="absolute -left-1.5 right-0 h-[2px] -translate-y-1/2 bg-fg" style={{ top }} />
      </div>

      {/* readouts */}
      <div className="absolute -bottom-12 right-0 flex flex-col items-end gap-0.5 whitespace-nowrap">
        <span>
          Z <span ref={depth} className="text-fg tabular-nums">000.0</span>
        </span>
        <span>
          ERR{" "}
          <span ref={err} data-state="holds" className="tabular-nums text-holds data-[state=breaks]:text-breaks">
            00%
          </span>
        </span>
      </div>
    </aside>
  );
}
