import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ROAD, roadTileParts, TrafficSimulation } from "./traffic.js";
import { facadeWindows, windowEmitters } from "./plumes.js";
import { WindowPlumes } from "./plume-renderer.js";
import { greenLots } from "./landscape.js";
import { createCriticalBlink } from "./critical-blink.js";
import { disposeSceneGroups } from "./scene-resources.js";
import { SelectionHighlight } from "./selection-highlight.js";
import {
  REGIONS,
  layoutMembership,
  ROAD_EVERY,
  random,
  sizeForUsers,
} from "./model.js";

const palettes = new Map(
  REGIONS.map((r) => [r.mask, new THREE.Color(r.color)]),
);
const dummy = new THREE.Object3D();
const rgb = new THREE.Color();
const criticalRed = new THREE.Color("#ff2525");
const STEP = 2.8;
const ISO_POLAR = Math.acos(1 / Math.sqrt(3));
function material(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.85,
    flatShading: true,
    ...extra,
  });
}
function instances(geometry, mat, items, scene) {
  const mesh = new THREE.InstancedMesh(
    geometry,
    mat,
    Math.max(1, items.length),
  );
  mesh.count = items.length;
  mesh.userData.items = items;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    dummy.position.set(it.x, it.y, it.z);
    dummy.rotation.set(0, it.ry ?? 0, 0);
    dummy.scale.set(it.w ?? 1, it.h ?? 1, it.d ?? 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    if (it.color) mesh.setColorAt(i, rgb.set(it.color));
  }
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  scene.add(mesh);
  return mesh;
}
export class City {
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.active = new Set();
    this.life = true;
    this.effects = true;
    this.running = true;
    this.elapsed = 0;
    this.previous = 0;
    this.frameMs = 0;
    this.reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#e9ede4");
    this.camera = new THREE.OrthographicCamera(-110, 110, 90, -90, 0.1, 800);
    this.camera.position.set(160, 160, 160);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    container.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.075;
    this.controls.minPolarAngle = ISO_POLAR;
    this.controls.maxPolarAngle = ISO_POLAR;
    this.controls.minZoom = 0.45;
    this.controls.maxZoom = 12;
    this.controls.zoomSpeed = 0.85;
    this.controls.rotateSpeed = 0.5;
    this.controls.screenSpacePanning = true;
    this.controls.target.set(0, 0, 5);
    this.controls.update();
    this.scene.add(new THREE.HemisphereLight("#fff8e9", "#8b9d8b", 2.5));
    const sun = new THREE.DirectionalLight("#fff6df", 3.1);
    sun.position.set(-60, 100, 60);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight("#d8eaff", 0.75);
    fill.position.set(80, 40, -100);
    this.scene.add(fill);
    this.terrain = new THREE.Group();
    this.scene.add(this.terrain);
    this.buildings = new THREE.Group();
    this.scene.add(this.buildings);
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.selection = new SelectionHighlight();
    this.scene.add(this.selection);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.resize();
    this.renderer.domElement.addEventListener("pointerdown", (e) => {
      this.down = { x: e.clientX, y: e.clientY };
    });
    this.renderer.domElement.addEventListener("pointerup", (e) => {
      if (
        this.down &&
        Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) < 5
      ) {
        const c = this.pick(e);
        if (c) this.callbacks.select?.(c);
        else this.callbacks.deselect?.();
      }
      this.down = null;
    });
    this.renderer.domElement.addEventListener("pointermove", (e) => {
      if (e.buttons) return;
      const c = this.pick(e);
      this.renderer.domElement.style.cursor = c ? "pointer" : "grab";
      this.callbacks.hover?.(c, e);
    });
    this.renderer.domElement.addEventListener("pointerleave", () =>
      this.callbacks.hover?.(null),
    );
    this.onVisibility = () => {
      this.previous = performance.now();
    };
    document.addEventListener("visibilitychange", this.onVisibility);
    this.animate = this.animate.bind(this);
    this.animationId = requestAnimationFrame(this.animate);
  }
  resize() {
    const w = this.container.clientWidth,
      h = this.container.clientHeight;
    if (!w || !h) return;
    const aspect = w / h;
    const half =
      aspect < 1 ? (this.homeHalf ?? 32) / aspect : (this.homeHalf ?? 32);
    this.camera.left = -half * aspect;
    this.camera.right = half * aspect;
    this.camera.top = half;
    this.camera.bottom = -half;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
  buildTerrain() {
    const tileGeo = new THREE.BoxGeometry(1, 1, 1),
      pavement = [],
      grass = [],
      asphalt = [],
      roadLines = [],
      curbs = [],
      trunks = [],
      leaves = [],
      parkSeats = [];
    const rb = this.layout.roadBounds;
    for (let z = rb.z1; z <= rb.z2; z++)
      for (let x = rb.x1; x <= rb.x2; x++) {
        const mask = layoutMembership(x, z, this.layout.bounds);
        const road = x % ROAD_EVERY === 0 || z % ROAD_EVERY === 0;
        const col = (palettes.get(mask) ?? new THREE.Color("#becdaa"))
          .clone()
          .lerp(new THREE.Color("#e4e6d9"), 0.82);
        pavement.push({
          x: x * STEP,
          y: -0.35,
          z: z * STEP,
          w: STEP,
          h: 0.65,
          d: STEP,
          color: col,
        });
        if (road) {
          for (const part of roadTileParts(x, z))
            asphalt.push({
              x: x * STEP + part.dx,
              y: 0.015,
              z: z * STEP + part.dz,
              w: part.w,
              h: 0.06,
              d: part.d,
              color: "#7c8989",
            });
          const nearJunction = (v) =>
            Math.min(
              ((v % ROAD_EVERY) + ROAD_EVERY) % ROAD_EVERY,
              ROAD_EVERY - (((v % ROAD_EVERY) + ROAD_EVERY) % ROAD_EVERY),
            ) <= 1;
          if (x % ROAD_EVERY !== 0 && z % ROAD_EVERY === 0 && !nearJunction(x))
            roadLines.push({
              x: x * STEP,
              y: 0.052,
              z: z * STEP,
              w: 0.7,
              h: 0.012,
              d: 0.035,
              color: "#e4e5da",
            });
          if (x % ROAD_EVERY === 0 && z % ROAD_EVERY !== 0 && !nearJunction(z))
            roadLines.push({
              x: x * STEP,
              y: 0.052,
              z: z * STEP,
              w: 0.035,
              h: 0.012,
              d: 0.7,
              color: "#e4e5da",
            });
          const edge = (STEP - ROAD.width) / 2,
            offset = (STEP + ROAD.width) / 4;
          if (x % ROAD_EVERY === 0 && z % ROAD_EVERY !== 0)
            for (const sign of [-1, 1])
              curbs.push({
                x: x * STEP + sign * offset,
                y: 0.035,
                z: z * STEP,
                w: edge,
                h: 0.12,
                d: STEP,
                color: "#d8dcd4",
              });
          if (z % ROAD_EVERY === 0 && x % ROAD_EVERY !== 0)
            for (const sign of [-1, 1])
              curbs.push({
                x: x * STEP,
                y: 0.035,
                z: z * STEP + sign * offset,
                w: STEP,
                h: 0.12,
                d: edge,
                color: "#d8dcd4",
              });
          if (x % ROAD_EVERY === 0 && z % ROAD_EVERY === 0) {
            for (const sx of [-1, 1])
              for (const sz of [-1, 1])
                curbs.push({
                  x: x * STEP + sx * offset,
                  y: 0.035,
                  z: z * STEP + sz * offset,
                  w: edge,
                  h: 0.12,
                  d: edge,
                  color: "#d8dcd4",
                });
            for (const sign of [-1, 1]) {
              for (let i = 0; i < 7; i++) {
                const q = (i - 3) * 0.29;
                if (z + sign >= rb.z1 && z + sign <= rb.z2)
                  roadLines.push({
                    x: x * STEP + q,
                    y: 0.055,
                    z: z * STEP + sign * ROAD.crosswalk,
                    w: 0.16,
                    h: 0.012,
                    d: 0.5,
                    color: "#f1efe3",
                  });
                if (x + sign >= rb.x1 && x + sign <= rb.x2)
                  roadLines.push({
                    x: x * STEP + sign * ROAD.crosswalk,
                    y: 0.055,
                    z: z * STEP + q,
                    w: 0.5,
                    h: 0.012,
                    d: 0.16,
                    color: "#f1efe3",
                  });
              }
              if (x + sign >= rb.x1 && x + sign <= rb.x2)
                roadLines.push({
                  x: x * STEP + sign * ROAD.stop,
                  y: 0.055,
                  z: z * STEP - sign * ROAD.lane,
                  w: 0.07,
                  h: 0.012,
                  d: 0.82,
                  color: "#f1efe3",
                });
              if (z + sign >= rb.z1 && z + sign <= rb.z2)
                roadLines.push({
                  x: x * STEP + sign * ROAD.lane,
                  y: 0.055,
                  z: z * STEP + sign * ROAD.stop,
                  w: 0.82,
                  h: 0.012,
                  d: 0.07,
                  color: "#f1efe3",
                });
            }
          }
        }
      }
    for (const lot of greenLots(this.layout)) {
      const x = lot.col * STEP,
        z = lot.row * STEP;
      grass.push({
        x,
        y: 0.05,
        z,
        w: STEP - 0.12,
        h: 0.07,
        d: STEP - 0.12,
        color: lot.grass,
      });
      for (const tree of lot.trees) {
        const tx = x + tree.dx,
          tz = z + tree.dz,
          s = tree.scale;
        trunks.push({
          x: tx,
          y: 0.41,
          z: tz,
          w: 0.12,
          h: 0.65,
          d: 0.12,
          color: "#947c5f",
        });
        leaves.push({
          x: tx,
          y: 0.96,
          z: tz,
          w: s,
          h: s * 1.4,
          d: s,
          color: tree.color,
        });
      }
      if (lot.bench)
        parkSeats.push({
          x,
          y: 0.2,
          z: z - 0.96,
          w: 0.55,
          h: 0.15,
          d: 0.22,
          color: "#ad9b7b",
        });
    }
    instances(tileGeo, material("#ffffff"), pavement, this.terrain);
    instances(tileGeo, material("#ffffff"), asphalt, this.terrain);
    instances(tileGeo, material("#ffffff"), roadLines, this.terrain);
    instances(tileGeo, material("#ffffff"), curbs, this.terrain);
    instances(tileGeo, material("#ffffff"), grass, this.terrain);
    instances(tileGeo, material("#ffffff"), trunks, this.terrain);
    instances(
      new THREE.IcosahedronGeometry(1, 0),
      material("#ffffff"),
      leaves,
      this.terrain,
    );
    instances(tileGeo, material("#ffffff"), parkSeats, this.terrain);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1600, 1600),
      material("#e9ede4"),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.71;
    this.terrain.add(ground);
    // Soft shared shadows avoid a separate shadow draw for every company.
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    grad.addColorStop(0, "rgba(42,62,40,0.22)");
    grad.addColorStop(1, "rgba(42,62,40,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    this.shadowMap = new THREE.CanvasTexture(canvas);
  }
  setCompanies(companies, layout) {
    this.layout = layout;
    this.homeHalf = Math.max(
      18,
      Math.max(
        layout.roadBounds.x2 - layout.roadBounds.x1,
        layout.roadBounds.z2 - layout.roadBounds.z1,
      ) *
        2.8 *
        0.7,
    );
    this.resize();
    disposeSceneGroups([this.terrain, this.traffic, this.buildings]);
    if (this.traffic) this.scene.remove(this.traffic);
    this.renderer.renderLists.dispose();
    this.shadowMap = null;
    this.warningTexture = null;
    this.plumes = null;
    this.simulation = null;
    this.body = null;
    this.windowGlow = null;
    this.warning = null;
    this.filterMeshes = [];
    this.criticalSurfaces = [];
    this.cars = null;
    this.carTops = null;
    this.carWheels = null;
    this.walkers = null;
    this.heads = null;
    this.legs = null;
    this.signalLamps = null;
    this.emitters = [];
    this.warningSources = [];
    this.lampItems = [];
    this.companies = [];
    this.buildTerrain();
    this.buildTraffic();
    this.companies = companies;
    this.active = new Set(companies.map((c) => c.id));
    const bodies = [],
      roofs = [],
      windows = [],
      bases = [],
      shadows = [],
      frames = [],
      glows = [];
    const rng = random(712);
    this.emitters = [];
    this.warningSources = [];
    for (const c of companies) {
      const size = sizeForUsers(c.users);
      c.height = size.height;
      c.house = size.house;
      const tint = palettes
        .get(c.mask)
        .clone()
        .multiplyScalar(0.88 + rng() * 0.22);
      const w = size.house ? 1.35 : 1.5 + rng() * 0.14;
      const d = size.house ? 1.45 : 1.4 + rng() * 0.15;
      c.width = w;
      c.depth = d;
      bodies.push({
        x: c.x,
        y: c.height / 2 + 0.13,
        z: c.z,
        w,
        h: c.height,
        d,
        color: tint,
        company: c.id,
      });
      bases.push({
        x: c.x,
        y: 0.08,
        z: c.z,
        w: 2.18,
        h: 0.12,
        d: 2.18,
        color: palettes
          .get(c.mask)
          .clone()
          .lerp(new THREE.Color("#f3efe2"), 0.64),
        company: c.id,
      });
      shadows.push({
        x: c.x + 0.45,
        y: 0.155,
        z: c.z + 0.35,
        w: 3.6 + c.height * 0.13,
        h: 1,
        d: 3.5 + c.height * 0.13,
        ry: 0,
        company: c.id,
      });
      roofs.push({
        x: c.x,
        y: c.height + 0.16 + (size.house ? 0.3 : 0),
        z: c.z,
        w: w * 0.92,
        h: size.house ? 0.65 : 0.15,
        d: d * 0.92,
        house: size.house,
        color: tint.clone().multiplyScalar(0.78),
        company: c.id,
      });
      const roof = roofs[roofs.length - 1];
      c.roofTop = roof.y + roof.h / 2;
      const facade = facadeWindows(c, size, w, d),
        emitters = windowEmitters(c, facade),
        emitting = new Map(emitters.map((e) => [e.index, e]));
      this.emitters.push(...emitters);
      const opening = (f, side, up, out, width, height, depth, color) => ({
        x: f.x - f.nz * side + f.nx * out,
        y: f.y + up,
        z: f.z + f.nx * side + f.nz * out,
        w: f.nx ? depth : width,
        h: height,
        d: f.nz ? depth : width,
        color,
        company: c.id,
      });
      for (const f of facade) {
        const source = emitting.get(f.index);
        if (source) {
          windows.push(opening(f, 0, 0, 0.012, 0.3, 0.4, 0.025, "#38332e"));
          for (const side of [-1, 1])
            frames.push(
              opening(
                f,
                side * 0.145,
                0,
                0.04,
                0.035,
                0.42,
                0.065,
                tint.clone().multiplyScalar(0.58),
              ),
            );
          for (const up of [-1, 1])
            frames.push(
              opening(
                f,
                0,
                up * 0.19,
                0.04,
                0.32,
                0.035,
                0.065,
                tint.clone().multiplyScalar(0.58),
              ),
            );
          glows.push({
            ...opening(
              f,
              0,
              0,
              0.029,
              0.23,
              0.32,
              0.009,
              source.critical ? "#ffad37" : "#555956",
            ),
            source,
          });
        } else
          windows.push(
            opening(
              f,
              0,
              0,
              0.012,
              0.25,
              0.35,
              0.022,
              rng() > 0.75 ? "#f7e6b2" : "#d9e6e8",
            ),
          );
      }
      if (c.status === "warning")
        this.warningSources.push({
          x: c.x,
          y: c.height + 1.65,
          z: c.z,
          company: c.id,
          phase: rng() * 5,
        });
    }
    const box = new THREE.BoxGeometry(1, 1, 1);
    this.body = instances(box, material("#ffffff"), bodies, this.buildings);
    this.filterMeshes.push(this.body);
    this.filterMeshes.push(
      instances(box, material("#ffffff"), bases, this.buildings),
    );
    this.filterMeshes.push(
      instances(
        box,
        material("#ffffff", { roughness: 0.6 }),
        windows,
        this.buildings,
      ),
    );
    instances(box, material("#ffffff"), frames, this.buildings);
    this.windowGlow = instances(
      box,
      new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }),
      glows,
      this.buildings,
    );
    const houseRoofs = instances(
      new THREE.ConeGeometry(0.71, 1, 4),
      material("#ffffff"),
      roofs
        .filter((r) => r.house)
        .map((r) => ({ ...r, ry: Math.PI / 4, w: r.w * 1.08, d: r.d * 1.08 })),
      this.buildings,
    );
    const towerRoofs = instances(
      box,
      material("#ffffff"),
      roofs.filter((r) => !r.house),
      this.buildings,
    );
    this.filterMeshes.push(houseRoofs, towerRoofs);
    const criticalBlinks = new Map(
      companies
        .filter((c) => c.status === "critical")
        .map((c) => [c.id, createCriticalBlink(c.id)]),
    );
    this.criticalSurfaces = [this.body, houseRoofs, towerRoofs].map((mesh) => ({
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
    const shadowGeo = new THREE.PlaneGeometry(1, 1);
    shadowGeo.rotateX(-Math.PI / 2);
    this.filterMeshes.push(
      instances(
        shadowGeo,
        new THREE.MeshBasicMaterial({
          map: this.shadowMap,
          transparent: true,
          depthWrite: false,
          opacity: 0.7,
        }),
        shadows,
        this.buildings,
      ),
    );
    this.buildEffects();
    this.selection.visible = false;
  }
  buildEffects() {
    this.plumes = new WindowPlumes(this.emitters, this.buildings);
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(64, 13);
    ctx.lineTo(115, 110);
    ctx.lineTo(13, 110);
    ctx.closePath();
    ctx.lineJoin = "round";
    ctx.fillStyle = "#ffd600";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 18;
    ctx.stroke();
    ctx.strokeStyle = "#111820";
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.fillStyle = "#111820";
    ctx.fillRect(59, 45, 10, 34);
    ctx.fillRect(59, 88, 10, 10);
    const tex = new THREE.CanvasTexture(canvas);
    this.warningTexture?.dispose();
    this.warningTexture = tex;
    tex.colorSpace = THREE.SRGBColorSpace;
    const warningGeo = new THREE.PlaneGeometry(1, 1);
    this.warning = instances(
      warningGeo,
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      }),
      this.warningSources.map((f) => ({
        x: f.x,
        y: f.y,
        z: f.z,
        w: 1.6,
        h: 1.6,
        d: 1,
        company: f.company,
      })),
      this.buildings,
    );
    this.warning.renderOrder = 4;
    this.updateEffects(0);
  }
  updateEffects(t) {
    if (!this.plumes) return;
    // Separate irregular timing per company; all surfaces of one building agree.
    for (const { mesh, items } of this.criticalSurfaces) {
      for (const item of items) {
        const showRed = this.effects && (this.reduceMotion || item.blink(t));
        mesh.setColorAt(item.index, showRed ? criticalRed : item.color);
      }
      if (items.length) mesh.instanceColor.needsUpdate = true;
    }
    this.plumes.update(t, this.effects, this.active);
    this.warning.visible = this.effects;
    if (this.effects) {
      for (let i = 0; i < this.warningSources.length; i++) {
        const source = this.warningSources[i];
        dummy.position.set(
          source.x,
          source.y + Math.sin(t * 1.5 + source.phase) * 0.08,
          source.z,
        );
        dummy.quaternion.copy(this.camera.quaternion);
        dummy.scale.setScalar(this.active.has(source.company) ? 1.6 : 0);
        dummy.updateMatrix();
        this.warning.setMatrixAt(i, dummy.matrix);
      }
      this.warning.instanceMatrix.needsUpdate = true;
    }
    this.windowGlow.userData.items.forEach((item, i) => {
      const source = item.source;
      if (source.critical && this.effects) {
        const flicker =
          0.86 +
          0.12 * Math.sin(t * 13 + source.seed) +
          0.04 * Math.sin(t * 23 + source.seed * 2);
        rgb.setRGB(1, 0.34 * flicker, 0.035);
      } else rgb.set(this.effects ? "#555956" : "#d9e6e8");
      this.windowGlow.setColorAt(i, rgb);
    });
    if (this.windowGlow.instanceColor)
      this.windowGlow.instanceColor.needsUpdate = true;
  }
  buildTraffic() {
    this.traffic = new THREE.Group();
    this.scene.add(this.traffic);
    this.traffic.visible = this.life;
    this.simulation = new TrafficSimulation(this.layout.roadBounds);
    const sim = this.simulation,
      colors = [
        "#faf8eb",
        "#d7b86c",
        "#829b9b",
        "#d28a76",
        "#52777b",
        "#f2dfab",
      ];
    this.cars = instances(
      new THREE.BoxGeometry(1, 1, 1),
      material("#ffffff"),
      sim.cars.map((c, i) => ({
        x: c.x,
        y: 0.28,
        z: c.z,
        w: 0.58,
        h: 0.32,
        d: 0.95,
        color: colors[i % colors.length],
      })),
      this.traffic,
    );
    this.carTops = instances(
      new THREE.BoxGeometry(1, 1, 1),
      material("#a6bfc1", { roughness: 0.35 }),
      sim.cars.map((c) => ({
        x: c.x,
        y: 0.51,
        z: c.z,
        w: 0.47,
        h: 0.16,
        d: 0.44,
      })),
      this.traffic,
    );
    const wheels = new THREE.CylinderGeometry(0.095, 0.095, 0.065, 8);
    wheels.rotateZ(Math.PI / 2);
    this.carWheels = instances(
      wheels,
      material("#3c4747"),
      sim.cars.flatMap((c) =>
        Array.from({ length: 4 }, () => ({ x: c.x, y: 0.14, z: c.z })),
      ),
      this.traffic,
    );
    this.walkers = instances(
      new THREE.CapsuleGeometry(0.075, 0.17, 2, 4),
      material("#ffffff"),
      sim.walkers.map((p, i) => ({
        x: p.x,
        y: 0.34,
        z: p.z,
        color: ["#bb7a66", "#667c84", "#b49e69", "#f5ead4", "#6d8973"][i % 5],
      })),
      this.traffic,
    );
    this.heads = instances(
      new THREE.IcosahedronGeometry(0.078, 0),
      material("#dcc7a9"),
      sim.walkers.map((p) => ({ x: p.x, y: 0.57, z: p.z })),
      this.traffic,
    );
    this.legs = instances(
      new THREE.BoxGeometry(0.045, 0.15, 0.045),
      material("#566360"),
      sim.walkers.flatMap((p) => [
        { x: p.x, y: 0.18, z: p.z },
        { x: p.x, y: 0.18, z: p.z },
      ]),
      this.traffic,
    );
    const posts = [],
      housings = [],
      bulbs = [];
    this.lampItems = [];
    for (const node of sim.intersections) {
      for (const [axis, sign] of [
        ["x", 1],
        ["x", -1],
        ["z", 1],
        ["z", -1],
      ]) {
        const bounds = this.layout.roadBounds;
        const x = THREE.MathUtils.clamp(
            node.x + (axis === "x" ? sign * 1.52 : -sign * 1.52),
            bounds.x1 * STEP - 1.17,
            bounds.x2 * STEP + 1.17,
          ),
          z = THREE.MathUtils.clamp(
            node.z + sign * 1.52,
            bounds.z1 * STEP - 1.17,
            bounds.z2 * STEP + 1.17,
          );
        posts.push({
          x,
          y: 0.02,
          z,
          w: 0.15,
          h: 0.12,
          d: 0.15,
          color: "#9ca69a",
        });
        posts.push({
          x,
          y: 0.75,
          z,
          w: 0.055,
          h: 1.4,
          d: 0.055,
          color: "#596763",
        });
        housings.push({
          x,
          y: 1.6,
          z,
          w: axis === "x" ? 0.14 : 0.22,
          h: 0.54,
          d: axis === "x" ? 0.22 : 0.14,
          color: "#35433f",
        });
        for (let k = 0; k < 3; k++) {
          const item = {
            x: x + (axis === "x" ? -sign * 0.085 : 0),
            y: 1.77 - k * 0.17,
            z: z + (axis === "z" ? -sign * 0.085 : 0),
            w: 0.06,
            h: 0.06,
            d: 0.06,
            color: "#263b32",
          };
          bulbs.push(item);
          this.lampItems.push({
            node,
            axis,
            state: ["red", "amber", "green"][k],
          });
        }
        housings.push({
          x,
          y: 0.97,
          z,
          w: 0.16,
          h: 0.2,
          d: 0.16,
          color: "#35433f",
        });
        bulbs.push({
          x: x + (axis === "x" ? -sign * 0.09 : 0),
          y: 0.98,
          z: z + (axis === "z" ? -sign * 0.09 : 0),
          w: 0.045,
          h: 0.065,
          d: 0.045,
          color: "#a3473b",
        });
        this.lampItems.push({ node, axis: "ped", state: "walk" });
      }
    }
    instances(
      new THREE.BoxGeometry(1, 1, 1),
      material("#ffffff"),
      posts,
      this.traffic,
    );
    instances(
      new THREE.BoxGeometry(1, 1, 1),
      material("#ffffff"),
      housings,
      this.traffic,
    );
    this.signalLamps = instances(
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }),
      bulbs,
      this.traffic,
    );
    this.updateTraffic(0);
  }
  updateTraffic(dt) {
    if (!this.simulation) return;
    const sim = this.simulation;
    if (this.life) sim.step(dt);
    sim.cars.forEach((c, i) => {
      dummy.position.set(c.x, 0.28, c.z);
      dummy.rotation.set(0, c.ry, 0);
      dummy.scale.set(0.58, 0.32, 0.95);
      dummy.updateMatrix();
      this.cars.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 0.51;
      dummy.scale.set(0.47, 0.16, 0.44);
      dummy.updateMatrix();
      this.carTops.setMatrixAt(i, dummy.matrix);
      for (let k = 0; k < 4; k++) {
        const side = k % 2 ? 0.3 : -0.3,
          front = k < 2 ? 0.29 : -0.29;
        dummy.position.set(
          c.x + side * Math.cos(c.ry) + front * Math.sin(c.ry),
          0.14,
          c.z - side * Math.sin(c.ry) + front * Math.cos(c.ry),
        );
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        this.carWheels.setMatrixAt(i * 4 + k, dummy.matrix);
      }
    });
    for (const m of [this.cars, this.carTops, this.carWheels]) {
      m.instanceMatrix.needsUpdate = true;
      m.frustumCulled = false;
    }
    sim.walkers.forEach((p, i) => {
      const moving = p.kind === "stroll" || p.state === "crossing",
        gait = moving ? Math.sin(sim.time * 7 + i) * 0.035 : 0;
      dummy.position.set(p.x, 0.34, p.z);
      dummy.rotation.set(0, p.ry, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      this.walkers.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 0.57;
      dummy.updateMatrix();
      this.heads.setMatrixAt(i, dummy.matrix);
      for (let k = 0; k < 2; k++) {
        const side = k ? 0.04 : -0.04,
          front = k ? gait : -gait;
        dummy.position.set(
          p.x + side * Math.cos(p.ry) + front * Math.sin(p.ry),
          0.18,
          p.z - side * Math.sin(p.ry) + front * Math.cos(p.ry),
        );
        dummy.updateMatrix();
        this.legs.setMatrixAt(i * 2 + k, dummy.matrix);
      }
    });
    for (const m of [this.walkers, this.heads, this.legs]) {
      m.instanceMatrix.needsUpdate = true;
      m.frustumCulled = false;
    }
    this.lampItems.forEach((lamp, i) => {
      const on =
        lamp.axis === "ped"
          ? sim.canWalk(lamp.node)
          : sim.lamp(lamp.node, lamp.axis) === lamp.state;
      const color =
        lamp.axis === "ped"
          ? on
            ? "#83f5a1"
            : "#df6351"
          : on
            ? { red: "#ff5949", amber: "#ffd56c", green: "#75eda0" }[lamp.state]
            : "#263a32";
      this.signalLamps.setColorAt(i, rgb.set(color));
    });
    this.signalLamps.instanceColor.needsUpdate = true;
  }
  pick(e) {
    if (!this.body) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster
      .intersectObject(this.body, false)
      .find(
        (h) =>
          h.instanceId !== undefined &&
          this.active.has(this.companies[h.instanceId].id),
      );
    return hit ? this.companies[hit.instanceId] : null;
  }
  select(c) {
    this.selection.select(c);
  }
  focus(c, { maxZoom = false } = {}) {
    this.select(c);
    const direction = this.camera.position
      .clone()
      .sub(this.controls.target)
      .normalize();
    const target = new THREE.Vector3(c.x, c.height * 0.45, c.z);
    this.fly = {
      fromPosition: this.camera.position.clone(),
      toPosition: target.clone().add(direction.multiplyScalar(180)),
      fromTarget: this.controls.target.clone(),
      toTarget: target,
      fromZoom: this.camera.zoom,
      toZoom: maxZoom
        ? this.controls.maxZoom
        : Math.min(5, Math.max(1.8, this.homeHalf / 15)),
      start: performance.now(),
    };
  }
  view(mode = "iso", immediate = false) {
    const [x, z] = this.layout?.center ?? [0, 0];
    const target = new THREE.Vector3(x, 0, z),
      pos =
        mode === "top"
          ? new THREE.Vector3(x, 230, z + 0.001)
          : new THREE.Vector3(x + 160, 160, z + 160);
    // Dragging changes azimuth only; the view buttons choose the fixed elevation.
    this.controls.minPolarAngle = this.controls.maxPolarAngle =
      mode === "top" ? 1e-6 : ISO_POLAR;
    if (immediate) {
      this.fly = null;
      // Flush OrbitControls damping before setting the next city's exact view.
      const damping = this.controls.enableDamping;
      this.controls.enableDamping = false;
      this.controls.update();
      this.camera.position.copy(pos);
      this.camera.zoom = 1;
      this.controls.target.copy(target);
      this.controls.update();
      this.controls.enableDamping = damping;
      this.camera.updateProjectionMatrix();
      this.camera.updateMatrixWorld();
      return;
    }
    this.fly = {
      fromPosition: this.camera.position.clone(),
      toPosition: pos,
      fromTarget: this.controls.target.clone(),
      toTarget: target,
      fromZoom: this.camera.zoom,
      toZoom: 1,
      start: performance.now(),
    };
  }
  zoom(factor) {
    this.fly = null;
    this.camera.zoom = THREE.MathUtils.clamp(
      this.camera.zoom * factor,
      0.45,
      12,
    );
    this.camera.updateProjectionMatrix();
  }
  project(x, y, z) {
    return new THREE.Vector3(x, y, z).project(this.camera);
  }
  dispose() {
    this.running = false;
    cancelAnimationFrame(this.animationId);
    this.observer.disconnect();
    this.controls.dispose();
    document.removeEventListener("visibilitychange", this.onVisibility);
    disposeSceneGroups([this.scene]);
    // The cone may be unused when the last selected company was not a house.
    this.selection.cone.dispose();
    this.renderer.renderLists.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
    this.callbacks = {};
  }
  animate(now) {
    if (!this.running) return;
    this.animationId = requestAnimationFrame(this.animate);
    if (document.hidden) {
      this.previous = now;
      return;
    }
    const dt = Math.min((now - (this.previous || now)) / 1000, 0.05);
    this.previous = now;
    if (!this.reduceMotion) this.elapsed += dt;
    if (this.fly) {
      const f = this.fly;
      let t = Math.min(1, (now - f.start) / (this.reduceMotion ? 1 : 850));
      t = t * t * (3 - 2 * t);
      this.camera.position.lerpVectors(f.fromPosition, f.toPosition, t);
      this.controls.target.lerpVectors(f.fromTarget, f.toTarget, t);
      this.camera.zoom = THREE.MathUtils.lerp(f.fromZoom, f.toZoom, t);
      this.camera.updateProjectionMatrix();
      if (t >= 1) this.fly = null;
    }
    this.controls.update();
    if (!this.reduceMotion) this.updateTraffic(dt);
    this.updateEffects(this.elapsed);
    this.callbacks.frame?.(this);
    this.renderer.render(this.scene, this.camera);
  }
}
