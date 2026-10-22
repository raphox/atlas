import { test, expect } from "@playwright/test";

const row = (id, status = "healthy") => ({
  id,
  name: `Imported ${id}`,
  metric: { label: "Revenue", value: 50 },
  categories: [{ label: "Services", value: "services" }],
  status,
});

test("extension page composes filters, cities, table, JSON and remote sources", async ({
  page,
}, testInfo) => {
  const errors = [];
  const requests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("./?page=extending#extension-example");
  await expect(page).toHaveTitle("Extending CityMap · Atlas Docs");
  const demo = page.getByRole("region", { name: "Extended chart example" });
  await expect(demo.locator("canvas")).toBeVisible();
  await demo.screenshot({ path: testInfo.outputPath("extension-desktop.png") });
  await expect(demo.getByTestId("extension-matches")).toHaveText("1,400");
  await expect(demo.getByText("City 1 of 14", { exact: true })).toBeVisible();
  await demo.getByRole("button", { name: "Next city", exact: true }).click();
  await expect(demo.getByText("City 2 of 14", { exact: true })).toBeVisible();
  await expect(
    demo.getByRole("button", { name: "Next city", exact: true }),
  ).toBeEnabled();
  await expect(demo.locator("tbody th").first()).toContainText("101");
  await demo.getByLabel("Filter company name").fill("· 1400");
  await expect(demo.getByTestId("extension-matches")).toHaveText("1");
  await expect(demo.locator("tbody tr")).toHaveCount(1);
  await demo.getByRole("button", { name: /^Locate / }).click();
  await expect(demo.locator('tbody tr[aria-selected="true"]')).toHaveCount(1);
  await expect(demo.getByLabel("Company details")).toBeVisible();
  await demo
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await demo.getByRole("checkbox", { name: "critical", exact: true }).check();
  const criticalCount = await demo
    .getByTestId("extension-matches")
    .textContent();
  expect(Number(criticalCount.replaceAll(",", ""))).toBeGreaterThan(0);
  await expect(demo.locator("tbody tr").first()).toContainText("critical");
  await demo
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await demo
    .getByLabel("Companies per city", { exact: true })
    .selectOption("250");
  await expect(demo.getByText("City 1 of 6", { exact: true })).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await demo.getByRole("button", { name: "Download example JSON" }).click();
  expect((await downloadEvent).suggestedFilename()).toBe(
    "companies-example.json",
  );
  const upload = demo.getByLabel("Import companies JSON");
  await upload.setInputFiles({
    name: "portfolio.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify([row("a"), row("b", "critical")])),
  });
  await expect(demo.getByTestId("extension-matches")).toHaveText("2");
  await upload.setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from("{}"),
  });
  await expect(demo.getByRole("alert")).toContainText("preserved");
  await expect(demo.getByTestId("extension-matches")).toHaveText("2");
  await page.route("**/extension-data.json", (route) =>
    route.fulfill({ json: { companies: [row("remote")] } }),
  );
  await demo
    .getByLabel("Company JSON endpoint")
    .fill(new URL("extension-data.json", page.url()).href);
  await demo.getByRole("button", { name: "Load source", exact: true }).click();
  await expect(demo.locator("tbody th")).toHaveText(["Imported remote"]);
  await page.route("**/extension-error.json", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await demo
    .getByLabel("Company JSON endpoint")
    .fill(new URL("extension-error.json", page.url()).href);
  await demo.getByRole("button", { name: "Load source", exact: true }).click();
  await expect(demo.getByRole("alert")).toContainText("HTTP 503");
  await expect(demo.locator("tbody th")).toHaveText(["Imported remote"]);
  expect(requests.filter((url) => url.includes("open-meteo.com"))).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await expect(demo.getByTestId("extension-matches")).toHaveText("1,400");
  await demo.screenshot({ path: testInfo.outputPath("extension-mobile.png") });
  expect(errors).toEqual([]);
});

test("extension weather is opt-in, cached, follows life and supports snow and failure", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: -23.55052, longitude: -46.633308 });
  const requests = [];
  let code = 63;
  await page.route("https://api.open-meteo.com/v1/forecast**", (route) => {
    requests.push(new URL(route.request().url()));
    return route.fulfill({
      json: {
        current: {
          time: Math.floor(Date.now() / 1000),
          weather_code: code,
          rain: code === 63 ? 0.8 : 0,
          showers: 0,
          snowfall: code === 73 ? 0.2 : 0,
        },
      },
    });
  });
  await page.goto("./?page=extending#extension-example");
  const demo = page.getByRole("region", { name: "Extended chart example" });
  await expect(demo.locator("canvas")).toBeVisible();
  expect(requests).toHaveLength(0);
  await demo.getByLabel("Connect local weather").check();
  await expect(demo.getByTestId("extension-weather")).toContainText("Rain");
  expect(requests).toHaveLength(1);
  expect(requests[0].searchParams.get("latitude")).toBe("-23.55");
  const life = demo.getByRole("checkbox", { name: "City life", exact: true });
  await life.uncheck();
  await expect(demo.getByTestId("extension-weather")).toContainText("paused");
  await life.check();
  await expect(demo.getByTestId("extension-weather")).toContainText("Rain");
  expect(requests).toHaveLength(1);
  code = 73;
  await page.reload();
  await demo.getByLabel("Connect local weather").check();
  await expect(demo.getByTestId("extension-weather")).toContainText("Snow");
  await demo.getByLabel("City weather", { exact: true }).selectOption("rain");
  await expect(demo.getByLabel("City weather", { exact: true })).toHaveValue(
    "rain",
  );
  await demo.getByLabel("Connect local weather").uncheck();
  await expect(demo.getByTestId("extension-weather")).toContainText(
    "disconnected",
  );
  await page.unroute("https://api.open-meteo.com/v1/forecast**");
  await page.route("https://api.open-meteo.com/v1/forecast**", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.reload();
  await demo.getByLabel("Connect local weather").check();
  await expect(demo.getByTestId("extension-weather")).toContainText(
    "unavailable",
  );
});
