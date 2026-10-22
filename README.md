# Atlas CityMap

![Atlas CityMap showing company health in an interactive 3D city](docs/images/city-map-preview.png)

Atlas CityMap is a reusable React component that turns company data into an interactive 3D city, built with TanStack Charts and Three.js.

Start with the [interactive documentation](https://raphox.github.io/atlas/), explore [Features](https://raphox.github.io/atlas/?page=features), try the [extension guide](https://raphox.github.io/atlas/?page=extending), or read the [package integration guide](packages/city-chart/README.md).

## Development

Requires Node.js 22.12 or later in the 22.x series, or Node.js 24 or later.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4174. The documentation and its playground are the project's web interface. `npm start` and `npm run dev:docs` start the same site. See [Running Atlas locally](RUN-LOCALLY.md).

```sh
npm run build        # static documentation in dist/docs (base: /atlas/)
npm run preview      # http://127.0.0.1:4174/atlas/
npm run build:package
npm run pack:package
```

Content lives in `docs/content/*.mdx`; runnable examples live in `docs/examples.js`. The basic playground uses the shared `CityMap` source, edits JSX and JSON locally, and simulates weather without location requests or API calls. The separate extension page adds filters, counts, pagination, a table, JSON imports, external data sources, and opt-in Open-Meteo weather. Consumer applications provide company records and optional weather through props.

## Source and verification

- `src/charts/city/`: reusable map, TanStack extension, themes, and React integration. See the [development guide](src/charts/city/README.md).
- `src/city.js`, `src/model.js`, and related modules: shared scene engine, validation, and city layout.
- `packages/city-chart/`: distributable package, declarations, and integration guide.
- `docs/`: documentation, Features, and interactive playground.

```sh
npm test
npx playwright install --only-shell chromium
npm run test:e2e
npm run test:docs
npm run format:check
```

Unit tests cover the shared engine and data contracts. Browser tests cover the standalone package with plain CSS and Tailwind themes, plus the documentation and playground.

The `Tests` workflow validates changes on `main` or manual dispatch. A successful run on `main` triggers `Documentation → GitHub Pages`, which builds and deploys that exact tested commit. Enable **Settings → Pages → Source → GitHub Actions**. Local builds default to `/atlas/`; set `DOCS_BASE_PATH=/` for root hosting and `DOCS_SITE_URL` for the public URL. Query-string pages and fragment links work without SPA rewrites.
