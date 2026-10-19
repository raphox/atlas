import { defineConfig, mergeConfig } from "vite";
import appConfig from "./vite.config.js";

// Use an isolated server and prebundle every browser fixture before testing.
// Hot reloads and dependency discovery must not reset a scenario mid-test.
export default mergeConfig(
  appConfig,
  defineConfig({
    cacheDir: "node_modules/.vite-e2e",
    optimizeDeps: { entries: ["index.html", "tests/e2e/fixtures/*.html"] },
    server: { port: 4176, hmr: false },
  }),
);
