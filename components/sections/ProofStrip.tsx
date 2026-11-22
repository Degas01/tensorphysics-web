import { panda } from "@/lib/data/panda";

const items = [
  { v: String(panda.meta.actuators), k: "actuators checked from public datasheets, every row sourced" },
  { v: "8", k: "modelling errors searched per joint, alone and together" },
  { v: "< 4 min", k: "for a full 7-joint arm study on a desktop CPU: 291 MuJoCo simulations" },
  { v: "7 / 7", k: "Panda joints where the lightest paper fit fails once errors stack" },
];

export function ProofStrip() {
  return (
    <section aria-label="Key numbers" className="border-y border-line bg-white/[0.015]">
      <dl className="mx-auto grid max-w-[1240px] grid-cols-2 gap-6 px-6 py-8 sm:px-8 lg:grid-cols-4">
        {items.map((i) => (
          <div key={i.k} className="flex flex-col-reverse gap-1">
            <dt className="text-[13px] leading-snug text-mute">{i.k}</dt>
            <dd className="font-display text-3xl font-bold tracking-tight">{i.v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
