import { panda } from "@/lib/data/panda";
import { SimVideo, SimCaption } from "@/components/media/SimVideo";

const short = (n: string) => n.replace("MyActuator ", "").replace(" (V4)", "").replace(" V3.0", "").replace(/ KV\d+/, "");

/** Full-bleed footage band: the Panda pick-and-place task, with the J2 numbers from the real study laid over it. */
export function SimBand() {
  const task = panda.tasks.find((t) => t.key === "T1")!;
  const j2 = panda.joints.find((j) => j.key === "joint2")!;
  return (
    <section id="footage" aria-label="Franka Panda study footage" className="scroll-mt-24 relative isolate flex min-h-[70vh] items-end border-y border-line">
      <SimVideo src="/videos/panda-pick.mp4" poster="/videos/panda-pick.jpg" />
      <div className="relative mx-auto w-full max-w-[1240px] px-6 pb-12 pt-24 sm:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-mute">fig. 05 · franka panda · {task.title}</p>
        <dl className="mt-6 grid border border-line bg-obsidian/80 sm:grid-cols-3">
          <div className="flex flex-col-reverse gap-1 border-b border-line p-5 sm:border-b-0 sm:border-r">
            <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">{j2.label} · peak / RMS</dt>
            <dd className="font-mono text-2xl tabular-nums">
              {j2.demand.peak_tau.toFixed(1)} / {j2.demand.rms_tau.toFixed(1)} Nm
            </dd>
          </div>
          <div className="flex flex-col-reverse gap-1 border-b border-line p-5 sm:border-b-0 sm:border-r">
            <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">Paper fit · {short(j2.lightest.name)} · all 8 stacked</dt>
            <dd className="font-mono text-2xl tabular-nums text-breaks">u {j2.lightest.u_corner.toFixed(2)} · breaks</dd>
          </div>
          <div className="flex flex-col-reverse gap-1 p-5">
            <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">ActuatorFit pick · {short(j2.recommended.name)}</dt>
            <dd className="font-mono text-2xl tabular-nums text-holds">u {j2.recommended.u_corner.toFixed(2)} · holds</dd>
          </div>
        </dl>
        <SimCaption className="mt-4">ActuatorFit v0 planned motion · MuJoCo {panda.meta.mujoco} · model: MuJoCo Menagerie (Apache-2.0)</SimCaption>
      </div>
    </section>
  );
}
