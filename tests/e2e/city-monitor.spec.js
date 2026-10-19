import { test, expect } from "@playwright/test";

async function ready(page, path = "/") {
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".atlas-city-chart").first()).toHaveAttribute(
    "aria-busy",
    "false",
    { timeout: 45000 },
  );
  await expect(page.locator("canvas").first()).toBeVisible();
}

test("rotação automática inicia desmarcada, funciona com a cena parada e permanece ativa após paginação", async ({
  page,
}) => {
  await ready(page);
  const rotation = page.getByRole("checkbox", { name: "Rotação automática" });
  await expect(rotation).not.toBeChecked();
  await page.getByRole("checkbox", { name: "Cidade viva" }).uncheck();
  await page.getByRole("checkbox", { name: "Efeitos de risco" }).uncheck();
  const angle = () =>
    page
      .locator("#city-map")
      .evaluate((node) =>
        parseFloat(
          getComputedStyle(node).getPropertyValue("--atlas-city-north-angle"),
        ),
      );
  await expect.poll(angle).toBeGreaterThan(0.5);
  const initial = await angle();
  await rotation.check();
  await expect
    .poll(async () => (await angle()) - initial)
    .toBeGreaterThan(0.02);
  await page
    .getByRole("button", { name: "Próxima cidade", exact: true })
    .click();
  await expect(page.locator("#city-map")).toHaveAttribute("aria-busy", "false");
  await expect(rotation).toBeChecked();
  const next = await angle();
  await expect.poll(async () => (await angle()) - next).toBeGreaterThan(0.02);
  await rotation.uncheck();
  // Let the existing drag damping settle, then verify that the camera sleeps.
  await expect
    .poll(async () => {
      const before = await angle();
      await page.waitForTimeout(350);
      return Math.abs((await angle()) - before);
    })
    .toBeLessThan(0.0001);
});

for (const path of ["/", "/tests/e2e/fixtures/package.html"]) {
  test(`tela cheia solicita e libera bloqueio de repouso: ${path}`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.wakeRequests = 0;
      window.wakeReleases = 0;
      Object.defineProperty(navigator, "wakeLock", {
        configurable: true,
        value: {
          request: async () => {
            window.wakeRequests++;
            const sentinel = new EventTarget();
            sentinel.released = false;
            sentinel.release = async () => {
              if (sentinel.released) return;
              sentinel.released = true;
              window.wakeReleases++;
              sentinel.dispatchEvent(new Event("release"));
            };
            return sentinel;
          },
        },
      });
    });
    await ready(page, path);
    expect(await page.evaluate(() => window.wakeRequests)).toBe(0);
    await page
      .getByRole("button", { name: "Abrir mapa em tela cheia" })
      .first()
      .click();
    await expect.poll(() => page.evaluate(() => window.wakeRequests)).toBe(1);
    await page.getByRole("button", { name: "Sair da tela cheia" }).click();
    await expect.poll(() => page.evaluate(() => window.wakeReleases)).toBe(1);
    await page
      .getByRole("button", { name: "Abrir mapa em tela cheia" })
      .first()
      .click();
    await expect.poll(() => page.evaluate(() => window.wakeRequests)).toBe(2);
    await page.evaluate(() => document.exitFullscreen());
    await expect.poll(() => page.evaluate(() => window.wakeReleases)).toBe(2);
  });
}

test("tela cheia continua disponível quando o navegador recusa o bloqueio de repouso", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      value: {
        request: async () => {
          throw new DOMException("Denied", "NotAllowedError");
        },
      },
    });
  });
  await ready(page);
  await page.getByRole("button", { name: "Abrir mapa em tela cheia" }).click();
  await expect(
    page.getByText(/Não foi possível manter a tela ativa/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sair da tela cheia" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sair da tela cheia" }).click();
  await expect(
    page.getByText(/Não foi possível manter a tela ativa/),
  ).toHaveCount(0);
});
