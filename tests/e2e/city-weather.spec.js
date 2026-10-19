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

test("Cidade viva requests location, shows rain and snow, caches and stops when disabled", async ({
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
  await page.goto("/");
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
  await page
    .locator("#city-map")
    .screenshot({ path: "test-results/city-weather-rain.png" });
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
  await page
    .locator("#city-map")
    .screenshot({ path: "test-results/city-weather-snow.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await life.scrollIntoViewIfNeeded();
  await expect(life).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator("#city-map")
    .screenshot({ path: "test-results/city-weather-mobile.png" });
  expect(errors).toEqual([]);
});

test("refresh waits for cache expiry, pauses in background and stops after permission revocation", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: -23.55, longitude: -46.63 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install({ time: new Date() });
  let requests = 0;
  let code = 63;
  await page.route(endpoint, (route) => {
    requests++;
    return route.fulfill({ json: response(code) });
  });
  await page.goto("/");
  await expect(page.getByTestId("weather-status")).toHaveText(
    "Chuva na região",
  );
  await page.clock.fastForward(14 * 60_000);
  expect(requests).toBe(1);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.fastForward(2 * 60_000);
  expect(requests).toBe(1);
  code = 73;
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByTestId("weather-status")).toHaveText("Neve na região");
  expect(requests).toBe(2);
  code = 0;
  await page.clock.fastForward(15 * 60_000 + 100);
  await expect(page.getByTestId("weather-status")).toHaveText(
    "Sem chuva ou neve na região",
  );
  await expect.poll(() => weather(page)).toBe("none");
  expect(requests).toBe(3);
  await context.clearPermissions();
  await expect(page.getByTestId("weather-status")).toContainText(
    "Localização não autorizada",
  );
  await page.clock.fastForward(16 * 60_000);
  expect(requests).toBe(3);
});

test("a pending API response cannot restore weather after Cidade viva is turned off", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: -23.55, longitude: -46.63 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  let pendingRoute;
  await page.route(endpoint, (route) => {
    pendingRoute = route;
  });
  await page.goto("/");
  await expect.poll(() => Boolean(pendingRoute)).toBe(true);
  const life = page.getByRole("checkbox", { name: "Cidade viva" });
  await expect(life).toBeEnabled();
  await life.uncheck();
  await pendingRoute.fulfill({ json: response(63) });
  await expect(page.getByTestId("weather-status")).toHaveText("Clima pausado");
  await expect.poll(() => weather(page)).toBe("none");
});

test("denied location sends no weather request and preserves local lighting", async ({
  page,
}) => {
  let requests = 0;
  await page.route(endpoint, (route) => {
    requests++;
    return route.abort();
  });
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (_, failure) =>
      failure({ code: 1 });
  });
  await page.goto("/");
  await expect(page.getByTestId("weather-status")).toContainText(
    "Localização não autorizada",
  );
  const lighting = page.getByRole("combobox", { name: "Iluminação da cidade" });
  await expect(lighting).toBeEnabled();
  await lighting.selectOption("night");
  await expect
    .poll(() => page.evaluate(() => window.atlas.summary.lightingPeriod))
    .toBe("night");
  await expect.poll(() => weather(page)).toBe("none");
  expect(requests).toBe(0);
});

test("failed weather request does not block the map; reduced motion suppresses particles", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: -23.55, longitude: -46.63 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route(endpoint, (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
  await page.goto("/");
  await expect(page.getByTestId("weather-status")).toContainText(
    "Clima indisponível",
  );
  await expect(
    page.getByRole("button", { name: "Aproximar", exact: true }),
  ).toBeEnabled();
  await expect.poll(() => weather(page)).toBe("none");
  await page.unroute(endpoint);
  await page.route(endpoint, (route) => route.fulfill({ json: response(73) }));
  await page.reload();
  await expect(page.getByTestId("weather-status")).toHaveText("Neve na região");
  await expect.poll(() => weather(page)).toBe("snow");
  expect(await page.evaluate(() => window.atlas.summary.weatherVisible)).toBe(
    false,
  );
});

test("late location is ignored after Cidade viva is disabled", async ({
  page,
}) => {
  let requests = 0;
  await page.route(endpoint, (route) => {
    requests++;
    return route.abort();
  });
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (success) => {
      window.resolveLocation = success;
    };
  });
  await page.goto("/");
  const life = page.getByRole("checkbox", { name: "Cidade viva" });
  await expect(life).toBeEnabled();
  await life.uncheck();
  await page.evaluate(() =>
    window.resolveLocation({ coords: { latitude: -23.55, longitude: -46.63 } }),
  );
  await expect(page.getByTestId("weather-status")).toHaveText("Clima pausado");
  expect(requests).toBe(0);
  await expect.poll(() => weather(page)).toBe("none");
});
