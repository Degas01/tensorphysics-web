"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createThermalMaterial } from "@/lib/three/thermal";
import { useDispose } from "@/lib/three/useDispose";
import { Studio } from "@/lib/three/Studio";

/**
 * Hero centrepiece: a procedural 7-DOF arm (J1-J7) running a pick-and-place loop.
 *
 * - Brushed titanium links and matte carbon sleeves (PBR, studio reflections from RoomEnvironment),
 *   cyan rim light, technical floor grid.
 * - Desktop: drag to orbit. Hover/click a joint, or "Inject adversarial shock", to send a shock
 *   that travels joint by joint along the chain. Each joint housing runs a thermal stress shader
 *   driven by its utilisation u; shocked joints micro-oscillate.
 * - The load model is ILLUSTRATIVE (lever arm + speed + shock), not a physics simulation.
 *
 * Performance: no React state per frame; per-frame work mutates refs; HUD writes go straight to the
 * DOM at 20 Hz; the loop stops off screen. Everything created outside JSX is disposed on unmount.
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
const HOLDS = new THREE.Color("#00e5ff");
const WARN = new THREE.Color("#f2b84b");
const BREAKS = new THREE.Color("#ff4d00");

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

// Pick-and-place loop: ready -> reach left -> lift -> swing and extend right -> retreat
const POSES = [
  [0.0, 0.35, 0.0, -1.6, 0.0, 1.2, 0.0],
  [-0.78, 0.86, 0.1, -1.02, 0.25, 0.78, 0.7],
  [-0.78, 0.42, 0.1, -1.52, 0.25, 1.12, 0.7],
  [0.82, 0.98, -0.12, -0.8, -0.25, 0.72, -0.5],
  [0.82, 0.38, -0.12, -1.55, -0.25, 1.15, -0.5],
];
const SEG = 2.3;
const smooth = (x: number) => x * x * x * (x * (6 * x - 15) + 10);

function poseAt(t: number, out: number[]) {
  const n = POSES.length;
  const f = (t / SEG) % n;
  const i = Math.floor(f);
  const a = POSES[i];
  const b = POSES[(i + 1) % n];
  const s = smooth(Math.min(Math.max((f - i - 0.3) / 0.7, 0), 1));
  for (let k = 0; k < N; k++) out[k] = a[k] + (b[k] - a[k]) * s;
}

function useMaterials() {
  const m = useMemo(
    () => ({
      titanium: new THREE.MeshPhysicalMaterial({
        color: "#5b616b",
        metalness: 0.92,
        roughness: 0.34,
        anisotropy: 0.7,
        clearcoat: 0.25,
        clearcoatRoughness: 0.4,
      }),
      carbon: new THREE.MeshPhysicalMaterial({ color: "#14171b", metalness: 0.15, roughness: 0.72, sheen: 0.4, sheenColor: new THREE.Color("#1d2630") }),
      base: new THREE.MeshPhysicalMaterial({ color: "#0d1014", metalness: 0.8, roughness: 0.42 }),
      edge: new THREE.LineBasicMaterial({ color: "#00e5ff", transparent: true, opacity: 0.22 }),
    }),
    [],
  );
  useDispose(m.titanium, m.carbon, m.base, m.edge);
  return m;
}

function ArmLink({ length, radius, mats }: { length: number; radius: number; mats: ReturnType<typeof useMaterials> }) {
  const geo = useMemo(() => {
    const core = new THREE.CylinderGeometry(radius * 0.72, radius * 0.86, length, 28, 1);
    core.translate(0, length / 2, 0);
    const sleeve = new THREE.CylinderGeometry(radius * 0.8, radius * 0.92, length * 0.5, 28, 1);
    sleeve.translate(0, length * 0.42, 0);
    const edges = new THREE.EdgesGeometry(core, 30);
    return { core, sleeve, edges };
  }, [length, radius]);
  useDispose(geo.core, geo.sleeve, geo.edges);
  return (
    <group>
      <mesh geometry={geo.core} material={mats.titanium} />
      <mesh geometry={geo.sleeve} material={mats.carbon} />
      <lineSegments geometry={geo.edges} material={mats.edge} />
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
  const mats = useMaterials();
  const thermals = useMemo(() => JOINTS.map(() => createThermalMaterial()), []);
  useDispose(...thermals);

  const jointRefs = useRef<(THREE.Group | null)[]>([]);
  const ringMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const pulseMeshes = useRef<(THREE.Mesh | null)[]>([]);
  const ee = useRef<THREE.Object3D>(null);
  const wave = useRef<THREE.Mesh>(null);
  const waveMat = useRef<THREE.MeshBasicMaterial>(null);
  const { camera, size } = useThree();

  const TRAIL = 140;
  const trailLine = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3));
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    l.frustumCulled = false;
    return l;
  }, []);
  useDispose(trailLine.geometry, trailLine.material as THREE.Material);

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
  });
  const jp = useMemo(() => Array.from({ length: N + 1 }, () => new THREE.Vector3()), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const col = useMemo(() => new THREE.Color(), []);

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

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const s = S.current;
    s.time += dt;
    const t = s.time;

    if (animate) poseAt(t + 0.8, s.target);
    else for (let k = 0; k < N; k++) s.target[k] = POSES[0][k];
    s.target[0] += pointer.current.x * 0.35;

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

    // Joint dynamics: critically damped follow + micro-oscillation while a shock is live
    const k = 42;
    const c = 2 * Math.sqrt(k);
    for (let i = 0; i < N; i++) {
      s.qd[i] += (k * (s.target[i] - s.q[i]) - c * s.qd[i]) * dt;
      s.q[i] += s.qd[i] * dt;
      const jitter = animate ? s.shock[i] * 0.03 * Math.sin(t * 58 + i * 1.7) : 0;
      const g = jointRefs.current[i];
      if (g) {
        if (JOINTS[i].axis === "y") g.rotation.y = s.q[i] + jitter;
        else g.rotation.z = s.q[i] + jitter;
      }
      s.shock[i] *= Math.exp(-dt * 0.55);
      s.flash[i] *= Math.exp(-dt * 5);
    }

    for (let i = 0; i < N; i++) jointRefs.current[i]?.getWorldPosition(jp[i]);
    ee.current?.getWorldPosition(jp[N]);

    let worst = 0;
    for (let i = 0; i < N; i++) {
      const lever = JOINTS[i].axis === "z" ? Math.hypot(jp[N].x - jp[i].x, jp[N].z - jp[i].z) : 0;
      const reach = JOINTS[i].axis === "z" ? (lever / 1.45) * LOAD_GAIN[i] + 0.06 : 0.16;
      const speed = Math.min(Math.abs(s.qd[i]) * 0.11, 0.42);
      s.u[i] = reach + speed + s.shock[i];
      if (s.u[i] > s.u[worst]) worst = i;
    }

    for (let i = 0; i < N; i++) {
      const u = s.u[i];
      const th = thermals[i];
      th.uniforms.uHeat.value = u + s.flash[i] * 0.25 + (s.hover === i ? 0.08 : 0);
      th.uniforms.uTime.value = t;
      const rm = ringMats.current[i];
      if (rm) {
        stressColor(u, col);
        rm.color.copy(col);
        rm.opacity = 0.55 + s.flash[i] * 0.45 + (s.hover === i ? 0.3 : 0);
      }
    }

    // Travelling shock pulses along the chain
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
      mesh.position.lerpVectors(jp[Math.max(0, Math.min(N, a))], jp[Math.max(0, Math.min(N, a + 1))], pos - a);
      mesh.visible = true;
    });

    if (wave.current && waveMat.current) {
      s.wave = Math.min(s.wave + dt * 1.5, 1);
      wave.current.position.copy(jp[Math.min(s.waveJoint, N)]);
      wave.current.scale.setScalar(0.05 + s.wave * 1.5);
      waveMat.current.opacity = (1 - s.wave) * 0.7;
      wave.current.lookAt(camera.position);
    }

    // End-effector trail
    const pos = trailLine.geometry.attributes.position as THREE.BufferAttribute;
    const cols = trailLine.geometry.attributes.color as THREE.BufferAttribute;
    const pa = pos.array as Float32Array;
    if (!s.trailInit) {
      for (let i = 0; i < TRAIL; i++) jp[N].toArray(pa, i * 3);
      s.trailInit = true;
    }
    pa.copyWithin(0, 3);
    jp[N].toArray(pa, (TRAIL - 1) * 3);
    const ca = cols.array as Float32Array;
    for (let i = 0; i < TRAIL; i++) {
      const a = (i / TRAIL) ** 2 * 0.7;
      ca[i * 3] = HOLDS.r * a;
      ca[i * 3 + 1] = HOLDS.g * a;
      ca[i * 3 + 2] = HOLDS.b * a;
    }
    pos.needsUpdate = true;
    cols.needsUpdate = true;

    // HUD at 20 Hz, straight to the DOM
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
        H.tagText.textContent = `J${worst + 1} · u = ${um.toFixed(2)}${um > 1 ? " · BREAKS" : ""}`;
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
  // Click (not drag): a drag orbits the camera instead.
  const onClick = (i: number) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return;
    shock(i, 1.45);
  };

  const chain = (i: number): React.ReactNode => {
    if (i >= N) {
      return (
        <group>
          <object3D ref={ee} position={[0, 0.07, 0]} />
          <mesh position={[0, 0.045, 0]} material={mats.titanium}>
            <cylinderGeometry args={[0.05, 0.06, 0.05, 24]} />
          </mesh>
          <mesh position={[0.03, 0.1, 0]}>
            <boxGeometry args={[0.018, 0.07, 0.05]} />
            <meshStandardMaterial color="#ff4d00" emissive="#ff4d00" emissiveIntensity={0.6} />
          </mesh>
          <mesh position={[-0.03, 0.1, 0]}>
            <boxGeometry args={[0.018, 0.07, 0.05]} />
            <meshStandardMaterial color="#ff4d00" emissive="#ff4d00" emissiveIntensity={0.6} />
          </mesh>
        </group>
      );
    }
    const J = JOINTS[i];
    const housingRot: [number, number, number] = J.axis === "y" ? [0, 0, 0] : [Math.PI / 2, 0, 0];
    return (
      <group
        ref={(el) => {
          jointRefs.current[i] = el;
        }}
      >
        {/* actuator housing: thermal stress shader */}
        <mesh rotation={housingRot} material={thermals[i]}>
          <cylinderGeometry args={[J.r * 1.08, J.r * 1.08, J.r * 1.7, 36]} />
        </mesh>
        {/* status ring */}
        <mesh rotation={J.axis === "y" ? [Math.PI / 2, 0, 0] : [0, 0, 0]}>
          <torusGeometry args={[J.r * 1.12, J.r * 0.045, 8, 48]} />
          <meshBasicMaterial
            ref={(m) => {
              ringMats.current[i] = m;
            }}
            color="#00e5ff"
            transparent
            opacity={0.6}
            toneMapped={false}
          />
        </mesh>
        {/* generous invisible hit target */}
        <mesh onPointerOver={onOver(i)} onPointerOut={onOut} onClick={onClick(i)}>
          <sphereGeometry args={[J.r * 1.7, 12, 10]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        {J.L > 0 && <ArmLink length={J.L} radius={J.r} mats={mats} />}
        <group position={[0, J.L, 0]}>{chain(i + 1)}</group>
      </group>
    );
  };

  return (
    <group position={[0, -1.02, 0]}>
      <mesh position={[0, 0.04, 0]} material={mats.base}>
        <cylinderGeometry args={[0.3, 0.36, 0.08, 48]} />
      </mesh>
      <mesh position={[0, 0.081, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.33, 0.342, 72]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.45} toneMapped={false} />
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
          <sphereGeometry args={[0.03, 12, 10]} />
          <meshBasicMaterial color="#ffb48a" toneMapped={false} />
        </mesh>
      ))}

      <mesh ref={wave}>
        <ringGeometry args={[0.2, 0.212, 64]} />
        <meshBasicMaterial ref={waveMat} color="#ff4d00" transparent opacity={0} side={THREE.DoubleSide} toneMapped={false} depthWrite={false} />
      </mesh>

      <primitive object={trailLine} />

      {/* technical floor: polar rings + square grid, fading into fog */}
      <polarGridHelper args={[3, 24, 6, 96, "#10343a", "#121820"]} />
      <gridHelper args={[8, 32, "#151b22", "#0d1117"]} position={[0, -0.002, 0]} />
    </group>
  );
}

