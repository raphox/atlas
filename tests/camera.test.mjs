import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { City } from "../src/city.js";

test("isometria mantém inclinação fixa ao girar, recentralizar e voltar da vista superior", () => {
  const camera = new THREE.OrthographicCamera(-100, 100, 100, -100, 0.1, 800);
  camera.position.set(160, 160, 160);
  const controls = new OrbitControls(camera, null),
    city = { camera, controls, layout: { center: [14, -8] } };
  const angle = Math.acos(1 / Math.sqrt(3));
  for (const previousMode of ["iso", "top"]) {
    City.prototype.view.call(city, previousMode, true);
    if (previousMode === "top") assert.ok(controls.getPolarAngle() < 0.00001);
    City.prototype.view.call(city, "iso", true);
    assert.deepEqual(controls.target.toArray(), [14, 0, -8]);
    let azimuth;
    for (const offset of [
      [150, 5, 10],
      [-150, 300, 10],
      [10, 500, -150],
    ]) {
      camera.position.copy(controls.target).add(new THREE.Vector3(...offset));
      controls.update();
      assert.ok(Math.abs(controls.getPolarAngle() - angle) < 1e-10);
      if (azimuth !== undefined)
        assert.notEqual(controls.getAzimuthalAngle(), azimuth);
      azimuth = controls.getAzimuthalAngle();
    }
    camera.zoom = 2;
    camera.updateProjectionMatrix();
    controls.target.x += 5;
    controls.update();
    assert.equal(camera.zoom, 2);
    assert.ok(Math.abs(controls.getPolarAngle() - angle) < 1e-10);
  }
});
