import { test, expect } from "@playwright/test";

test("production documentation executes edits, handles errors and restores examples", async ({
  page,
  context,
}) => {
  const errors = [];
  const requests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Dados que ganham",
  );
  await expect(page.locator(".map-preview canvas")).toBeVisible();
  const editor = page.getByRole("textbox", { name: "Código do exemplo" });
  await expect(editor).toBeVisible();
  await editor.fill(
    'render(<CityMap data={companies} title="Cidade editada" lightingMode="day" />);',
  );
  await expect(
    page.getByText("Alterações não executadas", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".atlas-city-title")).toHaveText("Minha cidade");
  await page.getByRole("button", { name: "Executar", exact: false }).click();
  await expect(page.locator(".atlas-city-title")).toHaveText("Cidade editada");
  await expect(editor).toBeVisible();

  await editor.fill("render(<CityMap");
  await editor.press("Control+Enter");
  await expect(page.getByRole("alert")).toBeVisible();
  await editor.fill('render(<CityMap data={companies} title="Recuperado" />);');
  await page.getByRole("button", { name: "Executar" }).click();
  await expect(page.locator(".atlas-city-title")).toHaveText("Recuperado");
  await expect(page.getByRole("alert")).toHaveCount(0);

  await page.getByRole("button", { name: "data.json", exact: true }).click();
  const dataEditor = page.getByRole("textbox", { name: "Dados do exemplo" });
  await dataEditor.fill('{ "invalid": true }');
  await page.getByRole("button", { name: "Executar" }).click();
  await expect(page.getByRole("alert")).toContainText("data.json");
  await expect(page.locator(".atlas-city-title")).toHaveText("Recuperado");
  await dataEditor.fill(
    JSON.stringify([
      {
        id: "test",
        name: "Empresa editada",
        metric: { label: "Vendas", value: 500 },
        categories: [{ label: "Comércio", value: "commerce" }],
        status: "healthy",
      },
    ]),
  );
  await page.getByRole("button", { name: "Executar" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page
    .locator(".map-preview")
    .getByRole("searchbox")
    .fill("Empresa editada");
  await page
    .getByRole("button", { name: "Empresa editada", exact: true })
    .click();
  await expect(page.getByLabel("Detalhes da empresa")).toContainText(
    "Empresa editada",
  );

  await page.getByRole("button", { name: "Restaurar exemplo" }).click();
  await expect(page.locator(".atlas-city-title")).toHaveText("Minha cidade");
  await page
    .getByRole("combobox", { name: "Exemplo", exact: true })
    .selectOption("weather");
  await expect(page.locator(".atlas-city-title")).toHaveText(
    "Uma noite na cidade",
  );
  await expect(page.getByLabel("Clima da cidade")).toBeEnabled();
  await page.getByLabel("Clima da cidade").selectOption("snow");
  await page
    .getByRole("combobox", { name: "Exemplo", exact: true })
    .selectOption("selection");
  await page.locator(".map-preview").getByRole("searchbox").fill("Aurora 1");
  await page.getByRole("button", { name: "Aurora 1", exact: true }).click();
  await expect(page.locator(".selection-output")).toHaveText(
    "Empresa selecionada: Aurora 1",
  );

  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copiar arquivo" }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain("onSelect={setSelected}");
  await page.getByRole("button", { name: "Código", exact: true }).click();
  await expect(page.locator(".preview-panel")).toBeHidden();
  await page.getByRole("button", { name: "Prévia", exact: true }).click();
  await expect(page.locator(".editor-panel")).toBeHidden();
  await page.getByRole("button", { name: "Dividido", exact: true }).click();
  await page.screenshot({
    path: "test-results/docs-desktop.png",
    fullPage: false,
  });
  expect(errors).toEqual([]);
  expect(
    requests.filter((url) =>
      /open-meteo|config\.json|empresas\.json/.test(url),
    ),
  ).toEqual([]);
});

test("Features, weather documentation and mobile navigation survive direct reloads", async ({
  page,
}) => {
  await page.goto("./?page=features#clima");
  await expect(page).toHaveTitle("Features · Atlas Docs");
  await expect(
    page.getByRole("heading", { name: "Consumo da API de clima" }),
  ).toBeInViewport();
  await expect(page.locator(".prose")).toContainText("15 minutos");
  await expect(page.locator(".prose")).toContainText("VITE_WEATHER_API_URL");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Consumo da API de clima" }),
  ).toBeInViewport();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Abrir navegação" }).click();
  await page
    .getByRole("navigation", { name: "Documentação" })
    .getByRole("link", { name: "Todas as features" })
    .click();
  await expect(
    page.getByRole("button", { name: "Abrir navegação" }),
  ).toHaveAttribute("aria-expanded", "false");
  await page.screenshot({
    path: "test-results/features-mobile.png",
    fullPage: false,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Documentação", exact: true }).click();
  await expect(page.locator(".map-preview canvas")).toBeVisible();
  await page.getByRole("button", { name: "Abrir navegação" }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Playground", exact: true })
    .click();
  await page.getByRole("button", { name: "Código", exact: true }).click();
  const editor = page.getByRole("textbox", { name: "Código do exemplo" });
  await editor.fill('render(<CityMap data={companies} title="Mobile" />);');
  await page.getByRole("button", { name: "Executar" }).click();
  await page.getByRole("button", { name: "Prévia", exact: true }).click();
  await expect(page.locator(".atlas-city-title")).toHaveText("Mobile");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/docs-mobile.png",
    fullPage: false,
  });
});
