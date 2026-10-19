import { test, expect } from "@playwright/test";

test("snow cover follows rooftops and daylight rain and lightning render without residual effects", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/tests/e2e/fixtures/weather-scene.html");
  await page.waitForFunction(() => Boolean(window.weatherFixture));
  await page.evaluate(() => {
    const { City, demoCompanies, layoutCity } = window.weatherFixture;
    const container = document.createElement("div");
    container.id = "weather-scene";
    Object.assign(container.style, { position: "fixed", inset: "0" });
    document.body.append(container);
    const city = new City(container);
    const layout = layoutCity(demoCompanies(100));
    city.setCompanies(layout.companies, layout);
    city.setActivity({ effects: false });
    city.setLightingMode("day");
    city.setWeather("snow");
    city.view("iso", true);
    window.weatherCity = city;
  });
  await expect
    .poll(() =>
      page.evaluate(() => window.weatherCity.weatherParticles.cover.amount),
    )
    .toBeGreaterThan(0.2);
  await page.evaluate(() => {
    window.weatherCity.elapsed += 35;
  });
  await expect
    .poll(() =>
      page.evaluate(() => window.weatherCity.weatherParticles.cover.amount),
    )
    .toBe(1);
  await expect
    .poll(() => page.evaluate(() => !window.weatherCity.lightingTransition))
    .toBe(true);
  await page.screenshot({ path: "test-results/snow-cover-day.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/snow-cover-day-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => window.weatherCity.setLightingMode("night"));
  await expect
    .poll(() => page.evaluate(() => !window.weatherCity.lightingTransition))
    .toBe(true);
  await page.screenshot({ path: "test-results/snow-cover-night.png" });
  await page.evaluate(() => {
    window.weatherCity.setWeather("rain");
    window.weatherCity.setLightingMode("day");
  });
  await expect
    .poll(() => page.evaluate(() => !window.weatherCity.lightingTransition))
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.weatherCity.weatherParticles.rain.material.color.getHexString(),
      ),
    )
    .toBe("356b91");
  await expect
    .poll(() =>
      page.evaluate(() => window.weatherCity.weatherParticles.cover.visible),
    )
    .toBe(false);
  await page.screenshot({ path: "test-results/rain-contrast-day.png" });
  // Freeze a frame before/at the pulse peak to inspect illumination, independent of wall time.
  const flash = await page.evaluate(() => {
    const city = window.weatherCity;
    cancelAnimationFrame(city.animationId);
    city.animationId = null;
    const layer = city.weatherParticles;
    layer.updateLightning(layer.nextLightning, true);
    layer.updateLightning(layer.lightningStart + 0.01, true);
    city.renderer.render(city.scene, city.camera);
    return layer.lightning.intensity;
  });
  expect(flash).toBeGreaterThanOrEqual(3.6);
  await page.screenshot({ path: "test-results/rain-lightning-day.png" });
  const rainLayers = await page.evaluate(() => {
    const city = window.weatherCity;
    const original = city.weatherParticles;
    for (const type of ["none", "rain", "snow", "rain"]) city.setWeather(type);
    return {
      reused: city.weatherParticles === original,
      groups: city.scene.children.filter((child) => child === original).length,
      drops: original.rain.geometry.drawRange.count / 2,
    };
  });
  expect(rainLayers).toEqual({ reused: true, groups: 1, drops: 800 });
  await page.evaluate(() => window.weatherCity.setActivity({ life: false }));
  await expect
    .poll(() =>
      page.evaluate(() => ({
        visible: window.weatherCity.weatherParticles.visible,
        flash: window.weatherCity.weatherParticles.lightning.intensity,
      })),
    )
    .toEqual({ visible: false, flash: 0 });
  await page.evaluate(() => window.weatherCity.dispose());
  await expect(page.locator("#weather-scene canvas")).toHaveCount(0);
  expect(errors).toEqual([]);
});
