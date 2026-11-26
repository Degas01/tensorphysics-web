"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { MotionValue } from "framer-motion";
import * as THREE from "three";
import { FLOOR_BOX, type StackSim } from "@/lib/stackSim";
import { Studio, useOnScreenLoop } from "@/lib/three/Studio";
import { useDispose } from "@/lib/three/useDispose";
import { HybridCameraRig, frameShot, type Shot } from "./HybridCameraRig";
import type { Telemetry } from "./OpticalHudOverlay";

/**
 * PhysicsFuzz studio: the page's own 2D penalty-contact demo solver (lib/stackSim, seed #64), drawn as machined
 * steel blocks on a thin plate raised over a gridded plinth, so a tunnelling block visibly drops through.
 * Act 01 is a 35mm wide shot; Act 02 an 85mm macro that follows the most loaded contact.
 */

const ss = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};
const BASE_Y = -0.62;
const MAXV = 64;

function World({
  simRef,
  onTick,
  focus,
}: {
  simRef: React.RefObject<StackSim | null>;
  onTick: (s: StackSim) => void;
  focus: React.RefObject<{ x: number; y: number; f: number; failed: boolean; kind: string }>;
}) {
  const mats = useMemo(
    () => ({
      block: new THREE.MeshPhysicalMaterial({ color: "#8e9299", metalness: 0.95, roughness: 0.18, clearcoat: 0.2 }),
      blockHot: new THREE.MeshPhysicalMaterial({ color: "#8e9299", metalness: 0.9, roughness: 0.3, emissive: new THREE.Color("#ff4d00"), emissiveIntensity: 0.55 }),
      tungsten: new THREE.MeshPhysicalMaterial({ color: "#3a3d43", metalness: 0.92, roughness: 0.25 }),
      plate: new THREE.MeshPhysicalMaterial({ color: "#18191c", metalness: 0.88, roughness: 0.24, clearcoat: 0.35 }),
      plinth: new THREE.MeshPhysicalMaterial({ color: "#0b0d10", metalness: 0.4, roughness: 0.62 }),
      floor: new THREE.MeshStandardMaterial({ color: "#07080a", roughness: 0.92 }),
    }),
    [],
  );
  const geo = useMemo(() => {
    const box = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
    return { box };
  }, []);
  const vec = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAXV * 2 * 3), 3));
    const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: "#f4f6f8" }));
    l.frustumCulled = false;
    return l;
  }, []);
  useDispose(...Object.values(mats), geo.box, vec.geometry, vec.material as THREE.Material);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((_, dt) => {
    const s = simRef.current;
    if (!s) return;
    s.advance(Math.min(dt, 1 / 20));
    onTick(s);
    const hot = s.failed && s.events.some((e) => e.kind === "explosion");
    s.bodies.forEach((b, i) => {
      const m = meshes.current[i];
      if (!m) return;
      m.visible = Math.abs(b.y) < 30 && Math.abs(b.x) < 30;
      m.position.set(b.x, b.y, 0);
      m.scale.set(b.hw * 2, b.hh * 2, b.proj ? b.hw * 2 : 0.4);
      if (!b.proj) m.material = hot ? mats.blockHot : mats.block;
    });
    // contact force vectors (length ~ force), tungsten white while it holds, flat orange once it fails
    const va = vec.geometry.attributes.position.array as Float32Array;
    let nv = 0;
    let best = { x: 0.35, y: 0, f: 0 };
    for (const c of s.contacts) {
      if (nv >= MAXV || Math.abs(c.x) > 6 || Math.abs(c.y) > 6) continue;
      const len = Math.min(c.f * 0.035, 1.6);
      va.set([c.x, c.y, 0.205, c.x + c.nx * len, c.y + c.ny * len, 0.205], nv * 6);
      nv++;
      if (c.f > best.f) best = { x: c.x, y: c.y, f: c.f };
    }
    vec.geometry.setDrawRange(0, nv * 2);
    vec.geometry.attributes.position.needsUpdate = true;
    (vec.material as THREE.LineBasicMaterial).color.set(s.failed ? "#ff4d00" : "#f4f6f8");
    const F = focus.current;
    const k = 1 - Math.exp(-dt * 3);
    F.x += (best.x - F.x) * k;
    F.y += (best.y - F.y) * k;
    F.f = best.f;
    F.failed = s.failed;
    F.kind = s.events.find((e) => e.kind !== "settled")?.kind ?? (s.events.some((e) => e.kind === "settled") ? "settled" : "running");
  });

  return (
    <group>
      {/* thin plate on four standoffs, over a gridded plinth */}
      <mesh position={[FLOOR_BOX.x, FLOOR_BOX.y, 0]} scale={[FLOOR_BOX.hw * 2, FLOOR_BOX.hh * 2, 1.2]} geometry={geo.box} material={mats.plate} castShadow receiveShadow />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * (FLOOR_BOX.hw - 0.12), (BASE_Y + FLOOR_BOX.y * 2) / 2, sz * 0.48]} material={mats.plate} castShadow>
            <cylinderGeometry args={[0.035, 0.035, -BASE_Y - 0.06, 16]} />
          </mesh>
        )),
      )}
      <mesh position={[0, BASE_Y - 0.06, 0]} material={mats.plinth} receiveShadow>
        <boxGeometry args={[6.4, 0.12, 2.6]} />
      </mesh>
      <gridHelper args={[6.4, 32, "#2a2f37", "#161a20"]} position={[0, BASE_Y + 0.002, 0]} scale={[1, 1, 2.6 / 6.4]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, BASE_Y - 0.12, 0]} material={mats.floor} receiveShadow>
        <planeGeometry args={[60, 60]} />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => (
        <mesh
          key={i}
          geometry={geo.box}
          material={i === 6 ? mats.tungsten : mats.block}
          castShadow
          receiveShadow
          ref={(el) => {
            meshes.current[i] = el;
          }}
        />
      ))}
      <primitive object={vec} />
    </group>
  );
}

