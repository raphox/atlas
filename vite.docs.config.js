import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";
import remarkGfm from "remark-gfm";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ command, isPreview }) => ({
  root: fileURLToPath(new URL("./docs", import.meta.url)),
  base:
    command === "serve" && !isPreview
      ? "/"
      : process.env.DOCS_BASE_PATH || "/atlas/",
  publicDir: "public",
  cacheDir: fileURLToPath(
    new URL("./node_modules/.vite-docs", import.meta.url),
  ),
  plugins: [
    {
      name: "docs-sharing-metadata",
      transformIndexHtml(html) {
        const siteUrl = new URL(
          process.env.DOCS_SITE_URL || process.env.DOCS_BASE_PATH || "/atlas/",
          "https://raphox.github.io",
        );
        if (!siteUrl.pathname.endsWith("/")) siteUrl.pathname += "/";
        const escapedUrl = siteUrl.href
          .replaceAll("&", "&amp;")
          .replaceAll('"', "&quot;");
        return html.replaceAll("__DOCS_SITE_URL__", escapedUrl);
      },
    },
    { enforce: "pre", ...mdx({ remarkPlugins: [remarkGfm] }) },
    react({ include: /\.(jsx|js|mdx)$/ }),
  ],
  build: {
    outDir: fileURLToPath(new URL("./dist/docs", import.meta.url)),
    emptyOutDir: true,
  },
  server: { host: "127.0.0.1", port: 4174, strictPort: true },
  preview: { host: "127.0.0.1", port: 4174, strictPort: true },
}));
