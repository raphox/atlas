import test from "node:test";
import assert from "node:assert/strict";
import { CityWeather } from "../src/charts/city/three/weather.js";
import * as THREE from "three";
import { disposeSceneGroups } from "../src/scene-resources.js";

test("particles animate both types, follow layout, sleep when disabled and release GPU resources", () => {
  const weather = new CityWeather();
  weather.setLayout({
    roadBounds: { x1: -10, x2: 10, z1: -5, z2: 5 },
    companies: [{ roofTop: 20 }],
  });
  assert.equal(weather.height, 32);
  weather.update(0, "rain", true);
  assert.equal(weather.visible, true);
  assert.equal(weather.rain.visible, true);
  assert.equal(weather.snow.visible, false);
  const rain = weather.rain.geometry.attributes.position;
  const initial = rain.array.slice();
  weather.update(0.1, "rain", true);
  assert.notDeepEqual(rain.array, initial);
  assert.ok(rain.array.every(Number.isFinite));
  weather.update(0.1, "snow", true);
  assert.equal(weather.rain.visible, false);
  assert.equal(weather.snow.visible, true);
  const snow = weather.snow.geometry.attributes.position;
  const version = snow.version;
  weather.update(1, "snow", false);
  assert.equal(weather.visible, false);
  assert.equal(snow.version, version);
  weather.update(1, "none", true);
  assert.equal(weather.visible, false);
  const resources = [
    weather.rain.geometry,
    weather.snow.geometry,
    weather.rain.material,
    weather.snow.material,
    weather.snow.material.map,
    weather.cover.geometry,
    weather.cover.material,
    weather.cover.material.map,
  ];
  const disposed = [];
  resources.forEach((resource) =>
    resource.addEventListener("dispose", () => disposed.push(resource)),
  );
  disposeSceneGroups([weather]);
  assert.equal(new Set(disposed).size, resources.length);
  assert.equal(weather.children.length, 0);
});

test("rain density follows city area without reallocating or duplicating weather layers", () => {
  const weather = new CityWeather();
  const geometry = weather.rain.geometry;
  const buffer = geometry.attributes.position;
  const small = { roadBounds: { x1: -8, x2: 8, z1: -8, z2: 8 }, companies: [] };
  const regular = {
    roadBounds: { x1: -12, x2: 12, z1: -12, z2: 8 },
    companies: [],
  };
  weather.setLayout(small);
  weather.update(1, "rain", true);
  const smallCount = geometry.drawRange.count / 2;
  assert.ok(smallCount > 0 && smallCount < 800);
  assert.ok(Math.abs(smallCount / 400 - 1.2) < 0.01);
  assert.ok(buffer.array.slice(0, smallCount * 6).every(Number.isFinite));
  weather.setLayout(regular);
  weather.update(2, "rain", true);
  assert.equal(geometry.drawRange.count / 2, 800);
  for (const type of ["none", "snow", "rain", "none", "rain"]) {
    weather.setLayout(small);
    weather.update(3, type, true);
  }
  assert.equal(geometry.drawRange.count / 2, smallCount);
  assert.equal(weather.rain.geometry.attributes.position, buffer);
  assert.equal(
    weather.children.filter((child) => child.isLineSegments).length,
    1,
  );
  assert.equal(weather.snow.geometry.attributes.position.count, 800);
  disposeSceneGroups([weather]);
});

test("rain has irregular spacing, varied trails and independent falling speeds", () => {
  const weather = new CityWeather();
  weather.setLayout({
    roadBounds: { x1: -8, x2: 8, z1: -8, z2: 8 },
    companies: [{ roofTop: 20 }],
  });
  weather.update(0, "rain", true);
  const buffer = weather.rain.geometry.attributes.position.array;
  const before = buffer.slice(0, weather.rainCount * 6);
  const lengths = new Set();
  // Constant modular offsets between successive drops create visible bands.
  for (const [axis, span] of [
    [0, weather.bounds.width],
    [1, weather.height],
    [2, weather.bounds.depth],
  ]) {
    const gaps = new Set();
    for (let i = 6; i < before.length; i += 6) {
      const gap = (before[i + axis] - before[i + axis - 6]) / span;
      gaps.add(Math.floor((gap - Math.floor(gap)) * 10));
    }
    assert.ok(gaps.size >= 8, `axis ${axis} must not repeat a regular offset`);
  }
  weather.update(0.01, "rain", true);
  const speeds = new Set();
  for (let i = 0; i < before.length; i += 6) {
    lengths.add(Math.round((before[i + 4] - before[i + 1]) * 10));
    const fall = before[i + 1] - buffer[i + 1];
    if (fall > 0) speeds.add(Math.round(fall / 0.01));
  }
  assert.ok(
    lengths.size >= 8,
    "rain trails should have visibly varied lengths",
  );
  assert.ok(speeds.size >= 8, "drops must not descend as one rigid sheet");
  // Re-evaluating the same time is stable, rather than jittering every frame.
  weather.update(0, "rain", true);
  assert.deepEqual(buffer.slice(0, before.length), before);
  disposeSceneGroups([weather]);
});

