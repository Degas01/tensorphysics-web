import * as THREE from "three";

/**
 * Procedural, ILLUSTRATIVE actuator parts for the ActuatorFit studio. Not manufacturer CAD.
 * Every part is built around the Y axis at unit radius (housing outer radius = 1); the scene scales and orients it.
 */

const v2 = (x: number, y: number) => new THREE.Vector2(x, y);

/** Closed lathe profile (outer then inner) so a shell has real wall thickness. */
function lathe(points: [number, number][], seg = 64) {
  const g = new THREE.LatheGeometry(points.map(([x, y]) => v2(x, y)), seg);
  g.computeVertexNormals();
  return g;
}

/** Ring with teeth on its inside (stator) or outside (flexspline), extruded along Y. */
function toothedRing(opts: { rIn: number; rOut: number; teeth: number; depth: number; toothH: number; inner: boolean; duty?: number }) {
  const { rIn, rOut, teeth, depth, toothH, inner, duty = 0.5 } = opts;
  const shape = new THREE.Shape();
  const hole = new THREE.Path();
  const step = (Math.PI * 2) / teeth;
  const pts: THREE.Vector2[] = [];
  for (let k = 0; k < teeth; k++) {
    const a0 = k * step;
    const a1 = a0 + step * duty;
    const a2 = a0 + step;
    const rTip = inner ? rIn : rOut + toothH;
    const rBase = inner ? rIn + toothH : rOut;
    for (const [a, r] of [
      [a0, rTip],
      [a1, rTip],
      [a1, rBase],
      [a2, rBase],
    ] as const)
      pts.push(v2(Math.cos(a) * r, Math.sin(a) * r));
  }
  if (inner) {
    shape.absarc(0, 0, rOut, 0, Math.PI * 2, false);
    hole.setFromPoints(pts.reverse());
  } else {
    shape.setFromPoints(pts);
    hole.absarc(0, 0, rIn, 0, Math.PI * 2, true);
  }
  shape.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1, curveSegments: 6 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -depth / 2, 0);
  g.computeVertexNormals();
  return g;
}

export const ACTUATOR_SLOTS = 24;
export const ACTUATOR_MAGNETS = 28;
export const ACTUATOR_BALLS = 16;
export const ACTUATOR_BOLTS = 8;

/** Each part sits at rest at `y`; `ex` is how far (in housing radii) it travels along +Y at full explode. */
export interface PartDef {
  key: string;
  geo: THREE.BufferGeometry;
  mat: "alu" | "steel" | "copper" | "magnet" | "dark";
  y: number;
  ex: number;
  instances?: THREE.Matrix4[];
}

