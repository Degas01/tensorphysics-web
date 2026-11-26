"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { MotionValue } from "framer-motion";
import * as THREE from "three";
import type { Telemetry } from "./OpticalHudOverlay";

/**
 * Hybrid camera: the page scroll is the master dolly (choreographed keyframes from `shot`), with
 * a small pointer parallax (±4°) and a bounded drag orbit (±35°) layered on top. On release, or as
 * soon as the scroll moves, the offset springs back (stiffness 180, damping 28) to the exact
 * choreographed angle, so the framing of every close-up is always recovered.
 */

export interface Shot {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  /** vertical field of view, degrees */
  fov: number;
}

/** Full-frame equivalent focal length (24 mm sensor height) for a vertical fov in degrees. */
export const focalFromFov = (fov: number) => 12 / Math.tan(THREE.MathUtils.degToRad(fov) / 2);
/** Vertical fov in degrees for a focal length in mm. */
export const fovFromFocal = (mm: number) => THREE.MathUtils.radToDeg(2 * Math.atan(12 / mm));

/**
 * Place a camera at `dist` (metres, as framed with a 32° lens) from `look` along `dir`, keeping
 * the framing when the lens changes: a longer lens backs the camera off, like a real dolly-zoom.
 */
export function frameShot(out: Shot, look: THREE.Vector3, dir: THREE.Vector3, dist: number, mm: number) {
  const fov = fovFromFocal(mm);
  const k = Math.tan(THREE.MathUtils.degToRad(16)) / Math.tan(THREE.MathUtils.degToRad(fov) / 2);
  out.look.copy(look);
  out.pos.copy(dir).normalize().multiplyScalar(dist * k).add(look);
  out.fov = fov;
}

const PARALLAX = THREE.MathUtils.degToRad(4);
const DRAG_MAX = THREE.MathUtils.degToRad(35);
const K = 180;
const C = 28;

export function HybridCameraRig({
  progress,
  shot,
  motionOff,
  telemetry,
  smoothing = 5,
}: {
  progress: MotionValue<number>;
  /** Fill `out` with the choreographed camera for smoothed scroll progress `p` (0..1). Called every frame. */
  shot: (p: number, out: Shot, dt: number) => void;
  motionOff: boolean;
  telemetry?: React.RefObject<Telemetry>;
  smoothing?: number;
}) {
  const { gl, camera } = useThree();
  const st = useRef({
    p: progress.get(),
    yaw: 0,
    pitch: 0,
    vy: 0,
    vp: 0,
    dragging: false,
    sx: 0,
    sy: 0,
    y0: 0,
    p0: 0,
    px: 0,
    py: 0,
    lastP: progress.get(),
  });
  const v = useMemo(
    () => ({
      shot: { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 32 } as Shot,
      off: new THREE.Vector3(),
      right: new THREE.Vector3(),
      up: new THREE.Vector3(0, 1, 0),
      q: new THREE.Quaternion(),
      pos: new THREE.Vector3(),
      look: new THREE.Vector3(),
      init: false,
    }),
    [],
  );

  // Drag orbit on fine pointers only; touch keeps scrolling the page.
  useEffect(() => {
    const el = gl.domElement;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const s = st.current;
    const onMove = (e: PointerEvent) => {
      s.px = (e.clientX / window.innerWidth) * 2 - 1;
      s.py = (e.clientY / window.innerHeight) * 2 - 1;
      if (!s.dragging) return;
      const w = el.clientWidth || 1;
      s.yaw = THREE.MathUtils.clamp(s.y0 - ((e.clientX - s.sx) / w) * Math.PI, -DRAG_MAX, DRAG_MAX);
      s.pitch = THREE.MathUtils.clamp(s.p0 + ((e.clientY - s.sy) / w) * Math.PI, -DRAG_MAX, DRAG_MAX);
      s.vy = 0;
      s.vp = 0;
    };
    const onDown = (e: PointerEvent) => {
      if (!fine || e.button !== 0) return;
      s.dragging = true;
      s.sx = e.clientX;
      s.sy = e.clientY;
      s.y0 = s.yaw;
      s.p0 = s.pitch;
      el.style.cursor = "grabbing";
    };
    const onUp = () => {
      s.dragging = false;
      el.style.cursor = fine ? "grab" : "";
    };
    if (fine) el.style.cursor = "grab";
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.style.cursor = "";
    };
  }, [gl]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const s = st.current;
    const target = progress.get();
    // resuming the scroll releases a drag
    if (Math.abs(target - s.lastP) > 0.0005) s.dragging = false;
    s.lastP = target;
    s.p = motionOff ? target : s.p + (target - s.p) * (1 - Math.exp(-dt * smoothing));

    shot(s.p, v.shot, dt);

    // spring the drag offset home when released (semi-implicit Euler, mass 1)
    if (!s.dragging) {
      s.vy += (-K * s.yaw - C * s.vy) * dt;
      s.vp += (-K * s.pitch - C * s.vp) * dt;
      s.yaw += s.vy * dt;
      s.pitch += s.vp * dt;
    }
    const yaw = s.yaw + (motionOff ? 0 : -s.px * PARALLAX);
    const pitch = s.pitch + (motionOff ? 0 : s.py * PARALLAX);

    // orbit the choreographed position around its look point
    v.off.subVectors(v.shot.pos, v.shot.look);
    v.q.setFromAxisAngle(v.up, yaw);
    v.off.applyQuaternion(v.q);
    v.right.crossVectors(v.off, v.up).normalize();
    v.q.setFromAxisAngle(v.right, pitch);
    v.off.applyQuaternion(v.q);
    v.pos.copy(v.shot.look).add(v.off);
    v.look.copy(v.shot.look);

    const cam = camera as THREE.PerspectiveCamera;
    cam.position.copy(v.pos);
    cam.lookAt(v.look);
    if (Math.abs(cam.fov - v.shot.fov) > 0.01) {
      cam.fov = v.shot.fov;
      cam.updateProjectionMatrix();
    }
    const T = telemetry?.current;
    if (T) T.focal = focalFromFov(cam.fov);
  });
  return null;
}
