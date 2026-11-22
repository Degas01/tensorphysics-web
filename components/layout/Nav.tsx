"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Command, Menu, X } from "lucide-react";
import clsx from "clsx";
import { nav, site } from "@/lib/site";
import { Lockup } from "@/components/ui/Logo";
import { useApp } from "@/components/providers/AppProvider";

export function Nav() {
  const pathname = usePathname();
  const { setPaletteOpen } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-50">
      <div
        className={clsx(
          "mx-auto mt-3 flex max-w-[1240px] items-center justify-between gap-4 rounded-[2px] px-4 py-2.5 transition-all duration-300 sm:px-5",
          scrolled ? "glass-strong mx-3 sm:mx-6 xl:mx-auto" : "border border-transparent",
        )}
      >
        <Link href="/" aria-label={`${site.name} home`} className="flex items-center">
          <Lockup height={20} />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {nav.map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                className={clsx(
                  "rounded-[2px] px-3 py-2 text-sm transition-colors",
                  active ? "text-fg" : "text-mute hover:text-fg",
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden h-10 items-center gap-2 rounded-[2px] border border-line px-3 font-mono text-xs text-mute transition-colors hover:border-holds/50 hover:text-fg sm:flex"
            aria-label="Open command palette"
          >
            <Command className="size-3.5" aria-hidden="true" />K
          </button>
          <Link
            href="/actuatorfit#beta"
            className="hidden h-10 items-center rounded-[2px] border border-holds/60 px-4 text-sm font-semibold text-holds transition-colors hover:bg-holds hover:text-obsidian sm:inline-flex"
          >
            Try the beta
          </Link>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-[2px] border border-line text-fg md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="glass-strong mx-3 mt-2 rounded-[2px] p-2 md:hidden">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="block rounded-[2px] px-4 py-3 text-base text-fg hover:bg-white/5">
              {n.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="block w-full rounded-[2px] px-4 py-3 text-left font-mono text-sm text-mute hover:bg-white/5"
          >
            Command palette
          </button>
          <Link href="/actuatorfit#beta" className="mt-1 block rounded-[2px] bg-holds px-4 py-3 text-center font-semibold text-obsidian">
            Try the ActuatorFit beta
          </Link>
        </div>
      )}
    </header>
  );
}
