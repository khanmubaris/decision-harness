import { test, expect } from "@playwright/test";

const examples = [
  "Should I take the new job?",
  "Should I buy a home or keep investing?",
  "Should I move abroad?",
  "Should I take a year off and start over?",
];

test("new landing entry points preserve decision input and example prefills", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".landing, .hero-map")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Stop asking AI what to do.Start testing what could happen.",
  );
  await page
    .getByRole("button", { name: "Put a decision to the test" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Your crossroads", exact: true }),
  ).toBeEditable();
  await page.getByRole("button", { name: "Close context form" }).click();
  for (const question of examples) {
    await page
      .locator(".lp-example-list")
      .getByRole("button", { name: new RegExp(question.replace("?", "\\?")) })
      .click();
    await expect(
      page.getByRole("textbox", { name: "Your crossroads", exact: true }),
    ).toHaveValue(question);
    await page.getByRole("button", { name: "Close context form" }).click();
  }
  await page
    .getByRole("textbox", { name: "Your decision", exact: true })
    .fill("Should I study part-time while working?");
  await page
    .getByRole("button", { name: "Explore My Crossroads", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Your crossroads", exact: true }),
  ).toHaveValue("Should I study part-time while working?");
});

test("illustrative controls work without AI calls and connect to the full demo", async ({
  page,
}) => {
  let aiCalls = 0;
  await page.route("**/api/decision", async (route) => {
    aiCalls++;
    await route.abort();
  });
  await page.goto("/");
  const hero = page.getByRole("region", {
    name: "Interactive illustrative decision harness",
  });
  await expect(hero).toContainText("16 months’ personal expense cover");
  await hero
    .getByRole("button", { name: "Inspect Build part-time", exact: true })
    .click();
  await expect(hero).toContainText("Retain employment income");
  await hero
    .getByRole("button", { name: "Inspect Build full-time", exact: true })
    .click();
  await hero
    .getByRole("button", { name: /What if your savings decreased/ })
    .click();
  await expect(hero).toContainText("6 months’ personal expense cover");
  await expect(
    page.getByRole("slider", { name: "Current savings" }),
  ).toHaveValue("15000");
  await hero.getByRole("button", { name: /Important assumptions/ }).click();
  await expect(hero).toContainText(
    "excludes business costs, tax and emergencies",
  );
  await page.getByRole("link", { name: "See how Crossroads works" }).click();
  await expect(page).toHaveURL(/#how-it-works$/);
  await page
    .locator(".lp-stage-track")
    .getByRole("button", { name: /04 Stress-test/ })
    .click();
  await expect(page.locator(".lp-stage-detail")).toContainText(
    "Reduce your savings from £40,000 to £15,000",
  );
  await page.getByRole("slider", { name: "Current savings" }).fill("25000");
  await expect(page.locator(".lp-local-result")).toContainText("10months");
  await page
    .getByRole("button", { name: "Time to build", exact: true })
    .click();
  await expect(page.locator(".lp-priority-insight")).toContainText(
    "Building full-time creates more focused time",
  );
  await page
    .locator(".lp-mini-map")
    .getByRole("button", { name: /Build part-time/ })
    .click();
  await page
    .getByRole("button", { name: "Validate a niche", exact: true })
    .click();
  await expect(page.locator(".lp-map-explanation")).toContainText(
    "what evidence would make this step worth taking",
  );
  expect(aiCalls).toBe(0);
  await page
    .getByRole("button", { name: "Open the full interactive demo" })
    .click();
  await expect(
    page.getByText("Pre-generated demo", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Explore Quit and build full-time",
      exact: true,
    }),
  ).toBeVisible();
  expect(aiCalls).toBe(0);
});

for (const width of [1440, 1280, 768, 390, 320]) {
  test(`landing layout and motion preferences at ${width}px`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: width >= 1280 ? 900 : 844 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator(".lp-lab")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    if (width >= 1280) {
      const bounds = await page
        .getByRole("button", { name: "Put a decision to the test" })
        .boundingBox();
      expect(bounds!.y + bounds!.height).toBeLessThan(800);
      const tops = await page
        .locator(".lp-stage-number")
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getBoundingClientRect().top),
        );
      expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(2);
    }
    // All interactive feature panels must fit, not merely be clipped by the page.
    for (const selector of [
      ".lp-lab",
      ".lp-assumption-sandbox",
      ".lp-tradeoff-sandbox",
      ".lp-mini-map",
    ]) {
      const bounds = await page.locator(selector).boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      const overflow = await page
        .locator(selector)
        .evaluate((el) => el.scrollWidth - el.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    }
    if (width === 1440 || width === 390) {
      await page.screenshot({
        path: `docs/landing-harness-${width === 1440 ? "desktop" : "mobile-viewport"}.png`,
      });
      await page
        .locator(".lp-lab")
        .screenshot({ path: `docs/landing-harness-lab-${width}.png` });
      await page
        .locator(".lp-workflow")
        .screenshot({ path: `docs/landing-harness-workflow-${width}.png` });
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    const animations = await page
      .locator(".harness-landing")
      .evaluate(
        (el) =>
          el
            .getAnimations({ subtree: true })
            .filter((a) => a.playState === "running").length,
      );
    expect(animations).toBe(0);
    await expect(page.locator(".lp-analysis-pulse")).toBeHidden();
    await page
      .getByRole("button", { name: "Put a decision to the test" })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(errors).toEqual([]);
  });
}
