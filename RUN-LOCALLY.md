# Running Atlas locally

Requires Node.js 22.12 or later in the 22.x series, or Node.js 24 or later, and npm.

## Documentation and playground

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4174. Documentation and Features share this site. `npm start` and `npm run dev:docs` are equivalent. Changes refresh automatically; press Ctrl+C to stop.

## Production build

```sh
npm run build
npm run preview
```

The build generates `dist/docs/`. Open http://127.0.0.1:4174/atlas/ for the preview. Stop the development server first. `build:docs` and `preview:docs` remain available as aliases for these operations.

## Reusable package

```sh
npm run build:package
npm run pack:package
```

See the [package guide](packages/city-chart/README.md) for integration. The component receives company data and optional weather through props. Documentation examples use local sample records and simulated weather.

## Verification and formatting

```sh
npm test
npx playwright install --only-shell chromium
npm run test:e2e
npm run test:docs
npm run format:check
```

Package browser tests use an isolated fixture server on port 4176. Documentation tests build and preview the site on port 4174. Run `npm run format` to apply formatting.
