# atlas-city-chart

A reusable 3D city: map, rain, snow, lighting, traffic, risk effects, search, selection, zoom, perspectives, and fullscreen mode. Receives data from the consuming project. It does not require the Atlas application, its own backend, or a Tailwind setup.

## Install the local package

From the repository root:

```sh
npm run pack:package
```

In the consuming project (React 18 or 19):

```sh
npm install /path/to/atlas-city-chart-0.1.0.tgz
```

`atlas-city-chart` is a provisional name. The package has not yet been published to the registry; choose the name/scope and distribution license before publishing. `UNLICENSED` does not grant a public license to the code.

## React and a plain CSS theme

```jsx
import { CityMap } from "atlas-city-chart/react";
import "atlas-city-chart/styles.css";
import "./my-city.css";

const companies = [
  {
    id: "aurora",
    name: "Aurora",
    metric: { label: "Revenue", value: 2400.5 },
    categories: [{ label: "Retail", value: "retail" }],
    status: "critical",
  },
];

export function Dashboard() {
  return (
    <CityMap
      className="my-city"
      theme="default"
      data={companies}
      weather="rain"
      lightingMode="auto"
      onSelect={(company) => console.log(company)}
    />
  );
}
```

`styles.css` contains the structure and default plain CSS theme. The theme is also exported separately as `atlas-city-chart/theme-default.css`. There is no global reset, external font, Atlas CSS, or Tailwind requirement. Theme classes use zero specificity (`:where`), so you can extend the theme without `!important` or relying on import order.

```css
/* my-city.css: extend the default theme for this instance only. */
.my-city {
  --atlas-city-height: 640px;
  --atlas-city-accent: #7c3aed;
  --atlas-city-on-accent: #fff;
  --atlas-city-card: #faf5ff;
  --atlas-city-text: #2e1065;
  --atlas-city-border: #ddd6fe;
  --atlas-city-radius: 12px;
  --atlas-city-font-family: "Inter", sans-serif;
  --atlas-city-control-padding: 10px 14px;
}

.my-city .atlas-city-camera-button {
  width: 40px;
  height: 40px;
}

.my-city .atlas-city-search-input {
  border-width: 2px;
}
```

Use `theme={null}` to supply all tokens through a custom class. Themes are independent across instances. The component uses `className` for sizing and customization; it has no `style` prop.

## Tailwind CSS 4 theme

In a project already configured with Tailwind CSS 4, import the styles into the CSS processed by Tailwind:

```css
@import "tailwindcss";
@import "atlas-city-chart/styles.css";
@import "atlas-city-chart/tailwind.css";

.my-city {
  --atlas-city-accent: theme("colors.violet.600");
  --atlas-city-height: 40rem;
}

.my-city .atlas-city-camera-button {
  @apply rounded-xl shadow-md;
}
```

```jsx
<CityMap data={companies} theme="tailwind" className="my-city" />
```

The Tailwind theme uses `@reference`, `theme()`, and `@apply`; it must be processed by the consumer's Tailwind 4 setup. The plain CSS theme works directly in any bundler that imports CSS. Both themes share the same structure and class names.

## Interface language

Text is centralized in `src/charts/city/i18n.js`, with `pt-BR` and `en-US` translations. The map uses the browser's primary language (`navigator.language`), matched case-insensitively. Any unsupported language, including `pt-PT` or `pt`, falls back to `en-US`. Changes reported by the `languagechange` event update the text without recreating the city.

Controls, search, details, health states, tooltips, messages, and accessible labels follow the detected language. Numbers also use that locale. Company names, categories, metric labels, and custom `title` and `ariaLabel` props are preserved. On the server, the shell uses English; after hydration, it adopts the browser's language.

## Interface classes

