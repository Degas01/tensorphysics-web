"use client";

import Link from "next/link";
import { Command, ExternalLink } from "lucide-react";
import { site } from "@/lib/site";
import { LogoMark } from "@/components/ui/Logo";
import { useApp } from "@/components/providers/AppProvider";

const cols = [
  {
    title: "Products",
    links: [
      { label: "ActuatorFit", href: "/actuatorfit" },
      { label: "PhysicsFuzz", href: "/physicsfuzz" },
    ],
  },
  {
    title: "Engine",
    links: [
      { label: "Simulate", href: "/engine/simulate" },
      { label: "Break", href: "/engine/break" },
      { label: "Prove", href: "/engine/prove" },
      { label: "Improve", href: "/engine/improve" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Evidence", href: "/evidence" },
      { label: "Join the beta", href: "/actuatorfit#beta" },
    ],
  },
];

export function Footer() {
  const { setPaletteOpen } = useApp();
  return (
    <footer className="relative mt-24 border-t border-line">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-6 py-14 sm:px-8 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="flex flex-col gap-4">
          <Link href="/" className="flex items-center gap-2.5 font-display text-lg font-bold">
            <LogoMark /> {site.name}
          </Link>
          <p className="max-w-xs text-sm leading-relaxed text-mute">{site.tagline}</p>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="glass flex h-11 w-fit items-center gap-2 rounded-lg px-3 font-mono text-xs text-mute transition-colors hover:text-fg"
          >
            <Command className="size-3.5" aria-hidden="true" /> Press <kbd className="rounded border border-line px-1.5">Ctrl</kbd>
            <kbd className="rounded border border-line px-1.5">K</kbd> to explore
          </button>
        </div>
        {cols.map((c) => (
          <div key={c.title} className="flex flex-col gap-3">
            <span className="eyebrow">{c.title}</span>
            {c.links.map((l) => (
              <Link key={l.href} href={l.href} className="text-sm text-soft transition-colors hover:text-holds">
                {l.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-6 py-6 text-xs text-mute sm:px-8">
          <span>
            © 2026 {site.company} · Company no. {site.companyNumber} · England &amp; Wales
          </span>
          <span className="flex items-center gap-5">
            <a href={site.github} className="flex items-center gap-1.5 hover:text-fg" rel="noopener noreferrer" target="_blank">
              GitHub <ExternalLink className="size-3" aria-hidden="true" />
            </a>
            <a href={`mailto:${site.contactEmail}`} className="hover:text-fg">
              {site.contactEmail}
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
