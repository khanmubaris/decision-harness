// Local-only integration fixture; never use this service as a real model.
import { createServer } from "node:http";
import {
  demoChoices,
  demoContext,
  demoReconsider,
  createDemo,
} from "../lib/decision/demo";
const server = createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += chunk;
  try {
    const call = JSON.parse(body);
    const input = JSON.parse(call.input);
    await new Promise((resolve) => setTimeout(resolve, 1800));
    res.setHeader("Content-Type", "application/json");
    if (input.question.includes("[rate-limit]")) {
      res.statusCode = 429;
      res.end(
        JSON.stringify({
          error: {
            message: "Simulated rate limit",
            type: "rate_limit_error",
            code: "rate_limit_exceeded",
          },
        }),
      );
      return;
    }
    let result = {
      category: "Career",
      objective: input.context.goal || demoContext.goal,
      tradeoff: "SIMULATED API TEST: ownership and growth versus stability.",
      constraints: [] as string[],
      choices: demoChoices(input.path, input.context),
    };
    if (input.mode === "reconsider_same_alternatives") {
      const revised = demoReconsider(
        { ...createDemo(), nodes: [...input.path, ...input.alternatives] },
        input.alternatives,
        input.context,
      );
      result = {
        ...revised,
        tradeoff: "SIMULATED API TEST: " + revised.tradeoff,
        choices: revised.choices.map((choice, index) => ({
          ...choice,
          alternativeId: input.alternatives[index].id,
        })),
      };
    }
    res.end(
      JSON.stringify({
        id: "resp_local_test",
        object: "response",
        created_at: 0,
        status: "completed",
        error: null,
        incomplete_details: null,
        model: "local-test-fixture",
        output: [
          {
            id: "msg_local_test",
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
  } catch {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: { message: "Invalid test request" } }));
  }
});
server.listen(4010, "127.0.0.1", () =>
  console.log(
    "Simulated Responses endpoint: http://127.0.0.1:4010/v1 (no real model or credits)",
  ),
);
