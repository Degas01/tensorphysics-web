import type { ModuleKey } from "./site";

export type Status = "working" | "not-passed" | "planned";

export interface EngineModule {
  key: ModuleKey;
  num: string;
  name: string;
  short: string;
  long: string;
  status: Status;
  statusLabel: string;
  code: string;
  honest: string;
  io: { in: string; out: string }[];
  next: string[];
}

export const modules: EngineModule[] = [
  {
    key: "simulate",
    num: "01",
    name: "Simulate",
    short: "Your robot, your task, run in MuJoCo and logged every millisecond.",
    long:
      "Loads a robot (MJCF or URDF), swaps its actuators for ideal joint torque, runs each task with a tracking controller and logs torque, speed and power on every joint, every millisecond. Modelling errors can be injected without the controller knowing, exactly like a real robot whose model is wrong.",
    status: "working",
    statusLabel: "v0 · working",
    code: "tpcore · MuJoCo 3.10",
    honest:
      "Today: CPU MuJoCo, robot arms. Quadrupeds and humanoids are next. GPU batches (MJX) are set up in the lab but not wired into the product yet.",
    io: [
      { in: "MJCF / URDF robot", out: "Torque, speed, power per joint" },
      { in: "Task: waypoints, payload, holds", out: "Tracking-error check per run" },
      { in: "Hidden modelling error", out: "Same task, wrong model" },
    ],
    next: ["Quadruped and Unitree G1 tasks", "GPU batches with MJX", "User-uploaded models"],
  },
  {
    key: "break",
    num: "02",
    name: "Break",
    short: "An adversary hunts for the errors that push a design over its limit.",
    long:
      "Searches the space of modelling errors (friction, rotor inertia, damping, payload, link mass, torque shortfall, bus voltage, heat) for the combination that pushes a design over its limit. Reports a margin per error and the first thing to break, so you know what to measure first.",
    status: "working",
    statusLabel: "v0 · working",
    code: "tpcore.adversary · PhysCheck",
    honest:
      "In the Panda study the worst case found was the all-adverse corner: the search found nothing worse. PhysCheck has not yet confirmed an exploit in its own test environments.",
    io: [
      { in: "A design + plausible error ranges", out: "Worst case found" },
      { in: "One error at a time", out: "Margin per error" },
      { in: "Margin ranking", out: "What to measure first" },
    ],
    next: ["Contact-rich tasks where the corner is not the worst case", "PhysCheck v1 detectors"],
  },
  {
    key: "prove",
    num: "03",
    name: "Prove",
    short: "Sim versus real, answered PASS, FAIL or INCONCLUSIVE.",
    long:
      "Compares simulation with real measurements using a bootstrap test (B = 500) on the excess gap G = sqrt(max(simMSE - noiseMSE, 0)), and answers PASS, FAIL or INCONCLUSIVE with the uncertainty attached. Measured gaps then replace assumed ranges in Gap Margin.",
    status: "not-passed",
    statusLabel: "v0 · not passed",
    code: "GapCheck",
    honest:
      "GapCheck v0 detected 5 of 6 parameter families on a synthetic arm, but gave false assurance on friction in 178 of 1,200 runs. Not passed. The planned fix is a per-parameter detectability table.",
    io: [
      { in: "Sim + real trajectories", out: "Excess gap G" },
      { in: "Bootstrap, B = 500", out: "PASS / FAIL / INCONCLUSIVE" },
      { in: "Measured ranges", out: "Tighter Gap Margins" },
    ],
    next: ["Per-parameter detectability table (v1)", "First real bench data"],
  },
  {
    key: "improve",
    num: "04",
    name: "Improve",
    short: "Optimise designs against the worst case, not the average.",
    long:
      "Optimises designs and control policies against the worst case that Break finds, so the result still holds when the model is wrong. Trade-offs (mass, cost, margin) come back as a set of options rather than one answer.",
    status: "planned",
    statusLabel: "planned",
    code: "RL · design search",
    honest: "Not built yet. Earlier reinforcement-learning experiments exist in the lab; nothing is offered as a product.",
    io: [
      { in: "Worst cases from Break", out: "Robust design candidates" },
      { in: "Measured gaps from Prove", out: "Re-ranked choices" },
      { in: "Budget: mass, cost", out: "Trade-off front" },
    ],
    next: ["Actuator self-weight feedback loop", "Robust policy training"],
  },
];

export const moduleByKey = (k: string) => modules.find((m) => m.key === k);
