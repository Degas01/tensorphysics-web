"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * Hero centrepiece: a 7-joint arm running a pick-and-place loop.
 *
 * - Renders immediately: the choreography does not wait for the cursor.
 * - Cursor adds camera parallax and nudges the base yaw.
 * - Clicking a joint (or the "Inject shock" button) sends a shock that travels joint by joint
 *   along the kinematic chain; each joint's utilisation u updates live; the worst joint is
 *   tagged and glows amber, then orange once u > 1.
 *
 * The load model is ILLUSTRATIVE (lever arm + speed + shock), not a physics simulation.
 * Performance: no React state per frame; all per-frame work mutates refs; HUD writes go
 * straight to the DOM at 20 Hz; the loop stops when the hero is off screen.
 */

export interface HudRefs {
  rows: { row: HTMLElement | null; bar: HTMLElement | null; val: HTMLElement | null }[];
  umax: HTMLElement | null;
  verdict: HTMLElement | null;
  tag: HTMLElement | null;
  tagText: HTMLElement | null;
}

export interface ArmApi {
  shock: (joint: number, magnitude?: number) => void;
}

const N = 7;
const HOLDS = new THREE.Color("#5cf2c1");
const WARN = new THREE.Color("#f2b84b");
const BREAKS = new THREE.Color("#ff8a3d");
const WHITE = new THREE.Color("#ffffff");

function stressColor(u: number, out: THREE.Color) {
  if (u <= 0.7) return out.copy(HOLDS);
  if (u <= 1.0) return out.copy(HOLDS).lerp(WARN, (u - 0.7) / 0.3);
  return out.copy(WARN).lerp(BREAKS, Math.min((u - 1) / 0.2, 1));
}

const JOINTS = [
  { axis: "y" as const, r: 0.12, L: 0.5 }, // J1 base yaw
  { axis: "z" as const, r: 0.12, L: 0.62 }, // J2 shoulder pitch
  { axis: "y" as const, r: 0.1, L: 0 }, // J3 upper-arm roll
  { axis: "z" as const, r: 0.1, L: 0.56 }, // J4 elbow pitch
  { axis: "y" as const, r: 0.075, L: 0 }, // J5 wrist roll
  { axis: "z" as const, r: 0.075, L: 0.26 }, // J6 wrist pitch
  { axis: "y" as const, r: 0.075, L: 0.12 }, // J7 flange roll
];
const LOAD_GAIN = [0, 0.95, 0, 0.82, 0, 0.55, 0];

// Pick-and-place loop: ready → reach left → lift → swing and extend right → retreat
const POSES = [
  [0.0, 0.35, 0.0, -1.6, 0.0, 1.2, 0.0],
  [-0.78, 0.86, 0.1, -1.02, 0.25, 0.78, 0.7],
  [-0.78, 0.42, 0.1, -1.52, 0.25, 1.12, 0.7],
  [0.82, 0.98, -0.12, -0.8, -0.25, 0.72, -0.5],
  [0.82, 0.38, -0.12, -1.55, -0.25, 1.15, -0.5],
];
const SEG = 2.3; // seconds per move
const smooth = (x: number) => x * x * x * (x * (6 * x - 15) + 10);

function poseAt(t: number, out: number[]) {
  const n = POSES.length;
  const f = (t / SEG) % n;
  const i = Math.floor(f);
  const a = POSES[i];
  const b = POSES[(i + 1) % n];
  // hold 30% of each segment, move for 70%
  const s = smooth(Math.min(Math.max((f - i - 0.3) / 0.7, 0), 1));
  for (let k = 0; k < N; k++) out[k] = a[k] + (b[k] - a[k]) * s;
}

function useGlowTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.25, "rgba(255,255,255,0.45)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
}

function ArmLink({ length, radius, wire }: { length: number; radius: number; wire: THREE.LineBasicMaterial }) {
  const { g, e } = useMemo(() => {
    const g = new THREE.CylinderGeometry(radius * 0.8, radius, length, 8, 1, false);
    g.translate(0, length / 2, 0);
    return { g, e: new THREE.EdgesGeometry(g, 1) };
  }, [length, radius]);
  return (
    <group>
      <mesh geometry={g}>
        <meshStandardMaterial color="#1a212b" metalness={0.55} roughness={0.38} />
      </mesh>
      <lineSegments geometry={e} material={wire} />
    </group>
  );
}

