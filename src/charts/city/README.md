# City chart: company health as a 3D city

A local extension for TanStack Charts **1.1.0**. A company is a spatial mark: its category combination determines its district and color, metric values determine building size, and its health classification determines risk indicators. Current records provide `status`, not a numeric score; the chart neither invents nor calculates such a score.

Consumers use TanStack's `defineChart`, `ChartMark`, `ChartRenderer`, `ChartPoint`, focus, tooltip, and callbacks. Three.js implements the 3D surface. The Atlas application, its filters, and its interface components are not required.

## Using React

```jsx
import { useMemo } from "react";
import { Chart } from "@tanstack/charts/react/core";
import { tooltip } from "@tanstack/charts/tooltip";
import { defineCityChart, createCityRenderer } from "./src/charts/city";

const renderer = createCityRenderer(); // Stable identity across renders.

export function CompanyHealth({ companies, onCompanySelect }) {
  const definition = useMemo(
    () => defineCityChart(companies, {
      tooltip: {
        use: tooltip,
        format: ({ datum }) => `${datum.name} · ${datum.metric.label}: ${datum.metric.value} · ${datum.status}`,
      },
    }),
    [companies],
  );

  return (
    <Chart
      definition={definition}
      renderer={renderer}
      height={480}
      ariaLabel="Company health"
      onSelect={(point) => onCompanySelect(point?.datum ?? null)}
      onFocusChange={(point) => console.log(point?.datum)}
    />
  );
}
```

`createCityRenderer()` is a `ChartRenderer` factory, not a new host. Each mount has its own camera, selection, WebGL context, and resources, even when sharing a definition and renderer. For JavaScript without React, pass the same `definition` and `renderer` to `mountChartRenderer` from `@tanstack/charts/renderer` and call `host.destroy()` when removing the chart.

## Composing the definition

`defineCityChart` is a preset. Consumers that already create definitions can use the mark directly:

```js
import { defineChart } from "@tanstack/charts";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import { cityMark, cityFocus } from "./src/charts/city";

const definition = defineChart({
  marks: [cityMark(companies, { id: "company-health" })],
  scales: {
    x: { scale: scaleLinear, axis: false },
    y: { scale: scaleLinear, axis: false },
  },
  color: {
    domain: [1, 2, 4, 3, 5, 6, 7],
    range: ["#4b91ef", "#e281af", "#ecc456", "#ab7cdd", "#47b8b2", "#e99b55", "#7777ca"],
  },
  guides: false,
  margin: 0,
  focus: cityFocus,
  tooltip,
});
```

The color resolved by TanStack reaches the renderer. `defineCityChart(data, options)` also accepts the usual definition options, such as `color`, `tooltip`, and `keyboard`. The internal `layout` option avoids recalculating placement when the application already has the result of `layoutCity`.

`cityFocus` resolves the building hit by raycasting instead of finding the nearest point in an outdated projection. `getPresentationPoints` and `subscribePresentationPoints` update `ChartPoint` positions when the camera changes. This lets TanStack's own focus and tooltips follow zoom, rotation, and resizing. Dragging the camera does not trigger selection. Arrow keys, Home/End, and Enter use the TanStack host's keyboard handling.

## Data and semantics

```js
const companies = [
  { id: "aurora", name: "Aurora", metric: { label: "Revenue", value: 2200.75 }, categories: [{ label: "Retail", value: "retail" }], status: "critical" },
  { id: "cedar", name: "Cedar", metric: { label: "Revenue", value: 350 }, categories: [{ label: "Services", value: "services" }], status: "warning" },
];
```

| Field | Contract | Representation |
| --- | --- | --- |
| `id` | unique, stable string or number | mark and selection key |
| `name` | nonempty string | company identification |
| `metric` | `{ label: string, value: number }`, finite value ≥ 0 | label in the interface; value determines size |
| `categories` | list of `{ label: string, value: string }` | district and color; up to three distinct values across the dataset |
| `status` | `healthy`, `warning`, or `critical` | normal operation, smoke/warning, or fire/flashing |

