import { test, expect } from "@playwright/test";

test("production documentation executes edits, handles errors and restores examples", async ({
  page,
  context,
}) => {
  const errors = [];
  const requests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("./");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Your data.",
  );
  await expect(page.locator(".map-preview canvas")).toBeVisible();
  const editor = page.getByRole("textbox", { name: "Example code" });
  await expect(editor).toBeVisible();
  await expect(editor).not.toHaveValue(/showEnvironmentControls/);
  await expect(page.getByLabel("City weather")).toHaveCount(0);
  await expect(page.getByLabel("City lighting")).toHaveCount(0);
  await editor.fill(
    'render(<CityMap data={companies} title="Edited city" lightingMode="day" />);',
  );
  await expect(
    page.getByText("Unapplied changes", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".atlas-city-title")).toHaveText("My city");
  await page.getByRole("button", { name: "Run", exact: false }).click();
  await expect(page.locator(".atlas-city-title")).toHaveText("Edited city");
  await expect(editor).toBeVisible();

  // Controls are opt-in: omission hides them, and JSX shorthand enables them.
  await expect(page.getByLabel("City weather")).toHaveCount(0);
  await expect(page.getByLabel("City lighting")).toHaveCount(0);
  await editor.fill(
    "render(<CityMap data={companies} showEnvironmentControls />);",
  );
  await page.getByRole("button", { name: "Run" }).click();
  await expect(page.getByLabel("City weather")).toBeVisible();
  await expect(page.getByLabel("City lighting")).toBeVisible();
  await editor.fill("render(<CityMap data={companies} />);");
  await page.getByRole("button", { name: "Run" }).click();
  await expect(page.getByLabel("City weather")).toHaveCount(0);
  await expect(page.getByLabel("City lighting")).toHaveCount(0);
  await editor.fill("render(<CityMap");
  await editor.press("Control+Enter");
  await expect(page.getByRole("alert")).toBeVisible();
  await editor.fill('render(<CityMap data={companies} title="Recovered" />);');
  await page.getByRole("button", { name: "Run" }).click();
  await expect(page.locator(".atlas-city-title")).toHaveText("Recovered");
  await expect(page.getByRole("alert")).toHaveCount(0);

  await page.getByRole("button", { name: "data.json", exact: true }).click();
  const dataEditor = page.getByRole("textbox", { name: "Example data" });
  await dataEditor.fill('{ "invalid": true }');
  await page.getByRole("button", { name: "Run" }).click();
  await expect(page.getByRole("alert")).toContainText("data.json");
  await expect(page.locator(".atlas-city-title")).toHaveText("Recovered");
  await dataEditor.fill(
    JSON.stringify([
      {
        id: "test",
        name: "Edited company",
        metric: { label: "Sales", value: 500 },
        categories: [{ label: "Commerce", value: "commerce" }],
        status: "healthy",
      },
    ]),
  );
  await page.getByRole("button", { name: "Run" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page
    .locator(".map-preview")
    .getByRole("searchbox")
    .fill("Edited company");
  await page
    .getByRole("button", { name: "Edited company", exact: true })
    .click();
  await expect(page.getByLabel("Company details")).toContainText(
    "Edited company",
  );

  await page.getByRole("button", { name: "Reset example" }).click();
  await expect(page.locator(".map-preview canvas")).toHaveCount(1);
  await expect(page.locator(".atlas-city-title")).toHaveText("My city");
  await page
    .getByRole("combobox", { name: "Example", exact: true })
    .selectOption("weather");
  await expect(page.locator(".atlas-city-title")).toHaveText(
    "A night in the city",
  );
  await expect(page.getByLabel("City weather")).toBeEnabled();
  await page.getByLabel("City weather").selectOption("snow");
  await page
    .getByRole("combobox", { name: "Example", exact: true })
    .selectOption("selection");
  await page.locator(".map-preview").getByRole("searchbox").fill("Aurora 1");
  await page.getByRole("button", { name: "Aurora 1", exact: true }).click();
  await expect(page.locator(".selection-output")).toHaveText(
    "Selected company: Aurora 1",
  );
  await expect(page.locator(".map-preview canvas")).toHaveCount(1);

  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copy file" }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain("onSelect={setSelected}");
  await page.getByRole("button", { name: "Code", exact: true }).click();
  await expect(page.locator(".preview-panel")).toBeHidden();
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.locator(".editor-panel")).toBeHidden();
  await page.getByRole("button", { name: "Split", exact: true }).click();
  expect(errors).toEqual([]);
  expect(
    requests.filter((url) =>
      /open-meteo|config\.json|empresas\.json/.test(url),
    ),
  ).toEqual([]);
});

test("Features, weather documentation and mobile navigation survive direct reloads", async ({
  page,
}) => {
  await page.goto("./?page=features#weather");
  await expect(page).toHaveTitle("Features · Atlas Docs");
  await expect(
    page.getByRole("heading", { name: "Weather API integration" }),
  ).toBeInViewport();
  await expect(page.locator(".prose")).toContainText("15 minutes");
  await expect(page.locator(".prose")).toContainText("VITE_WEATHER_API_URL");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Weather API integration" }),
  ).toBeInViewport();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Documentation" })
    .getByRole("link", { name: "All features" })
    .click();
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toHaveAttribute("aria-expanded", "false");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Documentation", exact: true }).click();
  await expect(page.locator(".map-preview canvas")).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Playground", exact: true })
    .click();
  await page.getByRole("button", { name: "Code", exact: true }).click();
  const editor = page.getByRole("textbox", { name: "Example code" });
  await editor.fill('render(<CityMap data={companies} title="Mobile" />);');
  await page.getByRole("button", { name: "Run" }).click();
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.locator(".atlas-city-title")).toHaveText("Mobile");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
