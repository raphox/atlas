# Running Atlas locally

A Vite application with React, Tailwind CSS, and shadcn/ui. The map uses Three.js with local demo data.

## Development

Requires Node.js 22.12 or later in the 22.x series, or Node.js 24 or later, and npm.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4173. The server is available only on your machine and refreshes the browser when you edit files. `npm start` is a shortcut for the same server. Press Ctrl+C to stop it. To use another port: `npm run dev -- --port 5173`.

## Production build

```sh
npm run build
npm run preview
```

The build generates `dist/`, ready for static hosting. The preview also uses port 4173; stop the development server before starting it.

Three.js is included in the bundle. Google Fonts have local fallbacks. Sample data is generated automatically before development and production builds, without requiring a backend.

## Formatting

The project uses Biome, configured in `biome.json`, with support for Tailwind CSS 4 directives. Run `npm run format` to format files or `npm run format:check` to check without making changes. Generated files, dependencies, and the lockfile are excluded from formatting.

## Verification

```sh
npm test
npx playwright install chromium
npm run test:e2e
```

The Playwright tests start Vite automatically when needed. If a local server is already running on port 4173, they reuse it.

## Main files

- `src/App.jsx`: React interface composition.
- `src/components/`: application components.
- `src/components/ui/`: shadcn/ui components.
- `src/hooks/use-atlas.js`: data, filters, pagination, imports, and selection.
- `src/charts/city/use-city-chart.js`: Three.js integration with the TanStack chart lifecycle.
- `src/city.js`: scene, buildings, traffic, effects, and camera.
- `src/model.js`: companies, regions, and lot allocation.
- `src/data-source.js`: JSON data source loading.
- `src/index.css`: Tailwind and the shadcn/ui theme.
- `public/config.json`: data source URL.
- `scripts/generate-demo.mjs`: demo data generation.
- `vite.config.js`: Vite, React plugin, Tailwind, and the `@/` alias.
- `components.json`: shadcn/ui configuration.

To connect a backend, configure `dataUrl` and `mode` in `public/config.json`; the data contract is described in [README.md](README.md). JSON imports remain local to the browser and do not persist after a page reload.
