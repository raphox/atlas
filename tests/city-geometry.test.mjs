import test from "node:test";
import assert from "node:assert/strict";
import { measureCityGeometry } from "../scripts/benchmark-city.mjs";

test("the city maintains a low geometry budget with 100 and 1,400 companies", () => {
  // Measured before simplification: 96,830 / 804,354 triangles and 26 batches.
  // Keep >=70% of that reduction, including planar sidewalks and signals.
  for (const [count, before] of [
    [100, 96830],
    [1400, 804354],
  ]) {
    const result = measureCityGeometry(count, { lifecycle: false });
    assert.ok(result.triangles < before * 0.3, JSON.stringify(result));
    assert.ok(result.batches <= 17);
    // Lifecycle details share four extra batches regardless of company count.
    // Allow tiered scaffolding every two floors, shared construction bands and fractures on all four facades.
    // Compare the same records, heights and lots to isolate the actual cost.
    const lifecycle = measureCityGeometry(count);
    assert.ok(
      lifecycle.triangles < result.triangles * 1.1,
      JSON.stringify(lifecycle),
    );
    assert.ok(lifecycle.batches <= 21);
  }
});