The generic contract can be passed directly to `defineCityChart`/`cityMark`. `placeCompanies` validates the data and calculates `mask` (bits 1, 2, and 4 assigned to category identifiers in text order). Combinations determine up to seven regions. The same `value` must retain the same `label` throughout the dataset. When calculated outside the mark, the layout must use the already normalized dataset, before pagination.

Existing integrations with `{ users, mask }` are still accepted by the mark. The Atlas importer also accepts `{ users, systems: ["A", "B"] }`, converting them to the generic fields. `metric.value` preserves decimals; `sizeForValue` retains the four existing size ranges (<90, <550, <1800, and ≥1800), regardless of the label. `sizeForUsers` remains as a compatibility alias.

The point preserves `datum === data[datumIndex]`. The mark does not mutate input rows, including frozen ones. `xValue` and `yValue` are the lots' spatial x/z coordinates. Mutable Three.js geometry receives separate copies. New data requires a new definition, as in other TanStack charts; keep data immutable and memoize definitions that capture props.

## Organization

| File | Responsibility |
| --- | --- |
| `index.js` | public entry point without React or Atlas components |
| `data.js` | JSDoc contract and data validation |
| `mark.js` | `createMark`: channels, identity, semantic geometry, and points |
| `definition.js` | preset for scales, color, focus, and layout |
| `layout.js` | internal layout transport within the scene, without mutating consumer data |
| `interaction.js` | point-to-surface association and 3D focus strategy |
| `renderer.js` | `ChartRenderer`/`ChartSurface`: mounting, projection, events, and disposal |
| `react.jsx` | Atlas visual integration over the official `Chart` |
| `use-city-chart.js` | Atlas bridge for camera, labels, visual tooltips, and page transitions |
| `three/primitives.js` | shared materials and instance batches |
| `three/terrain.js` | streets, sidewalks, markings, trees, and benches |
| `three/buildings.js` | buildings, windows, and risk emitters |
| `three/building-material.js` | risk red independent of lighting and exposure |
| `three/lighting.js` | lighting periods based on the local clock and window lighting |
| `three/weather.js` | particles, rain contrast, and lightning flashes |
| `three/snow-cover.js` | partial snow cover on the ground and rooftops |
| `three/traffic.js` | rendering cars, people, and traffic lights |
| `three/effects.js` | warnings, risk colors, and particle coordination |
| `../../city.js` | scene, camera, animation, and WebGL resources |

`src/components/city-map.jsx` consumes the extension, connecting the chart to Atlas data and controls. The React component accepts `showDistrictLabels` (default `false`) to display category and intersection labels; the corresponding Atlas checkbox controls this prop without rebuilding the scene. The renderer does not import `useAtlas`, pagination, shadcn, or React. Traffic simulation remains separate in `src/traffic.js`.

Critical flashing uses a fixed red (`#ff2525`), independent of lights and exposure. Outside the red phase, the building retains its category color under the current lighting. The exclamation icon also preserves its colors, without lighting or tone mapping. Both remain constant during lighting period transitions.

## Updates and rendering

The layout is calculated by the mark (or supplied by the application) and attached to a scene group through an internal symbol. The renderer reuses this result, including for empty cities, and copies only rows the Three.js engine needs to mutate. Each mount maintains its own camera, geometry, and interaction cache.

| Change | Required work |
| --- | --- |
| IDs, categories, positions, or street bounds | rebuild the city and frame the new layout |
| Metric or health, with the same lots | rebuild buildings and effects; preserve terrain, traffic, camera, and existing selection |
| Palette | update instance colors while preserving shading and risk phase |
| Name | update data used by the interface |
| Container size | adjust the camera and canvas without rebuilding geometry |

With City life, effects, and auto-rotation disabled, the loop sleeps after the camera settles. Camera, selection, data, controls, and resizing request a new frame; animations keep the loop active only while needed. When integrating directly with the engine, use `setActivity({ life, effects })` and `select(company)`/`select(null)` to invalidate the scene as well.

