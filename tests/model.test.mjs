import test from "node:test";
import assert from "node:assert/strict";
import {
  REGIONS,
  regionsFor,
  categoryLabel,
  sizeForValue,
  membership,
  isPark,
  demoCompanies,
  placeCompanies,
  sizeForUsers,
  layoutCity,
  layoutMembership,
  ROAD_EVERY,
} from "../src/model.js";
test("the seven regions exactly match the systems present", () => {
  const cases = [
    [0, -10, 1],
    [-25, 10, 2],
    [25, 10, 4],
    [-10, 0, 3],
    [10, 0, 5],
    [0, 15, 6],
    [0, 0, 7],
    [40, 0, 0],
  ];
  for (const [x, z, mask] of cases) assert.equal(membership(x, z), mask);
});
test("more than a thousand companies occupy unique lots without streets or duplicates", () => {
  const companies = demoCompanies();
  assert.equal(companies.length, 1400);
  const ids = new Set(),
    positions = new Set();
  for (const c of companies) {
    assert.ok(!ids.has(c.id));
    ids.add(c.id);
    const key = `${c.col},${c.row}`;
    assert.ok(!positions.has(key));
    positions.add(key);
    assert.notEqual(c.col % 6, 0);
    assert.notEqual(c.row % 6, 0);
    assert.equal(isPark(c.col, c.row), false);
    assert.equal(c.mask, membership(c.col, c.row));
    assert.ok(c.users > 0);
  }
  for (const r of REGIONS) assert.ok(companies.some((c) => c.mask === r.mask));
  assert.deepEqual(companies, demoCompanies());
});
test("imported data preserves memberships, users and risk with validation before replacing the city", () => {
  const valid = [
    {
      id: "a",
      name: "Empresa A",
      users: 20,
      systems: ["A", "B", "B"],
      status: "healthy",
    },
    {
      id: "b",
      name: "Empresa B",
      users: 3000,
      systems: ["A", "B", "C"],
      status: "critical",
    },
  ];
  const data = placeCompanies(valid);
  assert.equal(data[0].mask, 3);
  assert.equal(data[1].mask, 7);
  assert.equal(data[1].users, 3000);
  assert.throws(() => placeCompanies([{ ...valid[0], systems: ["D"] }]));
  assert.throws(() => placeCompanies([{ ...valid[0], users: -1 }]));
  assert.throws(() => placeCompanies([{ ...valid[0], status: "other" }]));
  assert.throws(() => placeCompanies([valid[0], valid[0]]));
  assert.throws(() => placeCompanies([]));
});
test("size grows with user count regardless of health status", () => {
  const domain = [30, 3000];
  assert.equal(sizeForUsers(30, domain).house, true);
  assert.equal(sizeForUsers(500, domain).house, false);
  assert.ok(
    sizeForUsers(3000, domain).height > sizeForUsers(500, domain).height,
  );
});
test("each city grows through lots near the center, preserving exact membership and reserving streets and parks", () => {
  const datasets = [
    demoCompanies().slice(0, 100),
    demoCompanies(),
    ...REGIONS.map((r) =>
      Array.from({ length: 1000 }, (_, i) => ({
        id: `${r.mask}-${i}`,
        name: "Empresa",
        mask: r.mask,
        users: 40,
        status: "healthy",
      })),
    ),
  ];
  for (const records of datasets) {
    const l = layoutCity(records);
    assert.equal(l.companies.length, records.length);
    const occupied = new Set();
    const distances = new Map();
    for (const c of l.companies) {
      const key = `${c.col},${c.row}`;
      assert.ok(!occupied.has(key));
      occupied.add(key);
      assert.notEqual(c.col % ROAD_EVERY, 0);
      assert.notEqual(c.row % ROAD_EVERY, 0);
      assert.equal(isPark(c.col, c.row), false);
      assert.equal(layoutMembership(c.col, c.row, l.bounds), c.mask);
      const d = c.col * c.col + c.row * c.row;
      assert.ok(d >= (distances.get(c.mask) ?? 0));
      distances.set(c.mask, d);
    }
  }
  const page = demoCompanies().slice(0, 100);
  assert.deepEqual(layoutCity(page), layoutCity(page));
  assert.equal(layoutCity([]).companies.length, 0);
});
test("normalization accepts more than a thousand companies in one intersection", () => {
  const data = Array.from({ length: 1401 }, (_, i) => ({
    id: String(i),
    name: `Empresa ${i}`,
    users: 20,
    systems: ["A", "B", "C"],
    status: "healthy",
  }));
  assert.equal(placeCompanies(data).length, 1401);
});

