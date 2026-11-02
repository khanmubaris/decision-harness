import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { requestSchema, resultSchema, reconsiderResultSchema } from "../decision/schema";
import { runway } from "../finance/calculate";
import { z } from "zod";
import { decisionInstructions } from "./instructions";
import { matchReconsideredAlternatives } from "../decision/harness";

export class ProviderError extends Error {
  constructor(message: string, readonly status?: number) { super(message); }
}

function safeCompatibleUrl(baseUrl: string) {
  let url: URL;
  try { url = new URL(baseUrl); } catch { throw new ProviderError("Enter a valid HTTPS API base URL."); }
  const host = url.hostname.toLowerCase();
  const privateHost = host === "localhost" || host === "::1" || host.startsWith("127.") || host.startsWith("10.") || host.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
  if (url.protocol !== "https:" || privateHost) throw new ProviderError("Use a public HTTPS API base URL.");
  return url.toString().replace(/\/$/, "");
}

function promptInput(input: z.infer<typeof requestSchema>) {
  const { apiKey: _apiKey, provider: _provider, exploration: _exploration, ...safe } = input;
  return {
    ...safe,
    mode: input.mode === "reconsider" ? "reconsider_same_alternatives" : input.path.length ? "expand_committed_history" : "initial_decision",
    committedActions: input.path.map((node) => ({ step: node.depth, action: node.action, outcome: node.summary, horizon: node.horizon })),
    nextDecisionCandidates: input.path.at(-1)?.nextDecisions ?? [],
    inputChanges: input.previousContext ? Object.entries(input.context).filter(([key, value]) => value !== input.previousContext![key as keyof typeof input.context]).map(([field, current]) => ({ field, previous: input.previousContext![field as keyof typeof input.context], current })) : [],
    previousExpenseCoverMonths: input.previousContext ? runway(input.previousContext.savings, input.previousContext.expenses) : null,
    expenseCoverBasis: "Savings divided by monthly living expenses with no income. Excludes business costs, taxes and emergencies; not a business runway forecast.",
    calculatedRunwayMonths: runway(input.context.savings, input.context.expenses),
  };
}

async function readJson(response: Response) {
  const body = await response.text();
  if (!response.ok) throw new ProviderError("Provider request failed.", response.status);
  try {
    const parsed = JSON.parse(body);
    const content = parsed.choices?.[0]?.message?.content ?? parsed.content?.find?.((item: { type?: string }) => item.type === "text")?.text;
    if (!content) throw new Error("No content");
    return JSON.parse(content);
  } catch { throw new ProviderError("The provider did not return valid decision data."); }
}

async function generateWithFetch(input: z.infer<typeof requestSchema>, signal?: AbortSignal) {
  if (!input.apiKey) throw new ProviderError("Enter your API key to generate live paths.", 400);
  const apiKey = input.apiKey;
  const schema = input.mode === "reconsider" ? reconsiderResultSchema : resultSchema;
  const system = `${decisionInstructions(input)}\n\nReturn only a JSON object matching this schema: ${JSON.stringify(z.toJSONSchema(schema))}`;
  const isAnthropic = input.provider.provider === "anthropic";
  const endpoint = isAnthropic ? "https://api.anthropic.com/v1/messages" : `${input.provider.provider === "kimi" ? "https://api.moonshot.ai/v1" : safeCompatibleUrl(input.provider.baseUrl)}/chat/completions`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: isAnthropic ? { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" } : { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(isAnthropic ? { model: input.provider.model, max_tokens: 6000, system, messages: [{ role: "user", content: JSON.stringify(promptInput(input)) }] } : { model: input.provider.model, temperature: 0.4, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: JSON.stringify(promptInput(input)) }] }),
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(45000)]) : AbortSignal.timeout(45000),
  });
  return readJson(response);
}

export async function generate(rawInput: z.input<typeof requestSchema>, signal?: AbortSignal) {
  const input = requestSchema.parse(rawInput);
  if (!input.apiKey) throw new ProviderError("Enter your API key to generate live paths.", 400);
  const schema = input.mode === "reconsider" ? reconsiderResultSchema : resultSchema;
  let parsed: unknown;
  if (input.provider.provider === "openai") {
    const client = new OpenAI({ apiKey: input.apiKey, timeout: 45000, maxRetries: 0 });
    const response = await client.responses.parse({ model: input.provider.model, store: false, max_output_tokens: 6000, instructions: decisionInstructions(input), input: JSON.stringify(promptInput(input)), text: { format: zodTextFormat(schema, "crossroads") } }, { signal });
    if (response.status !== "completed" || !response.output_parsed) throw new ProviderError("Generation was incomplete.");
    parsed = response.output_parsed;
  } else parsed = await generateWithFetch(input, signal);
  const result = schema.parse(parsed);
  if (result.choices.length !== input.exploration.branchingFactor) throw new ProviderError(`The provider returned ${result.choices.length} paths; expected ${input.exploration.branchingFactor}.`);
  return input.mode === "reconsider" ? matchReconsideredAlternatives(result, input.alternatives) : resultSchema.parse(result);
}
