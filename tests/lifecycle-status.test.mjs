import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { STATUS, sizeForValue } from "../src/model.js";
import { City } from "../src/city.js";
import { validateCityData } from "../src/charts/city/data.js";
import { buildBuildings } from "../src/charts/city/three/buildings.js";
import { updateWindowLighting } from "../src/charts/city/three/lighting.js";
import {
  ruinDepth,
  constructionBands,
  lifecycleDetails,
} from "../src/charts/city/three/lifecycle.js";
import { facadeWindows } from "../src/plumes.js";
import { disposeSceneGroups } from "../src/scene-resources.js";

function fixture(count = 6, values = [150]) {
  const companies = Array.from({ length: count }, (_, i) => ({
    id: `c-${i}`,
    name: `Company ${i}`,
    status: Object.keys(STATUS)[i % 6],
    metric: {
      label: "Revenue",
      value: values[Math.floor(i / 6) % values.length],
    },
    mask: 1,
    x: i * 3,
    z: 0,
  }));
  const city = {
    buildings: new THREE.Group(),
    palettes: new Map([[1, new THREE.Color("#4b91ef")]]),
    layout: { metricDomain: [0, 1000] },
    windowLight: 0,
  };
  buildBuildings(city, companies);
  return { city, companies };
}

test("all six statuses validate and lifecycle states never emit smoke or fire", () => {
  const { city, companies } = fixture();
  assert.equal(validateCityData(companies).length, 6);
  const masonry = city.body.geometry.getAttribute("exposedMasonry");
  for (const [index, company] of companies.entries())
    assert.equal(masonry.getX(index), Number(company.status === "cancelled"));
  const emitterIds = new Set(city.emitters.map((e) => e.company));
  assert.deepEqual(emitterIds, new Set(["c-1", "c-2"]));
  assert.deepEqual(
    city.warningSources.map((s) => s.company),
    ["c-1"],
  );
  assert.deepEqual(
    city.criticalSurfaces[0].items.map(
      (s) => city.body.userData.items[s.index].company,
    ),
    ["c-2"],
  );
  disposeSceneGroups([city.buildings]);
});

test("lifecycle visuals retain the metric height, footprint and original window grid", () => {
  const { city, companies } = fixture(24, [0, 150, 500, 1000]);
  const matrix = new THREE.Matrix4();
  for (const c of companies) {
    const size = sizeForValue(c.metric.value, city.layout.metricDomain);
    assert.equal(c.height, size.height);
    const expectedWindows = facadeWindows(c, size, c.width, c.depth);
    const windowMesh = ["configuring", "disabled", "cancelled"].includes(
      c.status,
    )
      ? city.inactiveWindows
      : city.windows;
    const actual = windowMesh.userData.items.filter((w) => w.company === c.id);
    if (["configuring", "disabled"].includes(c.status))
      assert.equal(actual.length, size.floors * 4);
    for (const window of actual)
      assert.ok(
        expectedWindows.some(
          (w) =>
            w.y === window.y &&
            Math.abs(w.x - window.x) < 0.02 &&
            Math.abs(w.z - window.z) < 0.02,
        ),
      );
    const bounds = new THREE.Box3();
    for (const mesh of city.bodyMeshes) {
      mesh.geometry.computeBoundingBox();
      mesh.userData.items.forEach((item, index) => {
        if (item.company !== c.id) return;
        mesh.getMatrixAt(index, matrix);
        bounds.union(mesh.geometry.boundingBox.clone().applyMatrix4(matrix));
      });
    }
    assert.ok(Math.abs(bounds.max.y - c.roofTop) < 1e-5);
    assert.ok(Math.abs(bounds.getSize(new THREE.Vector3()).x - c.width) < 1e-5);
    assert.ok(Math.abs(bounds.getSize(new THREE.Vector3()).z - c.depth) < 1e-5);
  }
  for (const mesh of [...city.bodyMeshes, city.inactiveWindows]) {
    assert.equal(mesh.material.transparent, false);
    assert.equal(mesh.material.opacity, 1);
    assert.equal(mesh.material.depthWrite, true);
  }
  city.windowLight = 1;
  updateWindowLighting(city);
  assert.ok(city.windows.material.emissiveIntensity > 0);
  assert.equal(city.inactiveWindows.material.emissiveIntensity, 0);
  disposeSceneGroups([city.buildings]);
});

