"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { MotionValue } from "framer-motion";
import * as THREE from "three";
import { Studio, useOnScreenLoop } from "@/lib/three/Studio";
import { useDispose } from "@/lib/three/useDispose";
import { panda } from "@/lib/data/panda";
import { go2 } from "@/lib/data/go2";
import { buildActuatorParts, housingGeometry, linkGeometry } from "./geometry";

/**
 * ActuatorFit studio: one persistent WebGL stage that the page scroll drives like a camera dolly.
 * Act 1 wide shot of a 7-joint arm, Act 2 dolly to the selected joint, Act 3 the joint's actuator
 * explodes along its axis (ILLUSTRATIVE geometry; coil heat follows the real u), Act 4 a quadruped leg
 * whose actuator sizes follow the real Go2 picks. Numbers come from lib/data; no per-frame React state.
 */

export interface StageProps {
  progress: MotionValue<number>;
  joint: number;
  hw: "pick" | "paper";
  run: 0 | 1;
  motionOff: boolean;
  /** phone layout: panels sit at the bottom, so subjects are framed centred and a little higher */
  narrow: boolean;
}

const AXIS = {
  y: new THREE.Euler(0, 0, 0),
  z: new THREE.Euler(Math.PI / 2, 0, 0),
};
// Panda-like chain (metres): axis, housing radius, housing length, link length, link radii
const CHAIN = [
  { axis: "y", r: 0.085, len: 0.2, L: 0.2, lr: [0.07, 0.065] },
  { axis: "z", r: 0.085, len: 0.21, L: 0.32, lr: [0.065, 0.058] },
  { axis: "y", r: 0.07, len: 0.16, L: 0.0, lr: [0.05, 0.05] },
  { axis: "z", r: 0.07, len: 0.17, L: 0.33, lr: [0.056, 0.05] },
  { axis: "y", r: 0.058, len: 0.13, L: 0.0, lr: [0.04, 0.04] },
  { axis: "z", r: 0.055, len: 0.13, L: 0.1, lr: [0.045, 0.04] },
  { axis: "y", r: 0.045, len: 0.08, L: 0.06, lr: [0.035, 0.03] },
] as const;
const POSE = [0.35, 0.42, 0.0, -1.85, 0.0, 1.55, 0.6];
const SWAY = [0.22, 0.08, 0.05, 0.1, 0.12, 0.1, 0.3];

const LEG_ORIGIN = new THREE.Vector3(3.4, 0, -0.7);
const ORANGE = new THREE.Color("#ff4d00");
const COPPER = new THREE.Color("#b86b35");

const ss = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

interface Live {
  p: number;
  e: number;
  heat: number;
  frames: (THREE.Group | null)[];
  housings: (THREE.Mesh | null)[];
  links: (THREE.Mesh | null)[];
  rings: (THREE.LineLoop | null)[];
}

function useMaterials() {
  const m = useMemo(
    () => ({
      alu: new THREE.MeshPhysicalMaterial({
        color: "#18191c",
        metalness: 0.88,
        roughness: 0.24,
        clearcoat: 0.35,
        clearcoatRoughness: 0.3,
      }),
      link: new THREE.MeshPhysicalMaterial({
        color: "#6a7079",
        metalness: 0.9,
        roughness: 0.3,
        anisotropy: 0.6,
        clearcoat: 0.2,
      }),
      steel: new THREE.MeshPhysicalMaterial({
        color: "#8e9299",
        metalness: 0.95,
        roughness: 0.15,
      }),
      copper: new THREE.MeshPhysicalMaterial({
        color: COPPER.clone(),
        metalness: 0.85,
        roughness: 0.28,
        emissive: ORANGE.clone(),
        emissiveIntensity: 0,
      }),
      magnet: new THREE.MeshPhysicalMaterial({
        color: "#2b2e34",
        metalness: 0.6,
        roughness: 0.38,
      }),
      dark: new THREE.MeshPhysicalMaterial({
        color: "#3a3d43",
        metalness: 0.7,
        roughness: 0.45,
      }),
      plinth: new THREE.MeshPhysicalMaterial({
        color: "#0b0d10",
        metalness: 0.4,
        roughness: 0.62,
      }),
      floor: new THREE.MeshStandardMaterial({
        color: "#07080a",
        roughness: 0.92,
        metalness: 0,
      }),
      ring: new THREE.LineBasicMaterial({ color: "#00e5ff" }),
    }),
    [],
  );
  useDispose(...Object.values(m));
  return m;
}
type Mats = ReturnType<typeof useMaterials>;