/** Desktop: drag to orbit (no zoom, so the page still scrolls), slow auto-rotate. Touch: gentle auto-orbit only. */
function Camera({ pointer, animate, orbit }: { pointer: React.RefObject<{ x: number; y: number }>; animate: boolean; orbit: boolean }) {
  const { camera, gl } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  const look = useMemo(() => new THREE.Vector3(0, -0.05, 0), []);

  useEffect(() => {
    camera.position.set(3.95 * Math.sin(0.66), 1.2, 3.95 * Math.cos(0.66));
    camera.lookAt(look);
    if (!orbit) return;
    const c = new OrbitControls(camera, gl.domElement);
    c.target.copy(look);
    c.enableZoom = false;
    c.enablePan = false;
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.minPolarAngle = 0.6;
    c.maxPolarAngle = 1.55;
    c.rotateSpeed = 0.6;
    c.autoRotate = animate;
    c.autoRotateSpeed = 0.35;
    controls.current = c;
    return () => {
      c.dispose();
      controls.current = null;
    };
  }, [camera, gl, look, orbit, animate]);

  const cur = useRef({ yaw: 0, pitch: 0 });
  useFrame((state, dt) => {
    if (controls.current) {
      controls.current.update();
      return;
    }
    const t = state.clock.elapsedTime;
    const targetYaw = (animate ? 0.22 * Math.sin(t * 0.07) : 0) + pointer.current.x * 0.12;
    const a = 1 - Math.exp(-dt * 2.2);
    cur.current.yaw += (targetYaw - cur.current.yaw) * a;
    cur.current.pitch += (pointer.current.y * 0.06 - cur.current.pitch) * a;
    const yaw = 0.66 + cur.current.yaw;
    state.camera.position.set(3.95 * Math.sin(yaw), 1.2 + cur.current.pitch * 2, 3.95 * Math.cos(yaw));
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
  const orbit = useMemo(() => typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches, []);

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
    <div ref={wrap} className={orbit ? "absolute inset-0 cursor-grab active:cursor-grabbing" : "absolute inset-0"}>
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [2.4, 1.2, 3.1], fov: 36, near: 0.1, far: 30 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={(st) => {
          setLoop.current = (v) => st.setFrameloop(v);
          st.gl.setClearColor(0x000000, 0);
          st.gl.toneMapping = THREE.ACESFilmicToneMapping;
          st.gl.toneMappingExposure = 1.05;
          st.scene.fog = new THREE.Fog("#06070a", 4.4, 9);
          requestAnimationFrame(() => onReady?.());
        }}
      >
        <Studio />
        <hemisphereLight args={["#cfe9ff", "#06070a", 0.35]} />
        <directionalLight position={[3, 4.5, 2]} intensity={1.4} />
        {/* cyan rim from behind */}
        <directionalLight position={[-2.5, 1.8, -3.2]} intensity={2.2} color="#00e5ff" />
        <pointLight position={[1.6, 0.4, -1.4]} intensity={1.2} color="#ff4d00" distance={4} />
        <Camera pointer={pointer} animate={animate} orbit={orbit} />
        <Arm hud={hud} pointer={pointer} animate={animate} apiRef={apiRef} wrap={wrap} />
      </Canvas>
    </div>
  );
}
