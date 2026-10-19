import { build } from "vite";
import { copyFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const packageRoot = resolve(root, "packages/city-chart");
const outDir = resolve(packageRoot, "dist");

await build({
  configFile: false,
  root,
  publicDir: false,
  build: {
    outDir,
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: {
        index: resolve(packageRoot, "index.js"),
        react: resolve(packageRoot, "react.js"),
      },
      formats: ["es"],
      fileName: (_format, name) => `${name}.js`,
      cssFileName: "styles",
    },
    rolldownOptions: {
      external: (id) =>
        /^(react|react-dom|three|@tanstack\/charts)(\/|$)/.test(id),
      output: {
        banner: (chunk) => (chunk.name === "react" ? '"use client";' : ""),
      },
    },
  },
});

for (const name of await readdir(resolve(packageRoot, "types"))) {
  await copyFile(resolve(packageRoot, "types", name), resolve(outDir, name));
}
await copyFile(
  resolve(root, "src/charts/city/theme-default.css"),
  resolve(outDir, "theme-default.css"),
);
await copyFile(
  resolve(root, "src/charts/city/theme-tailwind.css"),
  resolve(outDir, "tailwind.css"),
);
await copyFile(
  resolve(root, "THREE-LICENSE.txt"),
  resolve(packageRoot, "THREE-LICENSE.txt"),
);
