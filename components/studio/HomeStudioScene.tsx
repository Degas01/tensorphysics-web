"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { MotionValue } from "framer-motion";
import * as THREE from "three";
import { Studio, useOnScreenLoop } from "@/lib/three/Studio";
import { useDispose } from "@/lib/three/useDispose";
import { Arm, type ArmApi, type HudRefs } from "@/components/hero/ArmScene";
import { HybridCameraRig, frameShot, type Shot } from "./HybridCameraRig";
import type { Telemetry } from "./OpticalHudOverlay";

/**
 * Home studio: the hero arm on a plinth under studio light. Scroll dollies from a 35mm wide shot
 * (Act 01) to a closer 50mm shot (Act 02). The arm's load model is ILLUSTRATIVE (see the hero info tip).
 */

const ss = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};
const FLOOR_Y = -1.02;

/** Turn on shadows for the solid meshes once the arm has mounted (hit targets and lines stay off). */
function Shadows() {
  const { scene } = useThree();
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mat = m.material as THREE.Material & { opacity?: number };
      if (mat && (mat as THREE.MeshBasicMaterial).isMeshBasicMaterial) return;
      m.castShadow = true;
    });
  });
  return null;
}

export default function HomeStudioScene({
  progress,
  motionOff,
  narrow,
  telemetry,
  hud,
  apiRef,
  onReady,
}: {
  progress: MotionValue<number>;
  motionOff: boolean;
  narrow: boolean;
  telemetry: React.RefObject<Telemetry>;
  hud: React.RefObject<HudRefs>;
  apiRef: React.Ref<ArmApi>;
  onReady?: () => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const setLoop = useRef<((v: "always" | "never") => void) | null>(null);
  useOnScreenLoop(wrap, setLoop);
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  const mats = useMemo(
    () => ({
      floor: new THREE.MeshStandardMaterial({ color: "#07080a", roughness: 0.92 }),
      plinth: new THREE.MeshPhysicalMaterial({ color: "#0b0d10", metalness: 0.4, roughness: 0.62 }),
    }),
    [],
  );
  useDispose(mats.floor, mats.plinth);

  const v = useMemo(
    () => ({
      K: [0, 1].map((): Shot => ({ pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 32 })),
      dir: new THREE.Vector3(),
      right: new THREE.Vector3(),
      look: new THREE.Vector3(),
    }),
    [],
  );

  const shot = (p: number, out: Shot) => {
    const [K0, K1] = v.K;
    v.dir.set(Math.sin(0.66), 0.3, Math.cos(0.66));
    // screen-right for a camera looking back along dir; aim left of the arm so it sits right of the copy
    v.right.set(-v.dir.z, 0, v.dir.x).normalize().negate();
    v.look.set(0, narrow ? -0.6 : 0.0, 0).addScaledVector(v.right, narrow ? 0 : -0.95);
    frameShot(K0, v.look, v.dir, 4.7, 35);
    v.look.set(0, narrow ? -0.3 : 0.32, 0).addScaledVector(v.right, narrow ? 0 : -0.75);
    v.dir.set(Math.sin(0.9), 0.2, Math.cos(0.9));
    frameShot(K1, v.look, v.dir, 4.3, 50);
    const k = ss(0.38, 0.62, p);
    out.pos.copy(K0.pos).lerp(K1.pos, k);
    out.look.copy(K0.look).lerp(K1.look, k);
    out.fov = K0.fov + (K1.fov - K0.fov) * k;
  };

  return (
    <div ref={wrap} className="absolute inset-0">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [2.6, 1.2, 3.1], fov: 36, near: 0.05, far: 40 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={(st) => {
          setLoop.current = (x) => st.setFrameloop(x);
          st.gl.setClearColor("#040507", 1);
          st.gl.toneMapping = THREE.ACESFilmicToneMapping;
          st.gl.shadowMap.type = THREE.PCFSoftShadowMap;
          st.scene.fog = new THREE.Fog("#040507", 5, 13);
          requestAnimationFrame(() => onReady?.());
        }}
      >
        <Studio intensity={0.65} />
        <hemisphereLight args={["#dfe6ee", "#040507", 0.25]} />
        <directionalLight
          position={[3, 4.5, 2.6]}
          intensity={2.1}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0004}
          shadow-camera-left={-3}
          shadow-camera-right={3}
          shadow-camera-top={3}
          shadow-camera-bottom={-3}
        />
        <directionalLight position={[-2.6, 2.2, -3.2]} intensity={1.5} color="#f4f6f8" />
        <spotLight position={[0.8, 3.2, 1.6]} angle={0.55} penumbra={0.9} intensity={8} distance={8} color="#fff4ea" />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]} material={mats.floor} receiveShadow>
          <planeGeometry args={[40, 40]} />
        </mesh>
        <mesh position={[0, FLOOR_Y + 0.02, 0]} material={mats.plinth} receiveShadow>
          <cylinderGeometry args={[0.7, 0.72, 0.04, 96]} />
        </mesh>

        <Arm hud={hud} pointer={pointer} animate={!motionOff} apiRef={apiRef} wrap={wrap} studio telemetry={telemetry} />
        <Shadows />
        <HybridCameraRig progress={progress} shot={shot} motionOff={motionOff} telemetry={telemetry} />
      </Canvas>
    </div>
  );
}