| Part | Public classes |
| --- | --- |
| Container and chart | `.atlas-city-map`, `.atlas-city-chart`, `.atlas-city-viewport`, `.atlas-city-host` |
| Header | `.atlas-city-top-controls`, `.atlas-city-header`, `.atlas-city-title` |
| Search | `.atlas-city-search`, `.atlas-city-search-input`, `.atlas-city-results`, `.atlas-city-search-result`, `.atlas-city-search-empty` |
| Perspective | `.atlas-city-perspectives`, `.atlas-city-perspective-button` (`aria-pressed` state) |
| Camera | `.atlas-city-zoom`, `.atlas-city-camera-button`, modifiers `--zoom-in`, `--zoom-out`, `--reset`, `--fullscreen`, `--visibility` |
| Environment | `.atlas-city-scene-controls`, `.atlas-city-environment-control--lighting`, `.atlas-city-environment-control--weather`, `.atlas-city-select` |
| Options | `.atlas-city-control`, `.atlas-city-control-label`, `.atlas-city-toggle`, modifiers `--life`, `--effects`, `--auto-rotate`, `--labels` |
| Labels | `.atlas-city-labels`, `.atlas-city-label`, `.atlas-city-label-dot`, `.atlas-city-label-name`, `.atlas-city-label-count` |
| Tooltip | `.atlas-city-tooltip`, `.atlas-city-tooltip-name`, `.atlas-city-tooltip-summary`, `.atlas-city-tooltip-arrow` |
| Details | `.atlas-city-details`, `.atlas-city-details-title`, `.atlas-city-details-categories`, `.atlas-city-details-metric`, `.atlas-city-details-status`, `.atlas-city-details-close`, `.atlas-city-details-focus` |
| Monitoring | `.atlas-city-layout`, `.atlas-city-monitor-layout`, `.atlas-company-monitor`, `.atlas-monitor-clock`, `.atlas-monitor-metrics`, `.atlas-monitor-alerts` |
| Compass and footer | `.atlas-city-compass`, `.atlas-map-compass-arrow`, `.atlas-city-footer` |
| Status | `.atlas-city-loading`, `.atlas-city-message` |

Inputs, tabs, controls, labels, tooltips, and details use translucent gray surfaces (68% opacity), with a 10px blur and full-opacity text. Selected states use a darkened, translucent accent color. Customize them through `--atlas-city-surface-tint`, `--atlas-city-surface-background`, `--atlas-city-surface-hover-background`, `--atlas-city-surface-blur`, `--atlas-city-selected-background`, and `--atlas-city-selected-hover-background` in either the plain CSS or Tailwind theme.

Additional tokens: `--atlas-city-background`, `--atlas-city-muted`, `--atlas-city-font-size`, `--atlas-city-panel-radius`, `--atlas-city-shadow`, `--atlas-city-tooltip-background`, `--atlas-city-tooltip-text`, `--atlas-city-overlay-text`, `--atlas-city-accent-hover`, `--atlas-city-overlay-gap` (12px by default), and `--atlas-city-region-1` through `--atlas-city-region-7`.

Interface components do not generate `style` attributes. Dynamic label and tooltip positions are updated in per-instance stylesheet rules. The TanStack host and WebGL canvas manage their own internal dimensions. Category CSS tokens customize labels; the geometry palette is configured in the chart definition (`defineCityChart`), since 3D content is rendered on the canvas.

## Props and data

`data` is an immutable list. Each company has a unique `id` (string or number), `name`, `metric: { label, value }`, `categories: [{ label, value }]`, and `status: "healthy" | "warning" | "critical"`. The metric must be finite and nonnegative. Use one to three categories per company, with up to three distinct values across the dataset. A category must keep the same label. A new list updates the chart; `[]` displays an empty city.

| Prop | Default | Purpose |
| --- | --- | --- |
| `theme` | `"default"` | `"default"`, `"tailwind"`, or `null` |
| `view` | `"iso"` | `"iso"` or `"top"` |
| `life` / `effects` | `true` | city animation / risk effects |
| `autoRotate` | `false` | slow clockwise rotation, one full turn in about 200 seconds |
| `showDistrictLabels` | `false` | categories and intersections |
| `weather` | `"none"` | `"none"`, `"rain"`, or `"snow"` |
| `lightingMode` | `"auto"` | `"auto"`, `"day"`, `"twilight"`, or `"night"` |
| `showControls` | `true` | camera, scene, and environment controls, including the visibility toggle below fullscreen |
| `showEnvironmentControls` | `false` | opt in to weather and lighting selectors with `showEnvironmentControls` |
| `showSearch` / `showDetails` | `true` | search / selection panel with timestamps |
| `showMonitor` | `true` | local clock, totals, health counts, and latest high-risk entries |
| `showCompass` / `showInstructions` | `true` | north compass / navigation hints and company range |
| `busy` | `false` | temporary interaction lock and update indicator |
| `title` / `ariaLabel` | text in the browser's language | title / accessible name |
| `className` / `children` | — | CSS customization / additional content |
| `onSelect` | — | selected original company record or `null` |

`view`, `life`, `effects`, `autoRotate`, and `showDistrictLabels` can be controlled by the consumer through `onViewChange`, `onLifeChange`, `onEffectsChange`, `onAutoRotateChange`, and `onDistrictLabelsChange`. Without these props, buttons manage local state. Environment selectors have local overrides for each instance; **Automatic** follows the supplied prop.

