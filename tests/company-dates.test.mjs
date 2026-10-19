import test from "node:test";
import assert from "node:assert/strict";
import {
  timestampValue,
  recentCriticalCompanies,
} from "../src/lib/company-dates.js";
import { placeCompanies, layoutCity } from "../src/model.js";
import { parseCompanyPayload } from "../src/data-source.js";
import { validateCityData } from "../src/charts/city/data.js";

const row = {
  id: "a",
  name: "Aurora",
  status: "critical",
  metric: { label: "Receita", value: 10 },
  categories: [{ label: "Varejo", value: "retail" }],
};

test("timestamps are preserved through HTTP, imports and layout with time zone normalization", () => {
  const input = {
    ...row,
    updatedAt: "2026-10-19T12:00:00-03:00",
    statusChangedAt: "2026-10-19T14:00:00Z",
  };
  const companies = placeCompanies([input]);
  assert.equal(companies[0].updatedAt, "2026-10-19T15:00:00.000Z");
  assert.equal(companies[0].statusChangedAt, "2026-10-19T14:00:00.000Z");
  assert.deepEqual(parseCompanyPayload({ companies: [input] }), companies);
  assert.equal(
    layoutCity(companies).companies[0].statusChangedAt,
    companies[0].statusChangedAt,
  );
  assert.equal(input.updatedAt, "2026-10-19T12:00:00-03:00");
  assert.equal(placeCompanies([row])[0].updatedAt, undefined);
});

test("invalid timestamps, missing time zones and status changes after the update are rejected", () => {
  for (const value of [
    "ontem",
    "2026-10-19",
    "2026-10-19T12:00:00",
    "2026-02-30T12:00:00Z",
    "2026-10-19T24:00:00Z",
    1234,
  ]) {
    assert.ok(Number.isNaN(timestampValue(value)));
    for (const key of ["updatedAt", "statusChangedAt"]) {
      assert.throws(
        () => placeCompanies([{ ...row, [key]: value }]),
        new RegExp(key),
      );
      assert.throws(
        () => validateCityData([{ ...row, mask: 1, [key]: value }]),
        new RegExp(key),
      );
    }
  }
  assert.throws(
    () =>
      placeCompanies([
        {
          ...row,
          updatedAt: "2026-10-18T12:00:00Z",
          statusChangedAt: "2026-10-19T12:00:00Z",
        },
      ]),
    /posterior/,
  );
});

test("ranking uses entry into the current status and ignores ordinary updates and recovered companies", () => {
  const companies = Array.from({ length: 7 }, (_, i) => ({
    ...row,
    id: String(i),
    statusChangedAt: `2026-10-19T10:0${i}:00Z`,
    updatedAt: "2026-10-19T12:00:00Z",
  }));
  companies[0].updatedAt = "2026-10-20T12:00:00Z";
  companies.push({
    ...row,
    id: "recovered",
    status: "healthy",
    statusChangedAt: "2026-10-19T12:00:00Z",
  });
  companies.push({ ...row, id: "unknown", updatedAt: "2026-10-19T13:00:00Z" });
  const order = companies.map((company) => company.id);
  const result = recentCriticalCompanies(companies);
  assert.deepEqual(
    result.companies.map((company) => company.id),
    ["6", "5", "4", "3"],
  );
  assert.equal(result.undatedCount, 1);
  assert.equal(result.total, 8);
  assert.deepEqual(
    companies.map((company) => company.id),
    order,
  );
  assert.deepEqual(recentCriticalCompanies([]), {
    companies: [],
    total: 0,
    undatedCount: 0,
  });
  assert.equal(recentCriticalCompanies([row]).companies.length, 0);
});
