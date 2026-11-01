import { test, expect } from "@playwright/test";
import { createDemo } from "../lib/decision/demo";
import { emptyContext } from "../lib/decision/schema";
test("offline five-step journey, backtracking, comparison, persistence and collapse", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try the demo" }).click();
  await expect(
    page.getByText("Pre-generated demo", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Explore Quit and build full-time",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Add to comparison" }).click();
  for (let step = 2; step <= 5; step++) {
    await page.getByRole("button", { name: "Explore next step" }).click();
    await expect(
      page.getByText(`STEP ${step} OF 5`, { exact: true }),
    ).toBeVisible();
  }
  await expect(
    page.getByText("Five steps explored. A possibility, not a prediction."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add to comparison" }).click();
  await page.getByRole("button", { name: /Compare paths/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByText("Inspect assumptions and supporting details").click();
  await expect(
    page
      .getByRole("dialog")
      .getByText("Financial implications", { exact: true }),
  ).toHaveCount(2);
  await page.getByRole("button", { name: "Close comparison" }).click();
  await page.getByRole("button", { name: "Back a step" }).click();
  await expect(page.getByText("STEP 4 OF 5", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Collapse branches" }).click();
  await expect(
    page.getByRole("button", { name: "Show branches" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Explore next step" }).click();
  await expect(page.getByText("STEP 5 OF 5", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Save locally" }).click();
  await page.reload();
  await page
    .getByRole("button", { name: "Continue your saved exploration" })
    .click();
  await expect(
    page.getByText("Pre-generated demo", { exact: true }),
  ).toBeVisible();
});
test("mobile landing and context form fit viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.getByRole("button", { name: /Should I move abroad/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("Annual gross income")).toHaveCount(0);
  await page.getByLabel("Primary objective").fill("Being close to family");
  await page.getByRole("button", { name: "Use offline demo" }).click();
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
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
test("live UI handles an API failure and can recover", async ({ page }) => {
  await page.route("**/api/decision", (r) =>
    r.fulfill({
      status: 429,
      json: { error: "OpenAI is rate-limited. Please retry." },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Explore My Crossroads" }).click();
  await page
    .getByRole("textbox", { name: "Your crossroads", exact: true })
    .fill("Should I move to another country?");
  await page.getByRole("button", { name: "Generate my crossroads" }).click();
  await expect(page.locator(".generation-error")).toContainText("rate-limited");
  await expect(
    page.getByRole("button", { name: "Generate my crossroads" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Use offline demo" }).click();
  await expect(
    page.getByText("Pre-generated demo", { exact: true }),
  ).toBeVisible();
});
test("live response renders and expansion sends selected ancestry", async ({
  page,
}) => {
  const demo = createDemo();
  const calls: unknown[] = [];
  await page.route("**/api/decision", async (r) => {
    calls.push(r.request().postDataJSON());
    await r.fulfill({
      json: {
        category: demo.category,
        objective: demo.objective,
        tradeoff: demo.tradeoff,
        constraints: demo.constraints,
        choices: demo.nodes,
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Explore My Crossroads" }).click();
  await page
    .getByRole("button", { name: "Fill fictional career example" })
    .click();
  await page.getByRole("button", { name: "Generate my crossroads" }).click();
  await expect(
    page.getByText("Live AI scenario", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Explore Quit and build full-time",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Explore next step" }).click();
  await expect(page.getByText("STEP 2 OF 5", { exact: true })).toBeVisible();
  expect((calls[1] as { path: unknown[] }).path).toHaveLength(1);
});
test("API rejects invalid payloads and bad ancestry before requesting OpenAI", async ({
  request,
}) => {
  const a = await request.post("/api/decision", {
    data: { question: "short" },
  });
  expect(a.status()).toBe(400);
  const s = createDemo();
  const b = await request.post("/api/decision", {
    data: {
      question: s.question,
      context: emptyContext,
      path: [{ ...s.nodes[0], parentId: "bad" }],
    },
  });
  expect(b.status()).toBe(400);
  const c = await request.post("/api/decision", { data: "{" });
  expect(c.status()).toBe(400);
});
