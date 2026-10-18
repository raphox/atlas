import test from "node:test";
import assert from "node:assert/strict";
import { defineChart } from "@tanstack/charts";
import { createChartRuntime } from "@tanstack/charts/runtime";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import {
  cityMark,
  defineCityChart,
  createCityRenderer,
  cityFocus,
} from "../src/charts/city/index.js";
import { bindCityPoints } from "../src/charts/city/interaction.js";

import { readCityLayout } from "../src/charts/city/layout.js";
import { layoutCity } from "../src/model.js";

const data = Object.freeze([
  Object.freeze({
    id: "one",
    name: "Empresa saudável",
    users: 42,
    mask: 1,
    status: "healthy",
  }),
  Object.freeze({
    id: "two",
    name: "Empresa em risco",
    users: 2400,
    mask: 3,
    status: "critical",
  }),
]);
const sceneFor = (definition, size = { width: 800, height: 450 }) => {
  const runtime = createChartRuntime();
  return runtime.render(definition, size);
};

test("cityMark compõe uma definição TanStack e preserva datum, índices, chaves e cores", () => {
  const definition = defineChart({
    marks: [cityMark(data)],
    scales: { x: { scale: scaleLinear }, y: { scale: scaleLinear } },
    color: { domain: [1, 3], range: ["#123456", "#abcdef"] },
    guides: false,
  });
  const scene = sceneFor(definition);
  assert.equal(scene.points.length, data.length);
  scene.points.forEach((point, i) => {
    assert.equal(point.datum, data[i]);
    assert.equal(point.datumIndex, i);
    assert.equal(point.key, `companies:${data[i].id}`);
    assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
  });
  assert.deepEqual(
    scene.points.map((p) => p.color),
    ["#123456", "#abcdef"],
  );
  assert.equal(data[0].x, undefined);
  assert.equal(data[0].height, undefined);
});

test("a definição é determinística, responsiva e aceita uma base vazia", () => {
  const definition = defineCityChart(data);
  const first = sceneFor(definition);
  const wide = sceneFor(definition, { width: 1200, height: 450 });
  assert.deepEqual(
    first.points.map((p) => p.key),
    wide.points.map((p) => p.key),
  );
  assert.deepEqual(
    first.points.map((p) => [p.xValue, p.yValue]),
    wide.points.map((p) => [p.xValue, p.yValue]),
  );
  assert.deepEqual(
    first.points.map((p) => [p.x, p.y]),
    sceneFor(definition).points.map((p) => [p.x, p.y]),
  );
  assert.equal(sceneFor(defineCityChart([])).points.length, 0);
});

test("o foco usa a superfície de cada montagem sem misturar duas cidades", () => {
  const one = sceneFor(defineCityChart(data)).points;
  const two = sceneFor(defineCityChart(data)).points;
  bindCityPoints(one, () => [one[0]]);
  bindCityPoints(two, () => [two[1]]);
  assert.equal(cityFocus.resolve(one, { x: 0, y: 0 })[0], one[0]);
  assert.equal(cityFocus.resolve(two, { x: 0, y: 0 })[0], two[1]);
  assert.deepEqual(cityFocus.resolve([], { x: 0, y: 0 }), []);
});

test("o renderer gera shell SSR sem WebGL nem DOM e escapa o nome acessível", () => {
  const renderer = createCityRenderer();
  const markup = renderer.prerender(sceneFor(defineCityChart(data)), {
    ariaLabel: 'Saúde <empresas> "A" & B',
  });
  assert.match(markup, /data-city-surface/);
  assert.match(markup, /Saúde &lt;empresas&gt; &quot;A&quot; &amp; B/);
  assert.doesNotMatch(markup, /<canvas/);
});

test("a marca rejeita entradas inválidas antes de tentar distribuir os lotes", () => {
  for (const invalid of [
    null,
    [{}],
    [data[0], data[0]],
    [{ ...data[0], users: NaN }],
    [{ ...data[0], mask: 0 }],
    [{ ...data[0], status: "unknown" }],
  ]) {
    assert.throws(() => cityMark(invalid), /cityMark:/);
  }
});

test("o layout acompanha a cena TanStack inclusive vazia, sem recalcular posições", () => {
  for (const rows of [data, []]) {
    const layout = layoutCity(rows);
    if (rows.length) layout.companies[0].x += 0.4;
    const scene = sceneFor(defineCityChart(rows, { layout }));
    assert.equal(readCityLayout(scene.nodes), layout);
    if (rows.length)
      assert.equal(scene.points[0].xValue, layout.companies[0].x);
  }
});
