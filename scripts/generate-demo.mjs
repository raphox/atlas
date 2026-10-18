import { mkdir, writeFile } from "node:fs/promises";
import { demoCompanies } from "../src/model.js";
const records = demoCompanies().map((company) => ({
  id: company.id,
  name: company.name,
  users: company.users,
  status: company.status,
  systems: ["A", "B", "C"].filter((_, index) => company.mask & (1 << index)),
}));
await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../public/data/empresas.json", import.meta.url),
  JSON.stringify({ companies: records }),
);
