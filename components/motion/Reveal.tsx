"use client";

import { motion } from "framer-motion";
import { useApp } from "@/components/providers/AppProvider";

/**
 * Mechanical reveal: a left-to-right clip-path wipe that lands on a spring detent, with a thin cyan
 * scan edge riding the wipe. Replaces generic fade-ins. Static when motion is off.
 */
export function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { motionOff } = useApp();
  if (motionOff) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      style={{ position: "relative" }}
      initial={{ clipPath: "inset(0 100% 0 0)" }}
      whileInView={{ clipPath: "inset(0 0% 0 0)" }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ type: "spring", stiffness: 90, damping: 17, mass: 0.9, delay }}
    >
      {children}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 w-px bg-holds"
        initial={{ left: "0%", opacity: 1 }}
        whileInView={{ left: "100%", opacity: 0 }}
        viewport={{ once: true, margin: "0px 0px -12% 0px" }}
        transition={{ left: { type: "spring", stiffness: 90, damping: 17, mass: 0.9, delay }, opacity: { delay: delay + 0.55, duration: 0.3 } }}
      />
    </motion.div>
  );
}
