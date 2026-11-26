"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";

/**
 * Cinema viewfinder over a studio stage: corner crop brackets, a centre focus cross that pulses
 * when the rig locks onto a new target, and live lens / target / coordinate / state readouts.
 * The scene writes into `telemetry`; this overlay reads it ~12 times a second straight into the DOM.
 */

export interface Telemetry {
  focal: number;
  target: string;
  coords: [number, number, number];
  status: "idle" | "nominal" | "limit";
  statusText: string;
  /** change this (e.g. to Date.now()) to pulse the centre cross */
  lock: number;
}

export const newTelemetry = (): Telemetry => ({ focal: 35, target: "—", coords: [0, 0, 0], status: "idle", statusText: "STANDBY", lock: 0 });

const lensName = (mm: number) => `${Math.round(mm)}mm ${mm < 45 ? "WIDE" : mm >= 80 ? "MACRO" : "TELE"}`;
const sgn = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(3)}`;

export function OpticalHudOverlay({ telemetry, rig = "DOLLY-RIG 01", className }: { telemetry: React.RefObject<Telemetry>; rig?: string; className?: string }) {
  const lens = useRef<HTMLSpanElement>(null);
  const target = useRef<HTMLSpanElement>(null);
  const coords = useRef<HTMLSpanElement>(null);
  const state = useRef<HTMLSpanElement>(null);
  const cross = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    let lastLock = -1;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 80) return;
      last = now;
      const T = telemetry.current;
      if (!T) return;
      if (lens.current) lens.current.textContent = `LENS: ${lensName(T.focal)}`;
      if (target.current) target.current.textContent = `TARGET: ${T.target}`;
      if (coords.current) coords.current.textContent = `COORDS: X ${sgn(T.coords[0])} Y ${sgn(T.coords[1])} Z ${sgn(T.coords[2])}`;
      if (state.current) {
        state.current.textContent = `STATE: ${T.statusText}`;
        state.current.dataset.state = T.status;
      }
      if (cross.current && T.lock !== lastLock) {
        if (lastLock !== -1) {
          cross.current.classList.remove("hud-lock");
          void cross.current.offsetWidth;
          cross.current.classList.add("hud-lock");
        }
        lastLock = T.lock;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [telemetry]);

  const corner = "absolute h-3 w-3 border-fg/30";
  return (
    <div aria-hidden="true" className={clsx("pointer-events-none absolute inset-3 z-[5] font-mono text-[10px] uppercase tracking-[0.12em] text-mute sm:inset-5", className)}>
      <span className={clsx(corner, "left-0 top-0 border-l border-t")} />
      <span className={clsx(corner, "right-0 top-0 border-r border-t")} />
      <span className={clsx(corner, "bottom-0 left-0 border-b border-l")} />
      <span className={clsx(corner, "bottom-0 right-0 border-b border-r")} />

      <div ref={cross} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <span className="absolute left-1/2 top-1/2 h-px w-5 -translate-x-1/2 bg-fg/40" />
        <span className="absolute left-1/2 top-1/2 h-5 w-px -translate-y-1/2 bg-fg/40" />
      </div>

      <div className="absolute left-5 top-[68px] flex flex-col gap-1 sm:top-[76px]">
        <span className="text-fg/70">CAM // {rig}</span>
        <span ref={lens}>LENS: 35mm WIDE</span>
      </div>

      <div className="absolute bottom-5 right-5 hidden flex-col items-end gap-1 text-right sm:flex">
        <span ref={target}>TARGET: —</span>
        <span ref={coords}>COORDS: X +0.000 Y +0.000 Z +0.000</span>
        <span ref={state} className="data-[state=limit]:text-breaks data-[state=nominal]:text-fg">
          STATE: STANDBY
        </span>
      </div>
    </div>
  );
}
