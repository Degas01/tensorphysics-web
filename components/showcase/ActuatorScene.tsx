"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createThermalMaterial } from "@/lib/three/thermal";
import { useDispose } from "@/lib/three/useDispose";
import { Studio, prefersFinePointer, useOnScreenLoop } from "@/lib/three/Studio";

/**
 * Cutaway of one actuator joint: titanium housing cut open at 90 degrees, stator teeth and back-iron
 * (thermal stress shader driven by utilisation u), copper windings, a rotor with alternating magnets,
 * and the output shaft. Colour = utilisation from the study, not a thermal simulation.
 */
const TEETH = 12;
const MAGNETS = 14;

function Actuator({ uRef, animate }: { uRef: React.RefObject<number>; animate: boolean }) {
  const mats = useMemo(
    () => ({
      housing: new THREE.MeshPhysicalMaterial({ color: "#5b616b", metalness: 0.92, roughness: 0.32, anisotropy: 0.6, side: THREE.DoubleSide }),
      inner: new THREE.MeshPhysicalMaterial({ color: "#1a1e24", metalness: 0.6, roughness: 0.55, side: THREE.DoubleSide }),
      copper: new THREE.MeshPhysicalMaterial({ color: "#b4642e", metalness: 0.95, roughness: 0.3 }),
      magnetA: new THREE.MeshPhysicalMaterial({ color: "#1d2a33", metalness: 0.5, roughness: 0.4 }),
      magnetB: new THREE.MeshPhysicalMaterial({ color: "#8a939e", metalness: 0.85, roughness: 0.3 }),
      rotor: new THREE.MeshPhysicalMaterial({ color: "#0f1216", metalness: 0.8, roughness: 0.45 }),
      cut: new THREE.MeshBasicMaterial({ color: "#00e5ff", transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
      stator: createThermalMaterial("#3a4048", 0.14),
    }),
    [],
  );
  useDispose(...Object.values(mats));

  const geo = useMemo(() => {
    const cut = Math.PI * 1.5; // 270 degrees of housing, 90 degrees cut away
    const g = {
      shell: new THREE.CylinderGeometry(1, 1, 0.9, 72, 1, true, Math.PI / 2, cut),
      shellIn: new THREE.CylinderGeometry(0.92, 0.92, 0.9, 72, 1, true, Math.PI / 2, cut),
      cap: new THREE.RingGeometry(0.2, 1, 72, 1, Math.PI / 2, cut),
      backIron: new THREE.CylinderGeometry(0.88, 0.88, 0.62, 72, 1, true, Math.PI / 2, cut),
      tooth: new THREE.BoxGeometry(0.2, 0.62, 0.11),
      coil: new THREE.BoxGeometry(0.14, 0.5, 0.17),
      rotor: new THREE.CylinderGeometry(0.42, 0.42, 0.58, 56),
      magnet: new THREE.BoxGeometry(0.06, 0.5, 0.16),
      shaft: new THREE.CylinderGeometry(0.11, 0.11, 1.6, 32),
      cutEdge: new THREE.PlaneGeometry(0.08, 0.9),
    };
    return g;
  }, []);
  useDispose(...Object.values(geo));

  const rotor = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const time = useRef(0);

  useFrame((_, dt) => {
    const u = uRef.current;
    time.current += dt;
    mats.stator.uniforms.uHeat.value = u;
    mats.stator.uniforms.uTime.value = time.current;
    if (rotor.current && animate) rotor.current.rotation.y += dt * (1.2 + 1.6 * Math.min(u, 1.3));
    if (body.current) {
      // Over the limit the whole joint chatters slightly
      const chatter = animate && u > 1 ? (u - 1) * 0.012 * Math.sin(time.current * 63) : 0;
      body.current.position.x = chatter;
    }
  });

  const teeth = Array.from({ length: TEETH }, (_, i) => (i / TEETH) * Math.PI * 2).filter((a) => {
    // skip teeth inside the cut-away quadrant so the inside reads clearly
    const n = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    return !(n > 0 && n < Math.PI / 2);
  });

  return (
    <group ref={body} rotation={[0.35, -0.6, 0]}>
      <mesh geometry={geo.shell} material={mats.housing} />
      <mesh geometry={geo.shellIn} material={mats.inner} />
      <mesh geometry={geo.cap} material={mats.housing} position={[0, -0.45, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <mesh geometry={geo.backIron} material={mats.stator} />
      {teeth.map((a) => (
        <group key={a} rotation={[0, -a, 0]}>
          <mesh geometry={geo.tooth} material={mats.stator} position={[0.7, 0, 0]} />
          <mesh geometry={geo.coil} material={mats.copper} position={[0.62, 0, 0]} />
        </group>
      ))}
      <group ref={rotor}>
        <mesh geometry={geo.rotor} material={mats.rotor} />
        {Array.from({ length: MAGNETS }, (_, i) => (
          <mesh
            key={i}
            geometry={geo.magnet}
            material={i % 2 ? mats.magnetA : mats.magnetB}
            position={[0.44 * Math.cos((i / MAGNETS) * Math.PI * 2), 0, 0.44 * Math.sin((i / MAGNETS) * Math.PI * 2)]}
            rotation={[0, -(i / MAGNETS) * Math.PI * 2, 0]}
          />
        ))}
        <mesh geometry={geo.shaft} material={mats.housing} />
      </group>
      {/* cyan section lines on the two cut faces */}
      <mesh geometry={geo.cutEdge} material={mats.cut} position={[0.96, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
      <mesh geometry={geo.cutEdge} material={mats.cut} position={[0, 0, 0.96]} />
    </group>
  );
}

function Controls({ orbit, animate }: { orbit: boolean; animate: boolean }) {
  const { camera, gl } = useThree();
  const c = useRef<OrbitControls | null>(null);
  useEffect(() => {
    camera.position.set(3.3, 2.5, 3.9);
    camera.lookAt(0, 0, 0);
    if (!orbit) return;
    const ctl = new OrbitControls(camera, gl.domElement);
    ctl.enableZoom = false;
    ctl.enablePan = false;
    ctl.enableDamping = true;
    ctl.autoRotate = animate;
    ctl.autoRotateSpeed = 0.5;
    c.current = ctl;
    return () => {
      ctl.dispose();
      c.current = null;
    };
  }, [camera, gl, orbit, animate]);
  useFrame(() => c.current?.update());
  return null;
}

export default function ActuatorScene({ u, animate }: { u: number; animate: boolean }) {
  const uRef = useRef(u);
  uRef.current = u;
  const wrap = useRef<HTMLDivElement>(null);
  const setLoop = useRef<((v: "always" | "never") => void) | null>(null);
  useOnScreenLoop(wrap, setLoop);
  const orbit = useMemo(prefersFinePointer, []);
  return (
    <div ref={wrap} className={orbit ? "absolute inset-0 cursor-grab active:cursor-grabbing" : "absolute inset-0"}>
      <Canvas
        dpr={[1, 1.75]}
        camera={{ fov: 32, near: 0.1, far: 20 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={(st) => {
          setLoop.current = (v) => st.setFrameloop(v);
          st.gl.setClearColor(0x000000, 0);
          st.gl.toneMapping = THREE.ACESFilmicToneMapping;
        }}
      >
        <Studio intensity={0.6} />
        <directionalLight position={[2, 3, 2]} intensity={1.3} />
        <directionalLight position={[-2, 1, -2.5]} intensity={1.6} color="#00e5ff" />
        <Controls orbit={orbit} animate={animate} />
        <Actuator uRef={uRef} animate={animate} />
      </Canvas>
    </div>
  );
}
