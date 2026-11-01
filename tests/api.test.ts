import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { generate } from "../lib/ai/engine";
import { createDemo } from "../lib/decision/demo";

test("real SDK serialises structured schema, passes context, and parses a simulated Responses reply", async () => {
  const demo = createDemo();
  let captured: Record<string, any> | undefined;
  const result = {
    category: demo.category,
    objective: demo.objective,
    tradeoff: demo.tradeoff,
    constraints: demo.constraints,
    choices: demo.nodes.map(({ id, parentId, depth, ...choice }) => choice),
  };
  const server = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    captured = JSON.parse(body);
    assert.equal(req.url, "/v1/responses");
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        id: "resp_test",
        object: "response",
        created_at: 0,
        status: "completed",
        error: null,
        incomplete_details: null,
        model: "gpt-5.4-mini",
        output: [
          {
            id: "msg_test",
            type: "message",
            role: "assistant",
            status: "completed",
            content: [
              {
                type: "output_text",
                text: JSON.stringify(result),
                annotations: [],
              },
            ],
          },
        ],
      }),
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  const before = {
    key: process.env.OPENAI_API_KEY,
    url: process.env.OPENAI_BASE_URL,
  };
  process.env.OPENAI_API_KEY = "test-placeholder-not-a-real-key";
  process.env.OPENAI_BASE_URL = `http://127.0.0.1:${address.port}/v1`;
  try {
    const output = await generate({
      model: "gpt-5.4",
      question: demo.question,
      context: demo.context,
      path: [demo.nodes[0]],
      corrections: "I now support a dependant.",
    });
    assert.deepEqual(output, result);
    assert.equal(captured!.model, "gpt-5.4");
    assert.equal(captured!.store, false);
    assert.equal(captured!.text.format.type, "json_schema");
    assert.equal(captured!.text.format.strict, true);
    assert.equal(captured!.max_output_tokens, 6000);
    const input = JSON.parse(captured!.input);
    assert.equal(input.calculatedRunwayMonths, 16);
    assert.equal(input.path[0].title, "Quit and build full-time");
    assert.equal(input.corrections, "I now support a dependant.");
    assert.match(captured!.instructions, /step 2 of 5/);
  } finally {
    if (before.key === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = before.key;
    if (before.url === undefined) delete process.env.OPENAI_BASE_URL;
    else process.env.OPENAI_BASE_URL = before.url;
    server.close();
    await once(server, "close");
  }
});

test("cancelling an exploration aborts the upstream SDK request", async () => {
  const demo = createDemo();
  let received!: () => void;
  const requestArrived = new Promise<void>((resolve) => {
    received = resolve;
  });
  const server = createServer(async (req) => {
    for await (const _chunk of req) {
      /* Consume the body; deliberately hold the response. */
    }
    received();
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  const before = {
    key: process.env.OPENAI_API_KEY,
    url: process.env.OPENAI_BASE_URL,
  };
  process.env.OPENAI_API_KEY = "test-placeholder-not-a-real-key";
  process.env.OPENAI_BASE_URL = `http://127.0.0.1:${address.port}/v1`;
  try {
    const controller = new AbortController();
    const request = generate(
      {
        model: demo.model,
        question: demo.question,
        context: demo.context,
        path: [demo.nodes[0]],
        corrections: "",
      },
      controller.signal,
    );
    const rejected = assert.rejects(request, {
      name: "Error",
      message: /aborted/i,
    });
    await requestArrived;
    controller.abort();
    await rejected;
  } finally {
    if (before.key === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = before.key;
    if (before.url === undefined) delete process.env.OPENAI_BASE_URL;
    else process.env.OPENAI_BASE_URL = before.url;
    server.closeAllConnections();
    server.close();
    await once(server, "close");
  }
});