export function buildActuatorParts(): PartDef[] {
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3(1, 1, 1);
  const p = new THREE.Vector3();
  const ring = (n: number, r: number, y: number, rot?: (a: number) => THREE.Quaternion) =>
    Array.from({ length: n }, (_, k) => {
      const a = (k / n) * Math.PI * 2;
      p.set(Math.cos(a) * r, y, Math.sin(a) * r);
      return new THREE.Matrix4().compose(p.clone(), rot ? rot(a) : q.identity().clone(), s);
    });

  // housing: rear cup and front cap, chamfered, with real wall thickness
  const rear = lathe([
    [0.0, -0.44],
    [0.93, -0.44],
    [1.0, -0.38],
    [1.0, 0.02],
    [0.95, 0.02],
    [0.95, -0.39],
    [0.2, -0.39],
    [0.2, -0.44],
  ]);
  const front = lathe([
    [0.95, 0.02],
    [1.0, 0.02],
    [1.0, 0.4],
    [0.94, 0.46],
    [0.3, 0.46],
    [0.3, 0.41],
    [0.95, 0.41],
  ]);
  // stator iron with 24 inward teeth, copper coils wound on each tooth
  const stator = toothedRing({ rIn: 0.63, rOut: 0.9, teeth: ACTUATOR_SLOTS, depth: 0.3, toothH: 0.12, inner: true, duty: 0.45 });
  // a winding loop around each tooth: loop elongated along the axis (Y), its own axis pointing outward
  const coil = new THREE.TorusGeometry(0.045, 0.02, 8, 24);
  coil.scale(1, 2.9, 1);
  const toothMid = (0.45 / 2) * ((Math.PI * 2) / ACTUATOR_SLOTS);
  const coilInst = Array.from({ length: ACTUATOR_SLOTS }, (_, k) => {
    const a = (k / ACTUATOR_SLOTS) * Math.PI * 2 + toothMid;
    return new THREE.Matrix4().compose(
      new THREE.Vector3(Math.cos(a) * 0.69, -0.03, Math.sin(a) * 0.69),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2 - a, 0)),
      new THREE.Vector3(1, 1, 1),
    );
  });
  // rotor back-iron and surface magnets
  const rotor = lathe([
    [0.45, -0.17],
    [0.56, -0.17],
    [0.56, 0.11],
    [0.45, 0.11],
  ]);
  const magnet = new THREE.BoxGeometry(0.1, 0.27, 0.035);
  const magInst = ring(ACTUATOR_MAGNETS, 0.585, -0.03, (a) => new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a + Math.PI / 2, 0)));
  // two angular-contact bearings: races + balls
  const race = new THREE.TorusGeometry(0.36, 0.022, 10, 64);
  race.rotateX(Math.PI / 2);
  const raceIn = new THREE.TorusGeometry(0.29, 0.02, 10, 64);
  raceIn.rotateX(Math.PI / 2);
  const races = mergeSimple([race, raceIn]);
  const ball = new THREE.SphereGeometry(0.03, 12, 10);
  const balls = ring(ACTUATOR_BALLS, 0.325, 0);
  // strain-wave (harmonic) drive: wave generator, flexspline, circular spline
  const wave = new THREE.CylinderGeometry(0.34, 0.34, 0.08, 48);
  wave.scale(1.08, 1, 0.92);
  const flex = toothedRing({ rIn: 0.37, rOut: 0.43, teeth: 60, depth: 0.1, toothH: 0.025, inner: false });
  flex.scale(1.04, 1, 0.96);
  const circ = toothedRing({ rIn: 0.455, rOut: 0.6, teeth: 62, depth: 0.1, toothH: 0.025, inner: true });
  // output flange with bolt circle
  const flange = lathe([
    [0.08, -0.04],
    [0.4, -0.04],
    [0.42, -0.02],
    [0.42, 0.04],
    [0.08, 0.04],
  ]);
  const bolt = new THREE.CylinderGeometry(0.028, 0.028, 0.03, 6);
  const bolts = ring(ACTUATOR_BOLTS, 0.31, 0.05);

  const parts: PartDef[] = [
    { key: "rear", geo: rear, mat: "alu", y: 0, ex: -1.05 },
    { key: "bearing-rear", geo: races, mat: "steel", y: -0.31, ex: -0.62 },
    { key: "balls-rear", geo: ball, mat: "steel", y: -0.31, ex: -0.62, instances: balls },
    { key: "rotor", geo: rotor, mat: "magnet", y: 0, ex: -0.3 },
    { key: "magnets", geo: magnet, mat: "magnet", y: 0, ex: -0.3, instances: magInst },
    { key: "stator", geo: stator, mat: "dark", y: -0.03, ex: 0 },
    { key: "coils", geo: coil, mat: "copper", y: 0, ex: 0, instances: coilInst },
    { key: "bearing-front", geo: races, mat: "steel", y: 0.2, ex: 0.38 },
    { key: "balls-front", geo: ball, mat: "steel", y: 0.2, ex: 0.38, instances: balls },
    { key: "wave", geo: wave, mat: "steel", y: 0.26, ex: 0.62 },
    { key: "flex", geo: flex, mat: "steel", y: 0.3, ex: 0.86 },
    { key: "circ", geo: circ, mat: "alu", y: 0.31, ex: 1.12 },
    { key: "flange", geo: flange, mat: "steel", y: 0.38, ex: 1.4 },
    { key: "bolts", geo: bolt, mat: "dark", y: 0.38, ex: 1.4, instances: bolts },
    { key: "front", geo: front, mat: "alu", y: 0, ex: 1.75 },
  ];
  return parts;
}

/** Merge non-indexed copies of simple geometries that share attributes (position, normal, uv). */
function mergeSimple(list: THREE.BufferGeometry[]) {
  const parts = list.map((g) => (g.index ? g.toNonIndexed() : g));
  const total = parts.reduce((n, g) => n + g.attributes.position.count, 0);
  const out = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "uv"]) {
    const size = parts[0].attributes[name].itemSize;
    const arr = new Float32Array(total * size);
    let o = 0;
    for (const g of parts) {
      arr.set(g.attributes[name].array as Float32Array, o);
      o += g.attributes[name].array.length;
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  list.forEach((g) => g.dispose());
  return out;
}

/** Chamfered joint housing for the arm (unit radius, length `len`, along Y). */
export function housingGeometry(len: number) {
  const h = len / 2;
  return lathe([
    [0, -h],
    [0.9, -h],
    [1, -h + 0.08],
    [1, h - 0.08],
    [0.9, h],
    [0, h],
  ]);
}

/** Tapered link (radius r0 at the joint, r1 at the far end), length L along +Y. */
export function linkGeometry(L: number, r0: number, r1: number) {
  const g = new THREE.CylinderGeometry(r1, r0, L, 40, 1);
  g.translate(0, L / 2, 0);
  return g;
}
