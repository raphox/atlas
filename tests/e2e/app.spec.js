import { test, expect } from "@playwright/test";

const companies = Array.from({ length: 105 }, (_, i) => ({
  id: `company-${i}`,
  name: `Company ${i}`,
  metric: { label: "Revenue", value: 100 + i },
  categories: [{ label: "Commerce", value: "commerce" }],
  status: i % 3 === 0 ? "critical" : "healthy",
}));

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.route("**/data/empresas.json", (route) =>
    route.fulfill({ json: companies }),
  );
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (_, fail) => fail({ code: 1 });
  });
});

async function ready(page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#city-map")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator("#viewport canvas")).toBeVisible();
}

test("map and table integrate pagination, filtering, selection and camera controls", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await ready(page);
  await expect(page.locator("tbody tr")).toHaveCount(100);
  await expect(page.getByLabel("Clima da cidade")).toHaveCount(0);
  await expect(page.getByLabel("Iluminação da cidade")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Próxima cidade", exact: true })
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(5);
  await page.getByRole("button", { name: /^SAÚDE DA EMPRESA/ }).click();
  await page.getByRole("checkbox", { name: "Alto risco", exact: true }).check();
  await page.keyboard.press("Escape");
  await expect(page.locator("tbody tr")).toHaveCount(35);
  await expect
    .poll(() => page.evaluate(() => window.atlas.summary.chartPoints))
    .toBe(35);
  await page.getByRole("button", { name: "Limpar", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Buscar empresa" })
    .fill("Company 104");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Ver Company 104 no mapa" }).click();
  await expect(
    page.getByRole("region", { name: "Detalhes da empresa" }),
  ).toContainText("Company 104");
  await expect(page.locator("tbody tr[aria-current=true]")).toHaveCount(1);
  await page.getByRole("button", { name: "Fechar detalhes" }).click();
  await page.getByRole("checkbox", { name: "Cidade viva" }).uncheck();
  await page.getByRole("checkbox", { name: "Efeitos de risco" }).uncheck();
  await page.getByRole("radio", { name: "Vista superior" }).click();
  await expect(
    page.getByRole("radio", { name: "Vista superior" }),
  ).toBeChecked();
  await expect
    .poll(() =>
      page.locator(".atlas-map-compass-arrow").evaluate((node) => {
        const matrix = new DOMMatrixReadOnly(getComputedStyle(node).transform);
        return Math.abs(Math.atan2(matrix.b, matrix.a));
      }),
    )
    .toBeLessThan(0.001);
  await page
    .getByRole("button", { name: "Restaurar visão isométrica" })
    .click();
  await expect(page.getByRole("radio", { name: "Isométrica" })).toBeChecked();
  expect(errors).toEqual([]);
});

test("native file input and download connect to the imported map data", async ({
  page,
}) => {
  await ready(page);
  const input = page.getByLabel("Arquivo JSON de empresas");
  await input.setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from("{invalid"),
  });
  await expect(
    page.getByText("O arquivo não contém um JSON válido."),
  ).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(100);
  await input.setInputFiles({
    name: "companies.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify([companies[104]])),
  });
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody")).toContainText("Company 104");
  await expect
    .poll(() => page.evaluate(() => window.atlas.summary.chartPoints))
    .toBe(1);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar arquivo de exemplo" }).click();
  expect((await download).suggestedFilename()).toBe("empresas-exemplo.json");
});

test("mobile layout and native fullscreen preserve accessible map controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.getByRole("radio", { name: "Isométrica" })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Abrir mapa em tela cheia" }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.fullscreenElement?.getAttribute("data-chart"),
      ),
    )
    .toBe("city-3d");
  await expect(
    page.getByRole("button", { name: "Sair da tela cheia" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Aproximar", exact: true }).click();
  await page.evaluate(() => document.exitFullscreen());
  await expect(
    page.getByRole("button", { name: "Abrir mapa em tela cheia" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Empresas nesta cidade" }),
  ).toBeVisible();
});