test("ruin crown has missing sections on every face and removes glass from broken floors", () => {
  const { city, companies } = fixture();
  const c = companies[5];
  const crown = city.ruinCrowns;
  const firstOpening = crown.userData.items.find(
    (item) => item.company === c.id,
  ).openings[1];
  assert.ok(
    city.inactiveWindows.userData.items
      .filter((item) => item.company === c.id)
      .every((item) => item.y < firstOpening),
  );
  assert.equal(
    crown.geometry.getAttribute("ruinOpenings").getY(0),
    Math.fround(firstOpening),
  );
  const y = crown.geometry.getAttribute("position");
  assert.ok(
    Array.from({ length: y.count }, (_, i) => y.getY(i)).some(
      (v) => v > 0 && v < 1,
    ),
  );
  assert.ok(
    city.inactiveWindows.userData.items.filter((i) => i.company === c.id)
      .length <
      sizeForValue(150, [0, 1000]).floors * 4,
  );
  // Horizontal rays distinguish standing wall from openings on every facade.
  city.buildings.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  const cutY = c.roofTop - ruinDepth(c.height) * 0.4;
  for (const [label, nx, nz, peak, gap] of [
    ["front", 0, 1, -0.43, -0.1],
    ["right", 1, 0, -0.43, -0.1],
    ["back", 0, -1, -0.43, -0.1],
    ["left", -1, 0, -0.43, -0.1],
  ]) {
    const hitAt = (along) => {
      ray.set(
        new THREE.Vector3(
          c.x + (nx ? nx * (c.width / 2 + 2) : along * c.width),
          cutY,
          c.z + (nz ? nz * (c.depth / 2 + 2) : along * c.depth),
        ),
        new THREE.Vector3(-nx, 0, -nz),
      );
      return ray
        .intersectObjects(city.bodyMeshes, false)
        .find(
          (hit) => hit.object.userData.items[hit.instanceId].company === c.id,
        );
    };
    assert.ok(Math.abs(hitAt(peak).distance - 2) < 1e-4, label);
    const missing = hitAt(gap);
    assert.ok(!missing || missing.distance > 2.1, label);
  }
  disposeSceneGroups([city.buildings]);
});

test("picking resolves company IDs across opaque lifecycle and ruined meshes", () => {
  const { city, companies } = fixture();
  city.buildings.updateMatrixWorld(true);
  const camera = new THREE.OrthographicCamera(-12, 12, 12, -12, 0.1, 100);
  camera.position.set(7.5, 10, 24);
  camera.lookAt(7.5, 3, 0);
  camera.updateMatrixWorld();
  Object.assign(city, {
    camera,
    raycaster: new THREE.Raycaster(),
    pointer: new THREE.Vector2(),
    companiesById: new Map(companies.map((c) => [c.id, c])),
    active: new Set(companies.map((c) => c.id)),
    renderer: {
      domElement: {
        getBoundingClientRect: () => ({
          left: 0,
          top: 0,
          width: 800,
          height: 800,
        }),
      },
    },
  });
  for (const c of companies) {
    const point = new THREE.Vector3(c.x, c.height / 2, c.z).project(camera);
    assert.equal(
      City.prototype.pick.call(city, {
        clientX: (point.x + 1) * 400,
        clientY: (1 - point.y) * 400,
      })?.id,
      c.id,
    );
  }
  disposeSceneGroups([city.buildings]);
});

test("geometry batches stay constant as company counts grow", () => {
  const small = fixture(6),
    large = fixture(600);
  assert.equal(
    large.city.buildings.children.length,
    small.city.buildings.children.length,
  );
  assert.ok(large.city.buildings.children.length <= 7);
  assert.ok(
    large.city.buildings.children.every((mesh) => mesh.isInstancedMesh),
  );
  disposeSceneGroups([small.city.buildings, large.city.buildings]);
});

