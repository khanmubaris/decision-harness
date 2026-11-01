import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import {
  requestSchema,
  resultSchema,
  reconsiderResultSchema,
} from "../decision/schema";
import { runway } from "../finance/calculate";
import { z } from "zod";
import { decisionInstructions } from "./instructions";
import { matchReconsideredAlternatives } from "../decision/harness";
export async function generate(
  rawInput: z.input<typeof requestSchema>,
  signal?: AbortSignal,
) {
  const input = requestSchema.parse(rawInput);
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 45000,
    maxRetries: 0,
  });
  const response = await client.responses.parse(
    {
      model: input.model,
      store: false,
      max_output_tokens: 6000,
      instructions: decisionInstructions(input),
      input: JSON.stringify({
        ...input,
        mode:
          input.mode === "reconsider"
            ? "reconsider_same_alternatives"
            : input.path.length
              ? "expand_committed_history"
              : "initial_decision",
        committedActions: input.path.map((node) => ({
          step: node.depth,
          action: node.action,
          outcome: node.summary,
          horizon: node.horizon,
        })),
        nextDecisionCandidates: input.path.at(-1)?.nextDecisions ?? [],
        inputChanges: input.previousContext
          ? Object.entries(input.context)
              .filter(
                ([key, value]) =>
                  value !==
                  input.previousContext![key as keyof typeof input.context],
              )
              .map(([field, current]) => ({
                field,
                previous:
                  input.previousContext![field as keyof typeof input.context],
                current,
              }))
          : [],
        previousExpenseCoverMonths: input.previousContext
          ? runway(
              input.previousContext.savings,
              input.previousContext.expenses,
            )
          : null,
        expenseCoverBasis:
          "Savings divided by monthly living expenses with no income. Excludes business costs, taxes and emergencies; not a business runway forecast.",
        calculatedRunwayMonths: runway(
          input.context.savings,
          input.context.expenses,
        ),
      }),
      text: {
        format: zodTextFormat(
          input.mode === "reconsider" ? reconsiderResultSchema : resultSchema,
          "crossroads",
        ),
      },
    },
    { signal },
  );
  if (response.status !== "completed" || !response.output_parsed)
    throw new Error("INCOMPLETE");
  return input.mode === "reconsider"
    ? matchReconsideredAlternatives(response.output_parsed, input.alternatives)
    : resultSchema.parse(response.output_parsed);
}
