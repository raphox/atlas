import { test, expect } from "@playwright/test";

const box = async (locator) => {
  await expect(locator).toBeVisible();
  return locator.boundingBox();
};
const gap = (above, below) => below.y - above.y - above.height;
const right = (rect) => rect.x + rect.width;
const aligned = (a, b) => expect(Math.abs(a - b)).toBeLessThan(1);

test("Atlas alinha grupos e preserva espaço com zoom e detalhes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.goto("/");
  const map = page.locator("#city-map");
  await expect(map.locator("canvas")).toHaveCount(1);
  await expect(
    page.getByText("Construindo a cidade", { exact: true }),
  ).toHaveCount(0);
  for (const width of [1440, 872, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await map
      .getByRole("button", { name: "Restaurar visão geral", exact: true })
      .click();
    for (const zoomed of [false, true]) {
      if (zoomed)
        await map
          .getByRole("button", { name: "Aproximar", exact: true })
          .click();
      await expect(map.locator(".atlas-map-heading")).toHaveCSS(
        "background-color",
        "rgba(0, 0, 0, 0)",
      );
      const heading = await box(map.locator(".atlas-map-heading"));
      const search = await box(
        map.getByRole("combobox", { name: "Buscar empresa" }),
      );
      const header = await box(map.locator(".atlas-map-header"));
      const perspectives = await box(map.locator(".atlas-map-perspectives"));
      aligned(heading.x, perspectives.x);
      expect(gap(header, perspectives)).toBeGreaterThanOrEqual(11.9);
      if (width < 640) {
        aligned(heading.x, search.x);
        expect(gap(heading, search)).toBeGreaterThanOrEqual(11.9);
      } else {
        aligned(heading.y, search.y);
        aligned(right(search), right(header));
        expect(search.x - right(heading)).toBeGreaterThanOrEqual(11.9);
      }
    }
    await page
      .getByRole("button", { name: /^Ver .+ no mapa$/ })
      .first()
      .click();
    const details = await box(map.locator(".atlas-map-details"));
    const top = await box(map.locator(".atlas-map-top-controls"));
    const scene = await box(map.locator(".atlas-map-scene-controls"));
    const camera = await box(map.locator(".atlas-map-zoom"));
    expect(gap(top, details)).toBeGreaterThanOrEqual(23.9);
    expect(gap(details, scene)).toBeGreaterThanOrEqual(11.9);
    expect(camera.x - right(details)).toBeGreaterThanOrEqual(11.9);
    aligned(right(camera), right(top));
    const instructions = map.locator(".atlas-map-instructions");
    if (await instructions.isVisible()) {
      const hint = await box(instructions);
      const options = await box(map.locator(".atlas-map-scene-controls > div"));
      expect(options.x - right(hint)).toBeGreaterThanOrEqual(11.9);
      aligned(hint.y + hint.height, options.y + options.height);
    }
    const footer = await box(map.locator("footer"));
    const footerText = await box(map.locator(".atlas-map-footer-text").first());
    aligned(footerText.x, top.x);
    expect(gap(scene, footer)).toBeGreaterThanOrEqual(11.9);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await map.screenshot({ path: `test-results/atlas-spacing-${width}.png` });
    await map.getByRole("button", { name: "Fechar detalhes" }).click();
  }
});

for (const theme of ["package", "package-tailwind"]) {
  test(`pacote ${theme} mantém espaçamento e alinhamento com títulos longos`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/tests/e2e/fixtures/${theme}.html`);
    const map = page.locator(".atlas-city-map").first();
    await expect(map.locator("canvas")).toHaveCount(1);
    await page.evaluate(() =>
      window.renderPackage(undefined, {
        title: "Mapa das empresas e indicadores regionais",
      }),
    );
    for (const width of [1440, 872, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await map
        .getByRole("button", { name: "Restaurar visão geral", exact: true })
        .click();
      for (const zoomed of [false, true]) {
        if (zoomed)
          await map
            .getByRole("button", { name: "Aproximar", exact: true })
            .click();
        await expect(map.locator(".atlas-city-title")).toHaveCSS(
          "background-color",
          "rgba(0, 0, 0, 0)",
        );
        const header = await box(map.locator(".atlas-city-header"));
        const title = await box(map.locator(".atlas-city-title"));
        const search = await box(map.getByRole("searchbox"));
        const perspectives = await box(map.locator(".atlas-city-perspectives"));
        aligned(title.x, perspectives.x);
        expect(gap(header, perspectives)).toBeGreaterThanOrEqual(11.9);
        if (width <= 480) {
          aligned(title.x, search.x);
          expect(gap(title, search)).toBeGreaterThanOrEqual(11.9);
        } else {
          aligned(title.y, search.y);
          expect(search.x - right(title)).toBeGreaterThanOrEqual(11.9);
        }
      }
      await map.getByRole("searchbox").fill("Aurora");
      await map.getByRole("button", { name: "Aurora", exact: true }).click();
      const details = await box(map.getByLabel("Detalhes da empresa"));
      const perspectives = await box(map.locator(".atlas-city-perspectives"));
      const scene = await box(map.locator(".atlas-city-scene-controls"));
      const camera = await box(map.locator(".atlas-city-zoom"));
      expect(gap(perspectives, details)).toBeGreaterThanOrEqual(11.9);
      expect(gap(details, scene)).toBeGreaterThanOrEqual(11.9);
      expect(camera.x - right(details)).toBeGreaterThanOrEqual(11.9);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await map.screenshot({
        path: `test-results/${theme}-spacing-${width}.png`,
      });
      await map.getByRole("button", { name: "Fechar detalhes" }).click();
    }
  });
}