With City life enabled, lighting follows the browser's local time: sunrise from 6:00 to 8:00 a.m., day from 8:00 a.m. to 5:00 p.m., sunset from 5:00 to 7:00 p.m., and night from 7:00 p.m. to 6:00 a.m. Sunrise and sunset share the same warm lighting level. Windows are lit during those periods and at night, including when risk effects are disabled; fire and warnings retain their signals. The time is checked every minute and when returning to the tab, including with reduced motion. Disabling City life restores the original daylight and stops periodic checks.

The **Lighting** selector allows manual testing of **Sunrise/sunset**, **Day**, and **Night**. **Automatic** is the default and resumes local time when selected. Lighting and window changes are gradual, taking 1.8 seconds, including when toggling City life. Changing the option during a transition starts from the current lighting, without jumps. The first render already uses the correct period. The selector is disabled when City life is off and preserves the choice for when it is re-enabled. `CityChart` accepts the `lightingMode` prop (`auto`, `twilight`, `day`, `night`); direct engine integrations can use `setLightingMode(mode)`. Periodic clock checks are suspended during a manual selection. The color transition works with reduced motion and keeps the loop active only until it finishes, even without traffic or animated effects.

TanStack projections and Atlas labels follow a camera revision. Labels also update when their data or filter changes. Hover and the focus strategy share the same raycasting result for the same coordinate/camera; the cache is invalidated when scene data changes. Company lookups use an ID index.

Browser tests verify sleeping without new frames or uploads, animation and camera resumption, one query per pointer move, custom layouts, and geometry/zoom preservation during color updates. There is no promise of a fixed FPS improvement: it depends on the device and the number of active effects.

## Optional weather

`CityChart` accepts `weather="none" | "rain" | "snow"` (default `none`); direct integrations use `city.setWeather(type)`. The scene does not query APIs or request location: the Atlas application does that in `src/hooks/use-weather.js` and `src/weather.js`, following **City life**. The extension remains provider-independent.

Particles only appear and keep the loop active with `life=true` and without reduced motion. The layer reuses two geometries and materials across conditions and pages, adjusts its bounds to the layout, and releases its resources with the scene. Weather effects do not alter clock-based lighting or depend on `effects`, which controls only risk. Attribution, endpoint configuration, and commercial responsibilities are documented in the main README.

## Simplified geometry

| Element | Current geometry |
| --- | --- |
| Building/house | one block; its top face is already the roof |
| Window | one two-triangle plane, without a frame |
| Street/sidewalk | continuous flat strips instead of blocks per lot |
| Crosswalks and stop lines | planes; crosswalks use three wide stripes |
| Terrain | one green lawn plane; beige building lots and gray sidewalks, all planar |
| Trees | zero to three per empty lot; eight-sided trunk and canopy, with varied positions and sizes |
| Benches | one low block on about 9% of empty lots; share the trunk instance batch |
| Car | body and cabin; no wheels |
| Pedestrian | body and eight-sided head; no legs |
| Traffic light | pole, housings, and simple lights; retains vehicle and pedestrian phases |
| Fire/smoke | instanced eight-sided volumes |

Tree and bench placement uses coordinate-based seeds: it stays stable when rebuilding the same city, keeps canopies within the lot, and reserves space between trees and benches.

Extra per-building shadow planes and duplicate roofs in the selection outline have also been removed. Color still represents categories; health does not change size or district membership.

Deterministic measurement of base geometry, without fire/smoke or camera culling:

| Companies | Previous triangles | Current triangles | Reduction | Previous → current draw batches |
| --- | ---: | ---: | ---: | ---: |
| 100 | 96,830 | 26,022 | 73.1% | 26 → 17 |
| 1,400 | 804,354 | 198,042 | 75.4% | 26 → 17 |

Reproduce with `node scripts/benchmark-city.mjs`. These are geometry counts, not an FPS promise. Actual per-frame counts also depend on effects, selection, visibility, and camera.

