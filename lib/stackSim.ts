/**
 * Tiny deterministic 2D penalty-contact solver for the PhysicsFuzz demo.
 *
 * Bodies are axis-aligned boxes (no rotation). Contacts are springs on the overlap depth.
 *  - naive: one explicit-Euler step of 1/30 s, no continuous collision. A stiff contact spring
 *    with omega*dt > 2 gains energy every step (the stack explodes) and a fast projectile can step
 *    straight over the thin floor (tunnelling).
 *  - fixed: 12 semi-implicit substeps per 1/30 s and a swept test for the projectile (CCD).
 * Same scene, same stiffness, same seed: only the integration settings change.
 */

export type Mode = "naive" | "fixed";

export interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hw: number;
  hh: number;
  m: number;
  proj?: boolean;
}

export interface SimEvent {
  t: number;
  kind: "tunnelling" | "explosion" | "settled";
  detail: string;
}

const G = -9.81;
const K = 6000; // contact stiffness per metre of overlap (per unit mass)
const C = 60; // contact damping
const FLOOR = { x: 0, y: -0.03, hw: 2.4, hh: 0.03 }; // thin plate, top at y = 0
const FRAME = 1 / 30;
const VMAX = 40;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class StackSim {
  bodies: Body[] = [];
  t = 0;
  mode: Mode;
  events: SimEvent[] = [];
  done = false;
  private flagged = new Set<string>();
  private acc = 0;

  constructor(seed: number, mode: Mode) {
    this.mode = mode;
    const r = rng(seed);
    const s = 0.2;
    // Start at the exact static equilibrium (each contact compressed by the weight above it),
    // so any blow-up comes from the integrator, not from a bad initial overlap.
    let y = s - (6 * -G) / K;
    for (let k = 0; k < 6; k++) {
      this.bodies.push({ x: 0.35 + (r() - 0.5) * 0.04, y, vx: 0, vy: 0, hw: s, hh: s, m: 1 });
      y += 2 * s - ((5 - k) * -G) / K;
    }
    // Projectile: fired from the upper left, steeply down at the floor beside the stack.
    const speed = 22 + r() * 4;
    const ang = -1.05 - r() * 0.1;
    this.bodies.push({ x: -1.9, y: 2.4, vx: speed * Math.cos(ang), vy: speed * Math.sin(ang), hw: 0.07, hh: 0.07, m: 0.4, proj: true });
  }

  /** Advance by real time `dt` (seconds). */
  advance(dt: number) {
    if (this.done) return;
    this.acc += Math.min(dt, 0.1);
    while (this.acc >= FRAME && !this.done) {
      this.acc -= FRAME;
      if (this.mode === "naive") this.step(FRAME, false);
      else for (let i = 0; i < 12; i++) this.step(FRAME / 12, true);
      this.t += FRAME;
      this.check();
    }
  }

  private step(h: number, stable: boolean) {
    const n = this.bodies.length;
    const ax = new Array(n).fill(0);
    const ay = new Array(n).fill(G);
    const contact = (i: number, o: { x: number; y: number; hw: number; hh: number }, ovx: number, ovy: number, jx: number | null) => {
      const b = this.bodies[i];
      const ox = b.hw + o.hw - Math.abs(b.x - o.x);
      const oy = b.hh + o.hh - Math.abs(b.y - o.y);
      if (ox <= 0 || oy <= 0) return;
      if (oy < ox) {
        const s = Math.sign(b.y - o.y) || 1;
        const rv = (b.vy - ovy) * s;
        const f = Math.max(K * oy - C * rv, 0) * s;
        ay[i] += f;
        if (jx !== null) ay[jx] -= (f * b.m) / this.bodies[jx].m;
        // tangential friction (velocity damping while in contact)
        ax[i] += -(b.vx - ovx) * 6;
      } else {
        const s = Math.sign(b.x - o.x) || 1;
        const rv = (b.vx - ovx) * s;
        const f = Math.max(K * ox - C * rv, 0) * s;
        ax[i] += f;
        if (jx !== null) ax[jx] -= (f * b.m) / this.bodies[jx].m;
      }
    };
    for (let i = 0; i < n; i++) {
      contact(i, FLOOR, 0, 0, null);
      for (let j = i + 1; j < n; j++) {
        const o = this.bodies[j];
        contact(i, o, o.vx, o.vy, j);
      }
    }
    for (let i = 0; i < n; i++) {
      const b = this.bodies[i];
      const px = b.x;
      const py = b.y;
      if (stable) {
        // semi-implicit (symplectic) Euler
        b.vx += ax[i] * h;
        b.vy += ay[i] * h;
        b.x += b.vx * h;
        b.y += b.vy * h;
      } else {
        // explicit Euler
        b.x += b.vx * h;
        b.y += b.vy * h;
        b.vx += ax[i] * h;
        b.vy += ay[i] * h;
      }
      b.vx = Math.max(-VMAX, Math.min(VMAX, b.vx));
      b.vy = Math.max(-VMAX, Math.min(VMAX, b.vy));
      // CCD for the fast projectile: swept test against the floor's top face.
      if (stable && b.proj && py - b.hh >= 0 && b.y - b.hh < 0 && Math.abs(b.x) < FLOOR.hw) {
        const f = (py - b.hh) / (py - b.y);
        b.x = px + (b.x - px) * f;
        b.y = b.hh;
        b.vy = -b.vy * 0.25;
        b.vx *= 0.6;
      }
    }
  }

  private flag(kind: SimEvent["kind"], detail: string) {
    if (this.flagged.has(kind)) return;
    this.flagged.add(kind);
    this.events.push({ t: this.t, kind, detail });
  }

  private check() {
    const p = this.bodies[this.bodies.length - 1];
    if (p.y < -0.4 && Math.abs(p.x) < FLOOR.hw) this.flag("tunnelling", "projectile passed through the floor");
    let ke = 0;
    for (const b of this.bodies) if (!b.proj) ke += 0.5 * b.m * (b.vx * b.vx + b.vy * b.vy);
    if (ke > 60 || this.bodies.some((b) => !b.proj && (b.y > 4.5 || Math.abs(b.x) > 4))) this.flag("explosion", "stack energy grew with nothing driving it");
    if (this.t >= 3.6) {
      if (this.flagged.size === 0) this.flag("settled", "stack settled, projectile stopped on the floor");
      this.done = true;
    }
  }

  get failed() {
    return this.events.some((e) => e.kind !== "settled");
  }
}

export const FLOOR_BOX = FLOOR;
