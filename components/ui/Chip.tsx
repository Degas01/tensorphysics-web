import clsx from "clsx";

export type Tone = "holds" | "breaks" | "warn" | "mute" | "solid";

export function Chip({ children, tone = "mute", className }: { children: React.ReactNode; tone?: Tone; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] leading-5",
        tone === "holds" && "border-holds/60 text-holds",
        tone === "breaks" && "border-breaks/60 text-breaks",
        tone === "warn" && "border-warn/60 text-warn",
        tone === "mute" && "border-line text-mute",
        tone === "solid" && "border-holds bg-holds font-medium text-obsidian",
        className,
      )}
    >
      {children}
    </span>
  );
}
