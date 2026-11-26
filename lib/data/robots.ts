// Every robot ActuatorFit has run, summarised from its results.json (main repo, actuatorfit/results/*/results.json,
// read 26 Nov 2026) and lib/data/panda.ts. Totals are the sum of the picked actuator masses over all joints.
// "worst u" = the recommended set with all 8 modelling errors stacked plus the adversarial search. Simulation only.
// Footage: public/robots/*.mp4, rendered in MuJoCo 3.10 from each study's own planned motion (textures off).

export type CheckState = "pass" | "fail" | "not run";

export interface RobotRecord {
  key: string;
  name: string;
  kind: "arm" | "quadruped";
  source: string;
  licence: string;
  clip: string;
  joints: number;
  tasks: string[];
  pickKg: number;
  lightestKg: number;
  paperFails: number;
  worstU: number;
  finding: string;
  checks: { k: string; v: CheckState; note?: string }[];
  version: "v0" | "v1";
}

export const robots: RobotRecord[] = [
  {
    key: "panda",
    name: "Franka Panda",
    kind: "arm",
    source: "MuJoCo Menagerie",
    licence: "Apache-2.0",
    clip: "/robots/panda",
    joints: 7,
    tasks: ["Pick-and-place, 3 kg, 3 cycles", "Fast reach, 1 kg", "Extended hold, 3 kg, 5 s"],
    pickKg: 8.42,
    lightestKg: 4.81,
    paperFails: 7,
    worstU: 0.933,
    finding: "The lightest actuator that fits on paper fails on all 7 joints once the errors stack; heat breaks the shoulder first.",
    checks: [
      { k: "gravity torque", v: "pass" },
      { k: "inverse dynamics", v: "pass", note: "within 5%" },
      { k: "adversarial search", v: "pass" },
    ],
    version: "v0",
  },
  {
    key: "go2",
    name: "Unitree Go2",
    kind: "quadruped",
    source: "MuJoCo Menagerie",
    licence: "BSD-3-Clause, Unitree Robotics",
    clip: "/robots/go2",
    joints: 12,
    tasks: ["Stand-up from folded pose, hold 3 s", "Diagonal trot, 0.5 m/s, 10 s", "5 kg on the trunk, 3 crouch-and-rise"],
    pickKg: 17.42,
    lightestKg: 5.24,
    paperFails: 12,
    worstU: 0.933,
    finding: "Joint damping alone (0 in Unitree's file, 2 N·m·s/rad in Menagerie) moves the 12-actuator total from 5.84 kg to 17.42 kg.",
    checks: [
      { k: "static hold (2a)", v: "pass" },
      { k: "accelerations (2b)", v: "pass" },
      { k: "Pinocchio (2c)", v: "pass" },
      { k: "< 15 min (3)", v: "pass" },
    ],
    version: "v1",
  },
  {
    key: "a1",
    name: "Unitree A1",
    kind: "quadruped",
    source: "MuJoCo Menagerie",
    licence: "BSD-3-Clause, Unitree Robotics",
    clip: "/robots/a1",
    joints: 12,
    tasks: ["Stand-up from crouch, hold 3 s", "Diagonal trot, 0.4 m/s, 10 s", "3 kg on the trunk, 3 crouch-and-rise"],
    pickKg: 12.52,
    lightestKg: 4.43,
    paperFails: 12,
    worstU: 0.975,
    finding: "The lightest paper fit fails on 12 of 12 joints; on 8 of them viscous damping is what breaks it first. Run from a config file only.",
    checks: [
      { k: "static hold (2a)", v: "pass" },
      { k: "accelerations (2b)", v: "pass" },
      { k: "Pinocchio (2c)", v: "not run", note: "no Windows package; passed in a separate Linux run" },
      { k: "< 15 min (3)", v: "pass" },
    ],
    version: "v1",
  },
  {
    key: "solo12",
    name: "Solo-12",
    kind: "quadruped",
    source: "Gepetto example-robot-data (URDF)",
    licence: "BSD-2-Clause",
    clip: "/robots/solo12",
    joints: 12,
    tasks: ["Stand-up, hold 3 s", "Diagonal trot, 0.3 m/s, 10 s", "0.5 kg on the trunk, 3 crouch-and-rise"],
    pickKg: 2.04,
    lightestKg: 2.04,
    paperFails: 0,
    worstU: 0.706,
    finding: "The only robot of the five where the lightest paper fit still holds on every joint with all errors stacked.",
    checks: [
      { k: "static hold (2a)", v: "pass" },
      { k: "accelerations (2b)", v: "pass" },
      { k: "Pinocchio (2c)", v: "pass" },
      { k: "< 15 min (3)", v: "pass" },
    ],
    version: "v1",
  },
  {
    key: "anymal_c",
    name: "ANYmal C",
    kind: "quadruped",
    source: "MuJoCo Menagerie",
    licence: "BSD-3-Clause, ANYbotics",
    clip: "/robots/anymal_c",
    joints: 12,
    tasks: ["Stand-up from crouch, hold 3 s", "Diagonal trot, 0.5 m/s, 10 s", "10 kg on the trunk, 3 crouch-and-rise"],
    pickKg: 21.8,
    lightestKg: 9.8,
    paperFails: 10,
    worstU: 0.966,
    finding: "On a 45 kg robot the lightest paper fit fails on 10 of 12 joints, every one of them on heat.",
    checks: [
      { k: "static hold (2a)", v: "pass" },
      { k: "accelerations (2b)", v: "pass" },
      { k: "Pinocchio (2c)", v: "pass" },
      { k: "< 15 min (3)", v: "pass" },
    ],
    version: "v1",
  },
];
