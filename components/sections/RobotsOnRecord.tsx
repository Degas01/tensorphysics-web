"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import clsx from "clsx";
import { robots, type RobotRecord } from "@/lib/data/robots";
import { useApp } from "@/components/providers/AppProvider";

/** Footage plays only while on screen; with motion off it stays on its poster frame. */
function Clip({ r }: { r: RobotRecord }) {
  const { motionOff } = useApp();
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (motionOff) {
      v.pause();
      return;
    }
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.35 });
    io.observe(v);
    return () => io.disconnect();
  }, [motionOff]);
  return (
    <div className="relative aspect-[16/10] overflow-hidden border-b border-line bg-[#040507]">
      <video
        ref={ref}
        className="h-full w-full object-cover"
        src={`${r.clip}.mp4`}
        poster={`${r.clip}.jpg`}
        muted
        loop
        playsInline
        preload="none"
        aria-label={`${r.name}: the study's planned motion in MuJoCo`}
      />
      <span className="absolute left-3 top-3 border border-fg/40 bg-obsidian/80 px-1.5 py-px font-mono text-[10px] uppercase tracking-[0.12em] text-fg">simulation</span>
      <span className="absolute right-3 top-3 font-mono text-[10px] uppercase tracking-[0.12em] text-mute">
        {r.version} · {r.kind}
      </span>
    </div>
  );
}

function Card({ r, i }: { r: RobotRecord; i: number }) {
  const lab = "font-mono text-[10px] uppercase tracking-[0.12em] text-mute";
  return (
    <article className="flex flex-col border border-line bg-[#080a0d]">
      <Clip r={r} />
      <div className="flex flex-1 flex-col gap-4 p-5">
        <header className="flex flex-col gap-1">
          <h3 className="font-display text-xl font-semibold tracking-[-0.02em]">
            <span className="mr-2 font-mono text-[11px] text-dim">{String(i + 1).padStart(2, "0")}</span>
            {r.name}
          </h3>
          <span className="font-mono text-[10px] text-dim">
            model: {r.source} · {r.licence}
          </span>
        </header>
        <p className="text-[14px] leading-relaxed text-soft">{r.finding}</p>
        <dl className="grid grid-cols-3 border border-line">
          <div className="flex flex-col-reverse gap-1 border-r border-line p-3">
            <dt className={lab}>picks · {r.joints} joints</dt>
            <dd className="whitespace-nowrap font-mono text-base tabular-nums text-holds">{r.pickKg} kg</dd>
          </div>
          <div className="flex flex-col-reverse gap-1 border-r border-line p-3">
            <dt className={lab}>paper fit fails</dt>
            <dd className={clsx("whitespace-nowrap font-mono text-base tabular-nums", r.paperFails ? "text-breaks" : "text-holds")}>
              {r.paperFails} / {r.joints}
            </dd>
          </div>
          <div className="flex flex-col-reverse gap-1 p-3">
            <dt className={lab}>worst u · stacked</dt>
            <dd className="whitespace-nowrap font-mono text-base tabular-nums">{r.worstU.toFixed(2)}</dd>
          </div>
        </dl>
        <ul className="flex flex-col gap-1 font-mono text-[11px] text-mute">
          {r.tasks.map((t, k) => (
            <li key={t}>
              <span className="text-dim">Q{k + 1}</span> {t}
            </li>
          ))}
        </ul>
        <ul className="mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 font-mono text-[10px] uppercase tracking-[0.08em]">
          {r.checks.map((c) => (
            <li key={c.k} title={c.note} className={clsx(c.v === "pass" ? "text-holds" : c.v === "fail" ? "text-breaks" : "text-dim")}>
              {c.k} · {c.v}
              {c.note && c.v !== "pass" ? ` (${c.note})` : ""}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export function RobotsOnRecord() {
  return (
    <section id="robots" aria-labelledby="robots-h" className="mx-auto max-w-[1240px] scroll-mt-24 px-6 py-20 sm:px-8">
      <div className="grid gap-6 border-t border-line pt-6 lg:grid-cols-[220px_1fr]">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-dim">fig. 07 · on record</span>
        <div className="flex max-w-[820px] flex-col gap-3">
          <h2 id="robots-h" className="font-display text-[clamp(28px,3.4vw,44px)] font-semibold leading-[1.06] tracking-[-0.025em]">
            Every robot we have run, and what we found on each.
          </h2>
          <p className="text-[17px] leading-relaxed text-soft">
            Five public robot models, each through the same study: 48 actuators, 8 modelling errors stacked, pre-registered checks. The footage is
            each study&apos;s own planned motion in MuJoCo, not a hardware test.
          </p>
        </div>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {robots.map((r, i) => (
          <Card key={r.key} r={r} i={i} />
        ))}
        <aside className="flex flex-col justify-between gap-4 border border-dashed border-line p-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">06 · next</span>
          <p className="text-[15px] leading-relaxed text-soft">
            Your robot. Send an MJCF or URDF and we run the same study on it. Humanoids are next on our side.
          </p>
          <Link href="/actuatorfit#beta" className="inline-flex h-11 w-fit items-center bg-holds px-5 text-[14px] font-semibold text-obsidian hover:bg-[#5cf0ff]">
            Send your robot file
          </Link>
        </aside>
      </div>
    </section>
  );
}
