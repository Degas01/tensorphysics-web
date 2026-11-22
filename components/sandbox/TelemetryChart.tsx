"use client";

import { useEffect, useId, useRef } from "react";

/**
 * Rolling telemetry of utilisation u against the 1.00 limit.
 * The plotted value eases toward the target and is sampled at ~30 Hz into a ring buffer.
 * Paths are written straight to the DOM, so dragging sliders never re-renders the chart.
 * Below the limit the trace is green; the part above it is drawn orange.
 */
const W = 520;
const H = 132;
const PAD_T = 10;
const PAD_B = 18;
const U_MAX = 1.5;
const POINTS = 150;

const yOf = (u: number) => PAD_T + (1 - Math.min(Math.max(u, 0), U_MAX) / U_MAX) * (H - PAD_T - PAD_B);

export function TelemetryChart({ target }: { target: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const lineLo = useRef<SVGPathElement>(null);
  const lineHi = useRef<SVGPathElement>(null);
  const areaLo = useRef<SVGPathElement>(null);
  const areaHi = useRef<SVGPathElement>(null);
  const dot = useRef<SVGCircleElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const tgt = useRef(target);
  tgt.current = target;

  useEffect(() => {
    const buf = new Array(POINTS).fill(tgt.current);
    let shown = tgt.current;
    let raf = 0;
    let last = 0;
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    if (svg.current) io.observe(svg.current);

    const draw = () => {
      let d = "";
      for (let i = 0; i < POINTS; i++) {
        d += `${i ? "L" : "M"}${((i / (POINTS - 1)) * W).toFixed(1)} ${yOf(buf[i]).toFixed(1)}`;
      }
      const a = `${d}L${W} ${H - PAD_B}L0 ${H - PAD_B}Z`;
      lineLo.current?.setAttribute("d", d);
      lineHi.current?.setAttribute("d", d);
      areaLo.current?.setAttribute("d", a);
      areaHi.current?.setAttribute("d", a);
      const u = buf[POINTS - 1];
      if (dot.current) {
        dot.current.setAttribute("cy", yOf(u).toFixed(1));
        dot.current.setAttribute("fill", u > 1 ? "#ff4d00" : "#00e5ff");
      }
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!visible || now - last < 33) return;
      last = now;
      shown += (tgt.current - shown) * 0.2;
      buf.shift();
      buf.push(shown);
      draw();
    };
    draw();
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);

  const y1 = yOf(1);
  const lo = `lo${uid}`;
  const hi = `hi${uid}`;
  const grad = `g${uid}`;
  return (
    <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Utilisation over the last five seconds">
      <defs>
        <clipPath id={lo}>
          <rect x="0" y={y1} width={W} height={H - y1} />
        </clipPath>
        <clipPath id={hi}>
          <rect x="0" y="0" width={W} height={y1} />
        </clipPath>
        <linearGradient id={grad} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#00e5ff" stopOpacity="0.12" />
          <stop offset="1" stopColor="#00e5ff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <line x1="0" x2={W} y1={yOf(0.5)} y2={yOf(0.5)} stroke="rgba(255,255,255,0.05)" />
      <rect x="0" y="0" width={W} height={y1} fill="rgba(255,77,0,0.04)" />

      <path ref={areaLo} fill={`url(#${grad})`} clipPath={`url(#${lo})`} />
      <path ref={areaHi} fill="rgba(255,77,0,0.16)" clipPath={`url(#${hi})`} />
      <path ref={lineLo} fill="none" stroke="#00e5ff" strokeWidth="1.6" clipPath={`url(#${lo})`} vectorEffect="non-scaling-stroke" />
      <path ref={lineHi} fill="none" stroke="#ff4d00" strokeWidth="1.8" clipPath={`url(#${hi})`} vectorEffect="non-scaling-stroke" />

      <line x1="0" x2={W} y1={y1} y2={y1} stroke="#f4f6f8" strokeOpacity="0.5" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
      <circle ref={dot} cx={W - 3} r="3.5" />
    </svg>
  );
}
