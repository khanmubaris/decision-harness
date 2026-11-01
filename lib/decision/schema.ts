import { modelSchema, DEFAULT_MODEL, type ModelId } from "../ai/models";
import { z } from "zod";
export const contextSchema = z.object({
  location: z.string().max(150),
  age: z.string().max(50),
  income: z.string().max(50),
  expenses: z.string().max(50),
  savings: z.string().max(50),
  offeredSalary: z.string().max(50),
  risk: z.enum(["Low", "Medium", "High"]),
  goal: z.string().max(500),
  constraints: z.string().max(1000),
  decisionHorizon: z
    .enum(["1 year", "3 years", "5 years", "10 years"])
    .default("3 years"),
});
export const evaluationSchema = z.object({
  lifestyle: z.string().max(350),
  opportunityCost: z.string().max(350),
  reversibility: z.string().max(350),
  challenges: z
    .array(
      z.object({
        assumption: z.string().max(200),
        consequence: z.string().max(300),
      }),
    )
    .min(1)
    .max(3),
  dimensions: z
    .array(
      z.object({
        dimension: z.enum([
          "Financial stability",
          "Personal growth",
          "Lifestyle",
          "Risk",
          "Flexibility",
          "Goal alignment",
        ]),
        assessment: z.string().max(300),
      }),
    )
    .min(2)
    .max(6),
  betterWhen: z.string().max(400),
});
export const choiceSchema = z.object({
  title: z.string().max(100),
  action: z.string().max(250),
  summary: z.string().max(600),
  benefits: z.array(z.string().max(300)).min(1).max(4),
  drawbacks: z.array(z.string().max(300)).min(1).max(4),
  risks: z.array(z.string().max(300)).min(1).max(4),
  assumptions: z.array(z.string().max(300)).min(1).max(4),
  nextDecisions: z.array(z.string().max(300)).min(1).max(3),
  horizon: z.string().max(100),
  uncertainty: z.enum(["Low", "Moderate", "High"]),
  explanation: z.string().max(800),
  alignment: z.string().max(400),
  financial: z.string().max(400),
  evaluation: evaluationSchema.optional(),
});
export const resultSchema = z.object({
  category: z.enum([
    "Career",
    "Finance",
    "Education",
    "Relocation",
    "Lifestyle",
    "Life",
  ]),
  objective: z.string().max(400),
  tradeoff: z.string().max(600),
  constraints: z.array(z.string().max(300)).max(6),
  choices: z
    .array(choiceSchema.extend({ evaluation: evaluationSchema }))
    .length(2),
});
export const reconsiderResultSchema = resultSchema.extend({
  choices: z
    .array(
      resultSchema.shape.choices.element.extend({
        alternativeId: z.string().max(100),
      }),
    )
    .length(2),
});
export const nodeSchema = choiceSchema.extend({
  id: z.string().max(100),
  parentId: z.string().max(100),
  depth: z.number().int().min(1).max(5),
});
export const requestSchema = z.object({
  model: modelSchema.default(DEFAULT_MODEL),
  question: z.string().trim().min(10).max(2000),
  context: contextSchema,
  path: z.array(nodeSchema).max(4),
  corrections: z.string().max(1500).default(""),
  mode: z.enum(["explore", "reconsider"]).default("explore"),
  alternatives: z.array(nodeSchema).max(2).default([]),
  previousContext: contextSchema.optional(),
});
export type Context = z.infer<typeof contextSchema>;
export type Choice = z.infer<typeof choiceSchema>;
export type DecisionNode = z.infer<typeof nodeSchema>;
export type Result = z.infer<typeof resultSchema>;
export type Scenario = {
  model: ModelId;
  id: string;
  question: string;
  context: Context;
  objective: string;
  tradeoff: string;
  category: Result["category"];
  constraints: string[];
  nodes: DecisionNode[];
  mode: "live" | "demo";
  corrections: string;
  staleNodeIds?: string[];
  lastChange?: z.infer<typeof changeSchema>;
  view?: { selected: string; pins: string[]; collapsed: string[] };
};
export const emptyContext: Context = {
  location: "",
  age: "",
  income: "",
  expenses: "",
  savings: "",
  offeredSalary: "",
  risk: "Medium",
  goal: "",
  constraints: "",
  decisionHorizon: "3 years",
};
export function pathTo(nodes: DecisionNode[], id: string): DecisionNode[] {
  const path: DecisionNode[] = [];
  let n = nodes.find((n) => n.id === id);
  const seen = new Set<string>();
  while (n && !seen.has(n.id)) {
    seen.add(n.id);
    path.unshift(n);
    n = nodes.find((p) => p.id === n!.parentId);
  }
  return path;
}
export function attach(
  choices: Choice[],
  parentId = "root",
  depth = 1,
): DecisionNode[] {
  return choices.map((c) => ({
    ...c,
    id: crypto.randomUUID(),
    parentId,
    depth,
  }));
}

export const changeSchema = z.object({
  inputs: z.array(
    z.object({ field: z.string(), before: z.string(), after: z.string() }),
  ),
  nodes: z.array(
    z.object({
      id: z.string(),
      changes: z.array(
        z.object({
          section: z.string(),
          before: z.string(),
          after: z.string(),
        }),
      ),
    }),
  ),
  previousRunway: z.number().nullable(),
  currentRunway: z.number().nullable(),
});
export const scenarioSchema = z.object({
  model: modelSchema.default(DEFAULT_MODEL),
  id: z.string(),
  question: z.string().max(2000),
  context: contextSchema,
  objective: z.string(),
  tradeoff: z.string(),
  category: resultSchema.shape.category,
  constraints: z.array(z.string()),
  nodes: z.array(nodeSchema).max(62),
  mode: z.enum(["live", "demo"]),
  corrections: z.string().max(1500),
  staleNodeIds: z.array(z.string()).max(62).optional(),
  lastChange: changeSchema.optional(),
  view: z
    .object({
      selected: z.string(),
      pins: z.array(z.string()).max(2),
      collapsed: z.array(z.string()).max(62),
    })
    .optional(),
});
