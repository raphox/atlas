import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Measure actual composited colors over WebGL, including translucent surfaces.
// Hide text without changing layout and sample the actual backing pixels.
// Computed foreground colors avoid measuring anti-aliased glyph edges.
const output = resolve(
  process.env.ATLAS_CONTRAST_OUTPUT || "test-results/contrast-audit",
);
await mkdir(output, { recursive: true });
await import("./build-city-package.mjs");
const server = await createServer({ server: { port: 4175, strictPort: true } });
await server.listen();
const browser = await chromium.launch({
  args: [
    "--enable-webgl",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const reports = [];

async function audit(page, name, scope) {
  if (
    process.env.ATLAS_CONTRAST_FILTER &&
    !name.includes(process.env.ATLAS_CONTRAST_FILTER)
  )
    return;
  await page.waitForTimeout(250);
  // Let the pending frame finish, then keep geometry/labels stable between
  // the readable screenshot and the background-only measurement.
  await page.evaluate(() => {
    window.auditAnimationFrames = [];
    window.auditOriginalAnimationFrame = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => {
      window.auditAnimationFrames.push(callback);
      return -1;
    };
  });
  await page.waitForTimeout(100);
  await page.screenshot({ path: resolve(output, `${name}.png`), scale: "css" });
  const items = await page.evaluate((scope) => {
    const root = document.querySelector(scope);
    const textNodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    const items = [];
    const visible = (element, rects) => {
      const css = getComputedStyle(element);
      return (
        css.visibility === "visible" &&
        css.clipPath === "none" &&
        rects.some(
          (r) =>
            r.width > 1 &&
            r.height > 1 &&
            r.left >= 0 &&
            r.top >= 0 &&
            r.right <= innerWidth &&
            r.bottom <= innerHeight,
        )
      );
    };
    const metadata = (element, text, rects, color, placeholder = false) => {
      const css = getComputedStyle(element);
      const fontSize = parseFloat(css.fontSize);
      const large =
        fontSize >= 24 || (fontSize >= 18.667 && Number(css.fontWeight) >= 700);
      let opacity = placeholder
        ? Number(getComputedStyle(element, "::placeholder").opacity)
        : 1;
      for (let ancestor = element; ancestor; ancestor = ancestor.parentElement)
        opacity *= Number(getComputedStyle(ancestor).opacity);
      const item = {
        opacity,
        text: text.trim(),
        selector: `${element.tagName.toLowerCase()}${element.className ? `.${String(element.className).trim().replaceAll(/\s+/g, ".")}` : ""}`,
        foreground: color,
        fontSize,
        threshold: large ? 3 : 4.5,
        excluded: Boolean(element.closest(":disabled, [aria-disabled='true']")),
        placeholder,
        rects: rects
          .filter(
            (r) =>
              r.width > 1 &&
              r.height > 1 &&
              r.left >= 0 &&
              r.top >= 0 &&
              r.right <= innerWidth &&
              r.bottom <= innerHeight,
          )
          .map((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height })),
      };
      items.push(item);
      return item;
    };
    for (const node of textNodes) {
      const parent = node.parentElement;
      if (
        !node.textContent.trim() ||
        parent.closest("script, style, svg, option, select, textarea, .sr-only")
      )
        continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = [...range.getClientRects()];
      if (!visible(parent, rects)) continue;
      const color = getComputedStyle(parent).color;
      metadata(parent, node.textContent, rects, color);
    }
    for (const element of root.querySelectorAll(
      "input[type='search'], input[type='text'], select",
    )) {
      const box = element.getBoundingClientRect();
      if (!visible(element, [box])) continue;
      const css = getComputedStyle(element);
      const isSelect = element.tagName === "SELECT";
      const text = isSelect
        ? element.selectedOptions[0]?.text
        : element.value || element.placeholder;
      if (!text) continue;
      const placeholder = !isSelect && !element.value;
      const color = placeholder
        ? getComputedStyle(element, "::placeholder").color
        : css.color;
      const inset =
        parseFloat(css.paddingLeft) + parseFloat(css.borderLeftWidth);
      const height = parseFloat(css.fontSize);
      const rect = {
        x: box.x + inset,
        y: box.y + (box.height - height) / 2,
        left: box.x + inset,
        top: box.y + (box.height - height) / 2,
        right: box.right - 24,
        bottom: box.y + (box.height + height) / 2,
        width: box.width - inset - 24,
        height,
      };
      metadata(element, text, [rect], color, placeholder);
    }
    const style = document.createElement("style");
    style.id = "contrast-audit-hide";
    style.textContent = `${scope}, ${scope} *, ${scope} *::before, ${scope} *::after, ${scope} *::placeholder { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; }`;
    document.head.append(style);
    window.auditTextStyles = [root, ...root.querySelectorAll("*")].map(
      (element) => [element, element.getAttribute("style")],
    );
    for (const [element] of window.auditTextStyles) {
      element.style.setProperty("color", "transparent", "important");
      element.style.setProperty(
        "-webkit-text-fill-color",
        "transparent",
        "important",
      );
      element.style.setProperty("text-shadow", "none", "important");
    }
    return items;
  }, scope);
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        window.auditOriginalAnimationFrame(() =>
          window.auditOriginalAnimationFrame(resolve),
        );
      }),
  );
  const background = await page.screenshot({ scale: "css" });
  await writeFile(resolve(output, `${name}-background.png`), background);
  const measured = await page.evaluate(
    async ({ items, background }) => {
      const decode = async (bytes) => {
        const bitmap = await createImageBitmap(
          new Blob([new Uint8Array(bytes)], { type: "image/png" }),
        );
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const context = canvas.getContext("2d");
        context.drawImage(bitmap, 0, 0);
        bitmap.close();
        return {
          width: canvas.width,
          data: context.getImageData(0, 0, canvas.width, canvas.height).data,
        };
      };
      const bg = await decode(background);
      const luminance = (rgb) =>
        rgb
          .map((v) => {
            v /= 255;
            return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
          })
          .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
      const ratio = (a, b) =>
        (Math.max(luminance(a), luminance(b)) + 0.05) /
        (Math.min(luminance(a), luminance(b)) + 0.05);
      const cssColor = (css) => {
        const context = new OffscreenCanvas(1, 1).getContext("2d");
        context.fillStyle = css;
        context.fillRect(0, 0, 1, 1);
        return [...context.getImageData(0, 0, 1, 1).data];
      };
      return items.map((item) => {
        let minimum = Infinity,
          pair;
        const backings = new Set();
        const css = cssColor(item.foreground);
        for (const rect of item.rects) {
          for (
            let y = Math.ceil(rect.y + 2);
            y < rect.y + rect.height - 2;
            y += 2
          ) {
            for (
              let x = Math.ceil(rect.x + 2);
              x < rect.x + rect.width - 2;
              x += 2
            ) {
              const i = (y * bg.width + x) * 4;
              const backing = [...bg.data.slice(i, i + 3)];
              backings.add(luminance(backing));
              const alpha = (css[3] / 255) * item.opacity;
              const ink = css
                .slice(0, 3)
                .map(
                  (channel, c) => channel * alpha + backing[c] * (1 - alpha),
                );
              const contrast = ratio(ink, backing);
              if (contrast < minimum) {
                minimum = contrast;
                pair = { foreground: ink, background: backing };
              }
            }
          }
        }
        const levels = [...backings].sort((a, b) => a - b);
        let bestSolidText = { color: "#000000", contrast: 0 };
        for (let gray = 0; gray <= 255 && levels.length; gray++) {
          const light = luminance([gray, gray, gray]);
          let low = 0,
            high = levels.length;
          while (low < high) {
            const middle = (low + high) >> 1;
            if (levels[middle] < light) low = middle + 1;
            else high = middle;
          }
          const contrast = Math.min(
            ...[levels[low - 1], levels[low]]
              .filter((v) => v !== undefined)
              .map(
                (backing) =>
                  (Math.max(light, backing) + 0.05) /
                  (Math.min(light, backing) + 0.05),
              ),
          );
          if (contrast > bestSolidText.contrast)
            bestSolidText = {
              color: `#${gray.toString(16).padStart(2, "0").repeat(3)}`,
              contrast,
            };
        }
        return {
          ...item,
          minimum,
          pair,
          bestSolidText,
          passes: minimum >= item.threshold,
        };
      });
    },
    { items, background: [...background] },
  );
  await page.evaluate(() => {
    document.querySelector("#contrast-audit-hide")?.remove();
    for (const [element, style] of window.auditTextStyles) {
      if (style === null) element.removeAttribute("style");
      else element.setAttribute("style", style);
    }
    delete window.auditTextStyles;
    window.requestAnimationFrame = window.auditOriginalAnimationFrame;
    for (const callback of window.auditAnimationFrames)
      window.requestAnimationFrame(callback);
    delete window.auditAnimationFrames;
    delete window.auditOriginalAnimationFrame;
  });
  const failures = measured.filter((item) => !item.excluded && !item.passes);
  reports.push({ name, scope, measured, failures });
  await writeFile(
    resolve(output, `${name}.json`),
    JSON.stringify({ name, scope, measured, failures }, null, 2),
  );
  console.log(
    `${name}: ${measured.length} textos, ${failures.length} abaixo do mínimo`,
  );
}

