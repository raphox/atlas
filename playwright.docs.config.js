import { defineConfig, devices } from "@playwright/test";

const basePath = process.env.DOCS_BASE_PATH || "/atlas/";
export default defineConfig({
  testDir: "./tests/docs",
  workers: 1,
  timeout: 90000,
  expect: { timeout: 15000 },
  use: {
    ...devices["Desktop Chrome"],
    viewport: { width: 1512, height: 1100 },
    locale: "en-US",
    baseURL: `http://127.0.0.1:4174${basePath}`,
    trace: "retain-on-failure",
    launchOptions: {
      args: [
        "--enable-webgl",
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    },
  },
  webServer: {
    command: "npm run preview:docs",
    url: `http://127.0.0.1:4174${basePath}`,
    reuseExistingServer: false,
  },
});
