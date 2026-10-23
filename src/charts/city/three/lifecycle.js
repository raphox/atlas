import * as THREE from "three";

export const LIFECYCLE_COLORS = {
  disabled: "#41464c",
  cancelled: "#41464c",
};

export function companyColor(company, palette, shade) {
  return new THREE.Color(
    LIFECYCLE_COLORS[company.status] ?? palette,
  ).multiplyScalar(shade);
}

// A shared crown replaces the missing upper portion of the original box.
// Coordinates are normalized to its width/depth and the crown's height.
const front = [
  [-0.5, 0.85],
  [-0.24, 0.85],
  [-0.18, 0.3],
  [0.04, 0.3],
  [0.1, 0.8],
  [0.32, 0.8],
  [0.37, 0.45],
  [0.5, 0.45],
];
const side = [
  [-0.5, 1],
  [-0.26, 1],
  [-0.2, 0.35],
  [0.03, 0.35],
  [0.1, 0.85],
  [0.3, 0.85],
  [0.36, 0.45],
  [0.5, 0.45],
];
const back = [
  [-0.5, 1],
  [-0.3, 1],
  [-0.24, 0.4],
  [0.03, 0.4],
  [0.09, 0.9],
  [0.32, 0.9],
  [0.38, 1],
  [0.5, 1],
];
const left = [
  [-0.5, 1],
  [-0.3, 1],
  [-0.24, 0.3],
  [0.03, 0.3],
  [0.09, 0.85],
  [0.5, 0.85],
];

export function ruinDepth(height) {
  return Math.min(height * 0.16, 1.8);
}

function profileHeight(profile, value) {
  for (let i = 1; i < profile.length; i++) {
    const [a, y0] = profile[i - 1],
      [b, y1] = profile[i];
    if (value <= b) return THREE.MathUtils.lerp(y0, y1, (value - a) / (b - a));
  }
  return 1;
}

export function intactRuinWindow(company, window) {
  const profile = window.nx
    ? window.nx > 0
      ? side
      : left
    : window.nz < 0
      ? back
      : front;
  const span = window.nx ? company.depth : company.width;
  const center = window.nx ? window.z - company.z : window.x - company.x;
  const lo = (center - window.width / 2) / span;
  const hi = (center + window.width / 2) / span;
  const lowest = Math.min(
    profileHeight(profile, lo),
    profileHeight(profile, hi),
    ...profile.filter(([x]) => x > lo && x < hi).map(([, y]) => y),
  );
  const roof = company.roofTop - ruinDepth(company.height) * (1 - lowest);
  return window.y + window.height / 2 <= roof;
}

export function ruinCrownGeometry() {
  // Counter-clockwise around the footprint when seen from above.
  const rim = [
    ...left.map(([z, y]) => [-0.5, y, z]),
    ...front.slice(1).map(([x, y]) => [x, y, 0.5]),
    ...side
      .slice(0, -1)
      .reverse()
      .map(([z, y]) => [0.5, y, z]),
    ...back
      .slice(1, -1)
      .reverse()
      .map(([x, y]) => [x, y, -0.5]),
  ];
  const positions = [],
    colors = [];
  const triangle = (a, b, c, shade = 1) => {
    positions.push(...a, ...b, ...c);
    // Exposed fracture faces contrast with the dark intact facade at no extra batch cost.
    colors.push(...Array(9).fill(shade));
  };
  for (let i = 0; i < rim.length; i++) {
    const a = rim[i],
      b = rim[(i + 1) % rim.length];
    const bottomA = [a[0], 0, a[2]],
      bottomB = [b[0], 0, b[2]];
    if (a[1] > 0) triangle(bottomA, b, a);
    if (b[1] > 0) triangle(bottomA, bottomB, b);
    triangle([0, 0.02, 0], [a[0], 0.02, a[2]], [b[0], 0.02, b[2]], 1.25);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export function scaffoldLevels(height, floors) {
  const levels = [0];
  for (let floor = 2; floor < floors; floor += 2)
    levels.push((floor * height) / floors);
  levels.push(height);
  return levels;
}

export function constructionBands(company, floors) {
  if (company.status !== "configuring") return [];
  const { x, z, height, width, depth, id } = company;
  return scaffoldLevels(height, floors)
    .slice(1)
    .flatMap((level) => {
      const y = 0.13 + level - 0.09;
      return [
        {
          company: id,
          x,
          y,
          z: z + depth / 2 + 0.165,
          w: width + 0.24,
          h: 0.18,
        },
        {
          company: id,
          x: x + width / 2 + 0.165,
          y,
          z,
          w: depth + 0.24,
          h: 0.18,
          ry: Math.PI / 2,
        },
      ];
    });
}

// One tiny shared opaque texture, not geometry for each diagonal stripe.
export function constructionBandMaterial() {
  const width = 64,
    height = 16;
  const pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const color = (x + y) % 16 < 8 ? [245, 196, 45, 255] : [20, 25, 31, 255];
      pixels.set(color, (y * width + x) * 4);
    }
  const texture = new THREE.DataTexture(pixels, width, height);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return new THREE.MeshBasicMaterial({
    map: texture,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
}

export function lifecycleDetails(company, color, floors) {
  const { x, z, height, width: w, depth: d, id, status } = company;
  const items = [];
  const add = (item) => items.push({ company: id, color, ...item });
  if (status === "configuring") {
    const left = x - w / 2 - 0.12,
      right = x + w / 2 + 0.12;
    const frontZ = z + d / 2 + 0.12,
      back = z - d / 2 - 0.12;
    const metal = "#91a6b6",
      thickness = 0.08;
    for (const [px, pz] of [
      [left, frontZ],
      [right, frontZ],
      [right, back],
    ])
      add({
        x: px,
        y: 0.13 + height / 2,
        z: pz,
        w: thickness,
        h: height,
        d: thickness,
        color: metal,
      });
    const levels = scaffoldLevels(height, floors);
    for (let i = 1; i < levels.length; i++) {
      const bottom = levels[i - 1],
        top = levels[i];
      const y = 0.13 + top - thickness / 2;
      add({
        x,
        y,
        z: frontZ,
        w: right - left,
        h: thickness,
        d: thickness,
        color: metal,
      });
      add({
        x: right,
        y,
        z,
        w: thickness,
        h: thickness,
        d: frontZ - back,
        color: metal,
      });
      // Each brace is confined to one scaffold level (at most two floors).
      const rise = top - bottom - thickness;
      const direction = i % 2 ? 1 : -1;
      add({
        x,
        y: 0.13 + (bottom + top) / 2,
        z: frontZ,
        w: thickness,
        h: Math.hypot(w + 0.24, rise),
        d: thickness,
        rz: direction * Math.atan2(w + 0.24, rise),
        color: metal,
      });
      add({
        x: right,
        y: 0.13 + (bottom + top) / 2,
        z,
        w: thickness,
        h: Math.hypot(d + 0.24, rise),
        d: thickness,
        rx: direction * Math.atan2(d + 0.24, rise),
        color: metal,
      });
    }
  }
  return items;
}