try {
  for (const [mode, hour] of [
    ["day", 12],
    ["twilight", 7],
    ["night", 22],
  ]) {
    if (
      process.env.ATLAS_CONTRAST_LIGHT &&
      mode !== process.env.ATLAS_CONTRAST_LIGHT
    )
      continue;
    const context = await browser.newContext({
      locale: "pt-BR",
      viewport: { width: 1440, height: 1100 },
      timezoneId: "America/Sao_Paulo",
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.route("https://fonts.googleapis.com/**", (route) =>
      route.abort(),
    );
    await page.addInitScript(() => {
      navigator.geolocation.getCurrentPosition = (_ok, fail) =>
        fail({ code: 1 });
    });
    await page.clock.install({
      time: new Date(`2026-10-18T${String(hour).padStart(2, "0")}:00:00-03:00`),
    });
    await page.goto("http://127.0.0.1:4175/", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForFunction(
      (mode) =>
        window.atlas?.summary.lightingPeriod === mode &&
        window.atlas.summary.companies === 1400,
      mode,
    );
    await page.getByRole("checkbox", { name: "Efeitos de risco" }).uncheck();
    await page
      .getByRole("checkbox", { name: "Categorias e interseções" })
      .check();
    await audit(page, `atlas-${mode}-labels`, "#city-map");
    await page
      .getByRole("button", { name: /^Ver .* no mapa$/ })
      .first()
      .click();
    await page.locator("#city-map").scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Aproximar empresa" }).hover();
    await audit(page, `atlas-${mode}-details`, "#city-map");
    await page.getByRole("button", { name: "Fechar detalhes" }).click();
    await page.getByRole("button", { name: "Restaurar visão geral" }).click();
    const bounds = await page.locator("#viewport").boundingBox();
    for (const x of [0.5, 0.4, 0.6, 0.3, 0.7]) {
      await page.mouse.move(
        bounds.x + bounds.width * x,
        bounds.y + bounds.height * 0.5,
      );
      if (await page.locator(".atlas-city-tooltip").count()) break;
    }
    if (await page.locator(".atlas-city-tooltip").count())
      await audit(page, `atlas-${mode}-tooltip`, "#city-map");
    await context.close();

    if (process.env.ATLAS_CONTRAST_TARGET === "atlas") continue;

    for (const theme of ["package", "package-tailwind"]) {
      const context = await browser.newContext({
        locale: "pt-BR",
        viewport: { width: 1440, height: 1300 },
        timezoneId: "America/Sao_Paulo",
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:4175/tests/e2e/fixtures/${theme}.html`);
      await page.waitForFunction(() =>
        window.packageRefs?.every(
          (ref) => ref.current?.stats()?.chartPoints === 2,
        ),
      );
      await page.evaluate(() => {
        window.auditCompanies = Array.from({ length: 7 }, (_, i) => ({
          id: String(i + 1),
          name: `Empresa ${i + 1}`,
          metric: { label: "Receita", value: 500 + 300 * i },
          categories: [1, 2, 4]
            .filter((bit) => (i + 1) & bit)
            .map((bit) => ({
              value: `category-${bit}`,
              label: `Categoria ${bit}`,
            })),
          status: "healthy",
        }));
        window.renderPackage(window.auditCompanies);
      });
      const maps = page.locator(".atlas-city-map");
      for (const map of await maps.all()) {
        await map.getByRole("checkbox", { name: "Efeitos de risco" }).uncheck();
        await map
          .getByRole("checkbox", { name: "Categorias e interseções" })
          .check();
        await map.getByLabel("Iluminação da cidade").selectOption(mode);
      }
      await page.waitForTimeout(2100);
      await audit(page, `${theme}-${mode}-labels-custom`, ".custom-city");
      await audit(page, `${theme}-${mode}-labels-default`, ".other-city");
      await page.evaluate(() =>
        window.packageRefs.forEach((ref) =>
          ref.current.select(window.auditCompanies[0], true),
        ),
      );
      await maps.first().getByRole("searchbox").fill("Empresa");
      await audit(
        page,
        `${theme}-${mode}-details-search-custom`,
        ".custom-city",
      );
      await audit(
        page,
        `${theme}-${mode}-details-search-default`,
        ".other-city",
      );
      await context.close();
    }
  }
  const summary = {
    scenarios: reports.length,
    measured: reports.reduce(
      (total, report) => total + report.measured.length,
      0,
    ),
    failures: reports.reduce(
      (total, report) => total + report.failures.length,
      0,
    ),
  };
  await writeFile(
    resolve(output, "report.json"),
    JSON.stringify(
      {
        standard: "WCAG 2.2 SC 1.4.3 AA",
        summary,
        method:
          "Computed foreground colors against rendered backgrounds with text hidden and animation frozen. Includes WebGL and translucent surfaces. Disabled controls are recorded but excluded from WCAG failures. Small text requires 4.5:1; large text requires 3:1.",
        reports,
      },
      null,
      2,
    ),
  );
  console.log(`Relatório: ${resolve(output, "report.json")}`);
  if (summary.failures) process.exitCode = 1;
} finally {
  await browser.close();
  await server.close();
}
