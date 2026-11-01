import { test } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/decision/route";
import { createDemo } from "../lib/decision/demo";
const demo = createDemo();
const payload = { question: demo.question, context: demo.context, path: [] };
const request = (body: unknown, origin?: string) =>
  new Request("http://localhost:3000/api/decision", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(origin ? { origin } : {}),
    },
    body: JSON.stringify(body),
  });
test("API explicitly reports missing credentials without returning demo output", async () => {
  const previous = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const res = await POST(request(payload));
    assert.equal(res.status, 503);
    const data = await res.json();
    assert.match(data.error, /OPENAI_API_KEY/);
    assert.equal(data.choices, undefined);
  } finally {
    if (previous !== undefined) process.env.OPENAI_API_KEY = previous;
  }
});
test("API rejects an unrelated web origin", async () => {
  const res = await POST(request(payload, "https://unrelated.example"));
  assert.equal(res.status, 403);
});
test("API rejects invalid JSON and oversized payloads", async () => {
  const malformed = await POST(
    new Request("http://localhost:3000/api/decision", {
      method: "POST",
      body: "{",
    }),
  );
  assert.equal(malformed.status, 400);
  const oversized = await POST(
    request({ ...payload, question: "x".repeat(51000) }),
  );
  assert.equal(oversized.status, 413);
});
test("API rejects broken ancestry and a sixth-step expansion", async () => {
  const broken = await POST(
    request({ ...payload, path: [{ ...demo.nodes[0], parentId: "not-root" }] }),
  );
  assert.equal(broken.status, 400);
  const tooDeep = await POST(
    request({ ...payload, path: Array(5).fill(demo.nodes[0]) }),
  );
  assert.equal(tooDeep.status, 400);
});

test("API accepts the browser Host when Next uses an internal bind address", async () => {
  const previous = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const res = await POST(
      new Request("http://0.0.0.0:3000/api/decision", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          host: "localhost:3000",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
    );
    assert.equal(res.status, 503);
    assert.match((await res.json()).error, /OPENAI_API_KEY/);
  } finally {
    if (previous !== undefined) process.env.OPENAI_API_KEY = previous;
  }
});
