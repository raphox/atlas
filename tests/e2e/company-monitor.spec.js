import { test, expect } from "@playwright/test";

test.use({ timezoneId: "America/Sao_Paulo" });
test("relógio local e quatro entradas reais em alto risco ficam visíveis com filtros e em tela cheia", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-19T15:30:00Z"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  const companies = Array.from({ length: 7 }, (_, i) => ({
    id: `risk-${i}`,
    name: `Empresa risco ${i}`,
    metric: { label: "Receita", value: 10 },
    categories: [{ label: "Varejo", value: "retail" }],
    status: "critical",
    updatedAt: "2026-10-19T15:00:00Z",
    statusChangedAt: `2026-10-19T10:0${i}:00Z`,
  }));
  companies.push({
    ...companies[0],
    id: "healthy",
    name: "Empresa recuperada",
    status: "healthy",
    statusChangedAt: "2026-10-19T15:00:00Z",
  });
  companies.push({
    ...companies[0],
    id: "unknown",
    name: "Empresa sem data",
    statusChangedAt: undefined,
  });
  await page.route("**/data/empresas.json", (route) =>
    route.fulfill({ json: companies }),
  );
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#city-map")).toHaveAttribute(
    "aria-busy",
    "false",
    { timeout: 45000 },
  );
  const clock = page.getByTestId("monitor-clock");
  await expect(clock).toHaveText("12:30:00");
  await page.clock.setFixedTime(new Date("2026-10-19T15:30:05Z"));
  await expect(clock).toHaveText("12:30:05");
  const recent = page.getByRole("region", {
    name: "Últimas entradas em alto risco",
  });
  await expect(recent.locator("li strong")).toHaveText(
    [6, 5, 4, 3].map((i) => `Empresa risco ${i}`),
  );
  await expect(recent).toContainText(
    "1 em alto risco sem data de entrada informada.",
  );
  await expect(
    page.getByRole("columnheader", { name: "Atualização", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^SAÚDE DA EMPRESA/ }).click();
  await page.getByRole("checkbox", { name: "Saudável", exact: true }).check();
  await page.keyboard.press("Escape");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(recent.locator("li")).toHaveCount(4);
  await page.getByRole("button", { name: "Abrir mapa em tela cheia" }).click();
  await expect(clock).toBeVisible();
  await expect(recent).toBeVisible();
  await page.getByRole("button", { name: "Ocultar controles" }).click();
  await expect(clock).toBeVisible();
  await expect(recent).toBeVisible();
  await page.screenshot({
    path: "test-results/company-monitor-fullscreen.png",
  });
  await page.getByRole("button", { name: "Sair da tela cheia" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".atlas-company-monitor").scrollIntoViewIfNeeded();
  await expect(clock).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator(".atlas-company-monitor")
    .screenshot({ path: "test-results/company-monitor-mobile.png" });
});
