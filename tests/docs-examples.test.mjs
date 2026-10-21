import test from "node:test";
import assert from "node:assert/strict";
import { initialData } from "../docs/examples.js";
import { validateCityData } from "../src/charts/city/data.js";
import { sizeForValue, metricDomainFor } from "../src/model.js";

test("documentation data shows four distinct adaptive heights in every category intersection", () => {
  const records = JSON.parse(initialData);
  validateCityData(records);
  const domain = metricDomainFor(records);
  const districts = new Map();
  for (const company of records) {
    const district = company.categories
      .map((category) => category.value)
      .sort()
      .join("+");
    if (!districts.has(district)) districts.set(district, new Set());
    districts
      .get(district)
      .add(sizeForValue(company.metric.value, domain).height);
  }
  assert.equal(districts.size, 7);
  for (const bands of districts.values()) assert.equal(bands.size, 4);
});
