"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { elbow, fk, TOL_MM, type Traj } from "@/lib/gapTraj";
import { useDispose } from "@/lib/three/useDispose";
import { Studio, useOnScreenLoop } from "@/lib/three/Studio";

/**
 * Dual-trajectory ghost overlay. Simulated arm = cyan wireframe; synthetic bench arm = solid white,
 * turning amber when the end-effector gap exceeds tolerance. Full end-effector paths are drawn behind.
 */
const Z = 0;
const ORIGIN = new THREE.Vector3(-0.2, -0.75, 0);

function linkMatrix(a: [number, number], b: [number, number], r: number, out: THREE.Matrix4) {
  const pa = new THREE.Vector3(a[0], a[1], Z);
  const pb = new THREE.Vector3(b[0], b[1], Z);
  const len = pa.distanceTo(pb);
  const mid = pa.clone().add(pb).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), pb.clone().sub(pa).normalize());
  return out.compose(mid, q, new THREE.Vector3(r, len, r));
}

function Arms({ traj, idx }: { traj: Traj; idx: React.RefObject<number> }) {
  const mats = useMemo(
    () => ({
      simWire: new THREE.MeshBasicMaterial({ color: "#00e5ff", wireframe: true, transparent: true, opacity: 0.85 }),
      bench: new THREE.MeshPhysicalMaterial({ color: "#d9dee5", metalness: 0.7, roughness: 0.35 }),
      benchHot: new THREE.MeshPhysicalMaterial({ color: "#ff4d00", metalness: 0.4, roughness: 0.4, emissive: new THREE.Color("#ff4d00"), emissiveIntensity: 0.35 }),
      simPath: new THREE.LineDashedMaterial({ color: "#00e5ff", dashSize: 0.04, gapSize: 0.03, transparent: true, opacity: 0.8 }),
      benchPath: new THREE.LineBasicMaterial({ vertexColors: true }),
      joint: new THREE.MeshBasicMaterial({ color: "#040507" }),
    }),
    [],
  );
  const geo = useMemo(() => ({ link: new THREE.CylinderGeometry(1, 1, 1, 14, 1), jointS: new THREE.SphereGeometry(1, 16, 12) }), []);
  useDispose(...Object.values(mats), ...Object.values(geo));

  const paths = useMemo(() => {
    const simG = new THREE.BufferGeometry().setFromPoints(traj.eeSim.map(([x, y]) => new THREE.Vector3(x, y, Z)));
    const benchG = new THREE.BufferGeometry().setFromPoints(traj.eeBench.map(([x, y]) => new THREE.Vector3(x, y, Z + 0.002)));
    const cols = new Float32Array(traj.errMm.length * 3);
    traj.errMm.forEach((e, i) => {
      const c = e > TOL_MM ? new THREE.Color("#ff4d00") : new THREE.Color("#f4f6f8");
      c.toArray(cols, i * 3);
    });
    benchG.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    const simL = new THREE.Line(simG, mats.simPath);
    simL.computeLineDistances();
    const benchL = new THREE.Line(benchG, mats.benchPath);
    return { simL, benchL };
  }, [traj, mats.simPath, mats.benchPath]);
  useEffect(
    () => () => {
      paths.simL.geometry.dispose();
      paths.benchL.geometry.dispose();
    },
    [paths],
  );

  const simLinks = useRef<(THREE.Mesh | null)[]>([]);
  const benchLinks = useRef<(THREE.Mesh | null)[]>([]);
  const simJ = useRef<THREE.Mesh>(null);
  const benchJ = useRef<THREE.Mesh>(null);
  const m4 = useMemo(() => new THREE.Matrix4(), []);

  useFrame(() => {
    const i = Math.max(0, Math.min(traj.sim.length - 1, Math.round(idx.current)));
    const put = (q: [number, number], links: (THREE.Mesh | null)[], j: THREE.Mesh | null, r: number) => {
      const e = elbow(q);
      const t = fk(q);
      [
        [[0, 0], e],
        [e, t],
      ].forEach(([a, b], k) => {
        const m = links[k];
        if (!m) return;
        linkMatrix(a as [number, number], b as [number, number], r, m4);
        m.matrix.copy(m4);
        m.matrixWorldNeedsUpdate = true;
      });
      if (j) j.position.set(t[0], t[1], Z);
    };
    put(traj.sim[i], simLinks.current, simJ.current, 0.05);
    put(traj.bench[i], benchLinks.current, benchJ.current, 0.042);
    const hot = traj.errMm[i] > TOL_MM;
    benchLinks.current.forEach((m) => m && (m.material = hot ? mats.benchHot : mats.bench));
  });

  return (
    <group position={ORIGIN}>
      <primitive object={paths.simL} />
      <primitive object={paths.benchL} />
      {[0, 1].map((k) => (
        <mesh
          key={`b${k}`}
          geometry={geo.link}
          material={mats.bench}
          matrixAutoUpdate={false}
          ref={(el) => {
            benchLinks.current[k] = el;
          }}
        />
      ))}
      {[0, 1].map((k) => (
        <mesh
          key={`s${k}`}
          geometry={geo.link}
          material={mats.simWire}
          matrixAutoUpdate={false}
          ref={(el) => {
            simLinks.current[k] = el;
          }}
        />
      ))}
      <mesh ref={simJ} geometry={geo.jointS} material={mats.simWire} scale={0.05} />
      <mesh ref={benchJ} geometry={geo.jointS} material={mats.bench} scale={0.04} />
      <mesh geometry={geo.jointS} material={mats.bench} scale={0.07} />
      <gridHelper args={[4, 20, "#151b22", "#0d1117"]} rotation={[Math.PI / 2, 0, 0]} position={[0.4, 0.6, -0.05]} />
    </group>
  );
}

export default function GhostScene({ traj, idx }: { traj: Traj; idx: React.RefObject<number> }) {
  const wrap = useRef<HTMLDivElement>(null);
  const setLoop = useRef<((v: "always" | "never") => void) | null>(null);
  useOnScreenLoop(wrap, setLoop);
  return (
    <div ref={wrap} className="absolute inset-0">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [1.0, 0.5, 4.7], fov: 40, near: 0.1, far: 30 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={(st) => {
          setLoop.current = (v) => st.setFrameloop(v);
          st.gl.setClearColor(0x000000, 0);
          st.gl.toneMapping = THREE.ACESFilmicToneMapping;
          st.camera.lookAt(0.3, 0.15, 0);
        }}
      >
        <Studio intensity={0.5} />
        <directionalLight position={[2, 3, 3]} intensity={1.3} />
        <directionalLight position={[-2, 1, -2]} intensity={1.2} color="#00e5ff" />
        <Arms traj={traj} idx={idx} />
      </Canvas>
    </div>
  );
}
