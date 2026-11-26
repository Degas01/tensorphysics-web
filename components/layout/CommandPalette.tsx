"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Bot,
  Bug,
  CornerDownLeft,
  Cpu,
  FlaskConical,
  Grid3x3,
  Mail,
  Pause,
  Search,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";
import { useApp } from "@/components/providers/AppProvider";
import { site } from "@/lib/site";

interface Item {
  id: string;
  group: "Navigate" | "Engine" | "Links" | "Easter eggs";
  label: string;
  hint?: string;
  icon: LucideIcon;
  run: () => void;
}

export function CommandPalette() {
  const router = useRouter();
  const { paletteOpen, setPaletteOpen, wireframe, setWireframe, motionOff, setMotionToggle, triggerStress } = useApp();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const go = (href: string) => () => {
    setPaletteOpen(false);
    router.push(href);
  };
  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  };

  const items: Item[] = useMemo(
    () => [
      { id: "home", group: "Navigate", label: "Home", icon: ArrowRight, run: go("/") },
      { id: "af", group: "Navigate", label: "ActuatorFit", hint: "actuator sizing + Gap Margin", icon: Cpu, run: go("/actuatorfit") },
      { id: "beta", group: "Navigate", label: "Join the ActuatorFit beta", icon: Zap, run: go("/actuatorfit#beta") },
      { id: "pf", group: "Navigate", label: "PhysicsFuzz", hint: "game physics fuzzer", icon: Bug, run: go("/physicsfuzz") },
      { id: "sandbox", group: "Navigate", label: "Try the Gap Margin sandbox", icon: Activity, run: go("/#sandbox") },
      { id: "evidence", group: "Navigate", label: "Evidence: pass and fail results", icon: ShieldCheck, run: go("/evidence") },
      { id: "e-sim", group: "Engine", label: "Simulate", icon: Cpu, run: go("/engine/simulate") },
      { id: "e-break", group: "Engine", label: "Break", icon: Zap, run: go("/engine/break") },
      { id: "e-prove", group: "Engine", label: "Prove", icon: FlaskConical, run: go("/engine/prove") },
      { id: "e-imp", group: "Engine", label: "Improve", icon: Bot, run: go("/engine/improve") },
      {
        id: "mail",
        group: "Links",
        label: "Contact us",
        hint: "send a message",
        icon: Mail,
        run: go(site.contactPath),
      },
      {
        id: "wire",
        group: "Easter eggs",
        label: wireframe ? "Wireframe mode: off" : "Wireframe mode: on",
        hint: "see the skeleton",
        icon: Grid3x3,
        run: () => {
          setWireframe(!wireframe);
          flash(wireframe ? "Wireframe off" : "Wireframe on");
        },
      },
      {
        id: "stress",
        group: "Easter eggs",
        label: "Stress-test the arm",
        hint: "push every joint past its limit",
        icon: Zap,
        run: () => {
          setPaletteOpen(false);
          router.push("/");
          triggerStress();
        },
      },
      {
        id: "motion",
        group: "Easter eggs",
        label: motionOff ? "Motion: on" : "Motion: off",
        hint: "calmer page",
        icon: Pause,
        run: () => {
          setMotionToggle(!motionOff);
          flash(motionOff ? "Motion on" : "Motion off");
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wireframe, motionOff],
  );

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items;
    return items.filter((i) => `${i.label} ${i.hint ?? ""} ${i.group}`.toLowerCase().includes(t));
  }, [q, items]);

  useEffect(() => setActive(0), [q]);

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
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
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
            transition={{ duration: 0.15 }}
            onMouseDown={(e) => e.target === e.currentTarget && setPaletteOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Command palette"
              className="glass-strong w-full max-w-[620px] overflow-hidden rounded-[2px] shadow-[0_40px_120px_rgba(0,0,0,0.6)]"
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              onKeyDown={onKeyDown}
            >
              <div className="flex items-center gap-3 border-b border-line px-4">
                <Search className="size-4 text-mute" aria-hidden="true" />
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search pages, engine modules, easter eggs…"
                  aria-label="Search commands"
                  aria-controls="cmd-list"
                  aria-activedescendant={filtered[active] ? `cmd-${filtered[active].id}` : undefined}
                  className="h-14 flex-1 bg-transparent text-[15px] text-fg placeholder:text-dim focus:outline-none"
                />
                <kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-[11px] text-mute">Esc</kbd>
              </div>
              <ul id="cmd-list" role="listbox" data-lenis-prevent className="max-h-[52vh] overflow-y-auto p-2">
                {filtered.length === 0 && <li className="px-3 py-6 text-center text-sm text-mute">Nothing matches “{q}”.</li>}
                {filtered.map((it, i) => {
                  const header = it.group !== lastGroup;
                  lastGroup = it.group;
                  const Icon = it.icon;
                  return (
                    <li key={it.id} role="presentation">
                      {header && <div className="eyebrow px-3 pb-1 pt-3 !text-[10px]">{it.group}</div>}
                      <button
                        id={`cmd-${it.id}`}
                        role="option"
                        aria-selected={i === active}
                        type="button"
                        onMouseEnter={() => setActive(i)}
                        onClick={it.run}
                        className={clsx(
                          "flex min-h-11 w-full items-center gap-3 rounded-[2px] px-3 text-left text-sm transition-colors",
                          i === active ? "bg-white/[0.07] text-fg" : "text-soft",
                        )}
                      >
                        <Icon className={clsx("size-4", i === active ? "text-holds" : "text-dim")} aria-hidden="true" />
                        <span className="flex-1">{it.label}</span>
                        {it.hint && <span className="font-mono text-[11px] text-dim">{it.hint}</span>}
                        {i === active && <CornerDownLeft className="size-3.5 text-mute" aria-hidden="true" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-center justify-between border-t border-line px-4 py-2.5 font-mono text-[11px] text-dim">
                <span>↑↓ move · ↵ open · esc close</span>
                <span>tensorphysics://palette</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            className="glass-strong fixed bottom-6 left-1/2 z-[95] -translate-x-1/2 rounded-full px-4 py-2 font-mono text-xs text-holds"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