test("configuring follows group palette updates while disabled and cancelled retain their colors", () => {
  const { city, companies } = fixture();
  Object.assign(city, {
    companies,
    companiesById: new Map(companies.map((c) => [c.id, c])),
    renderer: { renderLists: { dispose() {} } },
    buildEffects() {},
    select() {},
    invalidate() {},
  });
  city.layout = {
    ...city.layout,
    companies,
    roadBounds: { x1: -1, x2: 20, z1: -1, z2: 1 },
  };
  const oldBodies = [...city.bodyMeshes];
  const setup = city.body.userData.items.find((i) => i.company === "c-3");
  assert.ok(
    setup.color.equals(new THREE.Color("#4b91ef").multiplyScalar(setup.shade)),
  );
  const fixedColors = city.body.userData.items
    .filter((i) => ["c-4", "c-5"].includes(i.company))
    .map((item) => [item, item.color.clone()]);
  City.prototype.updateCompanies.call(
    city,
    { ...city.layout, companies: companies.map((c) => ({ ...c })) },
    new Map([[1, "#ff8800"]]),
  );
  assert.equal(city.bodyMeshes[0], oldBodies[0]);
  assert.ok(
    setup.color.equals(new THREE.Color("#ff8800").multiplyScalar(setup.shade)),
  );
  for (const [item, color] of fixedColors) assert.ok(item.color.equals(color));
  let disposed = 0;
  city.buildings.children.forEach((mesh) =>
    mesh.addEventListener("dispose", () => disposed++),
  );
  const before = city.buildings.children.length;
  City.prototype.updateCompanies.call(
    city,
    {
      ...city.layout,
      companies: companies.map((c) => ({ ...c, status: "healthy" })),
    },
    new Map([[1, "#ff8800"]]),
  );
  assert.equal(disposed, before);
  assert.equal(city.bodyMeshes.length, 1);
  assert.equal(city.body.count, companies.length);
  assert.ok(
    city.body.geometry
      .getAttribute("exposedMasonry")
      .array.every((value) => value === 0),
  );
  assert.equal(city.ruinCrowns, null);
  assert.equal(city.inactiveWindows, null);
  assert.equal(city.emitters.length, 0);
  disposeSceneGroups([city.buildings]);
});

test("scaffolds span at most two floors per tier with visible bars and opaque yellow/black bands", () => {
  for (const value of [0, 150, 500, 1000]) {
    const size = sizeForValue(value, [0, 1000]);
    const company = {
      id: "setup",
      status: "configuring",
      x: 0,
      z: 0,
      width: 2,
      depth: 2,
      height: size.height,
    };
    const bands = constructionBands(company, size.floors);
    const tops = bands.filter((b) => !b.ry).map((b) => b.y + b.h / 2 - 0.13);
    let previous = 0;
    for (const top of tops) {
      assert.ok(top > previous);
      assert.ok(top - previous <= (2 * size.height) / size.floors + 1e-6);
      previous = top;
    }
    assert.ok(Math.abs(previous - size.height) < 1e-6);
    const details = lifecycleDetails(
      company,
      new THREE.Color("gray"),
      size.floors,
    );
    assert.ok(details.every((bar) => Math.min(bar.w, bar.h, bar.d) >= 0.08));
  }
  const { city } = fixture(60);
  const bandMeshes = city.buildings.children.filter(
    (mesh) => mesh.material.map,
  );
  assert.equal(bandMeshes.length, 1);
  const { material } = bandMeshes[0];
  assert.equal(material.transparent, false);
  assert.equal(material.opacity, 1);
  assert.equal(material.depthWrite, true);
  const pixels = material.map.image.data;
  const colors = new Set();
  for (let i = 0; i < pixels.length; i += 4)
    colors.add(Array.from(pixels.slice(i, i + 4)).join(","));
  assert.deepEqual(colors, new Set(["245,196,45,255", "20,25,31,255"]));
  let disposed = 0;
  material.map.addEventListener("dispose", () => disposed++);
  disposeSceneGroups([city.buildings]);
  assert.equal(disposed, 1);
});
