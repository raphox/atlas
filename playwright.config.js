import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: process.env.CI
    ? [["list"], ["json", { outputFile: "test-results/results.json" }]]
    : "list",
  use: {
    actionTimeout: 15000,
    locale: "pt-BR",
    baseURL: "http://127.0.0.1:4176",
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
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
  webServer: {
    command: "npx vite --config vite.e2e.config.js",
    url: "http://127.0.0.1:4176",
    reuseExistingServer: false,
  },
});