`ref` exposes `zoom(factor)`, `view(mode)`, `select(company, focus?, maxZoom?)`, `deselect()`, `cancel()`, `capture()`, `play(direction)`, `scrollIntoView()`, and `stats()`. `onFocusChange` receives the TanStack `ChartPoint`.

The package does not call geolocation or weather APIs. For real weather, supply the `weather` prop from your provider. `life={false}` pauses weather and restores daylight. A reduced-motion preference disables particles. Fullscreen depends on browser support. WebGL starts only in the browser; SSR generates an accessible shell. In frameworks with Server Components, import the component within a client boundary and load CSS according to the framework's rules.

## Composition and the engine without React

```jsx
import { CityChart } from "atlas-city-chart/react";
import { defineCityChart } from "atlas-city-chart";

// Memoize the definition from the application's data list.
<CityChart definition={definition} weather="snow" showEnvironmentControls />
```

`CityChart` retains TanStack callbacks (`point?.datum`), accepts `chartRef`, and allows controls to be positioned through `children={({ environmentControls, ready, error }) => ...}`. `EnvironmentControls` is also exported for composition. `CityMap` provides the complete interface, ready to use.

The main entry point exports `defineCityChart`, `cityMark`, `createCityRenderer`, and `cityFocus` without importing React. Pass the definition and renderer to the `mountChartRenderer` host from `@tanstack/charts/renderer`, or to TanStack's official `Chart`. Destroy the host on unmount. Engine dependencies: TanStack Charts 1.1.0 and Three.js 0.180.0.

## Maintenance and distribution

From the repository root:

```sh
npm run build:package
npm run test:package
npm run test:e2e -- tests/e2e/city-package.spec.js
npm run pack:package
```

The build compiles sources shared with Atlas into `packages/city-chart/dist`, including ESM JavaScript, TypeScript declarations, CSS, and source maps. React, Three.js, and TanStack are external bundle dependencies. The tarball contains only distribution files, the README, and the Three.js notice; it does not include the SPA or its data.

To publish, after choosing a name/scope, version, and license and authenticating with npm, run `npm publish` inside `packages/city-chart`. The `prepack` hook rebuilds the package from this checkout. Build, test, and packaging commands do not publish anything.

### Text contrast over the city

Default themes prioritize color: labels use dark text and retain category colors in their markers; placeholders use full opacity. Titles and information over the canvas use `--atlas-city-overlay-text`. The overview receives no additional backgrounds. When the camera zooms in or pans, the header and instructions receive backgrounds because they overlap both light and dark geometry. Returning to the overview removes that protection. Top groups use flex and `--atlas-city-overlay-gap` to keep the title, search, perspectives, and details separate even when text wraps onto multiple lines. On mobile, the title and search are stacked and left-aligned. All these adjustments use CSS classes and variables.

From the repository root, `npm run audit:contrast` checks day, sunrise/sunset, and night across 33 map, details, search, and tooltip scenarios in both the plain CSS and Tailwind themes. Results and screenshots are saved to `test-results/contrast-audit`; the command fails if any active text falls below the minimum of 4.5:1 (3:1 for large text). Measurements cover rendered states, including translucent backgrounds, without counting antialiased pixels along glyph edges.

### Continuous monitoring

**Auto rotation** starts unchecked and works independently of City life and Risk effects. Explicit activation also allows rotation with a reduced-motion preference. Rotation pauses during drags, camera transitions, and city changes, then resumes. The `autoRotate` prop is also available on `CityChart` and `createCityRenderer`; in the engine, use `setAutoRotate(enabled)`.

In fullscreen mode, `CityMap` requests a [Screen Wake Lock](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API) to keep the screen awake. The lock is released on exit, when the page is hidden, or when the map unmounts, and requested again when the page becomes visible in fullscreen mode. It requires a secure context (HTTPS or localhost) and browser/system support and permission; it does not prevent manual suspension. If unavailable or denied, the interface displays a notice and keeps fullscreen working.

Records also accept optional `updatedAt` (last update) and `statusChangedAt` (start of the current status) timestamps in ISO 8601 with a time zone. An ordinary update preserves `statusChangedAt`; a health change updates both fields. Supplied dates are validated, and `statusChangedAt` cannot be later than `updatedAt`. The Atlas application uses these dates in the monitoring panel and table; the reusable map preserves the fields in the data.

The eye button preserves the clock, monitoring panel, compass, selected-company details, footer, and camera toolbar while hiding the other UI. Monitoring uses the supplied `data`; no company polling or weather requests are added. Use `showMonitor={false}`, `showCompass={false}`, or `showInstructions={false}` to remove these overlays.
