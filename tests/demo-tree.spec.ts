import { test, expect } from "@playwright/test";

for (const mobile of [false, true]) {
  test(`five-level presentation tree supports overview, guided exploration and saving${mobile ? " on mobile" : ""}`, async ({
    page,
  }) => {
    await page.setViewportSize(
      mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    let requests = 0;
    await page.route("**/api/decision", async (route) => {
      requests++;
      await route.abort();
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Try the demo" }).click();
    await expect(page.getByText("Five levels ready")).toBeVisible();
    await expect(page.locator(".map-card")).toHaveCount(3);
    await page.getByRole("button", { name: "Show all five levels" }).click();
    await expect(page.locator(".map-card")).toHaveCount(63);
    await expect(
      page.locator(".node-eyebrow").filter({ hasText: "STEP 5" }),
    ).toHaveCount(32);
    await expect(page.locator(".future-edge-line")).toHaveCount(62);
    const title = page.locator(".overview-card strong").first();
    await expect(title).toBeVisible();
    expect(await title.evaluate((el) => el.clientHeight)).toBeGreaterThan(10);
    await page.waitForTimeout(300);
    await page.screenshot({
      path: `.crossroads/demo-five-levels-${mobile ? "mobile" : "desktop"}.png`,
      fullPage: true,
    });
    await page
      .locator(".overview-card")
      .filter({ hasText: "STEP 5" })
      .first()
      .click();
    await expect(page.getByText("STEP 5 OF 5", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Focus first choices" }).click();
    await expect(page.locator(".map-card")).toHaveCount(3);
    await page
      .getByRole("button", {
        name: "Explore Quit and build full-time",
        exact: true,
      })
      .click();
    for (let depth = 2; depth <= 5; depth++) {
      await page
        .getByRole("button", { name: "Explore next step", exact: true })
        .click();
      await expect(
        page.getByText(`STEP ${depth} OF 5`, { exact: true }),
      ).toBeVisible();
    }
    await expect(
      page.getByText("Five steps explored. A possibility, not a prediction."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^(Explore|Revisit) next step$/ }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Save locally" }).click();
    const saved = await page.evaluate(
      () => JSON.parse(localStorage.getItem("crossroads-v1")!).scenario,
    );
    expect(saved.nodes).toHaveLength(62);
    expect(
      Math.max(...saved.nodes.map((n: { depth: number }) => n.depth)),
    ).toBe(5);
    await page.reload();
    await page
      .getByRole("button", { name: "Continue your saved exploration" })
      .click();
    await expect(page.getByText("Five levels ready")).toBeVisible();
    await page
      .getByRole("button", { name: "Decision details", exact: true })
      .click();
    await expect(page.getByText("STEP 5 OF 5", { exact: true })).toBeVisible();
    expect(requests).toBe(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(mobile ? 390 : 1440);
  });
}
