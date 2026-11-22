"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { FLOOR_BOX, type StackSim } from "@/lib/stackSim";
import { useDispose } from "@/lib/three/useDispose";
import { Studio, useOnScreenLoop } from "@/lib/three/Studio";

/** Renders a StackSim (2D) as extruded boxes. The sim is stepped here so render and physics stay in lock-step. */
function World({ simRef, onTick }: { simRef: React.RefObject<StackSim | null>; onTick: (s: StackSim) => void }) {
  const mats = useMemo(
    () => ({
      box: new THREE.MeshPhysicalMaterial({ color: "#5b616b", metalness: 0.85, roughness: 0.35 }),
      boxHot: new THREE.MeshPhysicalMaterial({ color: "#ff4d00", metalness: 0.3, roughness: 0.4, emissive: new THREE.Color("#ff4d00"), emissiveIntensity: 0.5 }),
      proj: new THREE.MeshStandardMaterial({ color: "#ff4d00", emissive: new THREE.Color("#ff4d00"), emissiveIntensity: 0.8 }),
      floor: new THREE.MeshPhysicalMaterial({ color: "#1a1e24", metalness: 0.7, roughness: 0.45 }),
      edge: new THREE.LineBasicMaterial({ color: "#00e5ff", transparent: true, opacity: 0.5 }),
      trail: new THREE.LineBasicMaterial({ color: "#ff4d00", transparent: true, opacity: 0.6 }),
    }),
    [],
  );
  const geo = useMemo(() => {
    const box = new THREE.BoxGeometry(1, 1, 0.4);
    return { box, boxEdge: new THREE.EdgesGeometry(box), floor: new THREE.BoxGeometry(FLOOR_BOX.hw * 2, FLOOR_BOX.hh * 2, 0.9) };
  }, []);
  const trail = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(60 * 3), 3));
    const l = new THREE.Line(g, mats.trail);
    l.frustumCulled = false;
    return l;
  }, [mats.trail]);
  useDispose(...Object.values(mats), ...Object.values(geo), trail.geometry);

  const meshes = useRef<(THREE.Group | null)[]>([]);
  const trailN = useRef(0);

  useFrame((_, dt) => {
    const s = simRef.current;
    if (!s) return;
    s.advance(dt);
    onTick(s);
    const failed = s.failed;
    s.bodies.forEach((b, i) => {
      const g = meshes.current[i];
      if (!g) return;
      g.visible = Math.abs(b.y) < 30 && Math.abs(b.x) < 30;
      g.position.set(b.x, b.y, 0);
      g.scale.set(b.hw * 2, b.hh * 2, b.proj ? 0.35 : 1);
      const m = g.children[0] as THREE.Mesh;
      if (!b.proj) m.material = failed && s.events.some((e) => e.kind === "explosion") ? mats.boxHot : mats.box;
    });
    const p = s.bodies[s.bodies.length - 1];
    const arr = trail.geometry.attributes.position.array as Float32Array;
    if (s.t < 0.05) trailN.current = 0;
    if (trailN.current < 60) {
      arr[trailN.current * 3] = p.x;
      arr[trailN.current * 3 + 1] = p.y;
      arr[trailN.current * 3 + 2] = 0;
      trailN.current++;
    }
    trail.geometry.setDrawRange(0, trailN.current);
    trail.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <group position={[0, -1.1, 0]}>
      <mesh geometry={geo.floor} material={mats.floor} position={[FLOOR_BOX.x, FLOOR_BOX.y, 0]} />
      {Array.from({ length: 7 }, (_, i) => (
        <group
          key={i}
          ref={(el) => {
            meshes.current[i] = el;
          }}
        >
          <mesh geometry={geo.box} material={i === 6 ? mats.proj : mats.box} />
          {i < 6 && <lineSegments geometry={geo.boxEdge} material={mats.edge} />}
        </group>
      ))}
      <primitive object={trail} />
      <gridHelper args={[8, 32, "#151b22", "#0d1117"]} position={[0, -0.07, 0]} />
    </group>
  );
}

export default function StackScene({ simRef, onTick }: { simRef: React.RefObject<StackSim | null>; onTick: (s: StackSim) => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const setLoop = useRef<((v: "always" | "never") => void) | null>(null);
  useOnScreenLoop(wrap, setLoop);
  return (
    <div ref={wrap} className="absolute inset-0">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0.6, 1.2, 5.6], fov: 38, near: 0.1, far: 60 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={(st) => {
          setLoop.current = (v) => st.setFrameloop(v);
          st.gl.setClearColor(0x000000, 0);
          st.gl.toneMapping = THREE.ACESFilmicToneMapping;
          st.camera.lookAt(0, 0, 0);
        }}
      >
        <Studio intensity={0.5} />
        <directionalLight position={[2, 4, 3]} intensity={1.4} />
        <directionalLight position={[-3, 1, -2]} intensity={1.4} color="#00e5ff" />
        <World simRef={simRef} onTick={onTick} />
      </Canvas>
    </div>
  );
}