function Arm({
  live,
  mats,
  joint,
  motionOff,
}: {
  live: React.RefObject<Live>;
  mats: Mats;
  joint: number;
  motionOff: boolean;
}) {
  const geos = useMemo(
    () =>
      CHAIN.map((c) => ({
        housing: housingGeometry(c.len / c.r),
        link: c.L > 0 ? linkGeometry(c.L, c.lr[0], c.lr[1]) : null,
        ring: new THREE.BufferGeometry().setFromPoints(
          Array.from({ length: 65 }, (_, k) => {
            const a = (k / 64) * Math.PI * 2;
            return new THREE.Vector3(
              Math.cos(a) * 1.1,
              c.len / c.r / 2 + 0.02,
              Math.sin(a) * 1.1,
            );
          }),
        ),
      })),
    [],
  );
  useDispose(...geos.flatMap((g) => [g.housing, g.link, g.ring]));
  const joints = useRef<(THREE.Group | null)[]>([]);
  const t = useRef(0);

  useFrame((_, dt) => {
    const L = live.current;
    if (!motionOff) t.current += dt;
    const calm = 1 - L.e; // hold still while the actuator is open
    for (let i = 0; i < CHAIN.length; i++) {
      const g = joints.current[i];
      if (!g) continue;
      const q =
        POSE[i] +
        (motionOff ? 0 : SWAY[i] * calm * Math.sin(t.current * 0.35 + i * 0.9));
      if (CHAIN[i].axis === "y") g.rotation.y = q;
      else g.rotation.z = q;
      const ring = L.rings[i];
      if (ring) ring.visible = i === joint && L.p > 0.16 && L.p < 0.5;
      // while the actuator is open the rest of the arm steps away, so the links never cut through it
      const open = L.e > 0.06;
      const h = L.housings[i];
      if (h) h.visible = !open;
      const ln = L.links[i];
      if (ln) ln.visible = !open;
    }
  });

  // nested chain: joint group -> housing frame (+ link) -> next joint at the link tip
  const build = (i: number): React.ReactNode => {
    if (i >= CHAIN.length) return null;
    const c = CHAIN[i];
    const g = geos[i];
    return (
      <group
        ref={(el) => {
          joints.current[i] = el;
        }}
      >
        <group
          rotation={AXIS[c.axis]}
          ref={(el) => {
            live.current.frames[i] = el;
          }}
        >
          <mesh
            geometry={g.housing}
            material={mats.alu}
            scale={[c.r, c.r, c.r]}
            castShadow
            ref={(el) => {
              live.current.housings[i] = el;
            }}
          />
          <lineLoop
            geometry={g.ring}
            material={mats.ring}
            scale={[c.r, c.r, c.r]}
            visible={false}
            ref={(el) => {
              live.current.rings[i] = el;
            }}
          />
        </group>
        {g.link && (
          <mesh
            geometry={g.link}
            material={mats.link}
            castShadow
            ref={(el) => {
              live.current.links[i] = el;
            }}
          />
        )}
        <group position={[0, c.L, 0]}>{build(i + 1)}</group>
      </group>
    );
  };

  return (
    <group position={[0, 0.16, 0]}>
      <mesh
        position={[0, -0.05, 0]}
        material={mats.alu}
        castShadow
        receiveShadow
        ref={(el) => {
          live.current.links[CHAIN.length] = el;
        }}
      >
        <cylinderGeometry args={[0.1, 0.12, 0.1, 48]} />
      </mesh>
      <group position={[0, 0.1, 0]}>{build(0)}</group>
    </group>
  );
}

