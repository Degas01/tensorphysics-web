"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Zap } from "lucide-react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import clsx from "clsx";
import { ScrambleText } from "./ScrambleText";
import { MagneticButton } from "./MagneticButton";
import type { ArmApi, HudRefs } from "./ArmScene";
import { useApp } from "@/components/providers/AppProvider";
import { InfoTip } from "@/components/ui/InfoTip";
import { Frame } from "@/components/ui/Frame";

// WebGL only on the client. The static poster fills the frame until the first frame is drawn.
const ArmScene = dynamic(() => import("./ArmScene"), { ssr: false });

/** Static silhouette of the arm in its ready pose. */
function Poster() {
  return (
    <svg viewBox="0 0 400 420" className="absolute inset-0 m-auto h-[74%] w-auto opacity-50" aria-hidden="true">
      <ellipse cx="200" cy="350" rx="150" ry="34" fill="none" stroke="#10343a" />
      <ellipse cx="200" cy="350" rx="90" ry="20" fill="none" stroke="#10343a" />
      <path d="M200 336 L200 262 L176 168 L232 122 L246 104" fill="none" stroke="#5b616b" strokeWidth="9" strokeLinecap="round" />
      {[
        [200, 300],
        [200, 262],
        [176, 168],
        [232, 122],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i < 2 ? 12 : 9} fill="#0a0c10" stroke="#00e5ff" strokeWidth="2" />
      ))}
    </svg>
  );
}

