import test from "node:test";
import assert from "node:assert/strict";
import {
  filterCompanies,
  paginate,
  parseJson,
  sampleCompanies,
} from "../docs/extensions/data.js";
import {
  parseWeather,
  weatherCoordinates,
} from "../docs/extensions/weather.js";

const data = sampleCompanies();
test("extension filters combine health, district and name before pagination", () => {
  const filters = {
    statuses: ["critical", "warning"],
    region: "3",
    query: "vertex",
  };
  const expected = data.filter(
    (row) =>
      ["critical", "warning"].includes(row.status) &&
      row.mask === 3 &&
      row.name.toLowerCase().includes("vertex"),
  );
  assert.ok(expected.length > 0 && expected.length < data.length);
  assert.deepEqual(filterCompanies(data, filters), expected);
  assert.equal(filterCompanies(data, { statuses: [] }).length, 1400);
  for (const size of [100, 250, 500, 1000, "all"]) {
    const first = paginate(data, 1, size);
    const pages = Array.from(
      { length: first.pages },
      (_, i) => paginate(data, i + 1, size).rows,
    ).flat();
    assert.deepEqual(pages, data);
    assert.equal(new Set(pages.map((row) => row.id)).size, 1400);
  }
  assert.deepEqual(paginate([], 99, 100), { rows: [], pages: 1, current: 1 });
});
test("extension normalizes complete imports and envelopes before selecting subsets", () => {
  const input = data.slice(0, 28).map(({ mask, ...row }) => row);
  const result = parseJson(JSON.stringify({ companies: input }));
  assert.deepEqual(
    result.map((row) => row.mask),
    data.slice(0, 28).map((row) => row.mask),
  );
  assert.deepEqual(parseJson("[]"), []);
  const legacy = parseJson(
    JSON.stringify([
      {
        name: "Legacy company",
        users: 42,
        systems: ["A", "B"],
        status: "healthy",
      },
    ]),
  );
  assert.equal(legacy[0].metric.value, 42);
  assert.equal(legacy[0].mask, 3);
  assert.ok(legacy[0].id);
  assert.throws(() => parseJson('{"companies":[{}]}'));
  assert.throws(() => parseJson(JSON.stringify([input[0], input[0]])));
  assert.throws(() => parseJson(" ".repeat(5 * 1024 * 1024 + 1)), /5 MB/);
});
test("weather adapter prioritizes snow, rejects stale results and rounds location", () => {
  const now = Date.now();
  const fixture = (code, snowfall = 0) => ({
    current: {
      time: Math.floor(now / 1000),
      weather_code: code,
      rain: 0,
      showers: 0,
      snowfall,
    },
  });
  assert.equal(parseWeather(fixture(63), now).type, "rain");
  assert.equal(parseWeather(fixture(73), now).type, "snow");
  assert.equal(parseWeather(fixture(63, 0.2), now).type, "snow");
  assert.equal(parseWeather(fixture(0), now).type, "none");
  assert.throws(() => parseWeather(fixture(63), now + 91 * 60 * 1000));
  assert.throws(() => parseWeather({ current: {} }, now));
  assert.deepEqual(
    weatherCoordinates({ latitude: -23.55052, longitude: -46.633308 }),
    { latitude: "-23.55", longitude: "-46.63" },
  );
});

test("the first sample page shows varied metrics for every lifecycle status", () => {
  const first = paginate(sampleCompanies(), 1, 100).rows;
  for (const status of ["configuring", "disabled", "cancelled"]) {
    const values = new Set(
      first
        .filter((company) => company.status === status)
        .map((company) => company.metric.value),
    );
    assert.ok(values.size >= 3, status);
  }
});
