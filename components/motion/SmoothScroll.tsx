"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { useApp } from "@/components/providers/AppProvider";

/**
 * Inertial page scroll (Lenis). Off when motion is off (system setting or command palette),
 * so the page falls back to native scrolling. Anchor links (#sandbox etc.) glide instead of jumping.
 * Scroll boxes inside the page opt out with the attribute data-lenis-prevent.
 */
export function SmoothScroll() {
  const { motionOff } = useApp();

  useEffect(() => {
    if (motionOff) return;
    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.085,
      wheelMultiplier: 0.95,
      anchors: { offset: -88 },
    });
    return () => {
      lenis.destroy();
    };
  }, [motionOff]);

  return null;
}