export function Hero() {
  const { motionOff, stressPulse } = useApp();
  const hud = useRef<HudRefs>({ rows: [], umax: null, verdict: null, tag: null, tagText: null });
  const api = useRef<ArmApi>(null);
  const [ready, setReady] = useState(false);
  const firstPulse = useRef(stressPulse);
  const section = useRef<HTMLElement>(null);

  // Scroll-linked parallax: the viewport drifts slower than the copy.
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end start"] });
  const yRaw = useTransform(scrollYProgress, [0, 1], [0, motionOff ? 0 : 90]);
  const copyRaw = useTransform(scrollYProgress, [0, 1], [0, motionOff ? 0 : -40]);
  const y = useSpring(yRaw, { stiffness: 300, damping: 30 });
  const copyY = useSpring(copyRaw, { stiffness: 300, damping: 30 });

  useEffect(() => {
    if (stressPulse === firstPulse.current) return;
    const t = window.setTimeout(() => {
      api.current?.shock(0, 1.6);
      api.current?.shock(6, 1.6);
    }, 350);
    return () => window.clearTimeout(t);
  }, [stressPulse]);

  return (
    <section id="top" ref={section} className="relative scroll-mt-24 mx-auto grid max-w-[1240px] items-center gap-12 px-6 pb-20 pt-10 sm:px-8 lg:grid-cols-[1fr_1.08fr] lg:pt-14">
      <motion.div style={{ y: copyY }} className="flex flex-col gap-7">
        <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-holds">
          <span className="h-px w-8 bg-holds" aria-hidden="true" />
          Simulation reliability engine
        </div>
        <ScrambleText
          className="font-display text-[clamp(48px,6.6vw,96px)] font-semibold leading-[0.95] tracking-[-0.04em]"
          segments={[{ text: "Make reality predictable." }]}
        />
        <p className="max-w-[540px] text-[17px] leading-relaxed text-soft sm:text-lg">
          TensorPhysics stress-tests your robot against the modelling errors you haven&apos;t measured yet, shows which actuators still
          hold, and tells your team what to bench-test first, before a prototype burns out.
        </p>
        <div className="flex flex-wrap gap-3">
          <MagneticButton href="/actuatorfit#beta">
            Test your URDF / MJCF
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </MagneticButton>
          <MagneticButton href="#sandbox" variant="ghost">
            Explore sandbox
          </MagneticButton>
        </div>
        <dl className="mt-2 grid max-w-[540px] grid-cols-3 border-t border-line pt-5">
          {[
            ["engine", "MuJoCo 3.10"],
            ["errors searched", "8 per joint"],
            ["tests", "pre-registered"],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-col-reverse gap-1">
              <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-dim">{k}</dt>
              <dd className="text-sm text-fg">{v}</dd>
            </div>
          ))}
        </dl>
      </motion.div>

      <motion.div style={{ y }}>
        <Frame label="7-dof arm · live" coord="u ≤ 1.00" ticks className="aspect-[4/4.3] w-full bg-[#06070a] sm:aspect-[4/3.5] lg:aspect-[4/4.3]">
          <div className="absolute inset-0 overflow-hidden">
          <div className={clsx("transition-opacity duration-700", ready ? "opacity-0" : "opacity-100")}>
            <Poster />
          </div>
          <div className={clsx("absolute inset-0 transition-opacity duration-700", ready ? "opacity-100" : "opacity-0")}>
            <ArmScene hud={hud} animate={!motionOff} apiRef={api} onReady={() => setReady(true)} />
          </div>

          {/* floating HUD tag on the worst joint, positioned by the scene every frame */}
          <div
            ref={(el) => {
              hud.current.tag = el;
            }}
            data-state="holds"
            className="group/tag pointer-events-none absolute left-0 top-0 z-10 will-change-transform"
          >
            <div className="flex -translate-y-[calc(100%+14px)] translate-x-3 items-center gap-2 whitespace-nowrap border border-white/20 bg-black px-2 py-1 font-mono text-[11px] text-fg group-data-[state=breaks]/tag:border-breaks group-data-[state=breaks]/tag:text-breaks group-data-[state=warn]/tag:border-warn group-data-[state=warn]/tag:text-warn">
              <span className="size-1.5 bg-current" aria-hidden="true" />
              <span
                ref={(el) => {
                  hud.current.tagText = el;
                }}
              >
                J2 · u = 0.00
              </span>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 pt-5 sm:p-5 sm:pt-6">
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-dim">max utilisation</span>
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
              className="border px-2 py-0.5 font-mono text-[11px] tracking-[0.14em] transition-colors data-[state=breaks]:border-breaks data-[state=breaks]:bg-breaks/10 data-[state=breaks]:text-breaks data-[state=holds]:border-holds/50 data-[state=holds]:text-holds"
            >
              HOLDS
            </span>
          </div>

          <ol className="pointer-events-none absolute left-4 top-1/2 hidden w-[120px] -translate-y-1/2 flex-col gap-1.5 sm:left-5 sm:flex" aria-label="Joint utilisation">
            {Array.from({ length: 7 }, (_, i) => (
              <li
                key={i}
                ref={(el) => {
                  hud.current.rows[i] = { ...hud.current.rows[i], row: el };
                }}
                data-state=""
                className="grid grid-cols-[22px_1fr_34px] items-center gap-2 font-mono text-[10px] text-dim transition-colors data-[state=breaks]:text-breaks data-[state=warn]:text-warn data-[state=worst]:text-fg"
              >
                <span>J{i + 1}</span>
                <span className="relative h-[3px] overflow-hidden bg-white/[0.07]">
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

          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 border-t border-line bg-[#06070a] px-4 py-3 sm:px-5">
            <span className="flex items-center gap-2 font-mono text-[11px] text-mute">
              <span className="hidden sm:inline">Drag to orbit · click a joint</span>
              <span className="sm:hidden">Tap a joint</span>
              <InfoTip label="About this view" align="start">
                Illustrative load model, not a live simulation. u per joint = lever arm of everything after it + joint speed + shock. A shock
                travels joint by joint along the chain, about 75 ms per joint, and fades. Housing colour is u: cyan holds, amber nears the limit,
                red is over it. Real numbers live in the sandbox below.
              </InfoTip>
            </span>
            <button
              type="button"
              onClick={() => api.current?.shock(6, 1.6)}
              className="inline-flex h-9 items-center gap-1.5 border border-breaks/60 px-3 font-mono text-[11px] text-breaks transition-colors hover:bg-breaks hover:text-obsidian"
            >
              <Zap className="size-3.5" aria-hidden="true" /> Inject adversarial shock
            </button>
          </div>
          </div>
        </Frame>
      </motion.div>
    </section>
  );
}
