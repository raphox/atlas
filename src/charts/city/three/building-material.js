import * as THREE from "three";
import { material } from "./primitives.js";

// One flag per instance keeps the risk signal unlit without extra draw calls.
export function buildingMaterial(geometry, exposedMasonry) {
  const count = exposedMasonry.length;
  geometry.setAttribute(
    "exposedMasonry",
    new THREE.InstancedBufferAttribute(
      new Float32Array(count ? exposedMasonry.map(Number) : [0]),
      1,
    ),
  );
  geometry.setAttribute(
    "criticalBlink",
    new THREE.InstancedBufferAttribute(
      new Float32Array(Math.max(1, count)),
      1,
    ).setUsage(THREE.DynamicDrawUsage),
  );
  const result = material("#ffffff");
  result.onBeforeCompile = (shader) => {
    shader.uniforms.criticalColor = { value: new THREE.Color("#ff2525") };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute float criticalBlink;
        attribute float exposedMasonry;
        varying float vCriticalBlink;
        varying float vExposedMasonry;
        varying vec2 vBrickUv;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vCriticalBlink = criticalBlink;
        vExposedMasonry = exposedMasonry * (1.0 - step(0.5, abs(normal.y)));
        vec3 masonryPosition = (instanceMatrix * vec4(position, 1.0)).xyz;
        vBrickUv = vec2(abs(normal.z) > 0.5 ? masonryPosition.x : masonryPosition.z, masonryPosition.y);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform vec3 criticalColor;
        varying float vCriticalBlink;
        varying float vExposedMasonry;
        varying vec2 vBrickUv;`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        if (vExposedMasonry > 0.5) {
          // World-unit rows stay the same size across company metrics; no extra mesh or texture.
          vec2 grid = vBrickUv / vec2(0.36, 0.18);
          float row = floor(grid.y);
          grid.x += mod(row, 2.0) * 0.5;
          vec2 edge = min(fract(grid), 1.0 - fract(grid));
          vec2 aa = max(fwidth(grid), vec2(0.001));
          vec2 joint = smoothstep(vec2(0.045) - aa, vec2(0.045) + aa, edge);
          float brick = joint.x * joint.y;
          float variation = 0.9 + 0.2 * fract(sin(dot(floor(grid), vec2(12.9898, 78.233))) * 43758.5453);
          vec3 masonry = mix(vec3(0.82), vec3(2.35, 1.85, 1.45) * variation, brick);
          // Fade subpixel mortar at a distance to avoid moire while orbiting or zooming.
          float detail = 1.0 - smoothstep(0.35, 1.0, max(aa.x, aa.y));
          vec2 cell = floor(grid);
          float wear = sin(cell.x * 0.58 + sin(cell.y * 0.32)) * cos(cell.y * 0.47 + sin(cell.x * 0.5));
          float exposedPatch = smoothstep(0.34, 0.46, wear);
          diffuseColor.rgb *= mix(vec3(1.0), mix(vec3(2.0, 1.65, 1.3), masonry, detail), exposedPatch);
        }`,
      )
      .replace(
        "#include <tonemapping_fragment>",
        `#include <tonemapping_fragment>
        if (vCriticalBlink > 0.5) gl_FragColor.rgb = criticalColor;`,
      );
  };
  // The override runs after exposure/tone mapping, before output color space.
  result.customProgramCacheKey = () => "atlas-building-masonry-v2";
  return result;
}
