"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { useApp } from "@/components/providers/AppProvider";
import { site } from "@/lib/site";

type Group = "Products & routes" | "Interactive benchmarks & sandboxes" | "Actions";
type Tag = { t: string; tone: "holds" | "warn" | "breaks" | "mute" };

interface Item {
  id: string;
  group: Group;
  label: string;
  sub?: string;
  tag?: Tag;
  keywords?: string;
  run: () => void;
}

/** Subsequence fuzzy match: every query character in order; tighter, earlier and word-start matches score higher. */
function fuzzy(text: string, q: string): number {
  if (!q) return 1;
  const t = text.toLowerCase();
  let ti = 0;
  let score = 0;
  let prev = -2;
  for (const c of q.toLowerCase()) {
    if (c === " ") continue;
    const i = t.indexOf(c, ti);
    if (i < 0) return 0;
    score += i === prev + 1 ? 3 : 1;
    if (i === 0 || /[\s/—·(-]/.test(t[i - 1])) score += 2;
    prev = i;
    ti = i + 1;
  }
  return score - t.length * 0.01;
}

const GROUPS: Group[] = ["Products & routes", "Interactive benchmarks & sandboxes", "Actions"];
const TONE = { holds: "border-holds/60 text-holds", warn: "border-warn/60 text-warn", breaks: "border-breaks/60 text-breaks", mute: "border-line text-mute" };

export function CommandPalette() {
  const router = useRouter();
  const { paletteOpen, setPaletteOpen, motionOff, setMotionToggle } = useApp();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1600);
  };

  const items: Item[] = useMemo(() => {
    const go = (href: string) => () => {
      setPaletteOpen(false);
      router.push(href);
    };
    return [
      { id: "home", group: "Products & routes", label: "Overview", sub: "Simulation reliability engine", run: go("/") },
      { id: "af", group: "Products & routes", label: "ActuatorFit", sub: "Hardware and thermal margin engine", tag: { t: "beta open", tone: "holds" }, run: go("/actuatorfit") },
      { id: "pf", group: "Products & routes", label: "PhysicsFuzz", sub: "Adversarial contact and solver fuzzer", tag: { t: "testing", tone: "warn" }, run: go("/physicsfuzz") },
      { id: "gc", group: "Products & routes", label: "GapCheck", sub: "Sim-to-real calibration", tag: { t: "v0 not passed", tone: "breaks" }, run: go("/#gapcheck") },
      { id: "engine", group: "Products & routes", label: "Engine", sub: "Simulate · Break · Prove · Improve", run: go("/engine"), keywords: "pipeline under the hood architecture" },
      { id: "evidence", group: "Products & routes", label: "Evidence", sub: "Pre-registered results, failures included", run: go("/evidence") },

      { id: "joints", group: "Interactive benchmarks & sandboxes", label: "Inspect the Franka Panda study (J1–J7)", sub: "joint matrix + Gap Margin", run: go("/actuatorfit#joint-inspector"), keywords: "panda arm joint" },
      { id: "go2", group: "Interactive benchmarks & sandboxes", label: "Compare Unitree Go2 damping (0 vs 2 N·m·s/rad)", sub: "5.84 kg vs 17.42 kg", run: go("/actuatorfit#quadruped"), keywords: "go2 legged quadruped" },
      { id: "sandbox", group: "Interactive benchmarks & sandboxes", label: "Open the Gap Margin sandbox", sub: "8 modelling errors", run: go("/#sandbox") },
      { id: "robots", group: "Interactive benchmarks & sandboxes", label: "Every robot we have run", sub: "Panda · Go2 · A1 · Solo-12 · ANYmal C", run: go("/#robots") },
      { id: "seed", group: "Interactive benchmarks & sandboxes", label: "Run PhysicsFuzz seed #64 (naive vs substeps + CCD)", sub: "contact arena", run: go("/physicsfuzz#arena"), keywords: "tunnelling explosion" },

      { id: "upload", group: "Actions", label: "Send a URDF / MJCF for a beta study", sub: "beta intake form", run: go("/actuatorfit#beta"), keywords: "upload test robot file" },
      { id: "contact", group: "Actions", label: "Contact us", sub: "send a message", run: go(site.contactPath) },
      {
        id: "copy",
        group: "Actions",
        label: "Copy company registration and office",
        sub: `Co. No. ${site.companyNumber}`,
        run: () => {
          const txt = `${site.company} · Co. No. ${site.companyNumber} · ${site.registeredOffice}`;
          navigator.clipboard?.writeText(txt).then(
            () => flash("Copied ✓"),
            () => flash("Copy failed"),
          );
        },
      },
      {
        id: "motion",
        group: "Actions",
        label: motionOff ? "Turn motion on" : "Turn motion off",
        sub: "calmer page, no camera moves",
        run: () => {
          setMotionToggle(!motionOff);
          flash(motionOff ? "Motion on" : "Motion off");
        },
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motionOff]);

  const filtered = useMemo(() => {
    const t = q.trim();
    if (!t) return items;
    return items
      .map((i) => ({ i, s: Math.max(fuzzy(i.label, t) * 1.5, fuzzy(`${i.sub ?? ""} ${i.keywords ?? ""} ${i.tag?.t ?? ""}`, t)) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => GROUPS.indexOf(a.i.group) - GROUPS.indexOf(b.i.group) || b.s - a.s)
      .map((x) => x.i);
  }, [q, items]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  useEffect(() => {
    if (paletteOpen) {
      lastFocus.current = document.activeElement as HTMLElement | null;
      setQ("");
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      lastFocus.current?.focus?.();
    }
  }, [paletteOpen]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setPaletteOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (filtered.length ? (a + 1) % filtered.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (filtered.length ? (a - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[active]?.run();
    }
  };

  let lastGroup = "";

  return (
    <>
      <AnimatePresence>
        {paletteOpen && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-start justify-center bg-black/80 px-4 pt-[12vh]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onMouseDown={(e) => e.target === e.currentTarget && setPaletteOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Command palette"
              className="w-full max-w-[640px] overflow-hidden border border-line bg-[#0a0c10]"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.14 }}
              onKeyDown={onKeyDown}
            >
              <div className="flex items-center gap-3 border-b border-line px-4">
                <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-dim">{"jump //"}</span>
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search routes, studies, actions"
                  aria-label="Search commands"
                  role="combobox"
                  aria-expanded="true"
                  aria-controls="cmd-list"
                  aria-activedescendant={filtered[active] ? `cmd-${filtered[active].id}` : undefined}
                  className="h-14 flex-1 bg-transparent text-[15px] text-fg placeholder:text-dim focus:outline-none"
                />
              </div>
              <ul ref={listRef} id="cmd-list" role="listbox" data-lenis-prevent className="max-h-[56vh] overflow-y-auto">
                {filtered.length === 0 && <li className="px-4 py-8 text-center font-mono text-xs text-mute">Nothing matches “{q}”.</li>}
                {filtered.map((it, i) => {
                  const header = it.group !== lastGroup;
                  lastGroup = it.group;
                  return (
                    <li key={it.id} role="presentation">
                      {header && (
                        <div className="border-t border-line px-4 pb-1.5 pt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-dim first:border-t-0">
                          {`${String(GROUPS.indexOf(it.group) + 1).padStart(2, "0")} // ${it.group}`}
                        </div>
                      )}
                      <button
                        id={`cmd-${it.id}`}
                        data-idx={i}
                        role="option"
                        aria-selected={i === active}
                        type="button"
                        onMouseEnter={() => setActive(i)}
                        onClick={it.run}
                        className={clsx(
                          "relative flex min-h-12 w-full items-center gap-3 px-4 text-left transition-colors",
                          i === active ? "bg-white/[0.05] text-fg" : "text-soft",
                        )}
                      >
                        <span className={clsx("absolute inset-y-0 left-0 w-[2px]", i === active ? "bg-fg" : "bg-transparent")} aria-hidden="true" />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-[14px]">{it.label}</span>
                          {it.sub && <span className="truncate font-mono text-[11px] text-dim">{it.sub}</span>}
                        </span>
                        {it.tag && (
                          <span className={clsx("shrink-0 border px-1.5 py-px font-mono text-[10px] uppercase tracking-[0.1em]", TONE[it.tag.tone])}>{it.tag.t}</span>
                        )}
                        {i === active && <span className="shrink-0 font-mono text-[11px] text-mute">↵</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-center gap-4 border-t border-line px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-dim">
                <span>↑↓ navigate</span>
                <span>↵ execute</span>
                <span>esc close</span>
                <span className="ml-auto normal-case tracking-normal">{filtered.length} results</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            className="fixed bottom-6 left-1/2 z-[95] -translate-x-1/2 border border-line bg-[#0a0c10] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-holds"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
