import test from "node:test";
import assert from "node:assert/strict";
import { initialData } from "../docs/examples.js";
import { validateCityData } from "../src/charts/city/data.js";
import { sizeForValue } from "../src/model.js";

test("documentation data shows every height band in every category intersection", () => {
  const records = JSON.parse(initialData);
  validateCityData(records);
  const districts = new Map();
  for (const company of records) {
    const district = company.categories
      .map((category) => category.value)
      .sort()
      .join("+");
    if (!districts.has(district)) districts.set(district, new Set());
    districts.get(district).add(sizeForValue(company.metric.value).floors);
  }
  assert.equal(districts.size, 7);
  for (const bands of districts.values())
    assert.deepEqual(
      [...bands].sort((a, b) => a - b),
      [1, 2, 4, 6],
    );
});
