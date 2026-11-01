"use client";
import { useState } from "react";
import { ArrowRight, X, Info } from "lucide-react";
import PossibilityLoader from "./PossibilityLoader";
import {
  contextSchema,
  type Context,
  type DecisionNode,
  type Scenario,
} from "@/lib/decision/schema";
import { money, runway } from "@/lib/finance/calculate";
import { contextLabels, objectiveSuggestions } from "@/lib/decision/harness";

export default function WhatIfDialog({
  scenario,
  pair,
  busy,
  onClose,
  onApply,
}: {
  scenario: Scenario;
  pair: DecisionNode[];
  busy: boolean;
  onClose: () => void;
  onApply: (context: Context, corrections: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Context>({ ...scenario.context });
  const [notes, setNotes] = useState(scenario.corrections);
  const [error, setError] = useState("");
  const before = runway(scenario.context.savings, scenario.context.expenses);
  const after = runway(draft.savings, draft.expenses);
  const changed =
    JSON.stringify(draft) !== JSON.stringify(scenario.context) ||
    notes !== scenario.corrections;
  const stale = pair.some(
    (node) => scenario.staleNodeIds?.includes(node.id) || !node.evaluation,
  );
  const financial =
    ["Career", "Finance", "Education", "Relocation"].includes(
      scenario.category,
    ) || Boolean(scenario.context.savings || scenario.context.expenses);
  function field(key: keyof Context, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  return (
    <div className="overlay">
      <section
        className={`modal what-if-modal ${busy ? "possibility-modal" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={busy ? "context-title" : "what-if-title"}
        aria-busy={busy}
        tabIndex={-1}
      >
        {busy ? (
          <PossibilityLoader
            question={`What changes for “${pair[0]?.title}” and “${pair[1]?.title}”?`}
          />
        ) : (
          <>
            <button
              className="close"
              aria-label="Close What If"
              onClick={onClose}
            >
              <X size={20} />
            </button>
            <div className="eyebrow">
              A DIFFERENT ASSUMPTION. A DIFFERENT PERSPECTIVE.
            </div>
            <h2 id="what-if-title">What if things change?</h2>
            <p>
              Adjust what matters. We’ll reconsider these same two choices and
              show what changed.
            </p>
            <div className="what-if-paths">
              {pair.map((node) => (
                <span key={node.id}>{node.title}</span>
              ))}
            </div>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                setError("");
                for (const key of [
                  "savings",
                  "expenses",
                  "income",
                  "offeredSalary",
                ] as const) {
                  if (draft[key].trim() && money(draft[key]) === null) {
                    setError(
                      `Enter ${contextLabels[key].toLowerCase()} as a full amount, such as GBP 15000.`,
                    );
                    return;
                  }
                }
                try {
                  await onApply(contextSchema.parse(draft), notes);
                } catch (error) {
                  setError(
                    error instanceof Error
                      ? error.message
                      : "We couldn’t update the analysis. Please try again.",
                  );
                }
              }}
            >
              {financial && (
                <>
                  <div className="form-grid">
                    {(["savings", "expenses"] as (keyof Context)[]).map(
                      (key) => (
                        <label key={key}>
                          {contextLabels[key]}
                          <input
                            maxLength={50}
                            value={draft[key]}
                            onChange={(event) => field(key, event.target.value)}
                            placeholder="Include currency, e.g. GBP 15000"
                          />
                        </label>
                      ),
                    )}
                  </div>
                  <button
                    className="text-button stress-shortcut"
                    type="button"
                    disabled={money(draft.expenses) === null}
                    onClick={() => {
                      const amount = money(draft.expenses);
                      if (amount !== null)
                        field(
                          "expenses",
                          String(Math.round(amount * 1.3 * 100) / 100),
                        );
                    }}
                  >
                    Try monthly expenses +30%
                  </button>
                  <div className="runway-preview" role="status">
                    <span>PERSONAL EXPENSE COVER · CALCULATED LOCALLY</span>
                    <div>
                      <strong>
                        {before === null ? "—" : `${before} months`}
                      </strong>
                      <ArrowRight size={18} />
                      <strong>
                        {after === null ? "—" : `${after} months`}
                      </strong>
                    </div>
                    <p>
                      Savings ÷ monthly living expenses, assuming no income.
                      Excludes business costs, taxes and emergencies. Use the
                      same currency for both amounts. This is not a business
                      forecast.
                    </p>
                  </div>
                </>
              )}
              <details className="what-if-more" open={!financial}>
                <summary>
                  More changes: income, priorities & constraints
                </summary>
                {financial && (
                  <div className="form-grid">
                    {(
                      [
                        "income",
                        ...(scenario.category === "Career"
                          ? ["offeredSalary"]
                          : []),
                      ] as (keyof Context)[]
                    ).map((key) => (
                      <label key={key}>
                        {contextLabels[key]}
                        <input
                          maxLength={50}
                          value={draft[key]}
                          onChange={(event) => field(key, event.target.value)}
                          placeholder="Optional · include currency"
                        />
                      </label>
                    ))}
                  </div>
                )}
                <label>
                  Primary objective
                  <input
                    list="what-if-objectives"
                    maxLength={500}
                    value={draft.goal}
                    onChange={(event) => field("goal", event.target.value)}
                  />
                </label>
                <datalist id="what-if-objectives">
                  {objectiveSuggestions.map((goal) => (
                    <option key={goal} value={goal} />
                  ))}
                </datalist>
                <div className="form-grid">
                  <label>
                    Risk tolerance
                    <select
                      value={draft.risk}
                      onChange={(event) => field("risk", event.target.value)}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Moderate</option>
                      <option value="High">High</option>
                    </select>
                  </label>
                  <label>
                    Decision horizon
                    <select
                      value={draft.decisionHorizon}
                      onChange={(event) =>
                        field("decisionHorizon", event.target.value)
                      }
                    >
                      {["1 year", "3 years", "5 years", "10 years"].map(
                        (horizon) => (
                          <option key={horizon}>{horizon}</option>
                        ),
                      )}
                    </select>
                  </label>
                </div>
                <label>
                  Personal constraints
                  <textarea
                    maxLength={1000}
                    value={draft.constraints}
                    onChange={(event) =>
                      field("constraints", event.target.value)
                    }
                  />
                </label>
                <label>
                  Other assumptions to change
                  <textarea
                    maxLength={1500}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder={
                      scenario.category === "Finance"
                        ? "For example: monthly contribution, assumed return, or access to your savings. Returns remain hypothetical."
                        : scenario.category === "Career"
                          ? "For example: job stability, relocation, or time available for the business."
                          : "For example: time available, family responsibilities, or a change in priorities."
                    }
                  />
                </label>
              </details>
              <p className="what-if-note">
                <Info size={14} />{" "}
                {scenario.mode === "demo"
                  ? "Offline demo: calculations and authored cash-buffer trade-offs update locally. Other inputs are recorded as context, not interpreted by an AI."
                  : "Editing the numbers uses no AI request. Reconsidering updates the analysis with your selected model; ready next steps are then prepared in the background."}
              </p>
              <p className="what-if-note">
                Later branches below these choices will be cleared. Other paths
                retain their earlier analysis and will be marked for review.
              </p>
              {error && (
                <div className="generation-error" role="alert">
                  {error} Your current map has not changed. You can retry below.
                </div>
              )}
              <button
                className="primary"
                disabled={!changed && !stale}
                type="submit"
              >
                {error ? "Retry reconsideration" : "Reconsider these paths"}
                <ArrowRight size={16} />
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
