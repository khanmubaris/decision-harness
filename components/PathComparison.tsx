import type { DecisionNode, Scenario } from "@/lib/decision/schema";
import { comparisonDimensions, comparisonValue } from "@/lib/decision/harness";
import { pathTo } from "@/lib/decision/schema";

export default function PathComparison({
  nodes,
  scenario,
}: {
  nodes: DecisionNode[];
  scenario: Scenario;
}) {
  return (
    <>
      <div className="comparison-priority">
        <span>YOUR PRIORITY</span>
        <strong>{scenario.context.goal || scenario.objective}</strong>
        <p>
          {scenario.context.risk === "Medium"
            ? "Moderate"
            : scenario.context.risk}{" "}
          risk tolerance · {scenario.context.decisionHorizon}
        </p>
      </div>
      <div className="comparison-table-wrap">
        <table className="decision-comparison">
          <thead>
            <tr>
              <th scope="col">What matters</th>
              {nodes.map((node) => (
                <th scope="col" key={node.id}>
                  {node.title}
                  <small>
                    Step {node.depth} · {node.horizon}
                  </small>
                  {scenario.staleNodeIds?.includes(node.id) && (
                    <span className="stale-label">
                      Earlier assumptions · reconsider this path
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparisonDimensions(nodes).map((dimension) => (
              <tr key={dimension}>
                <th scope="row">{dimension}</th>
                {nodes.map((node) => (
                  <td key={node.id}>{comparisonValue(node, dimension)}</td>
                ))}
              </tr>
            ))}
            <tr className="better-choice">
              <th scope="row">What would make each path a better choice?</th>
              {nodes.map((node) => (
                <td key={node.id}>
                  {node.evaluation?.betterWhen ??
                    "This older analysis did not assess that question. Reconsider the path to add it."}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <details className="comparison-evidence">
        <summary>Inspect assumptions and supporting details</summary>
        <div className="comparison-grid">
          {nodes.map((node) => (
            <article key={node.id}>
              <h3>{node.title}</h3>
              <p className="path-breadcrumb">
                {pathTo(scenario.nodes, node.id)
                  .map((ancestor) => ancestor.title)
                  .join(" → ")}
              </p>
              {[
                ["Potential benefits", node.benefits.join(" ")],
                ["Trade-offs", node.drawbacks.join(" ")],
                ["Financial implications", node.financial],
                ["Assumptions", node.assumptions.join(" ")],
              ].map(([label, value]) => (
                <div className="detail-section" key={label}>
                  <h4>{label}</h4>
                  <p>{value}</p>
                </div>
              ))}
            </article>
          ))}
        </div>
      </details>
      <div className="comparison-note">
        There is no universal winner. Compare the conditions above with your
        priorities; a different goal can change which trade-offs you accept.
      </div>
    </>
  );
}
