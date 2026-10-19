import { test, expect } from "@playwright/test";

for (const theme of ["package", "package-tailwind"]) {
  test(`standalone package, ${theme} theme, controls and isolation`, async ({
    page,
  }) => {
    const errors = [];
    const requests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => requests.push(request.url()));
    await page.goto(`/tests/e2e/fixtures/${theme}.html`);
    const maps = page.locator(".atlas-city-map");
    await expect(maps.locator("canvas")).toHaveCount(2);
    const first = maps.nth(0),
      second = maps.nth(1);
    expect(
      await first
        .locator("canvas")
        .evaluate((canvas) =>
          Math.abs(
            canvas.clientHeight -
              canvas.closest(".atlas-city-chart").clientHeight,
          ),
        ),
    ).toBeLessThan(1);
    const stats = (index) =>
      page.evaluate((i) => window.packageRefs[i].current?.stats(), index);
    await expect
      .poll(() => stats(0))
      .toMatchObject({
        chartPoints: 2,
        weather: "rain",
        lightingPeriod: "day",
      });
    await expect(first.locator(".atlas-city-title")).toHaveCSS(
      "background-color",
      "rgba(0, 0, 0, 0)",
    );
    await first.getByLabel("Clima da cidade").selectOption("snow");
    await first.getByLabel("Iluminação da cidade").selectOption("night");
    await expect
      .poll(() => stats(0))
      .toMatchObject({ weather: "snow", lightingPeriod: "night" });
    await expect
      .poll(() => stats(1))
      .toMatchObject({ weather: "rain", lightingPeriod: "day" });
    const hideControls = first.getByRole("button", {
      name: "Ocultar controles",
    });
    const fullscreen = first.locator(".atlas-city-camera-button--fullscreen");
    const fullscreenBox = await fullscreen.boundingBox();
    const toggleBox = await hideControls.boundingBox();
    expect(toggleBox.x).toBe(fullscreenBox.x);
    expect(toggleBox.y).toBeGreaterThanOrEqual(
      fullscreenBox.y + fullscreenBox.height,
    );
    await hideControls.click();
    await expect(first.getByRole("searchbox")).toBeHidden();
    await expect(first.locator(".atlas-city-scene-controls")).toBeHidden();
    await expect(fullscreen).toBeVisible();
    await expect(first.locator("canvas")).toBeVisible();
    await expect(second.getByRole("searchbox")).toBeVisible();
    await expect
      .poll(() => stats(0))
      .toMatchObject({
        weather: "snow",
        lightingPeriod: "night",
        weatherVisible: true,
      });
    const showControls = first.getByRole("button", {
      name: "Mostrar controles",
    });
    await expect(showControls).toHaveAttribute("aria-pressed", "true");
    await showControls.press("Enter");
    await expect(first.getByRole("searchbox")).toBeVisible();
    await expect(first.getByLabel("Clima da cidade")).toHaveValue("snow");
    await expect(first.getByLabel("Iluminação da cidade")).toHaveValue("night");
    await first.getByRole("checkbox", { name: "Cidade viva" }).uncheck();
    await expect(first.getByLabel("Clima da cidade")).toBeDisabled();
    await expect.poll(() => stats(0)).toMatchObject({ weatherVisible: false });
    await expect(
      second.getByRole("checkbox", { name: "Cidade viva" }),
    ).toBeChecked();
    await first
      .getByRole("checkbox", { name: "Categorias e interseções" })
      .check();
    await expect(first.locator(".atlas-city-labels")).toBeVisible();
    await first.getByRole("searchbox").fill("Aurora");
    await first.getByRole("button", { name: "Aurora", exact: true }).click();
    await expect(first.getByLabel("Detalhes da empresa")).toBeVisible();
    await expect(first.locator(".atlas-city-title")).toHaveCSS(
      "background-color",
      "rgba(0, 0, 0, 0)",
    );
    expect(
      await page.evaluate(() => window.packageSelections.at(-1).same),
    ).toBe(true);
    await first.getByRole("button", { name: "Fechar detalhes" }).click();
    await first
      .getByRole("button", { name: "Vista superior", exact: true })
      .click();
    await expect(
      first.getByRole("button", { name: "Vista superior", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(first.locator(".atlas-city-title")).toHaveCSS(
      "background-color",
      "rgba(0, 0, 0, 0)",
    );
    const colors = await maps.evaluateAll((nodes) =>
      nodes.map((node) => {
        const button = node.querySelector(".atlas-city-search-input");
        return {
          accent: getComputedStyle(node)
            .getPropertyValue("--atlas-city-accent")
            .trim(),
          radius: getComputedStyle(button).borderRadius,
        };
      }),
    );
    expect(colors[0]).toMatchObject({ accent: "#7c3aed", radius: "12px" });
    expect(colors[1].radius).not.toBe("12px");
    // Runtime projection uses stylesheet rules; interface elements have no style attributes.
    expect(
      await maps
        .locator('[class*="atlas-city-"][style]:not(.atlas-city-host)')
        .count(),
    ).toBe(0);
    expect(
      requests.filter((url) =>
        /config\.json|empresas\.json|open-meteo|fonts\.google/.test(url),
      ),
    ).toEqual([]);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(first.getByLabel("Clima da cidade")).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.evaluate(() => window.renderPackage([]));
    await expect.poll(() => stats(0)).toMatchObject({ chartPoints: 0 });
    await expect(
      first.getByText("Nenhuma empresa encontrada.", { exact: true }),
    ).toBeVisible();
    await page.evaluate(() => window.unmountPackage());
    await expect(page.locator("canvas")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
