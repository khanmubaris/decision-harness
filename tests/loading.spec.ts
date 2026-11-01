import { test, expect, type Page } from "@playwright/test";
import { createDemo } from "../lib/decision/demo";

const question = "Should I leave my stable job for a startup?";
const demo = createDemo();
const result = {
  category: demo.category,
  objective: demo.objective,
  tradeoff: demo.tradeoff,
  constraints: demo.constraints,
  choices: demo.nodes,
};
async function begin(page: Page) {
  await page.route("**/api/profile-defaults", (route) =>
    route.fulfill({ json: { profile: null } }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Explore My Crossroads" }).click();
  await page
    .getByRole("textbox", { name: "Your crossroads", exact: true })
    .fill(question);
  await page.getByRole("button", { name: "Generate my crossroads" }).click();
  await expect(page.locator(".possibility-loader")).toBeVisible();
}

test("loading remains animated at 5, 45 and 50 seconds; response is immediately usable", async ({
  page,
}) => {
  test.setTimeout(75000);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/decision", async (route) => {
    await gate;
    await route.fulfill({ json: result });
  });
  await begin(page);
  const started = Date.now();
  for (const seconds of [5, 45, 50]) {
    await page.waitForTimeout(
      Math.max(0, seconds * 1000 - (Date.now() - started)),
    );
    await expect(page.getByRole("dialog")).toHaveAttribute("aria-busy", "true");
    await expect(
      page
        .getByRole("dialog")
        .getByRole("heading", { name: question, exact: true }),
    ).toBeVisible();
    const motion = await page
      .locator(".possibility-art")
      .evaluate(
        (el) =>
          el
            .getAnimations({ subtree: true })
            .filter((animation) => animation.playState === "running").length,
      );
    expect(motion).toBeGreaterThan(10);
    if (seconds === 5)
      await page.screenshot({ path: "docs/loading-desktop.png" });
  }
  release();
  await expect(page.locator(".workspace")).toBeVisible({ timeout: 1500 });
  // Do not wait for the outgoing illustration to finish before clicking a real path.
  await page
    .getByRole("button", {
      name: "Explore Quit and build full-time",
      exact: true,
    })
    .click();
  await expect(
    page
      .locator("aside")
      .getByRole("heading", { name: "Quit and build full-time", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".possibility-handoff")).toHaveCount(0);
  await page.screenshot({ path: "docs/loading-success.png" });
});

test("a failed request stops the animation; Retry resends preserved details and succeeds", async ({
  page,
}) => {
  const calls: unknown[] = [];
  await page.route("**/api/decision", async (route) => {
    calls.push(route.request().postDataJSON());
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.fulfill(
      calls.length === 1
        ? {
            status: 503,
            json: { error: "The service is temporarily unavailable." },
          }
        : { json: result },
    );
  });
  await begin(page);
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Your question and details are still here",
  );
  await expect(page.locator(".possibility-loader")).toHaveCount(0);
  await page.getByRole("button", { name: "Retry generation" }).click();
  await expect(page.locator(".workspace")).toBeVisible();
  const initialCalls = calls.filter(
    (call) => (call as { path: unknown[] }).path.length === 0,
  );
  expect(initialCalls).toHaveLength(2);
  expect(initialCalls[1]).toEqual(initialCalls[0]);
});

for (const reducedMotion of [false, true]) {
  test(`mobile loading and success${reducedMotion ? " with reduced motion" : ""}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({
      reducedMotion: reducedMotion ? "reduce" : "no-preference",
    });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/decision", async (route) => {
      await gate;
      await route.fulfill({ json: result });
    });
    await begin(page);
    await page.waitForTimeout(5000);
    const dialog = await page.getByRole("dialog").boundingBox();
    expect(dialog!.x).toBeGreaterThanOrEqual(0);
    expect(dialog!.x + dialog!.width).toBeLessThanOrEqual(390);
    expect(dialog!.y + dialog!.height).toBeLessThanOrEqual(844);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
    if (reducedMotion) {
      expect(
        await page
          .locator(".possibility-art")
          .evaluate((el) => el.getAnimations({ subtree: true }).length),
      ).toBe(0);
      await expect(page.locator(".possibility-messages p").first()).toHaveCSS(
        "opacity",
        "1",
      );
      await expect(page.locator(".possibility-node").first()).toHaveCSS(
        "opacity",
        "1",
      );
    }
    await page.screenshot({
      path: `docs/loading-mobile${reducedMotion ? "-reduced" : ""}.png`,
    });
    release();
    await expect(page.locator(".workspace")).toBeVisible();
    if (reducedMotion)
      await expect(page.locator(".map-card").first()).toHaveCSS(
        "animation-name",
        "none",
      );
  });
}