function ExplodedActuator({
  live,
  mats,
  joint,
  hw,
}: {
  live: React.RefObject<Live>;
  mats: Mats;
  joint: number;
  hw: "pick" | "paper";
}) {
  const parts = useMemo(() => buildActuatorParts(), []);
  useDispose(...parts.map((p) => p.geo));
  const root = useRef<THREE.Group>(null);
  const refs = useRef<(THREE.Object3D | null)[]>([]);
  const J = panda.joints[joint];
  const u = hw === "pick" ? J.recommended.u_corner : J.lightest.u_corner;
  const sizeK = Math.cbrt(
    (hw === "pick" ? J.recommended.mass_kg : J.lightest.mass_kg) /
      J.recommended.mass_kg,
  );
  const targetHeat = Math.min(Math.max((u - 1) / 0.3, 0), 1);
  const scaleNow = useRef(1);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const sc = useMemo(() => new THREE.Matrix4(), []);

  useFrame((_, dt) => {
    const L = live.current;
    const g = root.current;
    const f = L.frames[joint];
    if (!g || !f) return;
    g.visible = L.e > 0.015;
    if (!g.visible) return;
    const k = 1 - Math.exp(-dt * 6);
    L.heat += (targetHeat - L.heat) * k;
    scaleNow.current += (sizeK - scaleNow.current) * k;
    mats.copper.color.copy(COPPER).lerp(ORANGE, L.heat * 0.55);
    mats.copper.emissiveIntensity = L.heat * 1.4;
    const r = CHAIN[joint].r * scaleNow.current;
    sc.makeScale(r, r, r);
    m.copy(f.matrixWorld).multiply(sc);
    g.matrix.copy(m);
    g.matrixWorldNeedsUpdate = true;
    parts.forEach((p, i) => {
      const o = refs.current[i];
      if (o) o.position.y = p.y + p.ex * L.e;
    });
  });

  return (
    <group ref={root} matrixAutoUpdate={false} visible={false}>
      {parts.map((p, i) =>
        p.instances ? (
          <instancedMesh
            key={p.key}
            args={[p.geo, mats[p.mat], p.instances.length]}
            castShadow
            ref={(el) => {
              refs.current[i] = el;
              if (el && !el.userData.set) {
                p.instances!.forEach((mx, k) => el.setMatrixAt(k, mx));
                if (p.key === "magnets")
                  p.instances!.forEach((_, k) =>
                    el.setColorAt(
                      k,
                      new THREE.Color(k % 2 ? "#3c4048" : "#1f2228"),
                    ),
                  );
                el.instanceMatrix.needsUpdate = true;
                if (el.instanceColor) el.instanceColor.needsUpdate = true;
                el.userData.set = true;
              }
            }}
          />
        ) : (
          <mesh
            key={p.key}
            geometry={p.geo}
            material={mats[p.mat]}
            castShadow
            ref={(el) => {
              refs.current[i] = el;
            }}
          />
        ),
      )}
    </group>
  );
}

