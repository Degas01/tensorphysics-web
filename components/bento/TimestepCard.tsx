"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { GlowCard } from "@/components/ui/GlowCard";
import { CardHeader } from "./CardHeader";
import { useApp } from "@/components/providers/AppProvider";

type Integrator = "explicit" | "semi-implicit";

/**
 * Real physics, tiny: a pendulum integrated with the timestep you pick.
 * Explicit Euler gains energy every step and eventually blows up; semi-implicit
 * (symplectic) Euler keeps it bounded. Energy drift is measured, not faked.
 */
export function TimestepCard() {
  const { motionOff } = useApp();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [dtMs, setDtMs] = useState(16);
  const [integ, setInteg] = useState<Integrator>("explicit");
  const drift = useRef<HTMLSpanElement>(null);
  const verdict = useRef<HTMLSpanElement>(null);
  const params = useRef({ dt: 0.016, integ: "explicit" as Integrator });
  params.current.dt = dtMs / 1000;
  params.current.integ = integ;
  const reset = useRef(0);

  useEffect(() => {
    reset.current += 1;
  }, [dtMs, integ]);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const g = 9.81;
    const L = 1;
    let th = 1.2;
    let w = 0;
    let lastReset = -1;
    let acc = 0;
    let last = performance.now();
    let raf = 0;
    let visible = true;
    const E = (t: number, v: number) => 0.5 * L * L * v * v + g * L * (1 - Math.cos(t));
    let E0 = E(th, w);
    const trail: [number, number][] = [];

    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(cv);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) {
        last = now;
        return;
      }
      if (reset.current !== lastReset) {
        lastReset = reset.current;
        th = 1.2;
        w = 0;
        E0 = E(th, w);
        trail.length = 0;
        acc = 0;
      }
      const { dt, integ } = params.current;
      acc += Math.min((now - last) / 1000, 0.1) * (motionOff ? 0.25 : 1);
      last = now;
      let steps = 0;
      while (acc >= dt && steps < 40) {
        if (integ === "explicit") {
          const a = (-g / L) * Math.sin(th);
          th += w * dt;
          w += a * dt;
        } else {
          w += (-g / L) * Math.sin(th) * dt;
          th += w * dt;
        }
        acc -= dt;
        steps++;
      }
      if (!Number.isFinite(th) || Math.abs(w) > 1e3 || (E(th, w) - E0) / E0 > 3) {
        th = 1.2;
        w = 0;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = cv.clientWidth;
      const H = cv.clientHeight;
      if (cv.width !== W * dpr) {
        cv.width = W * dpr;
        cv.height = H * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const ox = W / 2;
      const oy = 22;
      const R = Math.min(H - 50, W / 2.3);
      const x = ox + R * Math.sin(th);
      const y = oy + R * Math.cos(th);
      const d = (E(th, w) - E0) / E0;
      const broken = Math.abs(d) > 0.2;
      const col = broken ? "#ff8a3d" : "#5cf2c1";

      trail.push([x, y]);
      if (trail.length > 60) trail.shift();
      ctx.lineWidth = 1.5;
      for (let i = 1; i < trail.length; i++) {
        ctx.strokeStyle = broken ? `rgba(255,138,61,${i / trail.length / 2})` : `rgba(92,242,193,${i / trail.length / 2})`;
        ctx.beginPath();
        ctx.moveTo(trail[i - 1][0], trail[i - 1][1]);
        ctx.lineTo(trail[i][0], trail[i][1]);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.moveTo(ox - 30, oy);
      ctx.lineTo(ox + 30, oy);
      ctx.stroke();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fill();

      if (drift.current) drift.current.textContent = `${d >= 0 ? "+" : ""}${(d * 100).toFixed(1)}%`;
      if (verdict.current) {
        verdict.current.textContent = broken ? "BREAKS" : "HOLDS";
        verdict.current.dataset.state = broken ? "breaks" : "holds";
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [motionOff]);

  return (
    <GlowCard className="h-full p-6">
      <div className="flex h-full flex-col gap-4">
        <CardHeader eyebrow="Engine · Simulate" title="Pick a timestep" href="/engine/simulate" hrefLabel="Open Simulate" />
        <p className="text-sm leading-relaxed text-soft">A live pendulum. Bigger steps and the wrong integrator make energy appear from nowhere.</p>
        <canvas ref={canvas} className="h-[190px] w-full" aria-label="Pendulum simulation" role="img" />
        <div className="flex items-center justify-between font-mono text-xs">
          <span className="text-mute">
            energy drift <span ref={drift} className="text-fg tabular-nums">0.0%</span>
          </span>
          <span
            ref={verdict}
            data-state="holds"
            className="rounded-full border px-2.5 py-0.5 data-[state=breaks]:border-breaks data-[state=breaks]:text-breaks data-[state=holds]:border-holds data-[state=holds]:text-holds"
          >
            HOLDS
          </span>
        </div>
        <label className="flex flex-col gap-1.5 text-sm text-soft">
          <span className="flex justify-between">
            <span>Timestep</span>
            <span className="font-mono text-fg">{dtMs} ms</span>
          </span>
          <input type="range" min={1} max={60} value={dtMs} onChange={(e) => setDtMs(Number(e.target.value))} />
        </label>
        <div role="radiogroup" aria-label="Integrator" className="mt-auto grid grid-cols-2 gap-1 rounded-xl border border-line p-1">
          {(["explicit", "semi-implicit"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={integ === k}
              onClick={() => setInteg(k)}
              className={clsx(
                "min-h-10 rounded-lg font-mono text-xs transition-colors",
                integ === k ? "bg-white/10 text-fg" : "text-mute hover:text-fg",
              )}
            >
              {k} Euler
            </button>
          ))}
        </div>
      </div>
    </GlowCard>
  );
}
