import {
  pathTo,
  reconsiderResultSchema,
  resultSchema,
  type Choice,
  type Context,
  type DecisionNode,
  type Result,
  type Scenario,
} from "./schema";
import { runway } from "../finance/calculate";

export const objectiveSuggestions = [
  "Maximize financial security",
  "Advance my career",
  "Improve my happiness",
  "Spend more time with family",
  "Pursue personal growth",
  "Maintain flexibility",
];
export const contextLabels: Record<keyof Context, string> = {
  location: "Location",
  age: "Age",
  income: "Annual gross income",
  offeredSalary: "Offered annual salary",
  savings: "Savings",
  expenses: "Monthly expenses",
  goal: "Primary objective",
  risk: "Risk tolerance",
  constraints: "Personal constraints",
  decisionHorizon: "Decision horizon",
};
export function pairFor(scenario: Scenario, selected: string) {
  const parent =
    scenario.nodes.find((node) => node.id === selected)?.parentId ?? "root";
  return scenario.nodes.filter((node) => node.parentId === parent);
}
export function comparisonValue(node: DecisionNode, dimension: string) {
  const assessed = node.evaluation?.dimensions.find(
    (item) => item.dimension === dimension,
  )?.assessment;
  if (assessed) return assessed;
  if (dimension === "Risk") return node.risks.join(" ");
  if (dimension === "Goal alignment") return node.alignment;
  return "Not assessed for this path.";
}
export function comparisonDimensions(nodes: DecisionNode[]) {
  return [
    ...new Set(
      nodes.flatMap(
        (node) =>
          node.evaluation?.dimensions.map((item) => item.dimension) ?? [
            "Risk",
            "Goal alignment",
          ],
      ),
    ),
  ];
}
export function nodeSections(node: Choice) {
  return {
    "What could happen?": node.summary,
    "Why?": node.explanation,
    "What could go right?": node.benefits.join(" "),
    "What could go wrong?": [...node.drawbacks, ...node.risks].join(" "),
    "What are we assuming?": node.assumptions.join(" "),
    "What matters?": node.alignment,
    "Financial implications": node.financial,
    Lifestyle: node.evaluation?.lifestyle ?? "Not assessed.",
    "Opportunity cost": node.evaluation?.opportunityCost ?? "Not assessed.",
    Reversibility: node.evaluation?.reversibility ?? "Not assessed.",
    "What comes next?": node.nextDecisions.join(" "),
  };
}
export function applyReconsideration(
  scenario: Scenario,
  pair: DecisionNode[],
  context: Context,
  corrections: string,
  result: Result,
): Scenario {
  const ids = new Set(pair.map((node) => node.id));
  // Reconsidering an earlier choice invalidates descendants built on its old evaluation.
  const retained = scenario.nodes.filter(
    (node) =>
      !pathTo(scenario.nodes, node.id)
        .slice(0, -1)
        .some((parent) => ids.has(parent.id)),
  );
  const replacements = pair.map((node, index) => ({
    ...result.choices[index],
    id: node.id,
    parentId: node.parentId,
    depth: node.depth,
    title: node.title,
    action: node.action,
  }));
  const inputs = (Object.keys(context) as (keyof Context)[])
    .filter((key) => context[key] !== scenario.context[key])
    .map((key) => ({
      field: contextLabels[key],
      before: scenario.context[key] || "Not specified",
      after: context[key] || "Not specified",
    }));
  if (corrections !== scenario.corrections)
    inputs.push({
      field: "Other assumptions",
      before: scenario.corrections || "None added",
      after: corrections || "None added",
    });
  const nodes = retained.map(
    (node) =>
      replacements.find((replacement) => replacement.id === node.id) ?? node,
  );
  return {
    ...scenario,
    context,
    corrections,
    nodes,
    objective: result.objective,
    tradeoff:
      pair[0]?.parentId === "root" ? result.tradeoff : scenario.tradeoff,
    constraints: result.constraints,
    staleNodeIds: nodes
      .filter(
        (node) =>
          !ids.has(node.id) &&
          (JSON.stringify(context) !== JSON.stringify(scenario.context) ||
            corrections !== scenario.corrections ||
            scenario.staleNodeIds?.includes(node.id)),
      )
      .map((node) => node.id),
    lastChange: {
      inputs,
      previousRunway: runway(
        scenario.context.savings,
        scenario.context.expenses,
      ),
      currentRunway: runway(context.savings, context.expenses),
      nodes: replacements.map((node, index) => {
        const before = nodeSections(pair[index]),
          after = nodeSections(node);
        return {
          id: node.id,
          changes: (Object.keys(after) as (keyof typeof after)[])
            .filter((section) => before[section] !== after[section])
            .map((section) => ({
              section,
              before: before[section],
              after: after[section],
            })),
        };
      }),
    },
    view: undefined,
  };
}

export function matchReconsideredAlternatives(
  raw: unknown,
  alternatives: DecisionNode[],
): Result {
  const result = reconsiderResultSchema.parse(raw);
  if (
    alternatives.length !== 2 ||
    new Set(result.choices.map((choice) => choice.alternativeId)).size !== 2 ||
    result.choices.some(
      (choice) =>
        !alternatives.some((node) => node.id === choice.alternativeId),
    )
  ) {
    throw new Error(
      "The response could not be matched to the selected paths. Please retry.",
    );
  }
  return resultSchema.parse({
    ...result,
    choices: alternatives.map((node) => ({
      ...result.choices.find((choice) => choice.alternativeId === node.id)!,
      title: node.title,
      action: node.action,
    })),
  });
}