test("snow accumulates modestly inside rooftops, rebuilds with the city and clears outside snow", () => {
  const weather = new CityWeather();
  const company = { x: 0, z: 0, roofTop: 8, width: 1.6, depth: 1.5 };
  const layout = {
    roadBounds: { x1: -3, x2: 3, z1: -3, z2: 3 },
    companies: [company],
  };
  weather.setLayout(layout);
  const cover = weather.cover;
  assert.ok(cover.groundCount > 0);
  assert.equal(cover.mesh.count, cover.groundCount + 1);
  const patch = cover.mesh.userData.items.at(-1);
  assert.ok(patch.y > company.roofTop);
  assert.ok(Math.abs(patch.x - company.x) + patch.w / 2 < company.width / 2);
  assert.ok(Math.abs(patch.z - company.z) + patch.d / 2 < company.depth / 2);
  assert.ok(patch.w * patch.d < company.width * company.depth * 0.6);
  weather.update(0, "snow", true);
  const firstOpacity = cover.material.opacity;
  weather.update(12, "snow", true);
  assert.ok(cover.material.opacity > firstOpacity);
  weather.update(1200, "snow", true);
  assert.equal(cover.material.opacity, 0.7);
  assert.equal(cover.visible, true);
  assert.ok(
    weather.snow.material.size >= 2.5 && weather.snow.material.size < 3.5,
  );
  assert.ok(
    weather.snow.geometry.attributes.position.array.every(Number.isFinite),
  );
  // Independent phases/speeds prevent ordered rows falling as a single sheet.
  assert.ok(new Set(weather.flakes.map((f) => f.speed)).size > 700);
  const oldMesh = cover.mesh;
  let disposed = false;
  oldMesh.addEventListener("dispose", () => {
    disposed = true;
  });
  weather.setLayout({ ...layout, companies: [{ ...company, roofTop: 4 }] });
  assert.equal(disposed, true);
  assert.equal(cover.children.length, 1);
  assert.equal(cover.mesh.userData.items.at(-1).y, 4.018);
  weather.update(1201, "rain", true);
  assert.equal(cover.visible, false);
  assert.equal(cover.amount, 0);
  weather.update(1202, "snow", true);
  assert.equal(cover.material.opacity, firstOpacity);
  weather.update(1203, "snow", false);
  assert.equal(cover.visible, false);
  assert.equal(cover.material.opacity, 0);
  disposeSceneGroups([weather]);
});

test("rain contrasts with daylight and night, lightning is spaced and stops with weather", () => {
  const weather = new CityWeather({ lightningRandom: () => 0.5 });
  weather.setLayout({
    roadBounds: { x1: -3, x2: 3, z1: -3, z2: 3 },
    companies: [],
  });
  weather.update(0, "rain", true, new THREE.Color("#e9ede4"));
  assert.equal(weather.rain.material.color.getHexString(), "356b91");
  assert.equal(weather.nextLightning, 18);
  assert.equal(weather.lightning.intensity, 0);
  weather.update(18, "rain", true, new THREE.Color("#141e35"));
  assert.equal(weather.rain.material.color.getHexString(), "b5d4eb");
  assert.equal(weather.nextLightning, 46);
  weather.update(18.01, "rain", true);
  assert.ok(weather.lightning.intensity > 3.9);
  const peak = weather.lightning.intensity;
  const strokes = weather.lightningStrokes;
  assert.equal(strokes.length, 2);
  weather.update(18.07, "rain", true);
  assert.ok(weather.lightning.intensity < peak * 0.1);
  weather.update(18 + strokes[0].duration + 0.01, "rain", true);
  assert.equal(weather.lightning.intensity, 0);
  weather.update(18 + strokes[1].start + 0.01, "rain", true);
  assert.ok(weather.lightning.intensity > 0);
  assert.ok(weather.lightning.intensity < peak * 0.7);
  weather.update(19.3, "rain", true);
  assert.equal(weather.lightning.intensity, 0);
  weather.update(46, "rain", true);
  weather.update(46.01, "rain", true);
  assert.ok(weather.lightning.intensity > 3.9);
  weather.update(46.02, "rain", false);
  assert.equal(weather.lightning.intensity, 0);
  assert.equal(weather.nextLightning, undefined);
  assert.equal(weather.lightningStrokes, undefined);
  weather.update(80, "rain", true);
  assert.equal(weather.nextLightning, 98);
  weather.update(98, "rain", true);
  weather.update(98.01, "snow", true);
  assert.equal(weather.lightning.intensity, 0);
  assert.equal(weather.nextLightning, undefined);
  disposeSceneGroups([weather]);
});
