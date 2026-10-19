import { mkdir, writeFile } from "node:fs/promises";
import { demoCompanies, REGIONS } from "../src/model.js";
const now = Date.now();
const records = demoCompanies().map((company, index) => ({
  id: company.id,
  name: company.name,
  metric: { label: "Usuários", value: company.users },
  status: company.status,
  updatedAt: new Date(now - (index % 30) * 60_000).toISOString(),
  statusChangedAt: new Date(
    now - (30 + ((index * 37) % 1440)) * 60_000,
  ).toISOString(),
  categories: ["A", "B", "C"].flatMap((value, index) =>
    company.mask & (1 << index)
      ? [
          {
            value,
            label: REGIONS.find((region) => region.mask === 1 << index).label,
          },
        ]
      : [],
  ),
}));
await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../public/data/empresas.json", import.meta.url),
  JSON.stringify({ companies: records }),
);
