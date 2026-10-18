import { placeCompanies } from "./model.js";

export function parseCompanyPayload(payload) {
  const records = Array.isArray(payload) ? payload : payload?.companies;
  if (Array.isArray(records) && records.length === 0) return [];
  return placeCompanies(records);
}

export async function loadCompanyData(
  configUrl = "/config.json",
  fetcher = fetch,
) {
  const configResponse = await fetcher(configUrl, {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!configResponse.ok)
    throw new Error(
      "Não foi possível carregar a configuração da fonte de dados.",
    );
  const config = await configResponse.json();
  if (typeof config.dataUrl !== "string" || !config.dataUrl.trim())
    throw new Error("Configure dataUrl com o endereço do JSON de empresas.");
  const response = await fetcher(config.dataUrl, {
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  if (!response.ok)
    throw new Error(
      "Não foi possível carregar o JSON de empresas. Verifique a fonte de dados e tente novamente.",
    );
  const companies = parseCompanyPayload(await response.json());
  return { companies, demo: config.mode === "demo" };
}
