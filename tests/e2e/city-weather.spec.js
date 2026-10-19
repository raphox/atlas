import { test, expect } from "@playwright/test";

const endpoint = "https://api.open-meteo.com/v1/forecast**";
const response = (code) => ({
  current: {
    time: Math.floor(Date.now() / 1000),
    weather_code: code,
    rain: code === 63 ? 0.8 : 0,
    showers: 0,
    snowfall: code === 73 ? 0.2 : 0,
  },
});
const weather = (page) => page.evaluate(() => window.atlas?.summary.weather);

test("City life requests location, shows rain and snow, caches and stops when disabled", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: -23.55052, longitude: -46.633308 });
  const requests = [];
  let code = 63;
  await page.route(endpoint, (route) => {
    requests.push(new URL(route.request().url()));
    return route.fulfill({ json: response(code) });
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.route("**/data/empresas.json", (route) =>
    route.fulfill({
      json: [
        {
          id: "weather",
          name: "Weather company",
          metric: { label: "Revenue", value: 100 },
          categories: [{ label: "Commerce", value: "commerce" }],
          status: "healthy",
        },
      ],
    }),
  );
  await page.goto("/tests/e2e/fixtures/app-environment.html");
  await expect(page.getByTestId("weather-status")).toHaveText(
    "Chuva na região",
  );
  await expect.poll(() => weather(page)).toBe("rain");
  await expect
    .poll(() => page.evaluate(() => window.atlas.summary.weatherVisible))
    .toBe(true);
  expect(requests).toHaveLength(1);
  expect(requests[0].searchParams.get("latitude")).toBe("-23.55");
  expect(requests[0].searchParams.get("longitude")).toBe("-46.63");
  await expect(
    page.getByRole("link", { name: "Open-Meteo", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Clima local" })).toHaveCount(
    0,
  );
  await page.getByRole("checkbox", { name: "Efeitos de risco" }).uncheck();

  const life = page.getByRole("checkbox", { name: "Cidade viva" });
  await life.uncheck();
  await expect.poll(() => weather(page)).toBe("none");
  await expect
    .poll(() => page.evaluate(() => window.atlas.summary.weatherVisible))
    .toBe(false);
  await expect(page.getByTestId("weather-status")).toHaveText("Clima pausado");
  await life.check();
  await expect.poll(() => weather(page)).toBe("rain");
  expect(requests).toHaveLength(1);
  // A fresh session reads the new weather; permission is already granted.
  code = 73;
  await page.reload();
  await expect(page.getByTestId("weather-status")).toHaveText("Neve na região");
  await expect.poll(() => weather(page)).toBe("snow");
  await page
    .getByRole("combobox", { name: "Iluminação da cidade" })
    .selectOption("night");
  await expect
    .poll(() => page.evaluate(() => window.atlas.summary.lightingPeriod))
    .toBe("night");
  expect(errors).toEqual([]);
});
