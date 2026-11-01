import { resultSchema, type Scenario } from "./schema";

type DecisionInput = Pick<
  Scenario,
  "question" | "context" | "model" | "corrections"
> & {
  path: Scenario["nodes"];
  mode?: "explore" | "reconsider";
  alternatives?: Scenario["nodes"];
  previousContext?: Scenario["context"];
};

export async function requestDecision(
  input: DecisionInput,
  signal?: AbortSignal,
) {
  const timeout = AbortSignal.timeout(55000);
  const response = await fetch("/api/decision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...input,
      path: input.path.map(({ evaluation, ...history }) => history),
    }),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Generation failed. Please retry.");
  return resultSchema.parse(data);
}
