import { test, expect } from "@playwright/test";

test("optional controls combine every light and weather, resume props and respect City life", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/tests/e2e/fixtures/environment.html");
  const stats = () => page.evaluate(() => window.environmentStats?.());
  const lighting = page.getByRole("combobox", { name: "Iluminação da cidade" });
  const weather = page.getByRole("combobox", { name: "Clima da cidade" });
  await expect
    .poll(stats)
    .toMatchObject({ lightingPeriod: "day", weather: "rain" });
  await expect(lighting).toHaveCount(0);
  await expect(weather).toHaveCount(0);
  await page.evaluate(() =>
    window.renderEnvironment({ showEnvironmentControls: true }),
  );
  await expect(lighting).toBeEnabled();
  for (const mode of ["auto", "day", "twilight", "night"]) {
    await lighting.selectOption(mode);
    for (const type of ["auto", "none", "rain", "snow"]) {
      await weather.selectOption(type);
      await expect.poll(stats).toMatchObject({
        lightingPeriod: mode === "auto" ? "day" : mode,
        weather: type === "auto" ? "rain" : type,
        weatherVisible: type !== "none",
      });
    }
  }
  await page.evaluate(() =>
    window.renderEnvironment({ showEnvironmentControls: true, life: false }),
  );
  await expect(lighting).toBeDisabled();
  await expect(weather).toBeDisabled();
  await expect
    .poll(stats)
    .toMatchObject({ lightingPeriod: "day", weatherVisible: false });
  await page.evaluate(() =>
    window.renderEnvironment({ showEnvironmentControls: true }),
  );
  await expect(lighting).toHaveValue("night");
  await expect(weather).toHaveValue("snow");
  await expect
    .poll(stats)
    .toMatchObject({ lightingPeriod: "night", weatherVisible: true });
  await page.evaluate(() =>
    window.renderEnvironment({ showEnvironmentControls: false }),
  );
  await expect(lighting).toHaveCount(0);
  await expect(weather).toHaveCount(0);
  await expect
    .poll(stats)
    .toMatchObject({ lightingPeriod: "day", weather: "rain" });
  await page.evaluate(() =>
    window.renderEnvironment({ showEnvironmentControls: true }),
  );
  await lighting.selectOption("auto");
  await weather.selectOption("auto");
  await page.evaluate(() =>
    window.renderEnvironment({
      showEnvironmentControls: true,
      lightingMode: "twilight",
      weather: "snow",
    }),
  );
  await expect
    .poll(stats)
    .toMatchObject({ lightingPeriod: "twilight", weather: "snow" });
  expect(errors).toEqual([]);
});

test("Atlas identifies manual weather and fits both dropdowns on mobile", async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (_success, fail) =>
      fail({ code: 1 });
  });
  await page.goto("/");
  const lighting = page.getByRole("combobox", { name: "Iluminação da cidade" });
  const weather = page.getByRole("combobox", { name: "Clima da cidade" });
  await expect(weather).toBeEnabled();
  await lighting.selectOption("night");
  await weather.selectOption("snow");
  await expect(page.getByTestId("weather-status")).toHaveText(
    "Simulação: neve",
  );
  await expect
    .poll(() => page.evaluate(() => window.atlas.summary.weatherVisible))
    .toBe(true);
  const life = page.getByRole("checkbox", { name: "Cidade viva" });
  await life.uncheck();
  await expect(weather).toBeDisabled();
  await expect(page.getByTestId("weather-status")).toHaveText("Clima pausado");
  await life.check();
  await expect(page.getByTestId("weather-status")).toHaveText(
    "Simulação: neve",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await weather.scrollIntoViewIfNeeded();
  await expect(lighting).toBeInViewport();
  await expect(weather).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator("#city-map")
    .screenshot({ path: "test-results/city-environment-mobile.png" });
  await weather.selectOption("auto");
  await expect(page.getByTestId("weather-status")).toHaveText(
    "Localização não autorizada · clima indisponível",
  );
  await expect
    .poll(() => page.evaluate(() => window.atlas.summary.weather))
    .toBe("none");
});
