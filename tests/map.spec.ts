import { test, expect } from "@playwright/test";
import { createDemo } from "../lib/decision/demo";

for (const mobile of [false, true]) {
  test(`cinematic map ${mobile ? "mobile" : "desktop"}: overview, selection and detail toggle`, async ({
    page,
  }) => {
    await page.setViewportSize(
      mobile ? { width: 390, height: 844 } : { width: 1440, height: 1100 },
    );
    await page.goto("/");
    await page.getByRole("button", { name: "Try the demo" }).click();
    await expect(page.locator(".details")).toBeHidden();
    await expect(page.locator(".map-card")).toHaveCount(3);
    await page.waitForTimeout(900);
    await page.locator(".workspace-heading").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `docs/map-${mobile ? "mobile" : "desktop"}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", {
        name: "Explore Quit and build full-time",
        exact: true,
      })
      .click();
    await expect(page.locator(".details")).toBeVisible();
    await expect(
      page.locator(".details").getByRole("heading", {
        name: "Quit and build full-time",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Hide details", exact: true })
      .click();
    await expect(page.locator(".details")).toBeHidden();
    await page
      .getByRole("button", { name: "Decision details", exact: true })
      .click();
    await expect(page.locator(".details")).toBeVisible();
    await page.getByRole("button", { name: "Explore next step" }).click();
    await expect(page.getByText("STEP 2 OF 5", { exact: true })).toBeVisible();
    await page.waitForTimeout(800);
    await page.screenshot({
      path: `docs/map-${mobile ? "mobile" : "desktop"}-expanded.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(mobile ? 390 : 1440);
  });
}

test("reduced-motion map keeps paths visible without traveling pulses", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Try the demo" }).click();
  await expect(page.locator(".future-edge-line")).toHaveCount(2);
  await expect(page.locator(".future-edge-pulse").first()).toBeHidden();
  await expect(page.locator(".map-card").first()).toHaveCSS(
    "animation-name",
    "none",
  );
  await page
    .getByRole("button", {
      name: "Explore Quit and build full-time",
      exact: true,
    })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".details")).toBeVisible();
});

test("long generated copy stays inside decision cards", async ({ page }) => {
  const scenario = createDemo();
  scenario.nodes = scenario.nodes.map((node) => ({
    ...node,
    title:
      "A thoughtful decision with several important consequences to consider before choosing a direction".slice(
        0,
        100,
      ),
    summary: "An uncertain possible future with trade-offs and opportunities. "
      .repeat(9)
      .slice(0, 600),
    benefits: [
      "A potential improvement that depends on your circumstances and the assumptions in this scenario. "
        .repeat(3)
        .slice(0, 300),
    ],
    horizon:
      "Over the next several years, depending on how the situation develops and your priorities change".slice(
        0,
        100,
      ),
  }));
  await page.addInitScript(
    (saved) =>
      localStorage.setItem(
        "crossroads-v1",
        JSON.stringify({ version: 1, scenario: saved }),
      ),
    scenario,
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Continue your saved exploration" })
    .click();
  await expect(page.locator(".map-card")).toHaveCount(3);
  for (const card of await page.locator(".map-card:not(.root-card)").all()) {
    const sizes = await card.evaluate((el) => ({
      client: el.clientHeight,
      scroll: el.scrollHeight,
    }));
    expect(sizes.scroll).toBeLessThanOrEqual(sizes.client + 1);
  }
});
