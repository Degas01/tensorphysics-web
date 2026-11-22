"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Zap } from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { ScrambleText } from "./ScrambleText";
import { MagneticButton } from "./MagneticButton";
import type { ArmApi, HudRefs } from "./ArmScene";
import { useApp } from "@/components/providers/AppProvider";
import { InfoTip } from "@/components/ui/InfoTip";

// WebGL only on the client (no hydration mismatch). The static poster below fills the
// frame until the first frame is drawn, so the hero never shows an empty box.
const ArmScene = dynamic(() => import("./ArmScene"), { ssr: false });

const fade = (d: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay: d, ease: [0.22, 1, 0.36, 1] as const },
});

/** Static silhouette of the arm in its ready pose; same palette as the 3D scene. */
function Poster() {
  return (
    <svg viewBox="0 0 400 420" className="absolute inset-0 m-auto h-[78%] w-auto opacity-60" aria-hidden="true">
      <ellipse cx="200" cy="350" rx="150" ry="34" fill="none" stroke="#18322c" />
      <ellipse cx="200" cy="350" rx="90" ry="20" fill="none" stroke="#18322c" />
      <ellipse cx="200" cy="338" rx="44" ry="10" fill="#0a0d12" stroke="#5cf2c1" strokeOpacity=".5" />
      <path d="M200 336 L200 262 L176 168 L232 122 L246 104" fill="none" stroke="#5cf2c1" strokeOpacity=".55" strokeWidth="2" />
      {[
        [200, 300],
        [200, 262],
        [176, 168],
        [232, 122],
        [246, 104],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i < 2 ? 11 : 8} fill="none" stroke="#5cf2c1" strokeWidth="2.5" />
      ))}
      <rect x="241" y="86" width="12" height="10" fill="#ff8a3d" />
    </svg>
  );
}

