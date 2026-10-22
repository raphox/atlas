import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createChartRuntime } from "@tanstack/charts/runtime";
import {
  defineCityChart,
  createCityRenderer,
} from "../packages/city-chart/dist/index.js";
import { CityMap } from "../packages/city-chart/dist/react.js";

const data = [
  {
    id: "one",
    name: "Aurora",
    metric: { label: "Receita", value: 2500 },
    categories: [{ label: "Varejo", value: "retail" }],
    status: "critical",
  },
];

test("compiled package preserves data and renders SSR without a DOM", () => {
  const definition = defineCityChart(data);
  const scene = createChartRuntime().render(definition, {
    width: 800,
    height: 450,
  });
  assert.equal(scene.points[0].datum, data[0]);
  assert.match(
    createCityRenderer().prerender(scene, { ariaLabel: "Cidade" }),
    /data-city-surface/,
  );
  const markup = renderToString(
    createElement(CityMap, {
      data,
      className: "custom-city",
      theme: "tailwind",
    }),
  );
  assert.match(markup, /atlas-city-theme-tailwind/);
  assert.match(markup, /custom-city/);
  assert.match(markup, /Camera controls/);
  assert.doesNotMatch(markup, /<canvas/);
  assert.doesNotMatch(
    markup,
    /class="atlas-city-(?:control|camera-button|map|search-input)[^"]*"[^>]*style=/,
  );
});

test("distribution includes entry points, types and two themes without application dependencies", async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL("../packages/city-chart/package.json", import.meta.url),
    ),
  );
  const dist = new URL("../packages/city-chart/dist/", import.meta.url);
  for (const entry of Object.values(manifest.exports)) {
    for (const path of typeof entry === "string"
      ? [entry]
      : Object.values(entry)) {
      await readFile(
        new URL(path, new URL("../packages/city-chart/", import.meta.url)),
      );
    }
  }
  const css = await readFile(new URL("styles.css", dist), "utf8");
  const tailwind = await readFile(new URL("tailwind.css", dist), "utf8");
  assert.match(css, /atlas-city-theme-default/);
  assert.match(css, /--atlas-city-accent/);
  assert.doesNotMatch(css, /tailwind|googleapis|@apply|@reference/);
  assert.match(tailwind, /atlas-city-theme-tailwind/);
  assert.match(tailwind, /@apply/);
  for (const name of (await readdir(dist)).filter((name) =>
    name.endsWith(".js"),
  )) {
    const code = await readFile(new URL(name, dist), "utf8");
    assert.doesNotMatch(code, /from\s*["']@\//);
    assert.doesNotMatch(
      code,
      /sonner|radix-ui|lucide-react|config\.json|empresas\.json|open-meteo|use-atlas/,
    );
  }
  const react = await readFile(new URL("react.js", dist), "utf8");
  assert.match(react, /^"use client";/);
});

test("portfolio options preserve defaults and validate shared height domains", () => {
  const baseline = renderToString(createElement(CityMap, { data }));
  assert.equal(
    renderToString(
      createElement(CityMap, {
        data,
        monitorData: data,
        metricDomain: [2500, 2500],
      }),
    ),
    baseline,
  );
  const outside = {
    ...data[0],
    id: "outside",
    name: "Outside current city",
    statusChangedAt: "2026-10-22T10:00:00Z",
  };
  const extended = renderToString(
    createElement(CityMap, {
      data: [],
      monitorData: [outside],
      metricDomain: [0, 3000],
    }),
  );
  assert.match(extended, /Outside current city/);
  assert.doesNotMatch(baseline, /Outside current city/);
  for (const metricDomain of [
    [-1, 10],
    [10, 0],
    [0, Infinity],
    [0],
    "invalid",
  ]) {
    assert.throws(
      () => renderToString(createElement(CityMap, { data, metricDomain })),
      /metricDomain/,
    );
  }
});
