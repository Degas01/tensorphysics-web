"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { BREAK_AT, pageProgress } from "@/lib/scrollStress";

/**
 * Background "stress field": a hex lattice (the Hex Tensor motif) laid out like a CAD floor that recedes
 * to the horizon. Scrolling the page stacks error onto it: the lattice warps more and more, and once the
 * illustrative error stack passes the break line (44%) cells start to fail and glow orange, spreading
 * from the most strained regions. The pointer acts as a load probe that dents the lattice.
 *
 * Decoration only, not a simulation. One draw call for the edges, one for the nodes.
 */

const VERT = /* glsl */ `
uniform float uTime;
uniform float uStress;
uniform float uBreak;
uniform vec2  uProbe;
uniform float uProbeOn;
attribute float aSeed;
varying float vCrack;
varying float vStrain;
varying float vFade;

// 2D simplex-ish value noise
vec2 hash(vec2 p){ p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3))); return -1.0 + 2.0*fract(sin(p)*43758.5453); }
float noise(vec2 p){
  const float K1 = 0.366025404; const float K2 = 0.211324865;
  vec2 i = floor(p + (p.x+p.y)*K1); vec2 a = p - i + (i.x+i.y)*K2;
  vec2 o = (a.x>a.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
  vec2 b = a - o + K2; vec2 c = a - 1.0 + 2.0*K2;
  vec3 h = max(0.5 - vec3(dot(a,a), dot(b,b), dot(c,c)), 0.0);
  vec3 n = h*h*h*h*vec3(dot(a,hash(i)), dot(b,hash(i+o)), dot(c,hash(i+1.0)));
  return dot(n, vec3(70.0));
}
float fbm(vec2 p){ return 0.6*noise(p) + 0.3*noise(p*2.03+7.1) + 0.1*noise(p*4.1-3.7); }

void main(){
  vec3 p = position;
  float t = uTime * 0.05;
  float n = fbm(p.xz * 0.06 + vec2(t, -t*0.7));          // where strain concentrates
  float strain = clamp(0.5 + 0.5*n, 0.0, 1.0);
  float amp = 0.15 + 2.6 * uStress * uStress;
  p.y += (n * amp);
  // failed cells sag and jitter a little
  float over = smoothstep(uBreak, uBreak + 0.18, uStress);
  float crack = over * smoothstep(0.80 - 0.17*over, 0.86 - 0.17*over, strain + 0.06*aSeed);
  p.y -= crack * (0.6 + 0.4*sin(uTime*3.0 + aSeed*40.0)*0.15);
  // load probe
  float d = distance(p.xz, uProbe);
  p.y -= uProbeOn * 1.4 * exp(-d*d/10.0);
  vCrack = crack;
  vStrain = strain * (0.35 + 0.65*uStress) + uProbeOn * exp(-d*d/10.0) * 0.5;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vFade = (1.0 - smoothstep(18.0, 95.0, -mv.z)) * smoothstep(1.0, 6.0, -mv.z);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (1.5 + 3.0*crack) * (40.0 / -mv.z);
}
`;

const FRAG_LINES = /* glsl */ `
varying float vCrack;
varying float vStrain;
varying float vFade;
uniform float uAlpha;
void main(){
  vec3 holds = vec3(0.0, 0.898, 1.0);
  vec3 cold  = vec3(0.32, 0.36, 0.42);
  vec3 brk   = vec3(1.0, 0.302, 0.0);
  vec3 c = mix(cold, holds, smoothstep(0.35, 0.95, vStrain));
  c = mix(c, brk, vCrack);
  float a = uAlpha * vFade * (0.35 + 0.65*max(vStrain, vCrack));
  gl_FragColor = vec4(c, a);
}
`;

const FRAG_NODES = /* glsl */ `
varying float vCrack;
varying float vStrain;
varying float vFade;
uniform float uAlpha;
void main(){
  vec2 q = gl_PointCoord - 0.5;
  float r = length(q);
  if (r > 0.5) discard;
  vec3 c = mix(vec3(0.0, 0.898, 1.0), vec3(1.0, 0.302, 0.0), vCrack);
  float a = uAlpha * vFade * (1.0 - smoothstep(0.0, 0.5, r)) * (0.25 + 0.75*max(vCrack, vStrain*0.6));
  gl_FragColor = vec4(c, a);
}
`;