export function Hero() {
  const { motionOff, stressPulse } = useApp();
  const hud = useRef<HudRefs>({ rows: [], umax: null, verdict: null, tag: null, tagText: null });
  const api = useRef<ArmApi>(null);
  const [ready, setReady] = useState(false);
  const firstPulse = useRef(stressPulse);

  // Command palette: "Stress-test the arm" hits both ends of the chain hard
  useEffect(() => {
    if (stressPulse === firstPulse.current) return;
    const t = window.setTimeout(() => {
      api.current?.shock(0, 1.6);
      api.current?.shock(6, 1.6);
    }, 350);
    return () => window.clearTimeout(t);
  }, [stressPulse]);

  return (
    <section className="relative mx-auto grid max-w-[1240px] items-center gap-12 px-6 pb-20 pt-12 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:pt-16">
      <div className="flex flex-col gap-7">
        <motion.div {...fade(0)} className="eyebrow flex items-center gap-2.5 !text-holds">
          <span className="size-1.5 rounded-full bg-holds" aria-hidden="true" />
          Simulation reliability engine
        </motion.div>
        <ScrambleText
          className="font-display text-[clamp(42px,5.4vw,74px)] font-semibold leading-[0.98] tracking-[-0.035em]"
          segments={[{ text: "Know where your simulation " }, { text: "breaks.", className: "text-breaks" }]}
        />
        <motion.p {...fade(0.12)} className="max-w-[540px] text-[17px] leading-relaxed text-soft sm:text-lg">
          TensorPhysics searches for the places a physics simulation is wrong, measures how wrong it can be before your
          design fails, and tells you what to test on the bench first.
        </motion.p>
        <motion.div {...fade(0.2)} className="flex flex-wrap gap-3">
          <MagneticButton href="/actuatorfit">
            Size actuators with Gap Margin
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </MagneticButton>
          <MagneticButton href="#sandbox" variant="ghost">
            Try the sandbox
          </MagneticButton>
        </motion.div>
        <motion.dl {...fade(0.3)} className="mt-2 grid max-w-[540px] grid-cols-3 border-t border-line pt-5">
          {[
            ["Engine", "MuJoCo 3.10"],
            ["Errors searched", "8 per joint"],
            ["Tests", "pre-registered"],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-col-reverse gap-1">
              <dt className="font-mono text-[11px] text-dim">{k}</dt>
              <dd className="text-sm text-fg">{v}</dd>
            </div>
          ))}
        </motion.dl>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative aspect-[4/4.3] w-full overflow-hidden rounded-2xl border border-line bg-[#07080b] sm:aspect-[4/3.5] lg:aspect-[4/4.3]"
      >
        <div className={clsx("transition-opacity duration-700", ready ? "opacity-0" : "opacity-100")}>
          <Poster />
        </div>
        <div className={clsx("absolute inset-0 transition-opacity duration-700", ready ? "opacity-100" : "opacity-0")}>
          <ArmScene hud={hud} animate={!motionOff} apiRef={api} onReady={() => setReady(true)} />
        </div>

        {/* worst-joint tag, positioned by the scene every frame */}
        <div
          ref={(el) => {
            hud.current.tag = el;
          }}
          data-state="holds"
          className="group/tag pointer-events-none absolute left-0 top-0 z-10 will-change-transform"
        >
          <div className="-translate-y-[calc(100%+14px)] translate-x-3 whitespace-nowrap rounded border border-white/15 bg-black/70 px-2 py-1 font-mono text-[11px] text-fg backdrop-blur-sm group-data-[state=breaks]/tag:border-breaks group-data-[state=breaks]/tag:text-breaks group-data-[state=warn]/tag:border-warn group-data-[state=warn]/tag:text-warn">
            <span
              ref={(el) => {
                hud.current.tagText = el;
              }}
            >
              J2 · u 0.00
            </span>
          </div>
        </div>

        {/* top bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 sm:p-5">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[11px] text-dim">max utilisation</span>
            <span className="font-display text-[32px] font-semibold leading-none tabular-nums">
              <span
                ref={(el) => {
                  hud.current.umax = el;
                }}
              >
                0.00
              </span>
            </span>
          </div>
          <span
            ref={(el) => {
              hud.current.verdict = el;
            }}
            data-state="holds"
            className="rounded border px-2 py-0.5 font-mono text-[11px] tracking-[0.14em] transition-colors data-[state=breaks]:border-breaks data-[state=breaks]:bg-breaks/10 data-[state=breaks]:text-breaks data-[state=holds]:border-holds/50 data-[state=holds]:text-holds"
          >
            HOLDS
          </span>
        </div>

        {/* per-joint telemetry */}
        <ol className="pointer-events-none absolute left-4 top-1/2 hidden w-[120px] -translate-y-1/2 flex-col gap-1.5 sm:left-5 sm:flex" aria-label="Joint utilisation">
          {Array.from({ length: 7 }, (_, i) => (
            <li
              key={i}
              ref={(el) => {
                hud.current.rows[i] = { ...hud.current.rows[i], row: el };
              }}
              data-state=""
              className="group/row grid grid-cols-[22px_1fr_34px] items-center gap-2 font-mono text-[10px] text-dim transition-colors data-[state=breaks]:text-breaks data-[state=warn]:text-warn data-[state=worst]:text-fg"
            >
              <span>J{i + 1}</span>
              <span className="relative h-[3px] overflow-hidden rounded-full bg-white/[0.07]">
                <span
                  ref={(el) => {
                    hud.current.rows[i] = { ...hud.current.rows[i], bar: el };
                  }}
                  className="absolute inset-0 origin-left bg-holds"
                  style={{ transform: "scaleX(0)" }}
                />
                <span className="absolute inset-y-0 left-[76.9%] w-px bg-white/40" aria-hidden="true" />
              </span>
              <span
                className="text-right tabular-nums"
                ref={(el) => {
                  hud.current.rows[i] = { ...hud.current.rows[i], val: el };
                }}
              >
                0.00
              </span>
            </li>
          ))}
        </ol>

        {/* bottom bar */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 border-t border-line bg-black/30 px-4 py-3 backdrop-blur-sm sm:px-5">
          <span className="flex items-center gap-2 font-mono text-[11px] text-mute">
            Click any joint to shock it
            <InfoTip label="About this view" align="start">
              Illustrative load model, not a live simulation. u per joint = lever arm of everything after it + joint speed + shock.
              A shock travels joint by joint along the chain, about 75 ms per joint, and fades. The worst joint is tagged; above 1.00 it
              breaks. Real numbers live in the sandbox below.
            </InfoTip>
          </span>
          <button
            type="button"
            onClick={() => api.current?.shock(6, 1.6)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-breaks/50 px-3 font-mono text-[11px] text-breaks transition-colors hover:bg-breaks hover:text-obsidian"
          >
            <Zap className="size-3.5" aria-hidden="true" /> Inject shock
          </button>
        </div>
      </motion.div>
    </section>
  );
}