/** Go2 front-left leg: abduction, thigh and calf actuator housings sized by the real picks (r ∝ mass^(1/3)). */
function Go2Leg({
  live,
  mats,
  run,
}: {
  live: React.RefObject<Live>;
  mats: Mats;
  run: 0 | 1;
}) {
  const root = useRef<THREE.Group>(null);
  const housings = useRef<(THREE.Mesh | null)[]>([]);
  const R = go2.runs[run];
  const mass = (part: string) =>
    R.joints.find((j) => j.leg === "FL" && j.part === part)!.pick.mass_kg;
  const target = [mass("hip"), mass("thigh"), mass("calf")].map(
    (kg) => 0.034 * Math.cbrt(kg / 0.36),
  );
  const now = useRef([0.034, 0.034, 0.042]);
  const geo = useMemo(() => housingGeometry(1.15), []);
  useDispose(geo);
  const hip = new THREE.Vector3(0, 0.44, 0.06);
  const knee = new THREE.Vector3(0.12, 0.264, 0.06);
  const foot = new THREE.Vector3(-0.053, 0.14, 0.06);
  const linkBetween = (a: THREE.Vector3, b: THREE.Vector3) => {
    const d = new THREE.Vector3().subVectors(b, a);
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      d.clone().normalize(),
    );
    return {
      pos: new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5),
      quat: q,
      len: d.length(),
    };
  };
  const thigh = linkBetween(hip, knee);
  const calf = linkBetween(knee, foot);

  useFrame((_, dt) => {
    const g = root.current;
    if (!g) return;
    g.visible = live.current.p > 0.6;
    const k = 1 - Math.exp(-dt * 5);
    now.current.forEach((r, i) => {
      now.current[i] = r + (target[i] - r) * k;
      const h = housings.current[i];
      if (h) h.scale.setScalar(now.current[i]);
    });
    const hc = housings.current[2];
    if (hc)
      hc.position.z =
        0.06 +
        now.current[1] * 1.15 * 0.5 +
        now.current[2] * 1.15 * 0.5 +
        0.006;
  });

  return (
    <group ref={root} position={LEG_ORIGIN} visible={false}>
      <mesh
        position={[0, 0.05, 0]}
        material={mats.plinth}
        receiveShadow
        castShadow
      >
        <cylinderGeometry args={[0.26, 0.28, 0.1, 64]} />
      </mesh>
      {/* trunk stub the leg hangs from */}
      <mesh position={[-0.08, 0.47, -0.1]} material={mats.alu} castShadow>
        <boxGeometry args={[0.3, 0.09, 0.12]} />
      </mesh>
      {/* abduction (hip) actuator, axis along the body */}
      <mesh
        geometry={geo}
        material={mats.alu}
        position={[0.08, 0.47, -0.05]}
        rotation={[0, 0, Math.PI / 2]}
        castShadow
        ref={(el) => {
          housings.current[0] = el;
        }}
      />
      {/* thigh and calf actuators, coaxial at the hip, axis sideways */}
      <mesh
        geometry={geo}
        material={mats.alu}
        position={[hip.x, hip.y, 0.06]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
        ref={(el) => {
          housings.current[1] = el;
        }}
      />
      <mesh
        geometry={geo}
        material={mats.dark}
        position={[hip.x, hip.y, 0.1]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
        ref={(el) => {
          housings.current[2] = el;
        }}
      />
      <mesh
        position={thigh.pos}
        quaternion={thigh.quat}
        material={mats.link}
        castShadow
      >
        <cylinderGeometry args={[0.016, 0.022, thigh.len, 24, 1]} />
      </mesh>
      <mesh
        position={calf.pos}
        quaternion={calf.quat}
        material={mats.link}
        castShadow
      >
        <cylinderGeometry args={[0.009, 0.014, calf.len, 24, 1]} />
      </mesh>
      <mesh position={foot} material={mats.magnet} castShadow>
        <sphereGeometry args={[0.02, 20, 16]} />
      </mesh>
    </group>
  );
}

function CameraRig({
  live,
  progress,
  joint,
  motionOff,
  narrow,
}: {
  live: React.RefObject<Live>;
  progress: MotionValue<number>;
  joint: number;
  motionOff: boolean;
  narrow: boolean;
}) {
  const v = useMemo(
    () => ({
      pos: new THREE.Vector3(1.55, 0.38, 1.9),
      look: new THREE.Vector3(0.05, 0.6, 0),
      tp: new THREE.Vector3(),
      tl: new THREE.Vector3(),
      a: new THREE.Vector3(),
      b: new THREE.Vector3(),
      jp: new THREE.Vector3(),
      ax: new THREE.Vector3(),
      perp: new THREE.Vector3(),
      up: new THREE.Vector3(0, 1, 0),
      K: Array.from({ length: 4 }, () => ({
        p: new THREE.Vector3(),
        l: new THREE.Vector3(),
      })),
    }),
    [],
  );
  useFrame((state, dt) => {
    const L = live.current;
    const target = progress.get();
    L.p = motionOff ? target : L.p + (target - L.p) * (1 - Math.exp(-dt * 5));
    const p = L.p;
    L.e = ss(0.5, 0.64, p) * (1 - ss(0.7, 0.76, p));

    const f = L.frames[joint];
    if (f) {
      f.getWorldPosition(v.jp);
      v.ax.set(0, 1, 0).transformDirection(f.matrixWorld);
    }
    const [K0, K1, K2, K3] = v.K;
    K0.p.set(1.55, 0.38, 1.9);
    K0.l.set(0.05, 0.62, 0);
    K1.p.set(0.5, 0.2, 0.62).normalize().multiplyScalar(1.05).add(v.jp);
    // shift the aim left so the joint sits right of centre, clear of the panel
    v.a.subVectors(v.jp, K1.p).normalize();
    v.b.crossVectors(v.a, v.up).normalize();
    K1.l.copy(v.jp).addScaledVector(v.b, narrow ? 0 : -0.28);
    if (narrow) K1.l.y -= 0.22;
    const R = CHAIN[joint].r;
    const d = Math.max(R * 11, 0.7) * (narrow ? 1.45 : 1);
    K2.l
      .copy(v.ax)
      .multiplyScalar(0.35 * R * L.e)
      .add(v.jp);
    v.perp.crossVectors(v.ax, v.up);
    if (v.perp.lengthSq() < 1e-4) v.perp.set(1, 0, 0);
    v.perp.normalize();
    if (v.perp.z < 0) v.perp.negate();
    // three-quarter view along the axis so the opened stack reads as a sequence, links fall to the side
    v.a
      .copy(v.perp)
      .multiplyScalar(0.62)
      .addScaledVector(v.ax, 0.7)
      .addScaledVector(v.up, 0.28)
      .normalize();
    K2.p.copy(K2.l).addScaledVector(v.a, d);
    v.b.subVectors(K2.l, K2.p).normalize().cross(v.up).normalize();
    K2.l.addScaledVector(v.b, narrow ? 0 : -d * 0.22);
    if (narrow) K2.l.y -= d * 0.1;
    K3.l.copy(LEG_ORIGIN).add(v.a.set(-0.12, 0.3, 0.06));
    K3.p.copy(LEG_ORIGIN).add(v.b.set(0.55, 0.42, 1.05));
    if (narrow) {
      K3.l.x += 0.12;
      K3.l.y -= 0.2;
      K3.p.add(v.a.set(0.25, 0.1, 0.35));
    }

    const k01 = ss(0.12, 0.24, p);
    const k12 = ss(0.44, 0.52, p);
    const k23 = ss(0.7, 0.78, p);
    v.tp.copy(K0.p).lerp(K1.p, k01).lerp(K2.p, k12).lerp(K3.p, k23);
    v.tl.copy(K0.l).lerp(K1.l, k01).lerp(K2.l, k12).lerp(K3.l, k23);
    const k = motionOff ? 1 : 1 - Math.exp(-dt * 4);
    v.pos.lerp(v.tp, k);
    v.look.lerp(v.tl, k);
    state.camera.position.copy(v.pos);
    state.camera.lookAt(v.look);
  });
  return null;
}

export default function StudioScene(
  props: StageProps & { onReady?: () => void },
) {
  const { progress, joint, hw, run, motionOff, narrow, onReady } = props;
  const wrap = useRef<HTMLDivElement>(null);
  const setLoop = useRef<((v: "always" | "never") => void) | null>(null);
  useOnScreenLoop(wrap, setLoop);
  const live = useRef<Live>({
    p: 0,
    e: 0,
    heat: 0,
    frames: [],
    housings: [],
    rings: [],
    links: [],
  });
  const mats = useMaterials();

  useEffect(() => {
    live.current.p = progress.get();
  }, [progress]);

  return (
    <div ref={wrap} className="absolute inset-0">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [1.55, 0.38, 1.9], fov: 32, near: 0.02, far: 30 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={(st) => {
          setLoop.current = (v) => st.setFrameloop(v);
          st.gl.setClearColor("#040507", 1);
          st.gl.toneMapping = THREE.ACESFilmicToneMapping;
          st.gl.toneMappingExposure = 1.0;
          st.gl.shadowMap.type = THREE.PCFSoftShadowMap;
          st.scene.fog = new THREE.Fog("#040507", 3.2, 8.5);
          requestAnimationFrame(() => onReady?.());
        }}
      >
        <Studio intensity={0.7} />
        <hemisphereLight args={["#dfe6ee", "#040507", 0.25]} />
        {/* key light with real shadows */}
        <directionalLight
          position={[2.6, 4.2, 2.4]}
          intensity={2.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0004}
          shadow-camera-left={-2.5}
          shadow-camera-right={5}
          shadow-camera-top={3}
          shadow-camera-bottom={-3}
          shadow-camera-near={0.5}
          shadow-camera-far={12}
        />
        {/* neutral rim from behind, no colour cast */}
        <directionalLight
          position={[-2.2, 2.0, -3.0]}
          intensity={1.6}
          color="#f4f6f8"
        />
        <spotLight
          position={[0.6, 2.4, 1.2]}
          angle={0.5}
          penumbra={0.9}
          intensity={6}
          distance={6}
          color="#fff4ea"
        />

        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          material={mats.floor}
          receiveShadow
        >
          <planeGeometry args={[40, 40]} />
        </mesh>
        <mesh
          position={[0, 0.03, 0]}
          material={mats.plinth}
          receiveShadow
          castShadow
        >
          <cylinderGeometry args={[0.5, 0.52, 0.06, 96]} />
        </mesh>
        <mesh
          position={[0, 0.08, 0]}
          material={mats.plinth}
          receiveShadow
          castShadow
        >
          <cylinderGeometry args={[0.34, 0.36, 0.04, 96]} />
        </mesh>

        <Arm live={live} mats={mats} joint={joint} motionOff={motionOff} />
        <ExplodedActuator live={live} mats={mats} joint={joint} hw={hw} />
        <Go2Leg live={live} mats={mats} run={run} />
        <CameraRig
          live={live}
          progress={progress}
          joint={joint}
          motionOff={motionOff}
          narrow={narrow}
        />
      </Canvas>
    </div>
  );
}
