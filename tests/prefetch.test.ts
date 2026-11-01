import { test } from "node:test";
import assert from "node:assert/strict";
import { BranchPrefetch, nextPair } from "../lib/decision/prefetch";
import { createDemo } from "../lib/decision/demo";
import {
  attach,
  pathTo,
  type Choice,
  type Scenario,
} from "../lib/decision/schema";

const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
function live(): Scenario {
  return { ...createDemo(), mode: "live" };
}
function fixture() {
  const calls: {
    scenario: Scenario;
    path: Scenario["nodes"];
    signal: AbortSignal;
    resolve: (choices: Choice[]) => void;
    reject: (error: Error) => void;
  }[] = [];
  const cache = new BranchPrefetch(
    (scenario, path, signal) =>
      new Promise((resolve, reject) => {
        calls.push({ scenario, path, signal, resolve, reject });
      }),
  );
  return { cache, calls };
}

test("prepares both paths once, shares pending requests, and never recursively generates cached children", async () => {
  const scenario = live();
  const { cache, calls } = fixture();
  cache.prepare(scenario, "root");
  cache.prepare(scenario, scenario.nodes[0].id);
  const pending = cache.expand(scenario, [scenario.nodes[0]]);
  assert.equal(pending, cache.expand(scenario, [scenario.nodes[0]]));
  await tick();
  assert.equal(calls.length, 2);
  calls[0].resolve(scenario.nodes);
  calls[1].resolve(scenario.nodes);
  assert.deepEqual(await pending, scenario.nodes);
  await tick();
  cache.prepare(scenario, "root");
  assert.deepEqual(
    await cache.expand(scenario, [scenario.nodes[0]]),
    scenario.nodes,
  );
  assert.equal(calls.length, 2);
  assert.equal(scenario.nodes.length, 2);
  assert.equal(cache.getSnapshot()[scenario.nodes[0].id], "ready");
  cache.clear();
});

test("only revealed levels are prepared, with two requests maximum and foreground priority", async () => {
  const scenario = live();
  const { cache, calls } = fixture();
  cache.prepare(scenario, "root");
  await tick();
  calls[0].resolve(scenario.nodes);
  await tick();
  const children = attach(scenario.nodes, scenario.nodes[0].id, 2);
  const deeper = { ...scenario, nodes: [...scenario.nodes, ...children] };
  cache.prepare(deeper, children[0].id);
  assert.equal(cache.getSnapshot()[children[1].id], "queued");
  const wanted = cache.expand(deeper, pathTo(deeper.nodes, children[1].id));
  await tick();
  // The other original branch is still running, so only one new request may start.
  assert.equal(calls.length, 3);
  assert.equal(calls[2].path.at(-1)?.id, children[1].id);
  calls[2].resolve(scenario.nodes);
  await wanted;
  await tick();
  assert.equal(calls.length, 4);
  assert.equal(calls[3].path.at(-1)?.id, children[0].id);
  calls[1].resolve(scenario.nodes);
  calls[3].resolve(scenario.nodes);
  await tick();
  cache.clear();
});

test("speculative failures do not loop; an explicit exploration retries and can recover", async () => {
  const scenario = live();
  const { cache, calls } = fixture();
  cache.prepare(scenario, "root");
  await tick();
  calls[0].reject(new Error("Temporary outage"));
  calls[1].resolve(scenario.nodes);
  await tick();
  assert.equal(cache.getSnapshot()[scenario.nodes[0].id], "failed");
  cache.prepare(scenario, "root");
  await tick();
  assert.equal(calls.length, 2);
  const retry = cache.expand(scenario, [scenario.nodes[0]]);
  await tick();
  assert.equal(calls.length, 3);
  calls[2].resolve(scenario.nodes);
  assert.deepEqual(await retry, scenario.nodes);
  cache.clear();
});

test("scope changes abort old work and ignore responses that arrive after cancellation", async () => {
  for (const change of [
    (s: Scenario) => ({ ...s, id: "new-session" }),
    (s: Scenario) => ({ ...s, corrections: "New responsibilities" }),
    (s: Scenario) => ({ ...s, model: "gpt-5.4" as const }),
    (s: Scenario) => ({
      ...s,
      context: { ...s.context, goal: "Different goal" },
    }),
    (s: Scenario) => ({ ...s, nodes: attach(s.nodes) }),
  ]) {
    const scenario = live();
    const { cache, calls } = fixture();
    cache.prepare(scenario, "root");
    await tick();
    const next = change(scenario);
    cache.prepare(next, "root");
    await tick();
    assert(calls[0].signal.aborted && calls[1].signal.aborted);
    calls[0].resolve(scenario.nodes);
    calls[1].resolve(scenario.nodes);
    await tick();
    assert.equal(cache.getSnapshot()[next.nodes[0].id], "loading");
    assert(cache.matches(next));
    assert.equal(calls.length, 4);
    cache.clear();
    calls[2].resolve(scenario.nodes);
    calls[3].resolve(scenario.nodes);
    await tick();
    assert.deepEqual(cache.getSnapshot(), {});
  }
});

test("offline scenarios and final-depth nodes never start speculative requests", async () => {
  const demo = createDemo();
  const { cache, calls } = fixture();
  cache.prepare(demo, "root");
  const final = {
    ...live(),
    nodes: demo.nodes.map((node) => ({ ...node, depth: 5 })),
  };
  assert.deepEqual(nextPair(final, "root"), []);
  cache.prepare(final, "root");
  await tick();
  assert.equal(calls.length, 0);
  cache.clear();
});