interface Pulse {
  active: boolean;
  from: number;
  dir: 1 | -1;
  t0: number;
}

function Arm({
  hud,
  pointer,
  animate,
  apiRef,
  wrap,
}: {
  hud: React.RefObject<HudRefs>;
  pointer: React.RefObject<{ x: number; y: number }>;
  animate: boolean;
  apiRef: React.Ref<ArmApi>;
  wrap: React.RefObject<HTMLDivElement | null>;
}) {
  const glowTex = useGlowTexture();
  const jointRefs = useRef<(THREE.Group | null)[]>([]);
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);
  const ringMats = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const halos = useRef<(THREE.Sprite | null)[]>([]);
  const pulseMeshes = useRef<(THREE.Mesh | null)[]>([]);
  const ee = useRef<THREE.Object3D>(null);
  const wave = useRef<THREE.Mesh>(null);
  const waveMat = useRef<THREE.MeshBasicMaterial>(null);
  const trail = useRef<THREE.Line>(null);
  const wire = useMemo(() => new THREE.LineBasicMaterial({ color: "#5cf2c1", transparent: true, opacity: 0.75 }), []);
  const { camera, size } = useThree();

  const TRAIL = 140;
  const trailGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3));
    return g;
  }, []);

  const S = useRef({
    q: POSES[0].slice(),
    qd: new Array(N).fill(0),
    target: new Array(N).fill(0),
    shock: new Array(N).fill(0),
    flash: new Array(N).fill(0),
    u: new Array(N).fill(0),
    hover: -1,
    queue: [] as { at: number; j: number; amp: number }[],
    pulses: Array.from({ length: 6 }, (): Pulse => ({ active: false, from: 0, dir: 1, t0: 0 })),
    wave: 1,
    waveJoint: 6,
    time: 0,
    lastHud: 0,
    trailInit: false,
    worst: 0,
  });
  const jp = useMemo(() => Array.from({ length: N + 1 }, () => new THREE.Vector3()), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const col = useMemo(() => new THREE.Color(), []);

  const trailLine = useMemo(() => {
    const l = new THREE.Line(
      trailGeo,
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    l.frustumCulled = false;
    return l;
  }, [trailGeo]);

  const shock = useCallback((j: number, magnitude = 1) => {
      const s = S.current;
      const now = s.time;
      for (let k = 0; k < N; k++) {
        const d = Math.abs(k - j);
        s.queue.push({ at: now + d * 0.075, j: k, amp: magnitude * Math.pow(0.88, d) });
      }
      let launched = 0;
      for (const p of s.pulses) {
        if (p.active || launched === 2) continue;
        if (launched === 0 && j < N) Object.assign(p, { active: true, from: j, dir: 1, t0: now });
        else if (launched === 1 && j > 0) Object.assign(p, { active: true, from: j, dir: -1, t0: now });
        launched++;
      }
      s.wave = 0;
      s.waveJoint = j;
  }, []);
  useImperativeHandle(apiRef, () => ({ shock }), [shock]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const s = S.current;
    s.time += dt;
    const t = s.time;

    // 1. targets: choreography (+ cursor nudge on the base)
    if (animate) poseAt(t + 0.8, s.target);
    else for (let k = 0; k < N; k++) s.target[k] = POSES[0][k];
    s.target[0] += pointer.current.x * 0.35;

    // 2. due shocks
    if (s.queue.length) {
      for (let i = s.queue.length - 1; i >= 0; i--) {
        const e = s.queue[i];
        if (e.at <= t) {
          s.shock[e.j] = Math.min(s.shock[e.j] + 0.86 * e.amp, 1.5);
          s.flash[e.j] = 1;
          s.qd[e.j] += (Math.random() < 0.5 ? -1 : 1) * (2.5 + 3 * Math.random()) * e.amp;
          s.queue.splice(i, 1);
        }
      }
    }

    // 3. joint dynamics: critically damped follow
    const k = 42;
    const c = 2 * Math.sqrt(k);
    for (let i = 0; i < N; i++) {
      s.qd[i] += (k * (s.target[i] - s.q[i]) - c * s.qd[i]) * dt;
      s.q[i] += s.qd[i] * dt;
      const g = jointRefs.current[i];
      if (g) {
        if (JOINTS[i].axis === "y") g.rotation.y = s.q[i];
        else g.rotation.z = s.q[i];
      }
      s.shock[i] *= Math.exp(-dt * 0.55);
      s.flash[i] *= Math.exp(-dt * 5);
    }

    // 4. world positions along the chain
    for (let i = 0; i < N; i++) jointRefs.current[i]?.getWorldPosition(jp[i]);
    ee.current?.getWorldPosition(jp[N]);

    // 5. illustrative load and visuals
    let worst = 0;
    for (let i = 0; i < N; i++) {
      const lever = JOINTS[i].axis === "z" ? Math.hypot(jp[N].x - jp[i].x, jp[N].z - jp[i].z) : 0;
      const reach = JOINTS[i].axis === "z" ? (lever / 1.45) * LOAD_GAIN[i] + 0.06 : 0.16;
      const speed = Math.min(Math.abs(s.qd[i]) * 0.11, 0.42);
      s.u[i] = reach + speed + s.shock[i];
      if (s.u[i] > s.u[worst]) worst = i;
    }
    s.worst = worst;

    for (let i = 0; i < N; i++) {
      const u = s.u[i];
      stressColor(u, col);
      const m = ringMats.current[i];
      if (m) {
        m.color.copy(col);
        m.emissive.copy(col).lerp(WHITE, s.flash[i] * 0.6);
        m.emissiveIntensity = 0.5 + Math.min(u, 1.3) * 0.8 + s.flash[i] * 2.5 + (s.hover === i ? 0.8 : 0);
      }
      const r = ringRefs.current[i];
      if (r) r.scale.setScalar(1 + s.flash[i] * 0.55 + (s.hover === i ? 0.12 : 0));
      const h = halos.current[i];
      if (h) {
        const isWorst = i === worst && u > 0.7;
        const sc = JOINTS[i].r * (2.2 + Math.max(u - 0.5, 0) * 3 + s.flash[i] * 3 + (isWorst ? 1.8 : 0));
        h.scale.setScalar(sc);
        (h.material as THREE.SpriteMaterial).color.copy(col);
        (h.material as THREE.SpriteMaterial).opacity = 0.18 + Math.min(Math.max(u - 0.5, 0), 0.8) * 0.5 + s.flash[i] * 0.6 + (isWorst ? 0.2 : 0);
      }
    }
    stressColor(s.u[worst], col);
    wire.color.lerp(col, 0.12);

    // 6. travelling shock pulses along the chain
    s.pulses.forEach((p, idx) => {
      const mesh = pulseMeshes.current[idx];
      if (!mesh) return;
      if (!p.active) {
        mesh.visible = false;
        return;
      }
      const pos = p.from + p.dir * ((t - p.t0) / 0.075);
      const end = p.dir > 0 ? N : 0;
      if ((p.dir > 0 && pos >= end) || (p.dir < 0 && pos <= end)) {
        p.active = false;
        mesh.visible = false;
        return;
      }
      const a = Math.floor(pos);
      const f = pos - a;
      mesh.position.lerpVectors(jp[Math.max(0, Math.min(N, a))], jp[Math.max(0, Math.min(N, a + 1))], f);
      mesh.visible = true;
    });

    // 7. expanding shockwave at the origin joint
    if (wave.current && waveMat.current) {
      s.wave = Math.min(s.wave + dt * 1.5, 1);
      wave.current.position.copy(jp[Math.min(s.waveJoint, N)]);
      wave.current.scale.setScalar(0.05 + s.wave * 1.5);
      waveMat.current.opacity = (1 - s.wave) * 0.75;
      wave.current.lookAt(camera.position);
    }

    // 8. end-effector trail
    if (trail.current) {
      const pos = trailGeo.attributes.position as THREE.BufferAttribute;
      const cols = trailGeo.attributes.color as THREE.BufferAttribute;
      const pa = pos.array as Float32Array;
      if (!s.trailInit) {
        for (let i = 0; i < TRAIL; i++) jp[N].toArray(pa, i * 3);
        s.trailInit = true;
      }
      pa.copyWithin(0, 3);
      jp[N].toArray(pa, (TRAIL - 1) * 3);
      const ca = cols.array as Float32Array;
      for (let i = 0; i < TRAIL; i++) {
        const a = (i / TRAIL) ** 2 * 0.9;
        ca[i * 3] = HOLDS.r * a;
        ca[i * 3 + 1] = HOLDS.g * a;
        ca[i * 3 + 2] = HOLDS.b * a;
      }
      pos.needsUpdate = true;
      cols.needsUpdate = true;
    }

    // 9. HUD + worst-joint tag at 20 Hz, straight to the DOM
    const H = hud.current;
    if (H && t - s.lastHud > 0.05) {
      s.lastHud = t;
      for (let i = 0; i < N; i++) {
        const row = H.rows[i];
        if (!row) continue;
        const u = s.u[i];
        if (row.val) row.val.textContent = u.toFixed(2);
        if (row.bar) {
          row.bar.style.transform = `scaleX(${Math.min(u / 1.3, 1).toFixed(3)})`;
          row.bar.style.backgroundColor = `#${stressColor(u, col).getHexString()}`;
        }
        if (row.row) row.row.dataset.state = i === worst ? (u > 1 ? "breaks" : u > 0.85 ? "warn" : "worst") : "";
      }
      const um = s.u[worst];
      if (H.umax) H.umax.textContent = um.toFixed(2);
      if (H.verdict) {
        H.verdict.textContent = um > 1 ? "BREAKS" : "HOLDS";
        H.verdict.dataset.state = um > 1 ? "breaks" : "holds";
      }
      if (H.tag && H.tagText && wrap.current) {
        v.copy(jp[worst]).project(camera);
        const x = ((v.x + 1) / 2) * size.width;
        const y = ((1 - v.y) / 2) * size.height;
        H.tag.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        H.tag.dataset.state = um > 1 ? "breaks" : um > 0.85 ? "warn" : "holds";
        H.tagText.textContent = `J${worst + 1} · u ${um.toFixed(2)}`;
      }
    }
  });

  const onOver = (i: number) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    S.current.hover = i;
    document.body.style.cursor = "pointer";
  };
  const onOut = () => {
    S.current.hover = -1;
    document.body.style.cursor = "";
  };
  const onDown = (i: number) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    shock(i, 1.45);
  };

  const chain = (i: number): React.ReactNode => {
    if (i >= N) {
      return (
        <group>
          <object3D ref={ee} position={[0, 0.07, 0]} />
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[0.09, 0.07, 0.09]} />
            <meshStandardMaterial color="#ff8a3d" emissive="#ff8a3d" emissiveIntensity={0.7} toneMapped={false} />
          </mesh>
        </group>
      );
    }
    const J = JOINTS[i];
    return (
      <group
        ref={(el) => {
          jointRefs.current[i] = el;
        }}
      >
        <mesh
          ref={(el) => {
            ringRefs.current[i] = el;
          }}
          rotation={J.axis === "y" ? [Math.PI / 2, 0, 0] : [0, 0, 0]}
        >
          <torusGeometry args={[J.r * 1.2, J.r * 0.15, 12, 40]} />
          <meshStandardMaterial
            ref={(m) => {
              ringMats.current[i] = m;
            }}
            color="#5cf2c1"
            emissive="#5cf2c1"
            emissiveIntensity={0.8}
            toneMapped={false}
          />
        </mesh>
        <sprite
          ref={(el) => {
            halos.current[i] = el;
          }}
        >
          <spriteMaterial map={glowTex} color="#5cf2c1" transparent opacity={0.2} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>
        {/* generous invisible hit target so joints are easy to click */}
        <mesh onPointerOver={onOver(i)} onPointerOut={onOut} onPointerDown={onDown(i)}>
          <sphereGeometry args={[J.r * 1.6, 12, 10]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        {J.L > 0 && <ArmLink length={J.L} radius={J.r} wire={wire} />}
        <group position={[0, J.L, 0]}>{chain(i + 1)}</group>
      </group>
    );
  };

  return (
    <group position={[0, -1.02, 0]}>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.3, 0.36, 0.08, 40]} />
        <meshStandardMaterial color="#0a0d12" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.081, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.33, 0.345, 64]} />
        <meshBasicMaterial color="#5cf2c1" transparent opacity={0.5} toneMapped={false} />
      </mesh>
      <group position={[0, 0.08, 0]}>{chain(0)}</group>

      {Array.from({ length: 6 }, (_, i) => (
        <mesh
          key={i}
          visible={false}
          ref={(el) => {
            pulseMeshes.current[i] = el;
          }}
        >
          <sphereGeometry args={[0.035, 12, 10]} />
          <meshBasicMaterial color="#ffd2b0" toneMapped={false} />
        </mesh>
      ))}

      <mesh ref={wave}>
        <ringGeometry args={[0.2, 0.215, 64]} />
        <meshBasicMaterial ref={waveMat} color="#ff8a3d" transparent opacity={0} side={THREE.DoubleSide} toneMapped={false} depthWrite={false} />
      </mesh>

      <primitive object={trailLine} ref={trail} />

      {/* instrument floor: polar rings and radial ticks, fading with fog */}
      <polarGridHelper args={[3, 24, 6, 96, "#18322c", "#121820"]} />
    </group>
  );
}

