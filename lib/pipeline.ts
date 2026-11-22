/**
 * Pipeline nodes, edges and the logs shown in "Under the hood".
 * Every number comes from the ActuatorFit v0 Panda run (results.json, MuJoCo 3.10.0) or the
 * GapCheck v0 study. Nothing here is invented for show.
 */

export type NodeId = "model" | "task" | "sim" | "break" | "prove" | "improve" | "report";
export type Status = "live" | "partial" | "planned";

export interface PipeNode {
  id: NodeId;
  title: string;
  sub: string;
  status: Status;
  metrics: { k: string; v: string; tone?: "holds" | "breaks" }[];
  log: { t: string; s: string; ok?: boolean | null }[];
}

export interface PipeEdge {
  from: NodeId;
  to: NodeId;
  status: Status;
  label?: string;
}

export const NODES: PipeNode[] = [
  {
    id: "model",
    title: "Robot model",
    sub: "MJCF · URDF",
    status: "live",
    metrics: [
      { k: "robot", v: "Franka Panda" },
      { k: "actuated joints", v: "7" },
      { k: "payload", v: "1–3 kg" },
      { k: "source", v: "Menagerie" },
    ],
    log: [
      { t: "load", s: "franka_emika_panda/panda_nohand.xml" },
      { t: "swap", s: "7 position actuators → 7 ideal torque motors" },
      { t: "attach", s: "payload body at <attachment>, +0.05 m" },
      { t: "opts", s: "timestep 1 ms · contacts off · implicitfast", ok: true },
    ],
  },
  {
    id: "task",
    title: "Task spec",
    sub: "waypoints · payload",
    status: "live",
    metrics: [
      { k: "tasks", v: "3" },
      { k: "longest", v: "16.8 s" },
      { k: "tracking limit", v: "0.02 rad" },
      { k: "reference", v: "min-jerk" },
    ],
    log: [
      { t: "T1", s: "pick-and-place · 3 kg · 3 cycles · 16.8 s" },
      { t: "T2", s: "fast reach · 1 kg · near speed limits · 9.8 s" },
      { t: "T3", s: "extended hold · 3 kg · 5 s hold · 7.0 s" },
      { t: "ref", s: "quintic segments, zero vel/acc at waypoints", ok: true },
    ],
  },
  {
    id: "sim",
    title: "Simulate",
    sub: "tpcore · MuJoCo 3.10",
    status: "live",
    metrics: [
      { k: "simulations", v: "291" },
      { k: "wall time", v: "115 s" },
      { k: "max |e| nominal", v: "1.1e-4 rad", tone: "holds" },
      { k: "torque vs ID", v: "0.037%", tone: "holds" },
    ],
    log: [
      { t: "ctrl", s: "τ = ID_nom(ref) + M(q_ref)(Kp·e + Kd·ė), ωn 60 rad/s" },
      { t: "T1", s: "max tracking error 8.0e-5 rad", ok: true },
      { t: "T2", s: "max tracking error 1.1e-4 rad", ok: true },
      { t: "T3", s: "max tracking error 3.0e-5 rad", ok: true },
      { t: "2a", s: "J2 hold: logged −70.251 Nm vs hand calc −70.251 Nm", ok: true },
      { t: "2b", s: "inverse dynamics on realised T1: worst 0.037%", ok: true },
    ],
  },
  {
    id: "break",
    title: "Break",
    sub: "8-error sweep · ARS",
    status: "live",
    metrics: [
      { k: "errors", v: "8" },
      { k: "sweep", v: "9 levels to 5×" },
      { k: "adversary", v: "50 evals" },
      { k: "worst u (pick)", v: "0.93", tone: "holds" },
    ],
    log: [
      { t: "sweep", s: "5 physical errors × 9 levels × 3 tasks = 135 runs" },
      { t: "sweep", s: "3 datasheet errors, analytic, every actuator" },
      { t: "corner", s: "all 8 at top of range → lightest paper fit fails 7/7 joints", ok: false },
      { t: "corner", s: "recommended set: worst u 0.933", ok: true },
      { t: "ars", s: "50 evals → worst 0.933, nothing worse than the corner", ok: true },
      { t: "track", s: "max error at corner 0.0137 rad < 0.02", ok: true },
    ],
  },
  {
    id: "prove",
    title: "Prove",
    sub: "GapCheck · bootstrap",
    status: "partial",
    metrics: [
      { k: "C1 false alarms", v: "0 / 100", tone: "holds" },
      { k: "C2 families caught", v: "5 / 6", tone: "breaks" },
      { k: "C3 false assurance", v: "178 / 1,200", tone: "breaks" },
      { k: "verdict", v: "not passed", tone: "breaks" },
    ],
    log: [
      { t: "gap", s: "G = sqrt(max(simMSE − noiseMSE, 0)), B = 500, δ = 0.05" },
      { t: "C1", s: "0 / 100 false alarms on matched models", ok: true },
      { t: "C2", s: "detected 5 of 6 parameter families", ok: false },
      { t: "C3", s: "178 / 1,200 false assurance, all friction", ok: false },
      { t: "next", s: "v1: per-parameter detectability table", ok: null },
    ],
  },
  {
    id: "improve",
    title: "Improve",
    sub: "design search",
    status: "planned",
    metrics: [
      { k: "status", v: "planned" },
      { k: "objective", v: "worst case" },
      { k: "inputs", v: "Break + Prove" },
      { k: "output", v: "trade-off front" },
    ],
    log: [
      { t: "todo", s: "feed actuator self-weight back into link masses", ok: null },
      { t: "todo", s: "optimise picks against the worst case found", ok: null },
      { t: "todo", s: "replace assumed ranges with measured gaps", ok: null },
    ],
  },
  {
    id: "report",
    title: "Report",
    sub: "html · raw json",
    status: "live",
    metrics: [
      { k: "joints with margin", v: "7 / 7", tone: "holds" },
      { k: "actuators", v: "48 (+4 excluded)" },
      { k: "nominal fits", v: "185" },
      { k: "with margin", v: "125" },
    ],
    log: [
      { t: "rank", s: "per joint: lightest first, then price" },
      { t: "pick", s: "lightest actuator that fits with margin" },
      { t: "J2", s: "RMD-X15-450 (lighter X12 fails corner, u 1.29)", ok: true },
      { t: "write", s: "report.html · results.json", ok: true },
    ],
  },
];

export const EDGES: PipeEdge[] = [
  { from: "model", to: "sim", status: "live" },
  { from: "task", to: "sim", status: "live" },
  { from: "sim", to: "break", status: "live" },
  { from: "break", to: "prove", status: "partial", label: "worst cases to bench-test" },
  { from: "prove", to: "improve", status: "planned" },
  { from: "improve", to: "report", status: "planned" },
  { from: "break", to: "report", status: "live", label: "today" },
];

export const nodeById = (id: NodeId) => NODES.find((n) => n.id === id)!;

/** Every edge on a path from the inputs to `id`. */
export function pathTo(id: NodeId): Set<number> {
  const out = new Set<number>();
  const stack: NodeId[] = [id];
  const seen = new Set<NodeId>();
  while (stack.length) {
    const n = stack.pop()!;
    if (seen.has(n)) continue;
    seen.add(n);
    EDGES.forEach((e, i) => {
      if (e.to === n) {
        out.add(i);
        stack.push(e.from);
      }
    });
  }
  return out;
}
