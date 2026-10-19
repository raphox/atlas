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

test("pacote compilado preserva dados e gera SSR sem DOM", () => {
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
  assert.match(markup, /Controles da câmera/);
  assert.doesNotMatch(markup, /<canvas/);
  assert.doesNotMatch(
    markup,
    /class="atlas-city-(?:control|camera-button|map|search-input)[^"]*"[^>]*style=/,
  );
});

test("distribuição contém entradas, tipos e dois temas sem dependências da aplicação", async () => {
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
