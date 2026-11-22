export type Verdict = "passed" | "in-progress" | "not-passed" | "no-result";

export interface Study {
  slug: string;
  title: string;
  product: string;
  verdict: Verdict;
  verdictLabel: string;
  summary: string;
  lines: { label: string; result: string; ok: boolean | null }[];
  date: string;
  href?: string;
}

export const studies: Study[] = [
  {
    slug: "actuatorfit-v0-panda",
    title: "ActuatorFit v0 · Franka Panda, 3 tasks",
    product: "ActuatorFit",
    verdict: "in-progress",
    verdictLabel: "In progress",
    summary:
      "48 actuators from public datasheets checked on 7 joints across 3 tasks, with Gap Margin over 8 modelling errors. All 7 joints have a fit that survives every error at once; on every joint the lightest paper fit does not.",
    lines: [
      { label: "Torque vs hand gravity calculation, within 5%", result: "PASS", ok: true },
      { label: "Torque vs inverse dynamics on the realised trajectory, within 5%", result: "PASS", ok: true },
      { label: "Full study under 10 min on CPU", result: "PASS on cloud (115 s); target PC not yet timed", ok: null },
      { label: "3 robots × 3 tasks", result: "NOT YET: arm only", ok: false },
    ],
    date: "Nov 2026",
    href: "/actuatorfit",
  },
  {
    slug: "gapcheck-v0",
    title: "GapCheck v0 · synthetic 3-joint arm",
    product: "Prove",
    verdict: "not-passed",
    verdictLabel: "Not passed",
    summary:
      "Bootstrap sim-versus-real test, pre-registered checks C1 to C7. It raised no false alarms, but friction errors slipped through, so v0 is not passed.",
    lines: [
      { label: "C1 · false alarms", result: "0 / 100", ok: true },
      { label: "C1b", result: "100 / 100 PASS", ok: true },
      { label: "C2 · parameter families detected", result: "5 of 6", ok: false },
      { label: "C3 · false assurance (all friction)", result: "178 / 1,200 · FAILED", ok: false },
      { label: "C4 – C7", result: "PASS", ok: true },
    ],
    date: "Oct 2026",
    href: "/engine/prove",
  },
  {
    slug: "physcheck-v0",
    title: "PhysCheck v0 · planted faults F1–F4",
    product: "Break",
    verdict: "no-result",
    verdictLabel: "No exploit found",
    summary:
      "Adversarial tester for simulation environments with five detectors and four planted faults. The adversary has not yet confirmed an exploit.",
    lines: [{ label: "Confirmed exploit", result: "None yet", ok: null }],
    date: "Oct 2026",
    href: "/engine/break",
  },
];
