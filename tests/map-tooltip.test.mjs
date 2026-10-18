import test from "node:test";
import assert from "node:assert/strict";
import { mapTooltipAnchor } from "../src/lib/map-tooltip.js";

test("a âncora mantém a projeção do telhado dentro do mapa", () => {
  assert.deepEqual(mapTooltipAnchor({ x: 0.5, y: -0.5 }, 800, 600), {
    x: 600,
    y: 450,
  });
});

test("telhados fora do enquadramento mantêm uma âncora visível nas bordas", () => {
  for (const point of [
    { x: 0, y: 2 },
    { x: 0, y: -2 },
    { x: -2, y: 0 },
    { x: 2, y: 0 },
    { x: 4, y: 4, z: 2 },
  ]) {
    const anchor = mapTooltipAnchor(point, 800, 600);
    assert.ok(anchor.x >= 18 && anchor.x <= 782);
    assert.ok(anchor.y >= 18 && anchor.y <= 582);
  }
});

test("dimensões transitórias não produzem âncoras inválidas", () => {
  assert.equal(mapTooltipAnchor({ x: 0, y: 0 }, 0, 600), null);
  assert.equal(mapTooltipAnchor({ x: NaN, y: 0 }, 800, 600), null);
  assert.deepEqual(mapTooltipAnchor({ x: 2, y: 2 }, 20, 10), { x: 10, y: 5 });
});
