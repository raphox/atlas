import * as THREE from "three";
import { pathToFileURL } from "node:url";
import { City } from "../src/city.js";
import { demoCompanies, layoutCity, REGIONS } from "../src/model.js";
import { disposeSceneGroups } from "../src/scene-resources.js";

// Deterministic geometry budget. No browser, WebGL, timers or particle effects.
// Counts all static base meshes and instances, independent of camera culling.
export function measureCityGeometry(count) {
  const layout = layoutCity(demoCompanies(count));
  const city = Object.assign(Object.create(City.prototype), {
    scene: new THREE.Scene(),
    terrain: new THREE.Group(),
    buildings: new THREE.Group(),
    palettes: new Map(REGIONS.map((r) => [r.mask, new THREE.Color(r.color)])),
    renderer: { renderLists: { dispose() {} } },
    selection: { visible: false },
    resize() {},
    buildEffects() {},
  });
  city.scene.add(city.terrain, city.buildings);
  city.setCompanies(layout.companies, layout);
  let triangles = 0,
    batches = 0;
  city.scene.traverse((object) => {
    if (!object.isMesh) return;
    triangles +=
      ((object.geometry.index?.count ??
        object.geometry.attributes.position.count) /
        3) *
      (object.isInstancedMesh ? object.count : 1);
    batches++;
  });
  disposeSceneGroups([city.scene]);
  return { companies: count, triangles, batches };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  console.table([100, 1400].map(measureCityGeometry));
}
