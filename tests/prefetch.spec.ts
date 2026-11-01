import { test, expect, type Page } from "@playwright/test";
import { createDemo, demoChoices } from "../lib/decision/demo";
import type { Scenario } from "../lib/decision/schema";

type Input = Pick<
  Scenario,
  "question" | "context" | "model" | "corrections"
> & { path: Scenario["nodes"] };
const demo = createDemo();
function response(input: Input) {
  return {
    category: demo.category,
    objective: demo.objective,
    tradeoff: demo.tradeoff,
    constraints: demo.constraints,
    choices: demoChoices(input.path).map((choice) => ({
      ...choice,
      title: input.corrections ? `Updated: ${choice.title}` : choice.title,
    })),
  };
}
async function begin(page: Page) {
  await page.route("**/api/profile-defaults", (route) =>
    route.fulfill({ json: { profile: null } }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Explore My Crossroads" }).click();
  await page
    .getByRole("button", { name: "Fill fictional career example" })
    .click();
  await page.getByLabel("AI model", { exact: true }).selectOption("gpt-5.4");
  await page.getByRole("button", { name: "Generate my crossroads" }).click();
  await expect(page.locator(".workspace")).toBeVisible();
}
async function selectStartup(page: Page) {
  await page
    .getByRole("button", {
      name: "Explore Quit and build full-time",
      exact: true,
    })
    .click();
}

test("both paths preload before selection; cached expansion reveals only the chosen level", async ({
  page,
}) => {
  const calls: Input[] = [];
  await page.route("**/api/decision", async (route) => {
    const input = route.request().postDataJSON() as Input;
    calls.push(input);
    await route.fulfill({ json: response(input) });
  });
  await begin(page);
  await expect.poll(() => calls.length).toBe(3);
  await expect(page.locator(".map-card")).toHaveCount(3);
  expect(
    calls
      .slice(1)
      .every((input) => input.path.length === 1 && input.model === "gpt-5.4"),
  ).toBe(true);
  expect(new Set(calls.slice(1).map((input) => input.path[0].id)).size).toBe(2);
  expect(calls[1].context).toEqual(calls[0].context);
  await selectStartup(page);
  await expect(
    page.getByText("Next paths are ready.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Explore next step", exact: true })
    .click();
  await expect(page.getByText("STEP 2 OF 5", { exact: true })).toBeVisible({
    timeout: 1500,
  });
  await expect(page.locator(".map-card")).toHaveCount(5);
  await expect.poll(() => calls.length).toBe(5);
  expect(calls.filter((input) => input.path.length === 1)).toHaveLength(2);
  expect(calls.filter((input) => input.path.length === 2)).toHaveLength(2);
  // Background completion must not recursively generate the rest of the tree.
  await page.waitForTimeout(400);
  expect(calls).toHaveLength(5);
});

test("exploring while preloading joins the same request without duplicates", async ({
  page,
}) => {
  const calls: Input[] = [];
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/decision", async (route) => {
    const input = route.request().postDataJSON() as Input;
    calls.push(input);
    if (input.path.length) await gate;
    await route.fulfill({ json: response(input) });
  });
  await begin(page);
  await expect.poll(() => calls.length).toBe(3);
  await selectStartup(page);
  await expect(
    page.getByText("Preparing the next possibilities…"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Explore next step", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Exploring possibilities…" }),
  ).toBeDisabled();
  expect(calls).toHaveLength(3);
  release();
  await expect(page.getByText("STEP 2 OF 5", { exact: true })).toBeVisible();
  expect(calls.filter((input) => input.path.length === 1)).toHaveLength(2);
});

test("background failures stay quiet and an explicit exploration retries successfully", async ({
  page,
}) => {
  const calls: Input[] = [];
  const attempts = new Map<string, number>();
  await page.route("**/api/decision", async (route) => {
    const input = route.request().postDataJSON() as Input;
    calls.push(input);
    const id = input.path.at(-1)?.id;
    if (id) attempts.set(id, (attempts.get(id) ?? 0) + 1);
    await route.fulfill(
      id && attempts.get(id) === 1
        ? { status: 503, json: { error: "Temporarily unavailable" } }
        : { json: response(input) },
    );
  });
  await begin(page);
  await expect.poll(() => calls.length).toBe(3);
  await selectStartup(page);
  await expect(
    page.getByText("Next paths will be generated when you explore."),
  ).toBeVisible();
  await expect(page.locator(".error-toast")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Explore next step", exact: true })
    .click();
  await expect(page.getByText("STEP 2 OF 5", { exact: true })).toBeVisible();
  expect(calls.filter((input) => input.path.length === 1)).toHaveLength(3);
  await expect(page.locator(".error-toast")).toHaveCount(0);
});

test("corrections discard old requests and warm both corrected paths", async ({
  page,
}) => {
  const calls: Input[] = [];
  let release!: () => void;
  const oldWork = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/decision", async (route) => {
    const input = route.request().postDataJSON() as Input;
    calls.push(input);
    if (input.path.length && !input.corrections) await oldWork;
    await route.fulfill({ json: response(input) }).catch(() => {});
  });
  await begin(page);
  await expect.poll(() => calls.length).toBe(3);
  await page
    .getByRole("button", { name: "Decision details", exact: true })
    .click();
  await page.getByText("Correct an assumption", { exact: true }).click();
  await page
    .locator("#correction")
    .fill("I now have additional family responsibilities.");
  await page
    .getByRole("button", { name: "Apply & regenerate", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Explore Updated: Quit and build full-time",
      exact: true,
    }),
  ).toBeVisible();
  await expect
    .poll(
      () =>
        calls.filter((input) => input.corrections && input.path.length === 1)
          .length,
    )
    .toBe(2);
  release();
  await page
    .getByRole("button", {
      name: "Explore Updated: Quit and build full-time",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Next paths are ready.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Explore next step", exact: true })
    .click();
  await expect(page.getByText("STEP 2 OF 5", { exact: true })).toBeVisible();
  await expect(page.locator(".details h2")).toContainText("Updated:");
  expect(
    calls.filter((input) => input.corrections && input.path.length === 1),
  ).toHaveLength(2);
  expect(calls.every((input) => input.model === "gpt-5.4")).toBe(true);
});

test("starting over during background work leaves the new exploration untouched", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let prefetched = 0;
  await page.route("**/api/decision", async (route) => {
    const input = route.request().postDataJSON() as Input;
    if (input.path.length) {
      prefetched++;
      await gate;
    }
    await route.fulfill({ json: response(input) }).catch(() => {});
  });
  await begin(page);
  await expect.poll(() => prefetched).toBe(2);
  await page
    .getByRole("button", { name: "New crossroads", exact: true })
    .click();
  release();
  await expect(
    page.getByRole("button", { name: "Explore My Crossroads" }),
  ).toBeVisible();
  await expect(page.locator(".workspace")).toHaveCount(0);
  await expect(page.locator(".error-toast")).toHaveCount(0);
});
