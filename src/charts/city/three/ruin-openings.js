import * as THREE from "three";
import { ruinDepth } from "./lifecycle.js";

export function ruinWindowStart(height, floors) {
  const spacing = height / floors;
  const first = Math.max(
    0,
    Math.min(
      floors - 1,
      Math.ceil((height + 0.13 - ruinDepth(height) - 0.175 - 0.52) / spacing),
    ),
  );
  return 0.52 + first * spacing;
}

// Cut out fragments instead of drawing dark glass or using translucent walls.
// One attribute per instance keeps both the body and crown in their shared batches.
export function withRuinOpenings(mat, geometry, items) {
  geometry.setAttribute(
    "ruinOpenings",
    new THREE.InstancedBufferAttribute(
      new Float32Array(items.flatMap((item) => item.openings ?? [0, 0])),
      2,
    ),
  );
  const previousCompile = mat.onBeforeCompile;
  const previousKey = mat.customProgramCacheKey();
  mat.side = THREE.DoubleSide;
  mat.onBeforeCompile = (shader, renderer) => {
    previousCompile.call(mat, shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute vec2 ruinOpenings;
        varying vec2 vRuinOpenings;
        varying vec2 vRuinWindowPosition;
        varying float vRuinWall;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vRuinOpenings = ruinOpenings;
        vRuinWall = 1.0 - step(0.5, abs(normal.y));
        vec3 ruinPosition = (instanceMatrix * vec4(position, 1.0)).xyz;
        vec3 ruinLocal = ruinPosition - instanceMatrix[3].xyz;
        vRuinWindowPosition = vec2(abs(normal.z) > 0.5 ? ruinLocal.x : ruinLocal.z, ruinPosition.y);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec2 vRuinOpenings;
        varying vec2 vRuinWindowPosition;
        varying float vRuinWall;`,
      )
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
        if (vRuinOpenings.x > 0.0 && vRuinWall > 0.5) {
          float row = floor((vRuinWindowPosition.y - vRuinOpenings.y) / vRuinOpenings.x + 0.5);
          float centerY = vRuinOpenings.y + row * vRuinOpenings.x;
          if (row >= 0.0 && abs(vRuinWindowPosition.y - centerY) < 0.175
              && abs(abs(vRuinWindowPosition.x) - 0.31) < 0.125) discard;
        }`,
      );
  };
  mat.customProgramCacheKey = () => `${previousKey}-ruin-openings-v1`;
  return mat;
}
