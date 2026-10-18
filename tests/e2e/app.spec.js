import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
});

async function ready(page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect
    .poll(() => page.evaluate(() => window.atlas?.summary.companies))
    .toBe(1400);
  await expect(
    page.getByText("Construindo a cidade", { exact: true }),
  ).toHaveCount(0);
  await expect(page.locator("#viewport canvas")).toHaveCount(1);
}
const summary = (page) => page.evaluate(() => window.atlas.summary);

test("mapa, tabela, filtros e paginação compartilham o estado React", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await ready(page);
  await expect(page.locator("tbody tr")).toHaveCount(100);
  const tableRegion = page.getByRole("region", {
    name: "Tabela de empresas da página atual",
  });
  expect(
    await tableRegion.evaluate((element) => element.clientHeight),
  ).toBeLessThanOrEqual(240);
  await page
    .getByRole("button", { name: "Próxima cidade", exact: true })
    .click();
  await expect.poll(async () => (await summary(page)).page).toBe(2);
  await expect(page.locator("#city-map")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator(".city-slide-snapshot")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Cidade anterior", exact: true })
    .click();
  await expect.poll(async () => (await summary(page)).page).toBe(1);
  await expect(page.locator("#city-map")).toHaveAttribute("aria-busy", "false");
  await page.getByRole("combobox", { name: "Por cidade" }).click();
  await page.getByRole("option", { name: "250", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(250);
  await expect.poll(async () => (await summary(page)).pageSize).toBe(250);
  await page.getByRole("combobox", { name: "SAÚDE DA EMPRESA" }).click();
  await page.getByRole("option", { name: "Alto risco", exact: true }).click();
  await expect
    .poll(async () => (await summary(page)).filtered)
    .toBeGreaterThan(0);
  for (const badge of await page
    .locator("tbody [data-slot=badge]")
    .allTextContents())
    expect(badge).toBe("Alto risco");
  await page.getByRole("button", { name: "Limpar", exact: true }).click();
  await page.getByRole("button", { name: /^Leads exclusivo/ }).click();
  await expect
    .poll(async () => (await summary(page)).filtered)
    .toBe(
      (await summary(page)).regions.find((r) => r.systems === "Leads").count,
    );
  await expect(
    page.locator("tbody tr").first().locator("td").first(),
  ).toHaveText("Leads");
  await page.getByRole("button", { name: "Limpar", exact: true }).click();
  expect(errors).toEqual([]);
});

test("busca, detalhes, controles, ajuda e estado vazio funcionam", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await ready(page);
  await page
    .getByRole("combobox", { name: "Buscar empresa" })
    .fill("Aurora Tecnologia 0001");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  const search = page.getByRole("combobox", { name: "Buscar empresa" });
  await expect(
    page.getByRole("option", { name: "Aurora Tecnologia 0001" }),
  ).toBeVisible();
  await search.press("ArrowDown");
  await search.press("Enter");
  await expect(
    page.getByRole("region", { name: "Detalhes da empresa" }),
  ).toContainText("Aurora Tecnologia 0001");
  await page.getByRole("button", { name: "Fechar detalhes" }).click();
  await page
    .getByRole("button", { name: "Ver Aurora Tecnologia 0001 no mapa" })
    .click();
  await expect(page.locator("tbody tr[aria-current=true]")).toHaveCount(1);
  await page.getByRole("button", { name: "Fechar detalhes" }).click();
  await page.getByRole("tab", { name: "Vista superior" }).click();
  await expect(
    page.getByRole("tab", { name: "Vista superior" }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Vista superior" }).press("ArrowLeft");
  await expect(page.getByRole("tab", { name: "Isométrica" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByRole("button", { name: "Aproximar", exact: true }).click();
  await page.getByRole("button", { name: "Restaurar visão geral" }).click();
  await page.getByText("Cidade viva", { exact: true }).click();
  await expect(
    page.getByRole("switch", { name: "Cidade viva" }),
  ).toHaveAttribute("aria-checked", "false");
  await page.getByRole("switch", { name: "Efeitos de risco" }).click();
  await expect(
    page.getByRole("switch", { name: "Efeitos de risco" }),
  ).toHaveAttribute("aria-checked", "false");
  await page.getByRole("button", { name: "Como navegar" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Buscar empresa" })
    .fill("empresa inexistente");
  await expect(
    page.getByText("Nenhuma empresa encontrada.", { exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Limpar filtros", exact: true })
    .click();
  await expect.poll(async () => (await summary(page)).filtered).toBe(1400);
  await page.screenshot({
    path: "test-results/atlas-desktop.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("importação valida o JSON antes de substituir as empresas e permite baixar o exemplo", async ({
  page,
}) => {
  await ready(page);
  const input = page.getByLabel("Arquivo JSON de empresas");
  await input.setInputFiles({
    name: "invalido.json",
    mimeType: "application/json",
    buffer: Buffer.from("{invalid"),
  });
  await expect(
    page.getByText("O arquivo não contém um JSON válido."),
  ).toBeVisible();
  expect((await summary(page)).companies).toBe(1400);
  const records = [
    {
      id: "custom",
      name: "Minha Empresa",
      users: 128,
      systems: ["A", "C"],
      status: "warning",
    },
  ];
  await input.setInputFiles({
    name: "empresas.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(records)),
  });
  await expect(
    page.getByText("Dados importados", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody")).toContainText("Minha Empresa");
  expect((await summary(page)).companies).toBe(1);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar arquivo de exemplo" }).click();
  expect((await download).suggestedFilename()).toBe("empresas-exemplo.json");
});

test("layouts móvel e tablet mantêm os controles, sem rolagem horizontal", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  await page.getByRole("button", { name: "Próxima cidade" }).click();
  await expect.poll(async () => (await summary(page)).page).toBe(2);
  await expect(page.locator("#city-map")).toHaveAttribute("aria-busy", "false");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/atlas-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 872, height: 950 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await page.locator("#city-map").boundingBox()).x).toBeGreaterThan(
    200,
  );
  await page.screenshot({
    path: "test-results/atlas-tablet.png",
    fullPage: true,
  });
});

test("falha da fonte é exibida e oferece tentar novamente", async ({
  page,
}) => {
  await page.route("**/config.json", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível carregar a configuração",
  );
  await expect(
    page.getByRole("button", { name: "Tentar novamente" }),
  ).toBeVisible();
});

test("tooltips ficam ancorados no prédio e mantêm uma seta triangular visível", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  const viewport = await page.locator("#viewport").boundingBox();
  const tooltip = page.locator('[data-slot="tooltip-content"]');
  const companies = new Set();
  let fixedPositions = 0;
  const settlePosition = () =>
    page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
  for (const y of [0.45, 0.5, 0.4, 0.55, 0.35, 0.6]) {
    for (const x of [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8]) {
      await page.mouse.move(
        viewport.x + viewport.width * x,
        viewport.y + viewport.height * y,
      );
      await settlePosition();
      if (!(await tooltip.isVisible())) continue;
      const name = await tooltip.locator("span").first().textContent();
      if (companies.has(name)) continue;
      const arrow = tooltip.locator("svg");
      await expect(arrow).toBeVisible();
      const appearance = await arrow.evaluate((element) => {
        const style = getComputedStyle(element);
        const content = element.closest('[data-slot="tooltip-content"]');
        return {
          transform: style.transform,
          background: style.backgroundColor,
          fill: style.fill,
          contentBackground: getComputedStyle(content).backgroundColor,
          stroke: style.stroke,
          border: getComputedStyle(content).borderBottomColor,
        };
      });
      expect(appearance.transform).toBe("none");
      expect(appearance.background).toBe("rgba(0, 0, 0, 0)");
      expect(appearance.fill).toBe(appearance.contentBackground);
      expect(appearance.contentBackground).toBe("rgb(255, 255, 255)");
      expect(appearance.stroke).toBe(appearance.border);
      await settlePosition();
      await expect
        .poll(async () => {
          const anchor = await page
            .locator(
              '#city-map span[data-slot="tooltip-trigger"][aria-hidden="true"]',
            )
            .boundingBox();
          const tip = await arrow.boundingBox();
          return Math.max(
            Math.abs(tip.x + tip.width / 2 - anchor.x - anchor.width / 2),
            Math.abs(tip.y + tip.height - anchor.y),
          );
        })
        .toBeLessThan(1.5);
      const original = await tooltip.boundingBox();
      for (const [dx, dy] of [
        [2, 0],
        [-2, 0],
        [0, 2],
        [0, -2],
      ]) {
        await page.mouse.move(
          viewport.x + viewport.width * x + dx,
          viewport.y + viewport.height * y + dy,
        );
        await settlePosition();
        if (
          !(await tooltip.isVisible()) ||
          (await tooltip.locator("span").first().textContent()) !== name
        )
          continue;
        const moved = await tooltip.boundingBox();
        expect(Math.abs(moved.x - original.x)).toBeLessThan(0.5);
        expect(Math.abs(moved.y - original.y)).toBeLessThan(0.5);
        fixedPositions++;
      }
      await page.mouse.move(
        viewport.x + viewport.width * x,
        viewport.y + viewport.height * y,
      );
      companies.add(name);
      if (companies.size === 2) break;
    }
    if (companies.size === 2) break;
  }
  expect(companies.size).toBe(2);
  expect(fixedPositions).toBeGreaterThan(0);
  await settlePosition();
  const roofAnchor = page.locator(
    '#city-map span[data-slot="tooltip-trigger"][aria-hidden="true"]',
  );
  const beforeZoom = await roofAnchor.boundingBox();
  await page.keyboard.press("+");
  await expect
    .poll(async () => {
      const afterZoom = await roofAnchor.boundingBox();
      return Math.hypot(afterZoom.x - beforeZoom.x, afterZoom.y - beforeZoom.y);
    })
    .toBeGreaterThan(0.5);
  await expect
    .poll(async () => {
      const anchor = await roofAnchor.boundingBox();
      const arrow = await tooltip.locator("svg").boundingBox();
      return Math.max(
        Math.abs(arrow.x + arrow.width / 2 - anchor.x - anchor.width / 2),
        Math.abs(arrow.y + arrow.height - anchor.y),
      );
    })
    .toBeLessThan(1);
  await page.screenshot({ path: "test-results/atlas-tooltip-arrow.png" });
});

test("tooltip aparece ao passar pela fachada mesmo com o telhado fora do mapa", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  await page.getByLabel("Arquivo JSON de empresas").setInputFiles({
    name: "predio-alto.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify([
        {
          id: "tower",
          name: "Prédio Alto",
          users: 5000,
          systems: ["A"],
          status: "healthy",
        },
      ]),
    ),
  });
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Ver Prédio Alto no mapa" }).click();
  await page.getByRole("button", { name: "Fechar detalhes" }).click();
  for (let i = 0; i < 8; i++)
    await page.getByRole("button", { name: "Aproximar", exact: true }).click();
  const viewport = await page.locator("#viewport").boundingBox();
  await page.mouse.move(
    viewport.x + viewport.width / 2,
    viewport.y + viewport.height / 2,
  );
  const tooltip = page
    .locator('[data-slot="tooltip-content"]')
    .filter({ hasText: "Prédio Alto" });
  await expect(tooltip).toBeVisible();
  const anchor = page.locator(
    '#city-map span[data-slot="tooltip-trigger"][aria-hidden="true"]',
  );
  await expect
    .poll(async () => (await anchor.boundingBox()).y - viewport.y)
    .toBeCloseTo(18, 0);
  await expect
    .poll(async () => {
      const box = await tooltip.boundingBox();
      return (
        box.y >= viewport.y &&
        box.y + box.height <= viewport.y + viewport.height &&
        box.x >= viewport.x &&
        box.x + box.width <= viewport.x + viewport.width
      );
    })
    .toBe(true);
  const box = await tooltip.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  // The original node must stay mounted beyond the handoff delay, not blink
  // away and reappear over the underlying building.
  expect(
    await tooltip.evaluate(
      (element) =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve(
                element.isConnected &&
                  getComputedStyle(element).visibility === "visible",
              ),
            400,
          );
        }),
    ),
  ).toBe(true);
  await page.mouse.move(box.x + box.width - 8, box.y + 8);
  await expect(tooltip).toBeVisible();
  await page.screenshot({
    path: "test-results/atlas-tooltip-offscreen-roof.png",
  });
  await page.mouse.move(
    viewport.x + viewport.width / 2,
    viewport.y + viewport.height / 2,
  );
  await expect(tooltip).toBeVisible();
  await page.mouse.move(100, 40);
  await expect(tooltip).toHaveCount(0);
});
