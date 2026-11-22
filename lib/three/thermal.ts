import * as THREE from "three";

/**
 * Thermal / torque stress material. One uniform drives it: uHeat = utilisation u.
 *   u <= 0.7  : dark titanium with a cool cyan rim
 *   0.7 .. 1  : amber bands start to crawl over the surface
 *   u > 1     : saturated crimson-orange with hot white crests
 * Lighting is a cheap fixed key + fresnel rim, so it costs one draw per joint.
 */
export function createThermalMaterial(base = "#2b3038", scale = 1) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uHeat: { value: 0 },
      uScale: { value: scale },
      uTime: { value: 0 },
      uBase: { value: new THREE.Color(base) },
      uCool: { value: new THREE.Color("#00e5ff") },
      uWarm: { value: new THREE.Color("#f2b84b") },
      uHot: { value: new THREE.Color("#ff4d00") },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vView;
      varying vec3 vLocal;
      void main() {
        vLocal = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = normalize(-mv.xyz);
        vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uHeat;
      uniform float uTime;
      uniform float uScale;
      uniform vec3 uBase, uCool, uWarm, uHot;
      varying vec3 vN;
      varying vec3 vView;
      varying vec3 vLocal;
      void main() {
        vec3 n = normalize(vN);
        float key = clamp(dot(n, normalize(vec3(0.5, 0.8, 0.6))), 0.0, 1.0);
        float fres = pow(1.0 - clamp(dot(n, vView), 0.0, 1.0), 3.0);
        vec3 col = uBase * (0.28 + 0.9 * key);
        // Brushed highlight
        col += vec3(0.10) * pow(key, 18.0);
        float h = clamp(uHeat, 0.0, 1.6);
        float warm = smoothstep(0.7, 1.0, h);
        float hot = smoothstep(1.0, 1.25, h);
        float bands = 0.5 + 0.5 * sin(vLocal.y * 90.0 * uScale - uTime * 7.0 + sin(vLocal.x * 70.0 * uScale + uTime * 2.0) * 1.6);
        vec3 heatCol = mix(uWarm, uHot, hot);
        col += heatCol * warm * (0.35 + 0.65 * bands) * (0.6 + 0.8 * hot);
        col += vec3(1.0, 0.85, 0.7) * hot * pow(bands, 6.0) * 0.6;
        col += mix(uCool, heatCol, warm) * fres * (0.55 + 0.9 * warm);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}