/** Slow cinematic orbit plus cursor parallax. */
function Rig({ pointer, animate }: { pointer: React.RefObject<{ x: number; y: number }>; animate: boolean }) {
  const cur = useRef({ yaw: 0, pitch: 0 });
  const look = useMemo(() => new THREE.Vector3(0, -0.05, 0), []);
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const targetYaw = (animate ? 0.22 * Math.sin(t * 0.07) : 0) + pointer.current.x * 0.18;
    const targetPitch = pointer.current.y * 0.08;
    const a = 1 - Math.exp(-dt * 2.2);
    cur.current.yaw += (targetYaw - cur.current.yaw) * a;
    cur.current.pitch += (targetPitch - cur.current.pitch) * a;
    const R = 3.95;
    const base = 0.66;
    const yaw = base + cur.current.yaw;
    state.camera.position.set(R * Math.sin(yaw), 1.2 + cur.current.pitch * 2.2, R * Math.cos(yaw));
    state.camera.lookAt(look);
  });
  return null;
}

export default function ArmScene({
  hud,
  animate,
  apiRef,
  onReady,
}: {
  hud: React.RefObject<HudRefs>;
  animate: boolean;
  apiRef: React.Ref<ArmApi>;
  onReady?: () => void;
}) {
  const pointer = useRef({ x: 0, y: 0 });
  const wrap = useRef<HTMLDivElement>(null);
  const loop = useRef<"always" | "never">("always");
  const setLoop = useRef<((v: "always" | "never") => void) | null>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      const next = e.isIntersecting ? "always" : "never";
      if (next !== loop.current) {
        loop.current = next;
        setLoop.current?.(next);
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} className="absolute inset-0">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [2.6, 1.2, 3.4], fov: 36, near: 0.1, far: 30 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={(st) => {
          setLoop.current = (v) => st.setFrameloop(v);
          st.gl.setClearColor(0x000000, 0);
          st.scene.fog = new THREE.Fog("#07080b", 4.2, 8.5);
          requestAnimationFrame(() => onReady?.());
        }}
        onPointerMissed={() => (apiRef as React.RefObject<ArmApi | null>).current?.shock(6, 0.9)}
      >
        <hemisphereLight args={["#cfe9ff", "#0a0c10", 0.55]} />
        <ambientLight intensity={0.15} />
        <directionalLight position={[3, 4.5, 2]} intensity={1.15} />
        <directionalLight position={[-3, 1.5, -2.5]} intensity={0.9} color="#5cf2c1" />
        <pointLight position={[-1.6, 0.6, 1.2]} intensity={2.2} color="#a98bff" distance={5} />
        <Rig pointer={pointer} animate={animate} />
        <Arm hud={hud} pointer={pointer} animate={animate} apiRef={apiRef} wrap={wrap} />
      </Canvas>
    </div>
  );
}
