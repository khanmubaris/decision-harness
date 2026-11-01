import { isLegacyCareer, legacyCareerChoices } from "./legacy-demo";
import { DEFAULT_MODEL } from "../ai/models";
import { runway } from "../finance/calculate";
import {
  attach,
  type Choice,
  type Context,
  type DecisionNode,
  type Scenario,
  type Result,
} from "./schema";

export const demoQuestion =
  "I'm 29, earning £90,000 in London. I have £40,000 in savings and I'm considering leaving my job to build an AI startup. Should I quit now or continue working while building the business?";
export const demoContext: Context = {
  location: "London, UK",
  age: "29",
  income: "GBP 90000",
  offeredSalary: "",
  expenses: "GBP 2500",
  savings: "GBP 40000",
  risk: "Medium",
  decisionHorizon: "3 years",
  goal: "Build an AI business while protecting financial security and time for relationships",
  constraints:
    "Maintain a six-month personal expense buffer. Monthly living expenses are a demo assumption, not supplied in the original question. Business costs are unknown and excluded.",
};
const titles = [
  ["Quit and build full-time", "Stay employed and build part-time"],
  ["Validate with a paying pilot", "Protect a cash floor"],
  ["Focus on one customer problem", "Find a complementary collaborator"],
  ["Commit to a bounded launch", "Reduce scope and preserve options"],
  ["Continue with clear review criteria", "Pause and reassess the evidence"],
];
const summaries = [
  [
    "Give the business your full attention while relying on savings until it can support you.",
    "Keep your salary while testing the business in limited time, with slower progress and competing demands.",
  ],
  [
    "Test whether a real customer will pay before committing to a larger build.",
    "Set a cash boundary and a fallback plan before increasing your commitment.",
  ],
  [
    "Use what you have learned to narrow the product to one problem worth solving.",
    "Test a small collaboration before sharing a bigger commitment or ownership.",
  ],
  [
    "Launch a deliberately limited version with a spending cap and review date.",
    "Cut nonessential work and protect the ability to change direction.",
  ],
  [
    "Continue for a defined period only if customer evidence, cash and wellbeing support it.",
    "Take stock of the evidence and decide which commitments to retain or stop.",
  ],
];
const upsides = [
  [
    "More sustained time for customer discovery and product development.",
    "Preserves employment income while you learn whether customers want the product.",
  ],
  [
    "A paid pilot can provide evidence of demand before a broader commitment.",
    "A clear cash floor makes stopping or changing direction easier to discuss.",
  ],
  [
    "A narrow customer problem can reduce wasted development effort.",
    "Complementary skills could reduce a bottleneck and provide a second perspective.",
  ],
  [
    "A bounded launch creates concrete feedback from real use.",
    "A smaller scope can protect cash, relationships and decision flexibility.",
  ],
  [
    "Explicit review criteria help keep continued effort connected to evidence.",
    "A deliberate pause can preserve resources for a better-fitting opportunity.",
  ],
];
const downsides = [
  [
    "Giving up a £90,000 gross salary increases dependence on a finite savings buffer.",
    "Evenings and weekends may come at the expense of rest and relationships.",
  ],
  [
    "Customer work may distract from a broader product if the pilot is too bespoke.",
    "Protecting the buffer may require slower progress or additional income.",
  ],
  [
    "Narrowing the focus means declining other attractive opportunities.",
    "Collaboration requires time to establish trust, ownership and decision rights.",
  ],
  [
    "A deadline can create pressure to ship before key assumptions are tested.",
    "Reducing scope may postpone valuable learning or disappoint early supporters.",
  ],
  [
    "Continuing ties up time and resources that could support other priorities.",
    "Pausing can interrupt momentum and make restarting harder.",
  ],
];
export function demoChoices(
  path: DecisionNode[],
  context: Context = demoContext,
): Choice[] {
  if (isLegacyCareer(path)) return legacyCareerChoices(path, context);
  const depth = path.length;
  const months = runway(context.savings, context.expenses);
  const cover =
    months === null
      ? "Cash cover cannot be calculated without savings and monthly expenses."
      : `${months} months of personal expenses at the stated spending, with no income; business costs, taxes and emergencies are excluded.`;
  const pressure =
    months === null
      ? "Check actual living costs and business spending before committing."
      : months <= 6
        ? "There is no margin above the demo's six-month personal buffer; separate business spending would reduce it further."
        : "The personal buffer provides more room to test demand, but does not establish that the business is viable.";
  return titles[depth].map((title, i) => {
    const fullTime = depth === 0 ? i === 0 : path[0].title === titles[0][0];
    const financial = fullTime
      ? `Savings cover ${cover.charAt(0).toLowerCase() + cover.slice(1)} ${months !== null && months <= 6 ? "The six-month buffer is already fully allocated." : "Decide how much is genuinely available for the business."}`
      : `Keeping employment may protect the savings buffer, but ${context.income || "the stated salary"} is gross income, not take-home pay. Check actual net surplus and business costs before assuming savings will grow.`;
    const flexible = fullTime
      ? "You can stop the experiment, but returning to comparable employment is not guaranteed."
      : "You can reduce the business commitment while retaining your job, subject to employment terms.";
    return {
      title,
      action: title,
      summary: summaries[depth][i],
      benefits: [upsides[depth][i]],
      drawbacks: [
        depth === 0 && i === 0
          ? `Giving up ${context.income || "your salary"} in gross annual income increases dependence on a finite savings buffer.`
          : downsides[depth][i],
      ],
      risks: [
        fullTime
          ? "Customer demand may take longer to establish than the available cash allows."
          : "Split attention could damage wellbeing or performance in the role that funds the experiment.",
      ],
      assumptions: [
        depth === 0
          ? "The business has no proven recurring revenue in this fictional example."
          : `This follows your choice to “${path.at(-1)!.title}”; its practical commitments remain in place.`,
        `${context.expenses || "Monthly expenses"} are a demo assumption; verify actual costs. Employment terms permit any side project.`,
      ],
      nextDecisions:
        depth === 4
          ? [
              "Choose a review date and record the customer, cash and wellbeing signals that would change your decision.",
            ]
          : [titles[depth + 1][0], titles[depth + 1][1]],
      horizon: [
        `Now → 3 months`,
        `3 → 6 months`,
        `6 → 12 months`,
        `12 → 18 months`,
        `Review within ${context.decisionHorizon}`,
      ][depth],
      uncertainty:
        depth > 1 || (fullTime && months !== null && months <= 6)
          ? "High"
          : "Moderate",
      explanation: `${depth ? `After ${path.at(-1)!.title.toLowerCase()}, this next step tests your assumptions. ` : ""}${fullTime ? pressure : "A salary can support a gradual experiment, but only if the workload is sustainable and the contract permits it."}`,
      alignment: `Your priority is “${context.goal || "not yet specified"}”, with ${context.risk === "Medium" ? "moderate" : context.risk.toLowerCase()} risk comfort over ${context.decisionHorizon}. ${fullTime ? "This puts more emphasis on focused growth, with greater financial exposure." : "This puts more emphasis on security and flexibility, with a cost to time and focus."}`,
      financial,
      evaluation: {
        lifestyle: fullTime
          ? "More control over working time may come with financial pressure and blurred work boundaries."
          : "A job plus a business can leave little room for rest or family; agree a sustainable weekly limit.",
        opportunityCost: fullTime
          ? "You give up salary and potential career progression while pursuing the business."
          : "You give up some evenings, weekends and potential speed of business development.",
        reversibility: flexible,
        challenges: [
          {
            assumption: "What if the business earns nothing for six months?",
            consequence: fullTime
              ? pressure
              : "Employment can preserve a fallback, but the time spent still has a cost.",
          },
          {
            assumption: "What if living expenses rise by 30%?",
            consequence:
              "The same savings would cover fewer months. Use What If to recalculate before changing the commitment.",
          },
        ],
        dimensions: [
          {
            dimension: "Financial stability",
            assessment: fullTime
              ? `${cover} ${pressure}`
              : "Employment income offers a fallback while the business is tested; job stability and net surplus remain assumptions.",
          },
          {
            dimension: "Personal growth",
            assessment: fullTime
              ? "Focused practice in building and selling, with concentrated exposure to uncertainty."
              : "A gradual way to learn, but progress competes with existing responsibilities.",
          },
          {
            dimension: "Lifestyle",
            assessment: fullTime
              ? "More autonomy, alongside potentially greater money-related pressure."
              : "Less financial disruption, but more pressure on free time.",
          },
          {
            dimension: "Risk",
            assessment: fullTime
              ? pressure
              : "Protects one income source while adding workload and potential employment conflicts.",
          },
          { dimension: "Flexibility", assessment: flexible },
          {
            dimension: "Goal alignment",
            assessment: fullTime
              ? "Better aligned with focused entrepreneurship if the buffer and uncertainty are acceptable."
              : "Better aligned with protecting security while gathering evidence.",
          },
        ],
        betterWhen: fullTime
          ? "Focused business-building is your priority, customer demand has evidence, and you can fund the experiment without spending your protected buffer."
          : "Financial security and reversibility matter most, and you can reserve sustainable time with your employer's permission.",
      },
    };
  });
}
export function demoReconsider(
  scenario: Scenario,
  pair: DecisionNode[],
  context: Context,
): Result {
  const parent = pair[0].parentId;
  const history: DecisionNode[] = [];
  let current = scenario.nodes.find((node) => node.id === parent);
  while (current) {
    history.unshift(current);
    current = scenario.nodes.find((node) => node.id === current!.parentId);
  }
  const legacy = isLegacyCareer(scenario.nodes);
  return {
    category: "Career",
    objective: context.goal,
    constraints: [context.constraints].filter(Boolean),
    tradeoff: legacy
      ? "Career development versus financial and personal flexibility."
      : runway(context.savings, context.expenses) !== null &&
          runway(context.savings, context.expenses)! <= 6
        ? "Focused business-building now uses the entire six-month personal buffer; staying employed preserves income but puts pressure on time."
        : "Focused business-building versus protecting income and testing demand gradually.",
    choices: (legacy
      ? legacyCareerChoices(history, context)
      : demoChoices(history, context)
    ).map((choice, i) => ({
      ...choice,
      title: pair[i].title,
      action: pair[i].action,
      evaluation: choice.evaluation!,
    })),
  };
}
export function createDemo(): Scenario {
  return {
    id: crypto.randomUUID(),
    question: demoQuestion,
    context: { ...demoContext },
    objective: demoContext.goal,
    tradeoff:
      "Focused business-building versus protecting income and testing demand gradually.",
    category: "Career",
    constraints: [demoContext.constraints],
    nodes: attach(demoChoices([])),
    mode: "demo",
    model: DEFAULT_MODEL,
    corrections: "",
  };
}

/** Materialise every authored branch for presentations, without calling the model. */
export function createDemoTree(): Scenario {
  const scenario = createDemo();
  let paths = scenario.nodes.map((node) => [node]);
  for (let depth = 2; depth <= 5; depth++) {
    paths = paths.flatMap((path) => {
      const children = attach(
        demoChoices(path, scenario.context),
        path.at(-1)!.id,
        depth,
      );
      scenario.nodes.push(...children);
      return children.map((child) => [...path, child]);
    });
  }
  return scenario;
}
