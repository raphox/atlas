import { ROAD_EVERY, random } from "./model.js";

// Use only this page's layout: a vacant company lot is always a green lot.
export function greenLots(layout) {
  const occupied = new Set(layout.companies.map((c) => `${c.col},${c.row}`));
  const lots = [],
    bounds = layout.roadBounds;
  for (let row = bounds.z1; row <= bounds.z2; row++)
    for (let col = bounds.x1; col <= bounds.x2; col++) {
      if (
        col % ROAD_EVERY === 0 ||
        row % ROAD_EVERY === 0 ||
        occupied.has(`${col},${row}`)
      )
        continue;
      // Coordinate seeds keep the same park looking the same after rebuilding.
      const rng = random(Math.imul(col + 59, 7349) ^ Math.imul(row + 41, 9157));
      const trees = [-1, 1].map((sign) => ({
        dx: sign * (0.38 + rng() * 0.18),
        dz: (rng() - 0.5) * 1.05,
        scale: 0.4 + rng() * 0.19,
        color: rng() > 0.5 ? "#789b59" : "#94af68",
      }));
      lots.push({
        col,
        row,
        trees,
        grass: rng() > 0.5 ? "#aac783" : "#b5ce8f",
        bench: rng() > 0.7,
      });
    }
  return lots;
}