test("generic metrics and categories preserve decimal values and identities", () => {
  const source = [
    {
      id: "b",
      name: "Beta",
      metric: { label: "Receita mensal", value: 1350.75 },
      categories: [
        { label: "Serviços", value: "services" },
        { label: "Varejo", value: "retail" },
      ],
      status: "warning",
    },
    {
      id: "a",
      name: "Alfa",
      metric: { label: "Receita mensal", value: 0 },
      categories: [{ label: "Varejo", value: "retail" }],
      status: "healthy",
    },
    {
      id: "c",
      name: "Gama",
      metric: { label: "Receita mensal", value: 2400 },
      categories: [{ label: "Indústria", value: "industry" }],
      status: "critical",
    },
  ];
  const original = structuredClone(source);
  const data = placeCompanies(source);
  assert.equal(data[0].metric.value, 1350.75);
  assert.equal(data[0].users, undefined);
  assert.equal(data[0].mask, 6);
  assert.equal(data[1].mask, 2);
  assert.equal(data[2].mask, 1);
  assert.deepEqual(source, original);
  assert.deepEqual(placeCompanies([...source].reverse()).reverse(), data);
  assert.equal(layoutCity(data).companies[0].metric.value, 1350.75);
});

test("the generic contract rejects inconsistent values and categories before import", () => {
  const row = {
    name: "Empresa",
    metric: { label: "Receita", value: 10.5 },
    categories: [{ label: "Varejo", value: "retail" }],
    status: "healthy",
  };
  for (const metric of [
    { label: "", value: 1 },
    { label: "Receita", value: -1 },
    { label: "Receita", value: "10" },
    { label: "Receita", value: Infinity },
  ])
    assert.throws(() => placeCompanies([{ ...row, metric }]));
  for (const categories of [
    [],
    [null],
    [{ label: "Varejo", value: "" }],
    [{ label: "", value: "retail" }],
  ])
    assert.throws(() => placeCompanies([{ ...row, categories }]));
  assert.throws(
    () =>
      placeCompanies([
        row,
        { ...row, categories: [{ value: "retail", label: "Outro nome" }] },
      ]),
    /mesmo label/,
  );
  assert.throws(
    () =>
      placeCompanies([
        {
          ...row,
          categories: ["a", "b", "c", "d"].map((value) => ({
            label: value,
            value,
          })),
        },
      ]),
    /três categorias/,
  );
  assert.equal(
    placeCompanies([
      { ...row, categories: [row.categories[0], row.categories[0]] },
    ])[0].categories.length,
    1,
  );
});

test("category names preserve the supplied labels", () => {
  const data = placeCompanies([
    {
      id: "1",
      name: "A",
      metric: { label: "Receita", value: 20 },
      categories: [
        { value: "a", label: "Premium" },
        { value: "b", label: "Regional" },
      ],
      status: "healthy",
    },
    {
      id: "2",
      name: "B",
      metric: { label: "Receita", value: 2400 },
      categories: [{ value: "b", label: "Regional" }],
      status: "healthy",
    },
  ]);
  assert.equal(categoryLabel(data[0]), "Premium + Regional");
  assert.deepEqual(
    regionsFor(data).map((region) => region.label),
    ["Premium", "Regional", "Premium + Regional"],
  );
  assert.deepEqual(
    regionsFor([data[1]]).map((region) => [region.mask, region.label]),
    [[2, "Regional"]],
  );
  assert.ok(
    sizeForValue(data[1].metric.value).height >
      sizeForValue(data[0].metric.value).height,
  );
});
