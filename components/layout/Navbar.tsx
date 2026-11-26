"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { ArrowRight, Menu, X } from "lucide-react";
import { site } from "@/lib/site";
import { Lockup } from "@/components/ui/Logo";
import { useApp } from "@/components/providers/AppProvider";

/** Primary routes, in order. `match` decides which one is active for the current path. */
export const ROUTES = [
  { n: "00", label: "Overview", href: "/", match: (p: string) => p === "/" },
  { n: "01", label: "ActuatorFit", href: "/actuatorfit", match: (p: string) => p.startsWith("/actuatorfit") },
  { n: "02", label: "PhysicsFuzz", href: "/physicsfuzz", match: (p: string) => p.startsWith("/physicsfuzz") },
  { n: "03", label: "Engine", href: "/engine", match: (p: string) => p.startsWith("/engine") },
  { n: "04", label: "Evidence", href: "/evidence", match: (p: string) => p.startsWith("/evidence") },
] as const;

/** "⌘K" on Apple platforms, "Ctrl K" elsewhere. Starts as Ctrl so server and first client render match. */
export function useShortcutLabel() {
  const [mac, setMac] = useState(false);
  useEffect(() => {
    const ua = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform ?? "";
    setMac(/mac|iphone|ipad/i.test(ua));
  }, []);
  return mac ? "⌘K" : "Ctrl K";
}

const mono = "whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.12em] tabular-nums";

export function Navbar() {
  const pathname = usePathname();
  const { setPaletteOpen } = useApp();
  const [open, setOpen] = useState(false);
  const key = useShortcutLabel();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-obsidian">
      <div className="flex h-[52px] items-stretch">
        {/* left: lockup + engine version */}
        <div className="flex items-center gap-5 border-r border-line px-4 sm:px-5">
          <Link href="/" aria-label={`${site.name} home`} className="flex items-center">
            <Lockup height={18} />
          </Link>
          <span className={clsx(mono, "hidden items-center gap-2 text-[10px] text-mute 2xl:flex")}>
            <span className="size-1.5 bg-holds" aria-hidden="true" />
            {"Sys // MuJoCo 3.10"}
          </span>
        </div>

        {/* centre: routes */}
        <nav aria-label="Main" className="hidden flex-1 items-stretch xl:flex">
          {ROUTES.map((r) => {
            const active = r.match(pathname);
            return (
              <Link
                key={r.href}
                href={r.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  mono,
                  "relative flex items-center border-r border-line px-3 transition-colors",
                  active ? "text-fg" : "text-mute hover:bg-white/[0.03] hover:text-fg",
                )}
              >
                <span className={clsx("mr-1.5", active ? "text-fg" : "text-dim")}>{active ? `[${r.n}]` : r.n}</span>
                <span className="text-dim">{"//"}</span>
                <span className="ml-1.5">{r.label}</span>
                {active && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-fg" aria-hidden="true" />}
              </Link>
            );
          })}
        </nav>
        <div className="flex-1 xl:hidden" />

        {/* right: palette trigger + CTA */}
        <div className="flex items-stretch">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className={clsx(mono, "hidden items-center gap-3 border-l border-line px-4 text-mute transition-colors hover:bg-white/[0.03] hover:text-fg sm:flex")}
            aria-label="Open command palette"
          >
            <span className="hidden 2xl:inline">Search / jump</span>
            <kbd className="border border-line px-1.5 py-px font-mono text-[10px] normal-case tracking-normal text-soft">{key}</kbd>
          </button>
          <Link
            href="/actuatorfit#beta"
            className={clsx(mono, "hidden items-center gap-2 bg-fg px-5 font-semibold text-obsidian transition-colors hover:bg-white sm:flex")}
          >
            Test URDF / MJCF <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
          <button
            type="button"
            className="flex w-[52px] items-center justify-center border-l border-line text-fg xl:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* mobile drawer: full screen, one hairline row per route */}
      {open && (
        <div id="mobile-nav" className="fixed inset-x-0 bottom-0 top-[53px] z-50 flex flex-col overflow-y-auto bg-obsidian xl:hidden" data-lenis-prevent>
          {ROUTES.map((r) => {
            const active = r.match(pathname);
            return (
              <Link
                key={r.href}
                href={r.href}
                aria-current={active ? "page" : undefined}
                className={clsx("flex min-h-16 items-center justify-between border-b border-line px-5", active ? "text-fg" : "text-soft")}
              >
                <span className="flex items-baseline gap-3">
                  <span className={clsx(mono, active ? "text-fg" : "text-dim")}>{active ? `[${r.n}]` : r.n}</span>
                  <span className="font-display text-2xl font-semibold tracking-[-0.02em]">{r.label}</span>
                </span>
                {active && <span className="h-6 w-[2px] bg-fg" aria-hidden="true" />}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setPaletteOpen(true);
            }}
            className={clsx(mono, "flex min-h-14 items-center justify-between border-b border-line px-5 text-left text-mute")}
          >
            Search / jump <kbd className="border border-line px-1.5 py-px text-[10px] normal-case tracking-normal">{key}</kbd>
          </button>
          <Link href="/actuatorfit#beta" className={clsx(mono, "m-5 flex min-h-12 items-center justify-center gap-2 bg-fg font-semibold text-obsidian")}>
            Test URDF / MJCF <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
          <p className={clsx(mono, "mt-auto flex items-center gap-2 border-t border-line px-5 py-4 text-[10px] text-dim")}>
            <span className="size-1.5 bg-holds" aria-hidden="true" />
            {`Sys // MuJoCo 3.10 · ${site.company} · Co. No. ${site.companyNumber}`}
          </p>
        </div>
      )}
    </header>
  );
}
