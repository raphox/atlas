import test from "node:test";
import assert from "node:assert/strict";
import { greenLots } from "../src/landscape.js";
import {
  demoCompanies,
  layoutCity,
  paginateCompanies,
  PAGE_SIZES,
  ROAD_EVERY,
} from "../src/model.js";

test("toda área sem empresa recebe grama e árvores, sem ocupar ruas, em cada filtro e página", () => {
  const records = demoCompanies();
  for (const size of PAGE_SIZES)
    for (const filter of [
      {},
      { region: "7" },
      { status: "warning" },
      { query: "sem-resultados-xyz" },
    ]) {
      const first = paginateCompanies(records, filter, 1, size);
      for (const page of new Set([1, first.pages])) {
        const layout = layoutCity(
          paginateCompanies(records, filter, page, size).companies,
        );
        const lots = greenLots(layout),
          green = new Set(lots.map((p) => `${p.col},${p.row}`));
        const occupied = new Set(
          layout.companies.map((c) => `${c.col},${c.row}`),
        );
        assert.equal(green.size, lots.length);
        const b = layout.roadBounds;
        for (let row = b.z1; row <= b.z2; row++)
          for (let col = b.x1; col <= b.x2; col++) {
            const key = `${col},${row}`,
              road = col % ROAD_EVERY === 0 || row % ROAD_EVERY === 0;
            assert.equal(green.has(key), !road && !occupied.has(key));
          }
        for (const lot of lots) {
          assert.ok(lot.trees.length > 0);
          for (const tree of lot.trees) {
            // Even the full canopy stays inside its grass tile and off sidewalks.
            assert.ok(Math.abs(tree.dx) + tree.scale < (2.8 - 0.12) / 2);
            assert.ok(Math.abs(tree.dz) + tree.scale < (2.8 - 0.12) / 2);
          }
        }
      }
    }
});

test("um lote liberado vira jardim e volta a receber uma empresa sem vegetação sobreposta", () => {
  const layout = layoutCity(demoCompanies().slice(0, 100)),
    removed = layout.companies[0];
  const before = greenLots(layout);
  const vacant = greenLots({ ...layout, companies: layout.companies.slice(1) });
  assert.ok(vacant.some((p) => p.col === removed.col && p.row === removed.row));
  assert.deepEqual(
    vacant.filter((p) => p.col !== removed.col || p.row !== removed.row),
    before,
  );
  assert.deepEqual(greenLots(layout), before);
});
