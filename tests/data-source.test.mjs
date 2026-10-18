import test from "node:test";
import assert from "node:assert/strict";
import { loadCompanyData, parseCompanyPayload } from "../src/data-source.js";
const records = [
  {
    id: "a",
    name: "Empresa A",
    users: 12,
    systems: ["A", "C"],
    status: "warning",
  },
];
test("o mesmo contrato JSON é convertido no cliente como lista ou envelope", () => {
  assert.equal(parseCompanyPayload(records)[0].mask, 5);
  assert.deepEqual(
    parseCompanyPayload({ companies: records }),
    parseCompanyPayload(records),
  );
  assert.deepEqual(parseCompanyPayload({ companies: [] }), []);
});
test("a SPA lê o endpoint da configuração e carrega empresas sem servidor de renderização", async () => {
  const requests = [];
  const fetcher = async (url, options) => {
    requests.push({ url, options });
    return {
      ok: true,
      json: async () =>
        url === "/config.json"
          ? { dataUrl: "/api/empresas", mode: "live" }
          : { companies: records },
    };
  };
  const data = await loadCompanyData("/config.json", fetcher);
  assert.equal(data.demo, false);
  assert.equal(data.companies[0].name, "Empresa A");
  assert.deepEqual(
    requests.map((r) => r.url),
    ["/config.json", "/api/empresas"],
  );
  assert.equal(requests[1].options.headers.Accept, "application/json");
});
test("falhas da fonte não são disfarçadas por dados demonstrativos", async () => {
  await assert.rejects(() =>
    loadCompanyData("/config.json", async () => ({ ok: false })),
  );
  await assert.rejects(() =>
    loadCompanyData("/config.json", async () => ({
      ok: true,
      json: async () => ({}),
    })),
  );
});

test("a fonte HTTP aceita a mesma métrica e categorias genéricas da importação", () => {
  const rows = [
    {
      name: "Aurora",
      metric: { label: "Contratos", value: 128.5 },
      categories: [{ value: "premium", label: "Premium" }],
      status: "healthy",
    },
  ];
  const companies = parseCompanyPayload({ companies: rows });
  assert.deepEqual(companies, parseCompanyPayload(rows));
  assert.deepEqual(companies[0].metric, rows[0].metric);
  assert.deepEqual(companies[0].categories, rows[0].categories);
});
