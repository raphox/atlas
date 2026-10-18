import { test, expect } from "@playwright/test";

test.use({ timezoneId: "America/Sao_Paulo", reducedMotion: "reduce" });

test("o seletor aplica os três níveis, retoma o automático e preserva a escolha com Cidade viva desligada", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.clock.install({ time: new Date("2026-10-18T12:00:00-03:00") });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const selector = page.getByRole("combobox", { name: "Iluminação da cidade" });
  const life = page.getByRole("checkbox", { name: "Cidade viva" });
  const period = () =>
    page.evaluate(() => window.atlas?.summary.lightingPeriod);
  await expect(selector).toBeEnabled();
  await expect(selector).toHaveValue("auto");
  await expect.poll(period).toBe("day");
  await page.getByRole("checkbox", { name: "Efeitos de risco" }).uncheck();
  for (const mode of ["twilight", "day", "night"]) {
    await selector.selectOption(mode);
    await expect.poll(period).toBe(mode);
  }
  await page.clock.setFixedTime(new Date("2026-10-18T17:00:00-03:00"));
  await page.clock.fastForward(60_000);
  await expect.poll(period).toBe("night");
  await selector.selectOption("auto");
  await expect.poll(period).toBe("twilight");
  await selector.selectOption("night");
  await life.uncheck();
  await expect(selector).toBeDisabled();
  await expect(selector).toHaveValue("night");
  await expect.poll(period).toBe("day");
  await life.check();
  await expect(selector).toBeEnabled();
  await expect.poll(period).toBe("night");
  await page.locator("#city-map").screenshot({
    path: "test-results/city-lighting-selector-desktop.png",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await selector.scrollIntoViewIfNeeded();
  await selector.selectOption("twilight");
  await expect.poll(period).toBe("twilight");
  await expect(selector).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator("#city-map").screenshot({
    path: "test-results/city-lighting-selector-mobile.png",
  });
  expect(errors).toEqual([]);
});

test("a iluminação segue o relógio local, atualiza em repouso e depende de Cidade viva", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.clock.install({ time: new Date("2026-10-18T12:00:00-03:00") });
  await page.route("**/lighting-fixture", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><html><body></body></html>",
    }),
  );
  await page.goto("/lighting-fixture", { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    const { City } = await import("/src/city.js");
    const { demoCompanies, layoutCity } = await import("/src/model.js");
    const container = document.createElement("div");
    container.id = "lighting-city";
    Object.assign(container.style, {
      position: "fixed",
      inset: "0",
      zIndex: "1000",
    });
    document.body.append(container);
    const city = new City(container);
    const companies = demoCompanies(12);
    companies[0].status = "critical";
    companies[1].status = "warning";
    const layout = layoutCity(companies);
    city.setCompanies(layout.companies, layout);
    city.setActivity({ effects: false });
    city.view("iso", true);
    window.lightingCity = city;
  });
  const state = () =>
    page.evaluate(() => {
      const city = window.lightingCity;
      return {
        period: city.lightingPeriod,
        emissive: city.windows.material.emissiveIntensity,
        background: city.scene.background.getHexString(),
        sleeping: city.animationId === null,
        clockStopped: city.lightingTimer === null,
        effects: city.effects,
      };
    });
  await expect.poll(state).toMatchObject({ period: "day", emissive: 0 });
  await expect.poll(state).toMatchObject({ sleeping: true });
  await page.locator("#lighting-city").screenshot({
    path: "test-results/city-lighting-day.png",
  });
  // Even with reduced motion and risk effects disabled, lighting fades via RAF.
  await page.clock.pauseAt(new Date("2026-10-18T12:01:00-03:00"));
  await page.evaluate(() => window.lightingCity.setLightingMode("night"));
  expect(await state()).toMatchObject({
    period: "night",
    emissive: 0,
    background: "e9ede4",
  });
  await page.clock.runFor(900);
  const halfway = await state();
  expect(halfway.emissive).toBeGreaterThan(0);
  expect(halfway.emissive).toBeLessThan(1.15);
  expect(halfway.background).not.toBe("e9ede4");
  await page.clock.runFor(1000);
  expect(await state()).toMatchObject({ emissive: 1.15, sleeping: true });
  await page.evaluate(() => window.lightingCity.setLightingMode("auto"));
  await page.clock.runFor(1900);
  expect(await state()).toMatchObject({
    period: "day",
    emissive: 0,
    sleeping: true,
  });
  await page.clock.resume();
  for (const [time, period] of [
    ["17:00", "twilight"],
    ["19:00", "night"],
    ["06:00", "twilight"],
    ["08:00", "day"],
  ]) {
    await page.clock.setFixedTime(new Date(`2026-10-18T${time}:00-03:00`));
    // A sleeping renderer must still notice the new period, without input.
    await page.clock.fastForward(60_000);
    await page.clock.fastForward(1900);
    await expect.poll(state).toMatchObject({
      period,
      emissive: period === "day" ? 0 : 1.15,
      effects: false,
      sleeping: true,
    });
    if (time === "17:00" || time === "19:00")
      await page.locator("#lighting-city").screenshot({
        path: `test-results/city-lighting-${period}.png`,
      });
  }
  await page.clock.setFixedTime(new Date("2026-10-18T22:00:00-03:00"));
  await page.evaluate(() => window.lightingCity.setActivity({ life: false }));
  await expect.poll(state).toMatchObject({
    period: "day",
    emissive: 0,
    background: "e9ede4",
    clockStopped: true,
  });
  await page.evaluate(() => window.lightingCity.setActivity({ life: true }));
  await expect.poll(state).toMatchObject({
    period: "night",
    emissive: 1.15,
    clockStopped: false,
  });
  const riskColors = await page.evaluate(async () => {
    const THREE = await import("/node_modules/three/build/three.module.js");
    const { advanceLighting } = await import(
      "/src/charts/city/three/lighting.js"
    );
    const city = window.lightingCity;
    city.setActivity({ effects: true });
    const critical = city.companies.find(
      (company) => company.status === "critical",
    );
    const pixelAt = (point) => {
      point.project(city.camera);
      const canvas = city.renderer.domElement;
      const pixel = new Uint8Array(4);
      const gl = city.renderer.getContext();
      gl.readPixels(
        Math.floor(((point.x + 1) * canvas.width) / 2),
        Math.floor(((point.y + 1) * canvas.height) / 2),
        1,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixel,
      );
      return Array.from(pixel).slice(0, 3);
    };
    return ["day", "twilight", "night"].map((mode) => {
      city.setLightingMode(mode);
      advanceLighting(city, performance.now() + 1800);
      city.updateEffects(0);
      // Keep smoke away from the sampled roof; test the risk surface itself.
      for (const layer of city.plumes.layers) layer.mesh.visible = false;
      const matrix = new THREE.Matrix4();
      city.warning.getMatrixAt(0, matrix);
      // Enlarge the icon to sample solid yellow, away from filtered edges.
      const enlarged = matrix.clone().scale(new THREE.Vector3(5, 5, 1));
      city.warning.setMatrixAt(0, enlarged);
      city.warning.instanceMatrix.needsUpdate = true;
      city.renderer.render(city.scene, city.camera);
      const colors = {
        red: pixelAt(
          new THREE.Vector3(critical.x, critical.roofTop, critical.z),
        ),
        yellow: pixelAt(
          new THREE.Vector3(-0.1875, -0.125, 0).applyMatrix4(enlarged),
        ),
      };
      city.warning.setMatrixAt(0, matrix);
      city.warning.instanceMatrix.needsUpdate = true;
      return colors;
    });
  });
  expect(riskColors[0].red).toEqual([255, 37, 37]);
  // Texture filtering can round a channel by one byte; periods must still match.
  for (const [channel, expected] of [255, 214, 0].entries())
    expect(
      Math.abs(riskColors[0].yellow[channel] - expected),
    ).toBeLessThanOrEqual(1);
  expect(riskColors[1]).toEqual(riskColors[0]);
  expect(riskColors[2]).toEqual(riskColors[0]);
  await page.evaluate(() => window.lightingCity.dispose());
  await expect(page.locator("#lighting-city canvas")).toHaveCount(0);
  expect(errors).toEqual([]);
});
