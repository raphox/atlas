export const REGIONS = [
  {
    mask: 1,
    label: "Leads",
    shortLabel: "LE",
    color: "#4b91ef",
    name: "Somente Leads",
  },
  {
    mask: 2,
    label: "Inteligência Artificial",
    shortLabel: "IA",
    color: "#e281af",
    name: "Somente Inteligência Artificial",
  },
  {
    mask: 4,
    label: "Imobiliárias",
    shortLabel: "IM",
    color: "#ecc456",
    name: "Somente Imobiliárias",
  },
  {
    mask: 3,
    label: "Leads + Inteligência Artificial",
    shortLabel: "LE + IA",
    color: "#ab7cdd",
    name: "Leads e Inteligência Artificial",
  },
  {
    mask: 5,
    label: "Leads + Imobiliárias",
    shortLabel: "LE + IM",
    color: "#47b8b2",
    name: "Leads e Imobiliárias",
  },
  {
    mask: 6,
    label: "Inteligência Artificial + Imobiliárias",
    shortLabel: "IA + IM",
    color: "#e99b55",
    name: "Inteligência Artificial e Imobiliárias",
  },
  {
    mask: 7,
    label: "Leads + Inteligência Artificial + Imobiliárias",
    shortLabel: "LE + IA + IM",
    color: "#7777ca",
    name: "Todos os sistemas",
  },
];
export const STATUS = {
  healthy: { label: "Saudável", color: "#4c9878" },
  warning: { label: "Risco médio", color: "#c28b29" },
  critical: { label: "Alto risco", color: "#db654d" },
};
export function random(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
export function membership(x, z) {
  return (
    (x >= -18 && x <= 18 && z >= -23 && z <= 7 ? 1 : 0) |
    (x >= -29 && x <= 5 && z >= -6 && z <= 26 ? 2 : 0) |
    (x >= -5 && x <= 29 && z >= -6 && z <= 26 ? 4 : 0)
  );
}
export function isPark(x, z) {
  const n = Math.imul(x + 59, 7349) ^ Math.imul(z + 41, 9157);
  return (n >>> 0) % 100 < 9;
}
export function lots() {
  const result = [];
  for (let z = -23; z <= 26; z++)
    for (let x = -29; x <= 29; x++) {
      const mask = membership(x, z);
      if (mask && x % 6 !== 0 && z % 6 !== 0 && !isPark(x, z))
        result.push({ x: x * 2.8, z: z * 2.8, mask, col: x, row: z });
    }
  return result;
}
const names = [
  "Aurora",
  "Horizonte",
  "Nexo",
  "Vértice",
  "Alameda",
  "Órbita",
  "Cedro",
  "Prisma",
  "Farol",
  "Solare",
  "Brisa",
  "Íris",
  "Ponte",
  "Lume",
  "Atlas",
  "Verde",
];
const sectors = [
  "Tecnologia",
  "Logística",
  "Educação",
  "Saúde",
  "Varejo",
  "Serviços",
  "Indústria",
  "Finanças",
];
export function demoCompanies(count = 1400) {
  const rng = random(8419);
  const pool = lots();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const chosen = pool.slice(0, Math.min(count, pool.length));
  return chosen.map((lot, i) => {
    const risk = rng();
    return {
      id: `empresa-${i + 1}`,
      name: `${names[i % names.length]} ${sectors[Math.floor(i / names.length) % sectors.length]} ${String(i + 1).padStart(4, "0")}`,
      users: Math.round(8 + Math.pow(rng(), 3) * 4200),
      status: risk < 0.024 ? "critical" : risk < 0.1 ? "warning" : "healthy",
      ...lot,
    };
  });
}
export function sizeForUsers(users) {
  return users < 90
    ? { height: 0.95, floors: 1, house: true }
    : users < 550
      ? { height: 2.4, floors: 2, house: false }
      : users < 1800
        ? { height: 4.3, floors: 4, house: false }
        : { height: 7.2, floors: 6, house: false };
}
export function filteredCompanies(
  companies,
  { region = "all", status = "all", query = "" } = {},
) {
  const q = query.trim().toLocaleLowerCase("pt-BR");
  return companies.filter(
    (c) =>
      (region === "all" || c.mask === Number(region)) &&
      (status === "all" || c.status === status) &&
      (!q || c.name.toLocaleLowerCase("pt-BR").includes(q)),
  );
}
export function placeCompanies(records) {
  if (!Array.isArray(records) || !records.length)
    throw new Error("O arquivo deve conter uma lista de empresas.");
  const ids = new Set();
  return records.map((r, i) => {
    if (!r || typeof r.name !== "string" || !r.name.trim())
      throw new Error(`Empresa ${i + 1}: informe um nome.`);
    if (!Number.isFinite(r.users) || r.users < 0)
      throw new Error(
        `Empresa ${i + 1}: usuários deve ser um número positivo.`,
      );
    if (
      !Array.isArray(r.systems) ||
      !r.systems.length ||
      r.systems.some((s) => !["A", "B", "C"].includes(s))
    )
      throw new Error(`Empresa ${i + 1}: sistemas deve conter A, B ou C.`);
    if (!STATUS[r.status])
      throw new Error(`Empresa ${i + 1}: status inválido.`);
    const mask = [...new Set(r.systems)].reduce(
      (v, s) => v | { A: 1, B: 2, C: 4 }[s],
      0,
    );
    const id = String(r.id ?? `importada-${i + 1}`);
    if (ids.has(id))
      throw new Error("Há identificadores repetidos no arquivo.");
    ids.add(id);
    return {
      id,
      name: r.name.trim(),
      users: Math.round(r.users),
      status: r.status,
      mask,
    };
  });
}
export const PAGE_SIZE = 100;
export const PAGE_SIZES = [100, 250, 500, 1000, "all"];
export const ROAD_EVERY = 4;
export function paginateCompanies(
  companies,
  filters = {},
  page = 1,
  pageSize = PAGE_SIZE,
) {
  const matching = filteredCompanies(companies, filters),
    total = matching.length;
  if (!PAGE_SIZES.includes(pageSize))
    throw new Error("Tamanho de página inválido.");
  const limit = pageSize === "all" ? Math.max(1, total) : pageSize;
  const pages = Math.max(1, Math.ceil(total / limit));
  const current = Math.max(1, Math.min(pages, Math.floor(page) || 1));
  return {
    companies: matching.slice((current - 1) * limit, current * limit),
    total,
    pages,
    page: current,
    pageSize,
    start: total ? (current - 1) * limit + 1 : 0,
    end: Math.min(current * limit, total),
  };
}
function boundsFor(p) {
  return {
    a: { x1: -p.cx - p.ab, x2: p.cx + p.ac, z1: -p.cz - p.a, z2: p.cz },
    b: { x1: -p.cx - p.ab - p.b, x2: p.cx, z1: -p.cz, z2: p.cz + p.bc },
    c: { x1: -p.cx, x2: p.cx + p.ac + p.c, z1: -p.cz, z2: p.cz + p.bc },
  };
}
export function layoutMembership(x, z, bounds) {
  const inRect = (r) => x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2;
  return (
    (inRect(bounds.a) ? 1 : 0) |
    (inRect(bounds.b) ? 2 : 0) |
    (inRect(bounds.c) ? 4 : 0)
  );
}
export function layoutCity(records) {
  const needed = new Map(
    REGIONS.map((r) => [
      r.mask,
      records.filter((c) => c.mask === r.mask).length,
    ]),
  );
  const core = Math.max(
    1,
    Math.ceil(Math.sqrt(Math.max(0, ...needed.values())) / 2),
  );
  const p = { cx: core, cz: core, a: 1, b: 1, c: 1, ab: 1, ac: 1, bc: 1 };
  let bounds, buckets;
  for (let attempt = 0; attempt < 250; attempt++) {
    bounds = boundsFor(p);
    buckets = new Map(REGIONS.map((r) => [r.mask, []]));
    for (let z = bounds.a.z1; z <= bounds.b.z2; z++)
      for (let x = bounds.b.x1; x <= bounds.c.x2; x++) {
        const mask = layoutMembership(x, z, bounds);
        if (
          mask &&
          x % ROAD_EVERY !== 0 &&
          z % ROAD_EVERY !== 0 &&
          !isPark(x, z)
        )
          buckets
            .get(mask)
            .push({ x: x * 2.8, z: z * 2.8, col: x, row: z, mask });
      }
    const missing = REGIONS.filter(
      (r) => buckets.get(r.mask).length < needed.get(r.mask),
    );
    if (!missing.length) break;
    for (const r of missing) {
      if (r.mask === 7) {
        p.cx++;
        p.cz++;
      } else p[{ 1: "a", 2: "b", 4: "c", 3: "ab", 5: "ac", 6: "bc" }[r.mask]]++;
    }
  }
  // Within each exact intersection, populate the nearest free lots first.
  for (const pool of buckets.values())
    pool.sort(
      (a, b) =>
        a.col * a.col + a.row * a.row - (b.col * b.col + b.row * b.row) ||
        a.row - b.row ||
        a.col - b.col,
    );
  const placed = records.map((record) => {
    const lot = buckets.get(record.mask).shift();
    if (!lot) throw new Error("Não foi possível distribuir esta página.");
    return { ...record, ...lot };
  });
  const roadBounds = placed.length
    ? {
        x1:
          Math.floor((Math.min(...placed.map((c) => c.col)) - 2) / ROAD_EVERY) *
          ROAD_EVERY,
        x2:
          Math.ceil((Math.max(...placed.map((c) => c.col)) + 2) / ROAD_EVERY) *
          ROAD_EVERY,
        z1:
          Math.floor((Math.min(...placed.map((c) => c.row)) - 2) / ROAD_EVERY) *
          ROAD_EVERY,
        z2:
          Math.ceil((Math.max(...placed.map((c) => c.row)) + 2) / ROAD_EVERY) *
          ROAD_EVERY,
      }
    : { x1: -4, x2: 4, z1: -4, z2: 4 };
  const anchors = {};
  for (const r of REGIONS) {
    const group = placed.filter((c) => c.mask === r.mask);
    if (group.length)
      anchors[r.mask] = [
        group.reduce((v, c) => v + c.x, 0) / group.length,
        2,
        group.reduce((v, c) => v + c.z, 0) / group.length,
      ];
  }
  return {
    companies: placed,
    bounds,
    roadBounds,
    anchors,
    center: [
      (roadBounds.x1 + roadBounds.x2) * 1.4,
      (roadBounds.z1 + roadBounds.z2) * 1.4,
    ],
  };
}