export default function FuzzStudioScene({
  progress,
  motionOff,
  narrow,
  telemetry,
  simRef,
  onTick,
  onReady,
}: {
  progress: MotionValue<number>;
  motionOff: boolean;
  narrow: boolean;
  telemetry: React.RefObject<Telemetry>;
  simRef: React.RefObject<StackSim | null>;
  onTick: (s: StackSim) => void;
  onReady?: () => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const setLoop = useRef<((v: "always" | "never") => void) | null>(null);
  useOnScreenLoop(wrap, setLoop);
  const focus = useRef({ x: 0.35, y: 0, f: 0, failed: false, kind: "running" });
  const v = useMemo(
    () => ({
      K: [0, 1].map((): Shot => ({ pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 32 })),
      look: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      lastKind: "",
    }),
    [],
  );

  const shot = (p: number, out: Shot) => {
    const [K0, K1] = v.K;
    const F = focus.current;
    frameShot(K0, v.look.set(narrow ? 0.2 : -0.9, narrow ? 0.4 : 1.0, 0), v.dir.set(0.32, 0.22, 1), narrow ? 9.5 : 7.4, 35);
    const fx = THREE.MathUtils.clamp(F.x, -2.4, 2.4);
    const fy = THREE.MathUtils.clamp(F.y, -0.5, 2.6);
    frameShot(K1, v.look.set(fx - (narrow ? 0 : 0.32), fy - (narrow ? 0.18 : 0), 0.1), v.dir.set(0.62, 0.16, 1), narrow ? 2.4 : 1.8, 85);
    const k = ss(0.36, 0.6, p);
    out.pos.copy(K0.pos).lerp(K1.pos, k);
    out.look.copy(K0.look).lerp(K1.look, k);
    out.fov = K0.fov + (K1.fov - K0.fov) * k;

    const T = telemetry.current;
    T.target = k < 0.5 ? "CONTACT STACK · 6 BLOCKS + PROJECTILE" : `CONTACT · MAX LOAD [f=${Math.min(F.f, 9999).toFixed(0)}/kg]`;
    T.coords = [fx, fy, 0.2];
    T.status = F.failed ? "limit" : F.kind === "settled" ? "nominal" : "idle";
    T.statusText = F.failed ? `LIMIT EXCEEDED · ${F.kind.toUpperCase()}` : F.kind === "settled" ? "NOMINAL · STABLE" : "RUNNING";
    if (F.kind !== v.lastKind) {
      v.lastKind = F.kind;
      T.lock = performance.now();
    }
  };

  return (
    <div ref={wrap} className="absolute inset-0">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [2, 2, 7], fov: 36, near: 0.05, far: 80 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={(st) => {
          setLoop.current = (x) => st.setFrameloop(x);
          st.gl.setClearColor("#040507", 1);
          st.gl.toneMapping = THREE.ACESFilmicToneMapping;
          st.gl.shadowMap.type = THREE.PCFSoftShadowMap;
          st.scene.fog = new THREE.Fog("#040507", 9, 24);
          requestAnimationFrame(() => onReady?.());
        }}
      >
        <Studio intensity={0.7} />
        <hemisphereLight args={["#dfe6ee", "#040507", 0.25]} />
        <directionalLight
          position={[3.5, 6, 4]}
          intensity={2.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0004}
          shadow-camera-left={-4}
          shadow-camera-right={4}
          shadow-camera-top={4}
          shadow-camera-bottom={-2}
        />
        <directionalLight position={[-3, 2.5, -4]} intensity={1.5} color="#f4f6f8" />
        <spotLight position={[1, 5, 3]} angle={0.5} penumbra={0.9} intensity={10} distance={14} color="#fff4ea" />
        <World simRef={simRef} onTick={onTick} focus={focus} />
        <HybridCameraRig progress={progress} shot={shot} motionOff={motionOff} telemetry={telemetry} />
      </Canvas>
    </div>
  );
}