## Verification and limitations

- `npm test`: mark contracts, immutable data, SSR, surface isolation, geometry budget, simulation, emitters, and resource release.
- `npm run test:e2e`: direct use through the TanStack host, events/keyboard/tooltips, two mounts, and Atlas flows on desktop and mobile.
- `npm run build` and `npm run format:check`: production build and formatting.

The surface is dedicated to a city: it does not draw axes, grids, or arbitrary Cartesian marks over WebGL. Use one `cityMark` per surface. SVG and Canvas do not become 3D renderers; the mark's semantic geometry allows a flat representation when drawn with SVG, but the city requires `createCityRenderer`. SSR produces a deterministic accessible shell; WebGL starts only when mounted in the browser. The npm package is generated in `packages/city-chart`; see its README for distribution, CSS/Tailwind themes, and use of the complete component.

API references: [custom marks and renderers](https://tanstack.com/charts/latest/docs/guides/custom-marks-and-renderers), [React renderer entry points](https://tanstack.com/charts/latest/docs/framework/react/reference/chart), [version 1.1.0 source](https://github.com/TanStack/charts/tree/v1.1.0).

### Optional selectors in the React component

`CityChart` and `CityMap` accept `showEnvironmentControls` (equivalent to `showEnvironmentControls={true}`) to display two independent lighting and weather dropdowns. The prop defaults to `false` on both components, including the reusable package's `CityMap`. The Atlas demo omits it in `src/App.jsx`, keeping these selectors hidden.

```jsx
<CityChart
  definition={definition}
  life={true}
  lightingMode="auto"
  weather={weather.type}
  showEnvironmentControls
/>
```

Lighting offers `auto`, `day`, `twilight`, and `night`; weather offers `auto`, `none`, `rain`, and `snow`. All combinations are supported. Manual choices are local to each instance and do not modify incoming props. **Automatic** resumes following the consumer's `lightingMode` or `weather`. With `showEnvironmentControls={false}`, prop values apply even if there was a manual choice. Showing the controls again restores previous choices.

Dropdowns are disabled during loading/errors and with `life={false}`; turning off City life hides particles and restores daylight while preserving selections. Reduced motion continues to hide particles, including in simulations.

By default, selectors are positioned at the bottom of the chart. When using `children` as a function, the consumer must position the `environmentControls` element returned alongside `ready`, `error`, and `weatherMode` (`auto`, `none`, `rain`, or `snow`). Atlas places it within the existing controls and uses `weatherMode` to identify simulations:

```jsx
<CityChart definition={definition} showEnvironmentControls>
  {({ environmentControls }) => (
    <div className="absolute bottom-4 right-4 z-10 flex flex-wrap gap-2">
      {environmentControls}
    </div>
  )}
</CityChart>
```

### Weather appearance and animation

Snow uses 3px points with a white center and blue-gray edge to maintain contrast over both light ground and nighttime scenes, with irregular clusters and individual phase, speed, and sway for each flake. `SnowCover` draws soft patches using instances of a shared plane: partial coverage grows from 20% to its limit over 24 seconds of animation, preserving uncovered rooftop areas. When the layout changes, instances follow the new buildings and heights; geometry, material, and texture are reused. Coverage disappears outside snow mode.

Rain color interpolates between dark and light blue using the current background luminance, including during lighting transitions. Lightning uses an additional directional light, with a variable direction and a sequence of two or three flashes per event: immediate onset, a 20ms peak, rapid decay, and irregular dark pauses. Each flash lasts 80–140ms, with 60–220ms pauses; secondary flashes have 30–60% of the first flash's intensity. The sequence is randomized once per event, keeping animation independent of the frame rate. The first event waits 12–24 seconds; subsequent events wait 18–38 seconds between starts. The animation clock avoids triggering delayed flashes when returning from a suspended tab. Particles, coverage, and lightning follow City life and reduced motion; no effect changes base building colors or materials.
