import { test, expect } from "@playwright/test";

test("a extensão funciona no host TanStack sem Atlas, com eventos, tooltip e duas montagens", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#viewport canvas")).toHaveCount(1);
  await page.evaluate(async () => {
    const { defineCityChart, createCityRenderer } = await import(
      "/src/charts/city/index.js"
    );
    const { mountChartRenderer } = await import(
      "/node_modules/@tanstack/charts/dist/renderer.js"
    );
    const { tooltip } = await import(
      "/node_modules/@tanstack/charts/dist/tooltip.js"
    );
    const data = Object.freeze([
      Object.freeze({
        id: "one",
        name: "Empresa do consumidor",
        users: 1200,
        mask: 1,
        status: "healthy",
      }),
    ]);
    const definition = defineCityChart(data, { tooltip });
    const cities = [];
    const renderer = createCityRenderer({
      life: false,
      effects: false,
      onMount: (city) => cities.push(city),
    });
    const mounts = [0, 1].map((index) => {
      const container = document.createElement("div");
      container.id = `extension-${index}`;
      Object.assign(container.style, {
        position: "fixed",
        left: `${index * 620}px`,
        top: "0",
        width: "600px",
        height: "400px",
        zIndex: "1000",
        background: "white",
      });
      document.body.append(container);
      const selections = [];
      const focuses = [];
      const options = {
        definition,
        renderer,
        ariaLabel: `Health score ${index}`,
        onSelect: (point) => selections.push(point),
        onFocusChange: (point) => focuses.push(point),
      };
      const host = mountChartRenderer(container, options);
      return {
        container,
        host,
        options,
        selections,
        focuses,
        canvas: container.querySelector("canvas"),
      };
    });
    window.cityExtension = { data, definition, cities, mounts };
  });
  const target = await page.evaluate(() => {
    const city = window.cityExtension.cities[0];
    const company = city.companies[0];
    const projected = city.project(
      company.x,
      company.height / 2 + 0.13,
      company.z,
    );
    const bounds = city.renderer.domElement.getBoundingClientRect();
    return {
      x: bounds.x + ((projected.x + 1) * bounds.width) / 2,
      y: bounds.y + ((1 - projected.y) * bounds.height) / 2,
    };
  });
  await page.mouse.move(target.x, target.y);
  await expect
    .poll(() =>
      page.evaluate(
        () => window.cityExtension.mounts[0].focuses.at(-1)?.datum.name,
      ),
    )
    .toBe("Empresa do consumidor");
  await page.mouse.click(target.x, target.y);
  expect(
    await page.evaluate(() => {
      const { data, mounts } = window.cityExtension;
      return {
        count: mounts[0].selections.length,
        sameDatum: mounts[0].selections[0]?.datum === data[0],
        otherCount: mounts[1].selections.length,
        untouched: data[0].height === undefined,
      };
    }),
  ).toEqual({ count: 1, sameDatum: true, otherCount: 0, untouched: true });
  await expect(page.locator("#extension-0 .ts-chart-tooltip")).toBeVisible();
  await page.mouse.move(target.x, target.y);
  await page.mouse.down();
  await page.mouse.move(target.x + 50, target.y + 15, { steps: 5 });
  await page.mouse.up();
  expect(
    await page.evaluate(() => window.cityExtension.mounts[0].selections.length),
  ).toBe(1);
  const second = page.locator("#extension-1 [data-city-surface]");
  await second.focus();
  await second.press("Enter");
  expect(
    await page.evaluate(
      () =>
        window.cityExtension.mounts[1].selections[0]?.datum ===
        window.cityExtension.data[0],
    ),
  ).toBe(true);
  await page.evaluate(async () => {
    const { defineCityChart } = await import("/src/charts/city/index.js");
    const { mounts } = window.cityExtension;
    window.cityExtension.updated = Object.freeze([
      { ...window.cityExtension.data[0], users: 2400, status: "warning" },
    ]);
    mounts[0].options = {
      ...mounts[0].options,
      definition: defineCityChart(window.cityExtension.updated, {
        color: { domain: [1], range: ["#112233"] },
      }),
    };
    mounts[0].host.update(mounts[0].options);
  });
  expect(
    await page.evaluate(() => {
      const { mounts } = window.cityExtension;
      return mounts[0].canvas === mounts[0].container.querySelector("canvas");
    }),
  ).toBe(true);
  expect(
    await page.evaluate(() => {
      const { mounts, updated, data } = window.cityExtension;
      return {
        firstDatum: mounts[0].host.getScene().points[0].datum === updated[0],
        secondDatum: mounts[1].host.getScene().points[0].datum === data[0],
        color: mounts[0].host.getScene().points[0].color,
      };
    }),
  ).toEqual({ firstDatum: true, secondDatum: true, color: "#112233" });
  await page.screenshot({ path: "test-results/city-extension.png" });
  await page.evaluate(() =>
    window.cityExtension.mounts.forEach(({ host }) => host.destroy()),
  );
  await expect(page.locator("[id^=extension-] canvas")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("layout compartilhado, atualizações incrementais e repouso preservam o gráfico", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#viewport canvas")).toHaveCount(1);
  const initial = await page.evaluate(async () => {
    const { defineCityChart, createCityRenderer } = await import(
      "/src/charts/city/index.js"
    );
    const { layoutCity } = await import("/src/model.js");
    const { mountChartRenderer } = await import(
      "/node_modules/@tanstack/charts/dist/renderer.js"
    );
    const data = Object.freeze([
      Object.freeze({
        id: "one",
        name: "Empresa",
        users: 42,
        mask: 1,
        status: "critical",
      }),
    ]);
    const layout = layoutCity(data);
    layout.companies[0].x += 0.4;
    Object.freeze(layout.companies[0]);
    Object.freeze(layout.companies);
    Object.freeze(layout);
    const container = document.createElement("div");
    Object.assign(container.style, {
      position: "fixed",
      inset: "0",
      zIndex: "1000",
    });
    document.body.append(container);
    let city;
    let projections = 0;
    const renderer = createCityRenderer({
      life: false,
      effects: false,
      onMount: (value) => {
        city = value;
      },
      projection: () => projections++,
    });
    let options = {
      renderer,
      definition: defineCityChart(data, { layout }),
      ariaLabel: "Teste incremental",
    };
    const host = mountChartRenderer(container, options);
    let frames = 0,
      picks = 0;
    const render = city.renderer.render.bind(city.renderer);
    city.renderer.render = (...args) => {
      frames++;
      return render(...args);
    };
    const pick = city.pick.bind(city);
    city.pick = (...args) => {
      picks++;
      return pick(...args);
    };
    window.incrementalCity = {
      city,
      host,
      container,
      data,
      layout,
      get counts() {
        return {
          frames,
          picks,
          projections,
          cars: city.cars.instanceMatrix.version,
          glow: city.windowGlow.instanceColor?.version,
        };
      },
      update(rows, color = "#112233") {
        options = {
          ...options,
          definition: defineCityChart(rows, {
            layout: {
              ...layout,
              companies: rows.map((datum, i) => ({
                ...layout.companies[i],
                ...datum,
              })),
            },
            color: { domain: [1], range: [color] },
          }),
        };
        host.update(options);
      },
      body: city.body,
      terrain: city.terrain.children[0],
      traffic: city.traffic,
      simulation: city.simulation,
    };
    return {
      semanticX: host.getScene().points[0].xValue,
      renderedX: city.companies[0].x,
      datumPreserved: host.getScene().points[0].datum === data[0],
      sourceUntouched: layout.companies[0].height === undefined,
    };
  });
  expect(initial.renderedX).toBe(initial.semanticX);
  expect(initial.datumPreserved && initial.sourceUntouched).toBe(true);
  await expect
    .poll(() =>
      page.evaluate(() => window.incrementalCity.city.animationId === null),
    )
    .toBe(true);
  // Observation window verifies that a sleeping surface does no GPU/DOM work.
  const idle = await page.evaluate(async () => {
    const state = window.incrementalCity;
    const before = state.counts;
    await new Promise((resolve) => setTimeout(resolve, 250));
    return { before, after: state.counts };
  });
  expect(idle.after).toEqual(idle.before);
  const target = await page.evaluate(() => {
    const { city } = window.incrementalCity;
    const c = city.companies[0],
      p = city.project(c.x, c.height / 2 + 0.13, c.z);
    const r = city.renderer.domElement.getBoundingClientRect();
    return {
      x: r.x + ((p.x + 1) * r.width) / 2,
      y: r.y + ((1 - p.y) * r.height) / 2,
    };
  });
  const beforePick = await page.evaluate(
    () => window.incrementalCity.counts.picks,
  );
  await page.mouse.move(target.x, target.y);
  expect(await page.evaluate(() => window.incrementalCity.counts.picks)).toBe(
    beforePick + 1,
  );
  const palette = await page.evaluate(() => {
    const s = window.incrementalCity,
      c = s.city;
    c.zoom(2);
    c.select(c.companies[0]);
    s.update(s.data);
    return {
      sameBody: s.body === c.body,
      sameTerrain: s.terrain === c.terrain.children[0],
      sameTraffic: s.traffic === c.traffic,
      zoom: c.camera.zoom,
      selected: c.selection.visible,
    };
  });
  expect(palette).toEqual({
    sameBody: true,
    sameTerrain: true,
    sameTraffic: true,
    zoom: 2,
    selected: true,
  });
  const health = await page.evaluate(() => {
    const s = window.incrementalCity,
      c = s.city;
    s.update([{ ...s.data[0], users: 2400, status: "warning" }]);
    return {
      newBody: s.body !== c.body,
      sameTerrain: s.terrain === c.terrain.children[0],
      sameSimulation: s.simulation === c.simulation,
      zoom: c.camera.zoom,
      selected: c.selection.visible,
      height: c.companies[0].height,
      warning: c.warningSources.length,
    };
  });
  expect(health).toMatchObject({
    newBody: true,
    sameTerrain: true,
    sameSimulation: true,
    zoom: 2,
    selected: true,
    warning: 1,
  });
  expect(health.height).toBeGreaterThan(0.95);
  await page.evaluate(() =>
    window.incrementalCity.city.setActivity({ life: true, effects: true }),
  );
  await expect
    .poll(() => page.evaluate(() => window.incrementalCity.counts.cars))
    .toBeGreaterThan(idle.after.cars);
  await page.evaluate(() =>
    window.incrementalCity.city.setActivity({ life: false, effects: false }),
  );
  await expect
    .poll(() =>
      page.evaluate(() => window.incrementalCity.city.animationId === null),
    )
    .toBe(true);
  const resumed = await page.evaluate(async () => {
    const s = window.incrementalCity,
      before = s.counts;
    await new Promise((resolve) => setTimeout(resolve, 250));
    return { before, after: s.counts };
  });
  expect(resumed.after).toEqual(resumed.before);
  // Camera and selection must wake a sleeping renderer, then settle again.
  await page.evaluate(() => window.incrementalCity.city.view("top"));
  await expect
    .poll(() => page.evaluate(() => window.incrementalCity.city.fly === null))
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(() => window.incrementalCity.city.animationId === null),
    )
    .toBe(true);
  expect(
    await page.evaluate(() => window.incrementalCity.counts.frames),
  ).toBeGreaterThan(resumed.after.frames);
  await page.evaluate(() => {
    const s = window.incrementalCity;
    s.host.destroy();
    s.container.remove();
  });
  expect(errors).toEqual([]);
});
