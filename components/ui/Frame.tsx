import clsx from "clsx";

/**
 * Instrument-panel frame: 1px hairline border, `+` crosshairs on the corners,
 * optional coordinate label and tick ruler along the top edge. No rounded corners.
 */
export function Frame({
  children,
  className,
  label,
  coord,
  ticks = false,
  tone = "line",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  label?: string;
  coord?: string;
  ticks?: boolean;
  tone?: "line" | "holds" | "breaks";
  as?: "div" | "section" | "article" | "figure";
}) {
  return (
    <Tag
      className={clsx(
        "relative border bg-ink/70",
        tone === "line" && "border-line",
        tone === "holds" && "border-holds/40",
        tone === "breaks" && "border-breaks/50",
        className,
      )}
    >
      <Cross className="-left-[5px] -top-[5px]" />
      <Cross className="-right-[5px] -top-[5px]" />
      <Cross className="-bottom-[5px] -left-[5px]" />
      <Cross className="-bottom-[5px] -right-[5px]" />
      {ticks && <Ticks />}
      {(label || coord) && (
        <div className="pointer-events-none absolute -top-[9px] left-4 right-4 flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-dim">
          {label && <span className="bg-obsidian px-1.5">{label}</span>}
          {coord && <span className="bg-obsidian px-1.5">{coord}</span>}
        </div>
      )}
      {children}
    </Tag>
  );
}

function Cross({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" width="11" height="11" viewBox="0 0 11 11" className={clsx("pointer-events-none absolute z-[1] text-white/40", className)}>
      <path d="M5.5 0V11M0 5.5H11" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function Ticks() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-2"
      style={{
        backgroundImage:
          "repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0 1px, transparent 1px 24px), repeating-linear-gradient(90deg, rgba(255,255,255,0.32) 0 1px, transparent 1px 120px)",
        backgroundSize: "100% 4px, 100% 8px",
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}

/** Small mono readout: KEY  value */
export function Readout({ k, v, tone }: { k: string; v: React.ReactNode; tone?: "holds" | "breaks" }) {
  return (
    <div className="flex flex-col-reverse gap-1">
      <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-dim">{k}</dt>
      <dd className={clsx("font-mono text-[15px] tabular-nums", tone === "holds" ? "text-holds" : tone === "breaks" ? "text-breaks" : "text-fg")}>{v}</dd>
    </div>
  );
}
