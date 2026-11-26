"use client";

import dynamic from "next/dynamic";
import { useApp } from "@/components/providers/AppProvider";

// WebGL only on the client; the CSS grid underneath is the fallback and the first paint.
const StressField = dynamic(() => import("./StressField"), { ssr: false });

/** Fixed backdrop: faint engineering grid + the stress field (decorative, see StressField). */
export function Background() {
  const { motionOff } = useApp();
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="grid-bg absolute inset-0 [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black_20%,transparent_70%)]" />
      <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent_0%,black_28%,black_100%)]">
        <StressField animate={!motionOff} />
      </div>
      {/* keeps text readable over the field */}
      <div className="absolute inset-0 bg-obsidian/45" />
      <div className="absolute inset-x-0 top-0 h-px bg-white/[0.06]" />
    </div>
  );
}
