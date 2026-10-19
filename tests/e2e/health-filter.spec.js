import { test, expect } from "@playwright/test";

test("health allows combining and removing statuses and synchronizes the map, table, counts and pagination", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  const companies = Array.from({ length: 210 }, (_, i) => ({
    id: `health-${i}`,
    name: `Empresa ${i}`,
    metric: { label: "Receita", value: i + 1 },
    categories: [{ label: "Varejo", value: "retail" }],
    status: i < 100 ? "healthy" : i < 200 ? "warning" : "critical",
  }));
  await page.route("**/data/empresas.json", (route) =>
    route.fulfill({ json: companies }),
  );
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const summary = () => page.evaluate(() => window.atlas?.summary);
  await expect
    .poll(summary, { timeout: 45000 })
    .toMatchObject({ companies: 210, chartPoints: 100 });
  await page
    .getByRole("button", { name: "Próxima cidade", exact: true })
    .click();
  await expect.poll(summary).toMatchObject({ page: 2 });
  const trigger = page.getByRole("button", { name: /^SAÚDE DA EMPRESA/ });
  await trigger.click();
  const warning = page.getByRole("checkbox", {
    name: "Risco médio",
    exact: true,
  });
  const critical = page.getByRole("checkbox", {
    name: "Alto risco",
    exact: true,
  });
  await warning.check();
  await expect
    .poll(summary)
    .toMatchObject({ page: 1, filtered: 100, chartPoints: 100 });
  await critical.check();
  await expect(warning).toBeChecked();
  await expect(critical).toBeChecked();
  await expect(trigger).toContainText("Risco médio + Alto risco");
  await expect
    .poll(summary)
    .toMatchObject({ filtered: 110, pages: 2, chartPoints: 100 });
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Próxima cidade", exact: true })
    .click();
  await expect
    .poll(summary)
    .toMatchObject({ page: 2, visible: 10, chartPoints: 10 });
  await expect(page.locator("tbody tr")).toHaveCount(10);
  await expect(page.locator("tbody [data-slot=badge]")).toHaveText(
    Array(10).fill("Alto risco"),
  );
  await trigger.click();
  await warning.uncheck();
  await expect
    .poll(summary)
    .toMatchObject({ page: 1, filtered: 10, chartPoints: 10 });
  await critical.uncheck();
  await expect
    .poll(summary)
    .toMatchObject({ page: 1, filtered: 210, chartPoints: 100 });
  await expect(trigger).toContainText("Todos os níveis de risco");
  await warning.check();
  await page
    .getByRole("button", { name: "Todos os níveis de risco", exact: true })
    .click();
  await expect(warning).not.toBeChecked();
  await expect.poll(summary).toMatchObject({ filtered: 210 });
  await critical.check();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Limpar", exact: true }).click();
  await expect.poll(summary).toMatchObject({ filtered: 210 });
  await expect(trigger).toContainText("Todos os níveis de risco");
});