/** Hex lattice (pointy-top) edges and nodes on the XZ plane. */
function buildLattice(size: number, x0: number, x1: number, z0: number, z1: number) {
  const w = Math.sqrt(3) * size;
  const h = 1.5 * size;
  const nodes = new Map<string, number>();
  const pos: number[] = [];
  const seed: number[] = [];
  const edges: number[] = [];
  const key = (x: number, z: number) => `${Math.round(x * 100)}|${Math.round(z * 100)}`;
  const node = (x: number, z: number) => {
    const k = key(x, z);
    let id = nodes.get(k);
    if (id === undefined) {
      id = pos.length / 3;
      nodes.set(k, id);
      pos.push(x, 0, z);
      seed.push(Math.random());
    }
    return id;
  };
  const seen = new Set<string>();
  let row = 0;
  for (let z = z0; z <= z1; z += h, row++) {
    const off = row % 2 ? w / 2 : 0;
    for (let x = x0 + off; x <= x1; x += w) {
      const corners = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 180) * (60 * i - 30);
        return node(x + size * Math.cos(a), z + size * Math.sin(a));
      });
      for (let i = 0; i < 6; i++) {
        const a = corners[i];
        const b = corners[(i + 1) % 6];
        const k = a < b ? `${a}-${b}` : `${b}-${a}`;
        if (!seen.has(k)) {
          seen.add(k);
          edges.push(a, b);
        }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1));
  g.setIndex(edges);
  const gp = new THREE.BufferGeometry();
  gp.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  gp.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1));
  return { lines: g, points: gp };
}

export default function StressField({ animate }: { animate: boolean }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      return; // no WebGL: the CSS grid behind stays
    }
    const mobile = window.matchMedia("(max-width: 768px)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.25 : 1.5));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 200);
    const uniforms = {
      uTime: { value: 0 },
      uStress: { value: 0 },
      uBreak: { value: BREAK_AT },
      uProbe: { value: new THREE.Vector2(999, 999) },
      uProbeOn: { value: 0 },
      uAlpha: { value: 0.55 },
    };
    const { lines, points } = buildLattice(mobile ? 1.6 : 1.15, -46, 46, -110, 14);
    const matL = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG_LINES, uniforms, transparent: true, depthWrite: false });
    const matP = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG_NODES,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    scene.add(new THREE.LineSegments(lines, matL));
    scene.add(new THREE.Points(points, matP));

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    // pointer probe: ray onto the y = 0 plane
    const ray = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const ndc = new THREE.Vector2();
    const hit = new THREE.Vector3();
    let probeTarget = 0;
    const onMove = (e: PointerEvent) => {
      ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (ray.ray.intersectPlane(plane, hit)) {
        uniforms.uProbe.value.set(hit.x, hit.z);
        probeTarget = 1;
      }
    };
    const onLeave = () => (probeTarget = 0);
    if (!mobile) {
      window.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerleave", onLeave);
    }

    let stress = pageProgress();
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const target = pageProgress();
      stress += (target - stress) * (1 - Math.exp(-dt * 6)); // springy follow
      uniforms.uStress.value = stress;
      uniforms.uTime.value += animate ? dt : 0;
      uniforms.uProbeOn.value += (probeTarget - uniforms.uProbeOn.value) * (1 - Math.exp(-dt * 5));
      // camera glides over the field as the page scrolls, and tips down slightly
      camera.position.set(Math.sin(stress * Math.PI) * 2.5, 7.5 - stress * 2.2, 14 - stress * 46);
      camera.lookAt(0, -1.2 - stress * 1.5, camera.position.z - 30);
      renderer.render(scene, camera);
      if (animate) raf = requestAnimationFrame(frame);
    };

    // with motion off: draw on scroll only
    const onScroll = () => requestAnimationFrame(frame);
    if (animate) raf = requestAnimationFrame(frame);
    else {
      frame(performance.now());
      window.addEventListener("scroll", onScroll, { passive: true });
    }
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && animate) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVis);
      lines.dispose();
      points.dispose();
      matL.dispose();
      matP.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [animate]);

  return <div ref={host} className="absolute inset-0" />;
}
