import { test } from "node:test";
import assert from "node:assert/strict";
import { createDemo, demoChoices } from "../lib/decision/demo";
import {
  attach,
  pathTo,
  requestSchema,
  resultSchema,
} from "../lib/decision/schema";
import { runway } from "../lib/finance/calculate";
test("all demo branches support five successive context-preserving steps", () => {
  const s = createDemo();
  let paths = s.nodes.map((n) => [n]);
  for (let depth = 2; depth <= 5; depth++) {
    paths = paths.flatMap((path) => {
      const nodes = attach(demoChoices(path), path.at(-1)!.id, depth);
      s.nodes.push(...nodes);
      return nodes.map((n) => [...path, n]);
    });
  }
  assert.equal(paths.length, 32);
  for (const path of paths) {
    assert.deepEqual(pathTo(s.nodes, path.at(-1)!.id), path);
    assert.equal(path.length, 5);
    assert.match(path[4].assumptions[0], new RegExp(path[3].title));
  }
  assert.equal(s.nodes.length, 62);
});
test("demo output conforms to the same schema as live generation", () => {
  const s = createDemo();
  resultSchema.parse({ ...s, choices: s.nodes });
});
test("rejects paths deeper than the expansion boundary and oversized inputs", () => {
  const s = createDemo();
  assert.equal(
    requestSchema.safeParse({
      question: s.question,
      context: s.context,
      path: Array(5).fill(s.nodes[0]),
    }).success,
    false,
  );
  assert.equal(
    requestSchema.safeParse({
      question: "x".repeat(2001),
      context: s.context,
      path: [],
    }).success,
    false,
  );
});
test("runway uses deterministic arithmetic and rejects missing or invalid inputs", () => {
  assert.equal(runway("£25,000", "2,500"), 10);
  assert.equal(runway("0", "2500"), 0);
  assert.equal(runway("", "2500"), null);
  assert.equal(runway("25000", "0"), null);
  assert.equal(runway("-500", "2500"), null);
  assert.equal(runway("unknown", "2500"), null);
});

test("model selection accepts supported choices and rejects arbitrary IDs", async () => {
  const { requestSchema } = await import("../lib/decision/schema");
  const s = createDemo();
  for (const model of ["gpt-5.4-mini", "gpt-5.4"])
    assert.equal(
      requestSchema.parse({
        question: s.question,
        context: s.context,
        path: [],
        model,
      }).model,
      model,
    );
  assert.equal(
    requestSchema.safeParse({
      question: s.question,
      context: s.context,
      path: [],
      model: "unknown-model",
    }).success,
    false,
  );
});
test("legacy saved maps and requests receive the same default model", async () => {
  const { scenarioSchema, requestSchema } =
    await import("../lib/decision/schema");
  const { model, ...oldMap } = createDemo();
  assert.equal(scenarioSchema.parse(oldMap).model, "gpt-5.4-mini");
  assert.equal(
    requestSchema.parse({
      question: oldMap.question,
      context: oldMap.context,
      path: [],
    }).model,
    "gpt-5.4-mini",
  );
  assert.equal(
    scenarioSchema.parse({ ...oldMap, model: "gpt-5.4" }).model,
    "gpt-5.4",
  );
});
