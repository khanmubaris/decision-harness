import { runway } from "../finance/calculate";
import type { Choice, Context, DecisionNode } from "./schema";

// Keep previously saved, authored job-offer demos explorable after the founder-demo pivot.
const titles = [
  ["Join the startup", "Stay in your current role"],
  ["Own a product launch", "Build a financial buffer"],
  ["Step into team leadership", "Deepen your technical expertise"],
  ["Negotiate a sustainable remit", "Explore an external opportunity"],
  ["Commit with a review date", "Preserve flexibility"],
];
export function isLegacyCareer(nodes: DecisionNode[]) {
  return nodes.some(
    (node) => node.depth === 1 && titles[0].includes(node.title),
  );
}
export function legacyCareerChoices(
  path: DecisionNode[],
  context: Context,
): Choice[] {
  const depth = path.length,
    cover = runway(context.savings, context.expenses);
  return titles[depth].map((title, index) => ({
    title,
    action: title,
    summary:
      index === 0
        ? "Build on the decisions already taken with a defined opportunity to develop your role."
        : "Protect financial and personal flexibility while reviewing your next commitment.",
    benefits: [
      index === 0
        ? "A concrete responsibility can provide evidence for career progression."
        : "A protected buffer and explicit boundaries can make future choices easier.",
    ],
    drawbacks: [
      index === 0
        ? "Broader responsibility can reduce time for relationships or technical learning."
        : "A more cautious pace can delay a desired career change.",
    ],
    risks: [
      "The role, employer or your personal priorities may change before the hoped-for benefit appears.",
    ],
    assumptions: [
      depth
        ? `This follows your choice to “${path.at(-1)!.title}”; its commitments remain in place.`
        : "Both employment options remain available; verify terms before acting.",
      "Spending and employment conditions need verification.",
    ],
    nextDecisions:
      depth < 4
        ? titles[depth + 1]
        : [
            "Set a review date and decide which evidence would make you change course.",
          ],
    horizon: `Within ${context.decisionHorizon}`,
    uncertainty: depth > 1 ? "High" : "Moderate",
    explanation: `This authored career scenario balances growth against resilience. ${cover === null ? "Check your required cash buffer." : `Current savings cover ${cover} months of personal expenses with no income; check whether that meets your needs.`}`,
    alignment: `Your objective is “${context.goal}”, with ${context.risk === "Medium" ? "moderate" : context.risk.toLowerCase()} risk comfort. Check how this commitment supports that priority.`,
    financial: `${context.income || "Current salary"} is gross annual income, not take-home pay. ${context.offeredSalary ? `An offered ${context.offeredSalary} is also gross and must be verified.` : "No future salary is assumed."} Savings cover excludes taxes and emergencies.`,
    evaluation: {
      lifestyle:
        "Workload and boundaries can affect relationships and energy; confirm the expectations.",
      opportunityCost:
        index === 0
          ? "This commitment may displace other learning or personal time."
          : "Protecting flexibility may mean declining a visible responsibility.",
      reversibility:
        "You can review the commitment, but an equivalent role or salary is not guaranteed elsewhere.",
      challenges: [
        {
          assumption:
            "What if the expected role or progression does not materialise?",
          consequence:
            "Review written terms and define a fallback before relying on the expected benefit.",
        },
      ],
      dimensions: [
        {
          dimension: "Risk",
          assessment:
            "Employment conditions and future progression remain uncertain.",
        },
        {
          dimension: "Lifestyle",
          assessment:
            "Check workload against the time and energy you want to protect.",
        },
        {
          dimension: "Flexibility",
          assessment:
            "A cash buffer and transferable skills can preserve alternatives.",
        },
        {
          dimension: "Goal alignment",
          assessment: `Assess the evidence against “${context.goal}”.`,
        },
      ],
      betterWhen:
        index === 0
          ? "Career development matters most and the role offers verified scope and support."
          : "Financial resilience, personal time or keeping alternatives open is the stronger priority.",
    },
  }));
}
