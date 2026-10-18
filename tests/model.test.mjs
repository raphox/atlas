import test from "node:test";
import assert from "node:assert/strict";
import {
  REGIONS,
  regionsFor,
  metricLabel,
  categoryLabel,
  sizeForValue,
  membership,
  isPark,
  demoCompanies,
  filteredCompanies,
  placeCompanies,
  sizeForUsers,
  paginateCompanies,
  layoutCity,
  layoutMembership,
  ROAD_EVERY,
  PAGE_SIZES,
} from "../src/model.js";
test("as sete regiões correspondem exatamente aos sistemas presentes", () => {
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
test("mais de mil empresas ocupam lotes únicos sem ruas e sem duplicação", () => {
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
test("filtro mantém somente a interseção exata, risco e busca solicitados", () => {
  const companies = demoCompanies();
  const selected = filteredCompanies(companies, {
    region: "3",
    status: "warning",
    query: "Aurora",
  });
  for (const c of selected) {
    assert.equal(c.mask, 3);
    assert.equal(c.status, "warning");
    assert.ok(c.name.includes("Aurora"));
  }
  const allAB = filteredCompanies(companies, { region: "3" });
  assert.ok(allAB.length > 0);
  assert.ok(allAB.every((c) => c.mask === 3));
  assert.equal(
    filteredCompanies(companies, { query: "inexistente-xyz" }).length,
    0,
  );
});
test("dados importados preservam membros, usuários e risco, com validação antes de trocar a cidade", () => {
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
test("porte cresce com usuários, independente do estado de saúde", () => {
  assert.equal(sizeForUsers(30).house, true);
  assert.equal(sizeForUsers(500).house, false);
  assert.ok(sizeForUsers(3000).height > sizeForUsers(500).height);
});
test("paginação padrão de 100 não perde nem repete empresas entre cidades", () => {
  const companies = demoCompanies();
  const ids = [];
  for (let page = 1; page <= 14; page++) {
    const p = paginateCompanies(companies, {}, page);
    assert.equal(p.companies.length, 100);
    ids.push(...p.companies.map((c) => c.id));
  }
  assert.equal(new Set(ids).size, 1400);
  assert.deepEqual(
    ids,
    companies.map((c) => c.id),
  );
});
test("os filtros são aplicados antes da paginação e todas as opções de tamanho funcionam", () => {
  const companies = demoCompanies();
  const filters = { status: "warning" };
  const matching = filteredCompanies(companies, filters);
  for (const size of PAGE_SIZES) {
    const p = paginateCompanies(companies, filters, 1, size);
    assert.equal(p.total, matching.length);
    assert.ok(p.companies.every((c) => c.status === "warning"));
    assert.equal(
      p.companies.length,
      Math.min(size === "all" ? Infinity : size, matching.length),
    );
  }
  assert.equal(
    paginateCompanies(companies, {}, 1, "all").companies.length,
    1400,
  );
  assert.equal(paginateCompanies(companies, {}, 99, 1000).page, 2);
  assert.equal(
    paginateCompanies(companies, { query: "sem-resultados-xyz" }, 99).page,
    1,
  );
  assert.throws(() => paginateCompanies(companies, {}, 1, 99));
});
test("cada cidade cresce por lotes próximos ao centro, mantendo a pertinência exata e reservando ruas e parques", () => {
  const datasets = [
    paginateCompanies(demoCompanies()).companies,
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
  const page = paginateCompanies(demoCompanies()).companies;
  assert.deepEqual(layoutCity(page), layoutCity(page));
  assert.equal(layoutCity([]).companies.length, 0);
});
test("importação admite mais de mil empresas numa mesma interseção para posterior paginação", () => {
  const data = Array.from({ length: 1401 }, (_, i) => ({
    id: String(i),
    name: `Empresa ${i}`,
    users: 20,
    systems: ["A", "B", "C"],
    status: "healthy",
  }));
  assert.equal(placeCompanies(data).length, 1401);
  assert.equal(
    paginateCompanies(placeCompanies(data), {}, 15).companies.length,
    1,
  );
});

test("métricas e categorias genéricas preservam valores decimais e identidades", () => {
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
  const page = paginateCompanies(data, { region: "6" });
  assert.equal(page.companies[0].id, "b");
  assert.equal(layoutCity(page.companies).companies[0].metric.value, 1350.75);
});

test("o contrato genérico rejeita valores e categorias inconsistentes antes da importação", () => {
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

test("nomes das categorias e da métrica acompanham filtros e paginação", () => {
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
  assert.equal(metricLabel(data), "Receita");
  assert.equal(categoryLabel(data[0]), "Premium + Regional");
  assert.deepEqual(
    regionsFor(data).map((region) => region.label),
    ["Premium", "Regional", "Premium + Regional"],
  );
  assert.deepEqual(
    regionsFor([data[1]]).map((region) => [region.mask, region.label]),
    [[2, "Regional"]],
  );
  assert.equal(metricLabel([]), "Valor");
  assert.equal(
    metricLabel([
      data[0],
      { ...data[1], metric: { label: "Contratos", value: 20 } },
    ]),
    "Valor",
  );
  assert.ok(
    sizeForValue(data[1].metric.value).height >
      sizeForValue(data[0].metric.value).height,
  );
});
