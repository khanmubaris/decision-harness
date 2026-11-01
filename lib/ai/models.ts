import { z } from "zod";

// Only expose models verified to support Responses and Structured Outputs.
export const modelSchema = z.enum(["gpt-5.4-mini", "gpt-5.4"]);
export type ModelId = z.infer<typeof modelSchema>;
export const DEFAULT_MODEL: ModelId = "gpt-5.4-mini";
export const MODEL_OPTIONS: {
  id: ModelId;
  label: string;
  description: string;
}[] = [
  {
    id: "gpt-5.4-mini",
    label: "GPT-5.4 mini",
    description:
      "Fast and cost-efficient. Recommended for exploring multiple paths.",
  },
  {
    id: "gpt-5.4",
    label: "GPT-5.4",
    description:
      "A larger model for complex decisions. Higher cost per request.",
  },
];
export function modelLabel(id: ModelId) {
  return MODEL_OPTIONS.find((model) => model.id === id)?.label ?? id;
}
