import { Sparkles } from "lucide-react";
import type { DecisionNode, Scenario } from "@/lib/decision/schema";
import { runway } from "@/lib/finance/calculate";

export default function BranchIntelligence({
  node,
  scenario,
}: {
  node: DecisionNode;
  scenario: Scenario;
}) {
  const changes =
    scenario.lastChange?.nodes.find((entry) => entry.id === node.id)?.changes ??
    [];
  function section(title: string, content: React.ReactNode) {
    const change = changes.find((item) => item.section === title);
    return (
      <div
        className={`detail-section ${change ? "changed-section" : ""}`}
        key={title}
      >
        <h3>
          {title}
          {change && <span className="updated-badge">Updated</span>}
        </h3>
        {content}
        {change && (
          <details className="previous-analysis">
            <summary>Previously</summary>
            <p>{change.before}</p>
          </details>
        )}
      </div>
    );
  }
  function list(items: string[]) {
    return (
      <ul>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  }
  const cover = runway(scenario.context.savings, scenario.context.expenses);
  return (
    <>
      {section("Why?", <p>{node.explanation}</p>)}
      {section("What could go right?", list(node.benefits))}
      {section(
        "What could go wrong?",
        list([...node.drawbacks, ...node.risks]),
      )}
      {section(
        "What are we assuming?",
        <>
          <p className="assessment-label">
            Unverified assumptions, not established facts.
          </p>
          {list(node.assumptions)}
        </>,
      )}
      {section("What matters?", <p>{node.alignment}</p>)}
      {section(
        "Financial implications",
        <>
          <p>{node.financial}</p>
          {cover !== null && (
            <div className="runway">
              <strong>{cover} months</strong>
              <span>
                Current savings ÷ monthly living expenses, with no income.
                Excludes business costs, taxes and emergencies. Calculated
                locally.
              </span>
            </div>
          )}
        </>,
      )}
      {node.evaluation && (
        <>
          {section("Lifestyle", <p>{node.evaluation.lifestyle}</p>)}
          {section(
            "Opportunity cost",
            <p>{node.evaluation.opportunityCost}</p>,
          )}
          {section("Reversibility", <p>{node.evaluation.reversibility}</p>)}
          <div className="detail-section challenge-section">
            <h3>
              <Sparkles size={13} /> Challenge this path
            </h3>
            {node.evaluation.challenges.map((challenge, i) => (
              <div key={i}>
                <h4>{challenge.assumption}</h4>
                <p>{challenge.consequence}</p>
              </div>
            ))}
          </div>
        </>
      )}
      {section("What comes next?", list(node.nextDecisions))}
    </>
  );
}
