"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** Studio reflections for PBR metals (RoomEnvironment through PMREM). Everything is disposed on unmount. */
export function Studio({ intensity = 0.55 }: { intensity?: number }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const rt = pm.fromScene(room, 0.04);
    scene.environment = rt.texture;
    scene.environmentIntensity = intensity;
    return () => {
      scene.environment = null;
      rt.dispose();
      pm.dispose();
      room.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose?.();
      });
    };
  }, [gl, scene, intensity]);
  return null;
}

/** Drag-to-orbit on fine pointers only (touch keeps page scrolling). */
export const prefersFinePointer = () => typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;

/** Render loop runs only while the canvas is on screen. */
export function useOnScreenLoop(el: React.RefObject<HTMLElement | null>, setLoop: React.RefObject<((v: "always" | "never") => void) | null>) {
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const io = new IntersectionObserver(([e]) => setLoop.current?.(e.isIntersecting ? "always" : "never"));
    io.observe(node);
    return () => io.disconnect();
  }, [el, setLoop]);
}
