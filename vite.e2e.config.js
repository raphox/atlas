import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Serve only the standalone package fixtures; the documentation has its own suite.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: false,
  cacheDir: "node_modules/.vite-e2e",
  optimizeDeps: { entries: ["tests/e2e/fixtures/*.html"] },
  server: { host: "127.0.0.1", port: 4176, strictPort: true, hmr: false },
});
