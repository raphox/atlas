import { test, expect } from "@playwright/test";

async function translucent(locator, blurred = true) {
  await expect(locator).toBeVisible();
  await expect(locator).toHaveCSS("opacity", "1");
  const appearance = await locator.evaluate((element) => {
    const css = getComputedStyle(element);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = css.backgroundColor;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, alpha] = ctx.getImageData(0, 0, 1, 1).data;
    return {
      r,
      g,
      b,
      alpha: alpha / 255,
      blur: css.backdropFilter,
      opacity: css.opacity,
    };
  });
  expect(appearance.alpha).toBeGreaterThan(0.5);
  expect(appearance.alpha).toBeLessThan(0.9);
  expect(appearance.opacity).toBe("1");
  if (blurred) expect(appearance.blur).toBe("blur(10px)");
}

test("Atlas usa superfícies translúcidas e mantém o destaque das abas", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.goto("/");
  await expect(
    page.getByText("Construindo a cidade", { exact: true }),
  ).toHaveCount(0);
  const map = page.locator("#city-map");
  await expect(
    map.getByRole("button", { name: "Aproximar", exact: true }),
  ).toBeEnabled();
  for (const selector of [
    ".atlas-map-search-input",
    ".atlas-map-perspectives",
    ".atlas-map-zoom",
    ".atlas-map-toggle",
    ".atlas-city-environment-control",
  ]) {
    for (const surface of await map.locator(selector).all())
      await translucent(surface);
  }
  await translucent(
    map.locator(".atlas-map-perspectives input:checked + span"),
    false,
  );
  await page
    .getByRole("button", { name: /^Ver .+ no mapa$/ })
    .first()
    .click();
  await expect(map.locator(".atlas-map-heading")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await map.scrollIntoViewIfNeeded();
  const viewport = await map.locator(".atlas-city-viewport").boundingBox();
  await page.mouse.move(
    viewport.x + viewport.width / 3,
    viewport.y + viewport.height / 2,
  );
  await page.mouse.down({ button: "right" });
  await page.mouse.move(
    viewport.x + viewport.width / 3 + 60,
    viewport.y + viewport.height / 2 + 30,
    { steps: 6 },
  );
  await page.mouse.up({ button: "right" });
  for (const selector of [".atlas-map-heading", ".atlas-map-instructions"]) {
    await expect(map.locator(selector)).toHaveCSS(
      "background-color",
      "rgba(0, 0, 0, 0)",
    );
    await expect(map.locator(selector)).toHaveCSS("backdrop-filter", "none");
  }
  await translucent(map.locator(".atlas-map-details"));
  await translucent(
    map.getByRole("button", { name: "Aproximar empresa", exact: true }),
    false,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await map.screenshot({ path: "test-results/atlas-surfaces-mobile.png" });
});

for (const theme of ["package", "package-tailwind"]) {
  test(`${theme} aplica transparência no tema e aceita CSS customizado`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/tests/e2e/fixtures/${theme}.html`);
    const map = page.locator(".atlas-city-map").first();
    await expect(map.locator("canvas")).toHaveCount(1);
    await expect(
      map.getByRole("button", { name: "Aproximar", exact: true }),
    ).toBeEnabled();
    for (const selector of [
      ".atlas-city-search-input",
      ".atlas-city-perspectives",
      ".atlas-city-camera-button",
      ".atlas-city-control",
    ]) {
      for (const surface of await map.locator(selector).all())
        await translucent(surface);
    }
    await translucent(
      map.locator('.atlas-city-perspective-button[aria-pressed="true"]'),
      false,
    );
    await map
      .getByRole("checkbox", { name: "Categorias e interseções" })
      .check();
    await translucent(map.locator(".atlas-city-label").first());
    await map.getByRole("searchbox").fill("Aurora");
    await translucent(map.locator(".atlas-city-results"));
    await map.getByRole("button", { name: "Aurora", exact: true }).click();
    await expect(map.locator(".atlas-city-title")).toHaveCSS(
      "background-color",
      "rgba(0, 0, 0, 0)",
    );
    await translucent(map.locator(".atlas-city-details"));
    await page.setViewportSize({ width: 390, height: 844 });
    await map.screenshot({ path: `test-results/${theme}-surfaces-mobile.png` });
    await page.addStyleTag({
      content:
        ".custom-city { --atlas-city-surface-background: rgb(190 210 230 / 0.6); --atlas-city-surface-blur: 6px; }",
    });
    await expect(map.getByRole("searchbox")).toHaveCSS(
      "backdrop-filter",
      "blur(6px)",
    );
    await expect(page.locator(".other-city").getByRole("searchbox")).toHaveCSS(
      "backdrop-filter",
      "blur(10px)",
    );
  });
}
