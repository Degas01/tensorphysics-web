/**
 * GapCheck demo trajectories. A 2-link arm in a vertical plane tracks a reference motion.
 *   sim   : the model's prediction (ideal tracking of the reference)
 *   bench : a SYNTHETIC "measured" run with injected faults. There is no real bench data yet;
 *           GapCheck v0 was also evaluated on a synthetic arm.
 * Faults: friction (stick near velocity reversals -> flattened, lagging peaks),
 *         latency (time shift), mass mismatch (gravity sag).
 */
export const L1 = 0.9;
export const L2 = 0.7;
export const N = 240;
export const PERIOD = 4; // seconds
export const TOL_MM = 20;

export interface Faults {
  friction: boolean;
  latency: boolean;
  mass: boolean;
}

export interface Traj {
  sim: [number, number][]; // q1, q2
  bench: [number, number][];
  eeSim: [number, number][];
  eeBench: [number, number][];
  errMm: number[];
  maxErr: number;
  firstBreach: number | null; // sample index
}

const ref = (t: number): [number, number] => [0.75 + 0.5 * Math.sin((2 * Math.PI * t) / PERIOD), 1.05 + 0.55 * Math.sin((4 * Math.PI * t) / PERIOD + 0.6)];

export const fk = ([a, b]: [number, number]): [number, number] => [L1 * Math.cos(a) + L2 * Math.cos(a + b), L1 * Math.sin(a) + L2 * Math.sin(a + b)];
export const elbow = ([a]: [number, number]): [number, number] => [L1 * Math.cos(a), L1 * Math.sin(a)];

export function build(f: Faults): Traj {
  const dt = PERIOD / N;
  const sim: [number, number][] = [];
  const bench: [number, number][] = [];
  const stuck: [number, number] = [...ref(-(f.latency ? 0.012 : 0))];
  for (let i = 0; i < N; i++) {
    const t = i * dt;
    sim.push(ref(t));
    let q = ref(t - (f.latency ? 0.012 : 0));
    if (f.friction) {
      // Coulomb stick: the joint only moves once the command leads it by more than a breakaway band.
      const band = [0.016, 0.014];
      for (let k = 0; k < 2; k++) {
        const d = q[k] - stuck[k];
        if (Math.abs(d) > band[k]) stuck[k] = q[k] - Math.sign(d) * band[k];
      }
      q = [stuck[0], stuck[1]];
    }
    if (f.mass) q = [q[0] - 0.016 * Math.cos(q[0]), q[1] - 0.012 * Math.cos(q[0] + q[1])];
    // deterministic sensor noise, ~1 mm
    q = [q[0] + 0.0008 * Math.sin(i * 12.9898), q[1] + 0.0008 * Math.sin(i * 78.233)];
    bench.push(q);
  }
  const eeSim = sim.map(fk);
  const eeBench = bench.map(fk);
  const errMm = eeSim.map((p, i) => Math.hypot(p[0] - eeBench[i][0], p[1] - eeBench[i][1]) * 1000);
  const firstBreach = errMm.findIndex((e) => e > TOL_MM);
  return { sim, bench, eeSim, eeBench, errMm, maxErr: Math.max(...errMm), firstBreach: firstBreach < 0 ? null : firstBreach };
}
