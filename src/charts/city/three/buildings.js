import * as THREE from "three";
import {
  random,
  metricFor,
  metricDomainFor,
  sizeForValue,
} from "../../../model.js";
import { facadeWindows, windowEmitters } from "../../../plumes.js";
import { createCriticalBlink } from "../../../critical-blink.js";
import { instances, material } from "./primitives.js";
import { updateWindowLighting } from "./lighting.js";
import { buildingMaterial } from "./building-material.js";
import { ruinWindowStart, withRuinOpenings } from "./ruin-openings.js";
import {
  companyColor,
  constructionBands,
  constructionBandMaterial,
  intactRuinWindow,
  lifecycleDetails,
  ruinCrownGeometry,
  ruinDepth,
} from "./lifecycle.js";

// Keep the original box/window grid; lifecycle details share instance batches.
export function buildBuildings(city, companies) {
  const bodies = [],
    windows = [],
    glows = [];
  const inactiveWindows = [],
    crowns = [],
    details = [],
    bands = [];
  const rng = random(712);
  const domain = city.layout?.metricDomain ?? metricDomainFor(companies);
  city.emitters = [];
  city.warningSources = [];
  for (const c of companies) {
    const size = sizeForValue(metricFor(c).value, domain);
    c.height = size.height;
    c.house = size.house;
    const shade = 0.88 + rng() * 0.22;
    const tint = companyColor(c, city.palettes.get(c.mask), shade);
    const w = size.house ? 1.35 : 1.5 + rng() * 0.14;
    const d = size.house ? 1.45 : 1.4 + rng() * 0.15;
    c.width = w;
    c.depth = d;
    const crownHeight = c.status === "cancelled" ? ruinDepth(c.height) : 0;
    const bodyHeight = c.height - crownHeight;
    const openings =
      c.status === "cancelled"
        ? [c.height / size.floors, ruinWindowStart(c.height, size.floors)]
        : [0, 0];
    const inactive = ["configuring", "disabled", "cancelled"].includes(
      c.status,
    );
    bodies.push({
      x: c.x,
      y: bodyHeight / 2 + 0.13,
      z: c.z,
      w,
      h: bodyHeight,
      d,
      color: tint,
      shade,
      company: c.id,
      openings,
    });
    c.roofTop = c.height + 0.13;
    if (crownHeight)
      crowns.push({
        x: c.x,
        // Slight overlap hides rasterization seams between the two meshes.
        y: c.roofTop - crownHeight - 0.004,
        z: c.z,
        w,
        h: crownHeight + 0.004,
        openings,
        d,
        color: tint,
        company: c.id,
      });
    details.push(...lifecycleDetails(c, tint, size.floors));
    bands.push(...constructionBands(c, size.floors));
    const facade = facadeWindows(c, size, w, d),
      emitters = windowEmitters(c, facade),
      emitting = new Map(emitters.map((e) => [e.index, e]));
    city.emitters.push(...emitters);
    const opening = (f, width, height, color, out = 0.012) => ({
      x: f.x + f.nx * out,
      y: f.y,
      z: f.z + f.nz * out,
      w: width,
      h: height,
      d: 1,
      ry: f.nx ? Math.PI / 2 : 0,
      color,
      company: c.id,
    });
    for (const f of facade) {
      // Consume the same random sample for every ordinary window, regardless
      // of lifecycle, so changing status preserves later buildings' dimensions.
      const source = emitting.get(f.index);
      if (source) {
        glows.push({
          ...opening(
            f,
            0.23,
            0.32,
            source.critical ? "#ffad37" : "#555956",
            0.029,
          ),
          source,
        });
      } else {
        const color = rng() > 0.75 ? "#f7e6b2" : "#d9e6e8";
        if (
          c.status === "cancelled" &&
          (f.y >= openings[1] - 1e-6 || !intactRuinWindow(c, f))
        )
          continue;
        const target = inactive ? inactiveWindows : windows;
        target.push(
          opening(
            f,
            0.25,
            0.35,
            c.status === "disabled" || c.status === "cancelled"
              ? "#171b20"
              : color,
          ),
        );
      }
    }
    if (c.status === "warning")
      city.warningSources.push({
        x: c.x,
        y: c.height + 1.65,
        z: c.z,
        company: c.id,
        phase: rng() * 5,
      });
  }
  const box = new THREE.BoxGeometry(1, 1, 1);
  city.body = instances(
    box,
    withRuinOpenings(
      buildingMaterial(
        box,
        companies.map((company) => company.status === "cancelled"),
      ),
      box,
      bodies,
    ),
    bodies,
    city.buildings,
  );
  city.bodyMeshes = [city.body];
  city.ruinCrowns = null;
  if (crowns.length) {
    const crownGeometry = ruinCrownGeometry();
    city.ruinCrowns = instances(
      crownGeometry,
      withRuinOpenings(
        material("#ffffff", { vertexColors: true }),
        crownGeometry,
        crowns,
      ),
      crowns,
      city.buildings,
    );
    city.bodyMeshes.push(city.ruinCrowns);
  }
  if (details.length)
    instances(
      new THREE.BoxGeometry(1, 1, 1),
      material("#ffffff"),
      details,
      city.buildings,
    );
  const windowPlane = new THREE.PlaneGeometry(1, 1);
  if (bands.length)
    instances(windowPlane, constructionBandMaterial(), bands, city.buildings);
  city.windows = instances(
    windowPlane,
    material("#ffffff", { roughness: 0.6 }),
    windows,
    city.buildings,
  );
  updateWindowLighting(city);
  city.inactiveWindows = inactiveWindows.length
    ? instances(
        windowPlane.clone(),
        material("#ffffff", { emissiveIntensity: 0 }),
        inactiveWindows,
        city.buildings,
      )
    : null;
  city.windowGlow = instances(
    windowPlane,
    new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }),
    glows,
    city.buildings,
  );
  const criticalBlinks = new Map(
    companies
      .filter((c) => c.status === "critical")
      .map((c) => [c.id, createCriticalBlink(c.id)]),
  );
  city.criticalSurfaces = [city.body].map((mesh) => ({
    mesh,
    items: mesh.userData.items.flatMap((item, index) =>
      criticalBlinks.has(item.company)
        ? [
            {
              index,
              color: item.color.clone(),
              blink: criticalBlinks.get(item.company),
            },
          ]
        : [],
    ),
  }));
}
