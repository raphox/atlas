import { test, expect } from "@playwright/test";

const cases = [
  {
    locale: "pt-BR",
    lang: "pt-BR",
    title: "Distrito das empresas",
    search: "Buscar empresa no mapa",
    details: "Detalhes da empresa",
    risk: "Alto risco",
    number: "2.400,5",
    lighting: "Iluminação da cidade",
    weather: "Clima da cidade",
    night: "Noite",
    life: "Cidade viva",
    empty: "Nenhuma empresa encontrada.",
    zoom: "Aproximar",
    hide: "Ocultar controles",
    show: "Mostrar controles",
    paused: "Clima pausado",
  },
  {
    locale: "en-US",
    lang: "en-US",
    title: "Business district",
    search: "Search companies on the map",
    details: "Company details",
    risk: "High risk",
    number: "2,400.5",
    lighting: "City lighting",
    weather: "City weather",
    night: "Night",
    life: "City life",
    empty: "No companies found.",
    zoom: "Zoom in",
    hide: "Hide controls",
    show: "Show controls",
    paused: "Weather paused",
  },
];
cases.push({ ...cases[1], locale: "es-ES" });

for (const c of cases) {
  test.describe(`map locale ${c.locale}`, () => {
    test.use({ locale: c.locale, reducedMotion: "reduce" });

    test("the package translates controls and details without changing data", async ({
      page,
    }) => {
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/tests/e2e/fixtures/package.html");
      const map = page.locator(".atlas-city-map").first();
      await expect(map).toHaveAttribute("lang", c.lang);
      await expect(map.locator(".atlas-city-title")).toHaveText(c.title);
      await expect(
        map.getByRole("button", { name: c.zoom, exact: true }),
      ).toBeEnabled();
      await expect(map.getByLabel(c.lighting)).toContainText(c.night);
      await map.getByLabel(c.weather).selectOption("snow");
      await expect(map.getByLabel(c.weather)).toHaveValue("snow");
      await map.getByRole("searchbox", { name: c.search }).fill("Aurora");
      await map.getByRole("button", { name: "Aurora", exact: true }).click();
      const details = map.getByLabel(c.details, { exact: true });
      await expect(details).toContainText(c.risk);
      await expect(details).toContainText(`Receita: ${c.number}`);
      await expect(details).toContainText("Varejo");
      await page.evaluate(() => window.renderPackage([]));
      await expect(map.getByText(c.empty, { exact: true })).toBeVisible();
      expect(errors).toEqual([]);
    });

    test("the application map translates controls and weather status", async ({
      page,
    }) => {
      await page.addInitScript(() => {
        navigator.geolocation.getCurrentPosition = (_success, failure) =>
          failure({ code: 1 });
      });
      await page.goto("/");
      const map = page.locator('section[data-chart="city-3d"]');
      await expect(map).toHaveAttribute("lang", c.lang);
      await expect(map.getByText(c.title, { exact: true })).toBeVisible();
      await expect(
        map.getByRole("button", { name: c.zoom, exact: true }),
      ).toBeEnabled();
      await map.getByRole("checkbox", { name: c.life, exact: true }).uncheck();
      await expect(map.getByTestId("weather-status")).toHaveText(c.paused);
      await map.getByRole("button", { name: c.hide, exact: true }).click();
      await expect(
        map.getByRole("button", { name: c.show, exact: true }),
      ).toBeVisible();
    });
  });
}

test("language changes preserve the canvas, selection and control state", async ({
  page,
}) => {
  await page.goto("/tests/e2e/fixtures/package.html");
  const map = page.locator(".atlas-city-map").first();
  await expect(map.getByLabel("Clima da cidade")).toBeEnabled();
  await map.getByLabel("Clima da cidade").selectOption("snow");
  await map.getByRole("searchbox").fill("Aurora");
  await map.getByRole("button", { name: "Aurora", exact: true }).click();
  await page.evaluate(() => {
    window.originalMapCanvas = document.querySelector(".atlas-city-map canvas");
    Object.defineProperty(navigator, "language", {
      configurable: true,
      value: "en-US",
    });
    window.dispatchEvent(new Event("languagechange"));
  });
  await expect(map).toHaveAttribute("lang", "en-US");
  await expect(
    map.getByLabel("Company details", { exact: true }),
  ).toContainText("Aurora");
  await expect(map.getByLabel("City weather")).toHaveValue("snow");
  expect(
    await page.evaluate(
      () =>
        window.originalMapCanvas ===
        document.querySelector(".atlas-city-map canvas"),
    ),
  ).toBe(true);
});
