import { test } from "node:test";
import assert from "node:assert/strict";
import { createDemo, demoChoices, demoReconsider } from "../lib/decision/demo";
import {
  applyReconsideration,
  comparisonDimensions,
  pairFor,
} from "../lib/decision/harness";
import {
  attach,
  contextSchema,
  resultSchema,
  scenarioSchema,
  requestSchema,
} from "../lib/decision/schema";
import { money, runway } from "../lib/finance/calculate";
import { nextPair } from "../lib/decision/prefetch";
import { decisionInstructions } from "../lib/ai/instructions";

test("the founder demo responds to savings changes with arithmetic and explicit trade-offs", () => {
  const scenario = createDemo();
  assert.equal(runway(scenario.context.savings, scenario.context.expenses), 16);
  const context = { ...scenario.context, savings: "GBP 15000" };
  const result = resultSchema.parse(
    demoReconsider(scenario, scenario.nodes, context),
  );
  const updated = applyReconsideration(
    scenario,
    scenario.nodes,
    context,
    "",
    result,
  );
  assert.equal(updated.lastChange?.currentRunway, 6);
  assert.equal(updated.lastChange?.previousRunway, 16);
  assert.match(updated.nodes[0].explanation, /no margin/);
  assert.notEqual(updated.nodes[0].explanation, scenario.nodes[0].explanation);
  assert.equal(updated.nodes[0].id, scenario.nodes[0].id);
  assert.equal(updated.nodes[0].action, scenario.nodes[0].action);
  assert.equal(updated.staleNodeIds?.length, 0);
  assert(
    updated.lastChange?.nodes[0].changes.some(
      (change) => change.section === "Why?",
    ),
  );
  scenarioSchema.parse(updated);
});

test("reconsideration prunes affected descendants and marks other evaluations as stale", () => {
  const s = createDemo();
  const children = attach(demoChoices([s.nodes[0]]), s.nodes[0].id, 2);
  const grandchildren = attach(
    demoChoices([s.nodes[0], children[0]]),
    children[0].id,
    3,
  );
  s.nodes.push(...children, ...grandchildren);
  const pair = pairFor(s, children[0].id);
  const context = { ...s.context, savings: "GBP 15000" };
  const updated = applyReconsideration(
    s,
    pair,
    context,
    "",
    demoReconsider(s, pair, context),
  );
  assert.equal(updated.nodes.length, 4);
  assert.deepEqual(
    updated.staleNodeIds,
    s.nodes.slice(0, 2).map((node) => node.id),
  );
  assert.equal(nextPair(updated, "root").length, 0);
  assert.equal(nextPair(updated, children[0].id).length, 2);
  // Reviewing with the same current inputs must not mark already-reviewed paths stale again.
  const reviewedAgain = applyReconsideration(
    updated,
    pair,
    context,
    "",
    demoReconsider(updated, pair, context),
  );
  assert.deepEqual(reviewedAgain.staleNodeIds, updated.staleNodeIds);
});

test("legacy profiles/maps stay readable and updated inputs plus view survive persistence", () => {
  const demo = createDemo();
  const { decisionHorizon, ...legacyContext } = demo.context;
  assert.equal(contextSchema.parse(legacyContext).decisionHorizon, "3 years");
  const legacy = scenarioSchema.parse({
    ...demo,
    context: legacyContext,
    nodes: demo.nodes.map(({ evaluation, ...node }) => node),
  });
  assert.equal(legacy.nodes[0].evaluation, undefined);
  const saved = scenarioSchema.parse({
    ...demo,
    view: {
      selected: demo.nodes[1].id,
      pins: [demo.nodes[0].id],
      collapsed: [],
    },
  });
  assert.equal(saved.view?.selected, demo.nodes[1].id);
});

test("currency parsing rejects shorthand and malformed amounts rather than inventing precision", () => {
  assert.equal(money("GBP15000"), 15000);
  assert.equal(money("£15,000"), 15000);
  assert.equal(money("15000 GBP"), 15000);
  for (const value of [
    "15k",
    "15,000 per month",
    "-10",
    "Infinity",
    "1.2.3",
    "unknown",
  ])
    assert.equal(money(value), null);
  assert.equal(runway("GBP 15000", "GBP 3250"), 4.6);
});

test("comparison is qualitative and reconsideration gives updated profile precedence", () => {
  const demo = createDemo();
  assert(comparisonDimensions(demo.nodes).includes("Flexibility"));
  assert(demo.nodes.every((node) => node.evaluation?.betterWhen));
  const input = requestSchema.parse({
    ...demo,
    mode: "reconsider",
    path: [],
    alternatives: demo.nodes,
  });
  assert.match(decisionInstructions(input), /override older facts/);
  assert.match(
    decisionInstructions(input),
    /titles and actions copied exactly/,
  );
  assert.match(decisionInstructions(input), /Never assign arbitrary scores/);
});

test("reconsidered responses bind to validated IDs, never rewritten labels or output order", async () => {
  const { matchReconsideredAlternatives } =
    await import("../lib/decision/harness");
  const s = createDemo();
  const result = demoReconsider(s, s.nodes, s.context);
  const response = {
    ...result,
    choices: result.choices
      .map((choice, index) => ({
        ...choice,
        alternativeId: s.nodes[index].id,
        title: `Reworded ${index}`,
        action: `Reworded action ${index}`,
      }))
      .reverse(),
  };
  const matched = matchReconsideredAlternatives(response, s.nodes);
  assert.equal(matched.choices[0].title, s.nodes[0].title);
  assert.equal(matched.choices[0].action, s.nodes[0].action);
  assert.equal(matched.choices[0].financial, result.choices[0].financial);
  assert.throws(() =>
    matchReconsideredAlternatives(
      {
        ...response,
        choices: response.choices.map((choice) => ({
          ...choice,
          alternativeId: "unknown",
        })),
      },
      s.nodes,
    ),
  );
});

test("older saved career demos keep career alternatives rather than switching to founder decisions", () => {
  const s = createDemo();
  s.nodes[0].title = "Join the startup";
  const choices = demoChoices([s.nodes[0]], s.context);
  assert.equal(choices[0].title, "Own a product launch");
  assert.equal(runway("GBP 15000", "USD 2500"), null);
  assert.equal(money("1,50"), null);
});
