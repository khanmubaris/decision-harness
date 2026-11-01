import { test, expect } from "@playwright/test";
import { createDemo, demoChoices, demoReconsider } from "../lib/decision/demo";
import type { Context, Scenario } from "../lib/decision/schema";

for (const mobile of [false, true]) {
  test(`founder decision workflow: local What If, changed reasoning, comparison and persistence${mobile ? " on mobile" : ""}`, async ({
    page,
  }) => {
    await page.setViewportSize(
      mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    );
    let aiCalls = 0;
    await page.route("**/api/decision", async (route) => {
      aiCalls++;
      await route.abort();
    });
    await page.goto("/");
    if (!mobile)
      await page.screenshot({
        path: "docs/personal-decision-landing.png",
        fullPage: true,
      });
    await page.getByRole("button", { name: "Try the demo" }).click();
    await page
      .getByRole("button", {
        name: "Explore Quit and build full-time",
        exact: true,
      })
      .click();
    await expect(
      page.locator(".details").getByText("Why?", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Add to comparison" }).click();
    await page
      .getByRole("button", { name: "What if things change?", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Savings", { exact: true }).fill("GBP 15000");
    await expect(dialog.locator(".runway-preview")).toContainText("16 months");
    await expect(dialog.locator(".runway-preview")).toContainText("6 months");
    expect(aiCalls).toBe(0);
    await page.screenshot({
      path: `docs/what-if-${mobile ? "mobile" : "desktop"}.png`,
      fullPage: true,
    });
    await dialog
      .getByRole("button", { name: "Reconsider these paths" })
      .click();
    await expect(page.locator(".revision-summary")).toContainText(
      "16 → 6 months",
    );
    await expect(page.locator(".details")).toContainText("no margin");
    await expect(page.locator(".changed-section").first()).toBeVisible();
    await page
      .getByRole("button", {
        name: "Explore Stay employed and build part-time",
        exact: true,
      })
      .click();
    await page.getByRole("button", { name: "Add to comparison" }).click();
    await page.getByRole("button", { name: /Compare paths/ }).click();
    await expect(
      page.getByRole("cell", { name: /salary|employment|income/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("rowheader", {
        name: "What would make each path a better choice?",
      }),
    ).toBeVisible();
    await page.screenshot({
      path: `docs/decision-comparison-${mobile ? "mobile" : "desktop"}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Close comparison" }).click();
    await page.getByRole("button", { name: "Save locally" }).click();
    await page.reload();
    await page
      .getByRole("button", { name: "Continue your saved exploration" })
      .click();
    await expect(page.locator(".revision-summary")).toContainText("GBP 15000");
    await page
      .getByRole("button", { name: "Decision details", exact: true })
      .click();
    await expect(page.locator(".details h2")).toContainText("Stay employed");
    await page
      .getByRole("button", { name: "Explore next step", exact: true })
      .click();
    await expect(page.getByText("STEP 2 OF 5", { exact: true })).toBeVisible();
    expect(aiCalls).toBe(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(mobile ? 390 : 1440);
  });
}

test("live reconsideration uses updated inputs, keeps original alternatives, and preserves state after failure", async ({
  page,
}) => {
  const demo = createDemo();
  const calls: {
    context: Context;
    mode?: string;
    alternatives?: Scenario["nodes"];
    path: Scenario["nodes"];
    corrections: string;
    model: string;
  }[] = [];
  let fail = true;
  await page.route("**/api/profile-defaults", (route) =>
    route.fulfill({ json: { profile: null } }),
  );
  await page.route("**/api/decision", async (route) => {
    const input = route.request().postDataJSON();
    calls.push(input);
    if (input.mode === "reconsider") {
      if (fail) {
        fail = false;
        await route.fulfill({
          status: 503,
          json: { error: "Temporary failure" },
        });
        return;
      }
      await route.fulfill({
        json: demoReconsider(
          { ...demo, nodes: input.alternatives },
          input.alternatives,
          input.context,
        ),
      });
    } else
      await route.fulfill({
        json: { ...demo, choices: demoChoices(input.path, input.context) },
      });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Explore My Crossroads" }).click();
  await page
    .getByRole("button", { name: "Fill fictional career example" })
    .click();
  await page
    .getByRole("combobox", { name: "Decision horizon", exact: true })
    .selectOption("5 years");
  await page.getByRole("button", { name: "Generate my crossroads" }).click();
  await page
    .getByRole("button", {
      name: "Explore Quit and build full-time",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "What if things change?", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Savings", { exact: true })
    .fill("GBP 15000");
  await page.getByRole("button", { name: "Reconsider these paths" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Your current map has not changed",
  );
  await expect(
    page.getByRole("dialog").getByLabel("Savings", { exact: true }),
  ).toHaveValue("GBP 15000");
  await expect(page.locator(".revision-summary")).toHaveCount(0);
  await page.getByRole("button", { name: "Retry reconsideration" }).click();
  await expect(page.locator(".revision-summary")).toContainText(
    "16 → 6 months",
  );
  const reconsidered = calls.filter((call) => call.mode === "reconsider");
  expect(reconsidered).toHaveLength(2);
  expect(reconsidered[1].context.savings).toBe("GBP 15000");
  expect(reconsidered[1].context.decisionHorizon).toBe("5 years");
  expect(reconsidered[1].alternatives).toHaveLength(2);
  expect(reconsidered[1].path).toHaveLength(0);
  await expect(
    page.getByRole("button", {
      name: "Explore Quit and build full-time",
      exact: true,
    }),
  ).toBeVisible();
});

test("reconsidering a later pair clears descendants and marks other paths for review", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try the demo" }).click();
  await page
    .getByRole("button", {
      name: "Explore Quit and build full-time",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Explore next step", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Explore next step", exact: true })
    .click();
  await page.getByRole("button", { name: "Back a step", exact: true }).click();
  await page
    .getByRole("button", { name: "What if things change?", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Savings", { exact: true })
    .fill("GBP 15000");
  await page.getByRole("button", { name: "Reconsider these paths" }).click();
  await expect(page.locator(".map-card")).toHaveCount(5);
  await page.getByRole("button", { name: "Back a step", exact: true }).click();
  await expect(page.locator(".stale-analysis")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Revisit next step", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "What if things change?", exact: true }),
  ).toBeEnabled();
});
