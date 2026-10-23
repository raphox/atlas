import { initialData } from "../examples.js";
import { validateCityData } from "../../src/charts/city/data.js";
import { placeCompanies } from "../../src/model.js";

export const PAGE_SIZES = [100, 250, 500, 1000, "all"];
export const MAX_JSON_BYTES = 5 * 1024 * 1024;

export function sampleCompanies() {
  const base = JSON.parse(initialData);
  const metricValues = [
    ...new Set(base.map((company) => company.metric.value)),
  ];
  return normalizePayload(
    Array.from({ length: 1400 }, (_, i) => ({
      ...base[i % base.length],
      // Rotate the sample metrics between copies so every status has varied heights.
      metric: {
        ...base[i % base.length].metric,
        value:
          metricValues[
            (metricValues.indexOf(base[i % base.length].metric.value) +
              Math.floor(i / base.length)) %
              metricValues.length
          ],
      },
      id: `extension-${i + 1}`,
      name: `${base[i % base.length].name} · ${i + 1}`,
    })),
  );
}

export function normalizePayload(payload) {
  const rows = Array.isArray(payload) ? payload : payload?.companies;
  // Normalize the entire dataset once, keeping district identities across subsets.
  if (Array.isArray(rows) && rows.length === 0) return [];
  return validateCityData(placeCompanies(rows));
}

export function parseJson(text) {
  if (new Blob([text]).size > MAX_JSON_BYTES)
    throw new Error("Choose JSON smaller than 5 MB.");
  return normalizePayload(JSON.parse(text));
}

export function filterCompanies(
  data,
  { statuses = [], region = "all", query = "" },
) {
  const term = query.trim().toLocaleLowerCase();
  return data.filter(
    (company) =>
      (!statuses.length || statuses.includes(company.status)) &&
      (region === "all" || company.mask === Number(region)) &&
      (!term || company.name.toLocaleLowerCase().includes(term)),
  );
}

export function paginate(data, page, pageSize) {
  if (!PAGE_SIZES.includes(pageSize)) throw new Error("Invalid page size.");
  const limit = pageSize === "all" ? Math.max(1, data.length) : pageSize;
  const pages = Math.max(1, Math.ceil(data.length / limit));
  const current = Math.max(1, Math.min(pages, page));
  return {
    rows: data.slice((current - 1) * limit, current * limit),
    pages,
    current,
  };
}

export function downloadJson(data, filename = "companies-example.json") {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
