"use client";

import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  GitBranch,
  SlidersHorizontal,
  ScanLine,
  CornerDownRight,
  RotateCcw,
} from "lucide-react";
import { runway } from "@/lib/finance/calculate";

const stages = [
  {
    name: "Define",
    title: "Start with what matters.",
    description: "Enter your decision, goals, circumstances, and constraints.",
    example:
      "A business of your own. A six-month cash buffer. Time for the people you love.",
    caption: "Your context sets the boundaries.",
    tags: ["Your goal", "Your constraints", "Your risk comfort"],
  },
  {
    name: "Explore",
    title: "See where each choice could lead.",
    description: "AI builds an interactive map of possible futures.",
    example:
      "Build full-time, or keep your job while you test the idea. Each choice opens a different next step.",
    caption: "Two directions. Room to keep exploring.",
    tags: ["Alternative paths", "Consequences", "Next decisions"],
  },
  {
    name: "Challenge",
    title: "Question the assumptions.",
    description: "Identify risks, uncertainties, and overlooked consequences.",
    example:
      "What if your first customer takes longer to arrive? What are you counting on that you haven’t verified?",
    caption: "Make the unknowns visible.",
    tags: ["Unverified assumptions", "Possible downsides", "Evidence to find"],
  },
  {
    name: "Stress-test",
    title: "Change the variables.",
    description:
      "Explore how different circumstances could affect your options.",
    example:
      "Reduce your savings from £40,000 to £15,000. The same decision now comes with a different margin for error.",
    caption: "Change an input. Revisit the reasoning.",
    tags: ["What If", "Local calculations", "Updated analysis"],
  },
  {
    name: "Decide",
    title: "Make the choice that’s yours.",
    description:
      "Compare alternatives and decide with a clearer understanding of the trade-offs.",
    example:
      "More focus, or more financial flexibility? The right trade-off depends on the life you want to build.",
    caption: "The final decision always belongs to you.",
    tags: ["Side-by-side comparison", "Your priorities", "Your choice"],
  },
];
const examples = [
  {
    category: "Career",
    question: "Should I take the new job?",
    detail: "Ambition, stability, and what comes next.",
  },
  {
    category: "Money",
    question: "Should I buy a home or keep investing?",
    detail: "Security today. Possibilities tomorrow.",
  },
  {
    category: "Life",
    question: "Should I move abroad?",
    detail: "A different place. A different everyday.",
  },
  {
    category: "Personal Growth",
    question: "Should I take a year off and start over?",
    detail: "Make room for the person you’re becoming.",
  },
];
const pounds = (value: number) => `£${value.toLocaleString("en-GB")}`;

function HeroHarness({
  savings,
  setSavings,
}: {
  savings: number;
  setSavings: (value: number) => void;
}) {
  const [path, setPath] = useState(0);
  const [assumptions, setAssumptions] = useState(false);
  const cover = runway(String(savings), "2500");
  const reduced = savings < 40000;
  return (
    <section
      className="lp-lab"
      aria-label="Interactive illustrative decision harness"
    >
      <div className="lp-lab-bar">
        <span>
          <GitBranch size={15} /> THE DECISION HARNESS
        </span>
        <span className="lp-demo-tag">Illustrative demo</span>
      </div>
      <div className="lp-lab-body">
        <div className="lp-origin">
          <span className="lp-mini-label">01 / YOUR DECISION</span>
          <h2>
            Should I leave my job
            <br />
            to build a startup?
          </h2>
          <div>
            <span>Build something meaningful</span>
            <span>{pounds(savings)} saved</span>
          </div>
        </div>
        <svg
          className="lp-branches"
          viewBox="0 0 480 74"
          fill="none"
          aria-hidden="true"
        >
          <path
            className="lp-branch-line"
            d="M240 0 V18 C240 45 120 24 120 66"
            pathLength="1"
          />
          <path
            className="lp-branch-line lp-violet-line"
            d="M240 0 V18 C240 45 360 24 360 66"
            pathLength="1"
          />
          <path
            className="lp-analysis-pulse"
            d={
              path === 0
                ? "M240 0 V18 C240 45 120 24 120 66"
                : "M240 0 V18 C240 45 360 24 360 66"
            }
            pathLength="1"
          />
          <circle cx="240" cy="0" r="3" fill="#d3f4df" />
          <circle cx="120" cy="66" r="3" fill="#c4f1d7" />
          <circle cx="360" cy="66" r="3" fill="#c6b7e6" />
        </svg>
        <div className="lp-paths">
          {["Build full-time", "Build part-time"].map((title, index) => (
            <button
              key={title}
              className={`lp-path ${index === 1 ? "lp-path-b" : ""} ${path === index ? "is-selected" : ""}`}
              aria-pressed={path === index}
              onClick={() => setPath(index)}
              aria-label={`Inspect ${title}`}
            >
              <span>
                PATH {index === 0 ? "A" : "B"}
                <ArrowUpRight size={14} />
              </span>
              <strong>{title}</strong>
              <small>
                {index === 0
                  ? "More focus. More exposure."
                  : "Keep income. Share your time."}
              </small>
            </button>
          ))}
        </div>
        <div className={`lp-insights ${path === 1 ? "lp-insights-b" : ""}`}>
          <div className="lp-insights-title">
            <span>
              <ScanLine size={13} /> LOOK BEYOND THE CHOICE
            </span>
            <span>PATH {path === 0 ? "A" : "B"}</span>
          </div>
          <dl
            key={`${path}-${savings}`}
            className="lp-insight-content"
            aria-live="polite"
          >
            <div>
              <dt>Financial stability</dt>
              <dd>
                {path === 0
                  ? `${cover} months’ personal expense cover`
                  : "Retain employment income"}
              </dd>
            </div>
            <div>
              <dt>Potential upside</dt>
              <dd>
                {path === 0
                  ? "Dedicated time to build"
                  : "Test demand before committing"}
              </dd>
            </div>
            <div>
              <dt>Flexibility</dt>
              <dd>
                {path === 0
                  ? "Returning to work may take time"
                  : "Keep the option to change pace"}
              </dd>
            </div>
          </dl>
          <button
            className="lp-assumption"
            aria-expanded={assumptions}
            onClick={() => setAssumptions((open) => !open)}
          >
            <span>
              <span className="lp-inspect-dot" /> Important assumptions
            </span>
            <span>
              Inspect <ChevronDown size={12} />
            </span>
          </button>
          {assumptions && (
            <p className="lp-assumption-detail">
              £2,500/month living costs and a protected six-month buffer are
              illustrative assumptions. Expense cover assumes no income and
              excludes business costs, tax and emergencies. Employment and
              future demand are not guaranteed.
            </p>
          )}
        </div>
        <button
          className={`lp-what-if ${reduced ? "is-changed" : ""}`}
          aria-pressed={reduced}
          onClick={() => setSavings(reduced ? 40000 : 15000)}
        >
          <span className="lp-what-if-icon">
            <SlidersHorizontal size={16} />
          </span>
          <span>
            <strong>What if your savings decreased?</strong>
            <small>
              {reduced
                ? "£15,000 saved · the trade-off has changed"
                : "Try £40,000 → £15,000"}
            </small>
          </span>
          {reduced ? <RotateCcw size={15} /> : <ArrowRight size={17} />}
        </button>
        <p className="lp-lab-foot" role="status">
          {reduced
            ? "Less room above the six-month buffer. Same decision, different constraints."
            : "Select a path. Inspect an assumption. Try a different scenario."}
        </p>
      </div>
      <div className="lp-lab-footer">
        <span className="lp-small-dot" /> Authored illustration · local
        arithmetic · no AI request
      </div>
    </section>
  );
}

function MiniMap({ onDemo }: { onDemo: () => void }) {
  const [route, setRoute] = useState(0);
  const [next, setNext] = useState<number | null>(null);
  const nextChoices =
    route === 0
      ? ["Talk to customers", "Test a paid pilot"]
      : ["Protect weekly time", "Validate a niche"];
  return (
    <div className="lp-mini-map">
      <div className="lp-visual-caption">
        <span>EXPLORE THE BRANCHES</span>
        <span>Illustrative paths</span>
      </div>
      <div className="lp-map-start">
        <GitBranch size={18} />
        <span>Your next chapter</span>
      </div>
      <div className="lp-mini-route">
        {["Build full-time", "Build part-time"].map((title, index) => (
          <button
            key={title}
            className={route === index ? "selected" : ""}
            aria-pressed={route === index}
            onClick={() => {
              setRoute(index);
              setNext(null);
            }}
          >
            <span>0{index + 1}</span>
            {title}
            <ArrowUpRight size={14} />
          </button>
        ))}
      </div>
      <div className="lp-mini-next">
        <span className="lp-mini-label">WHAT COULD COME NEXT?</span>
        <div>
          {nextChoices.map((title, index) => (
            <button
              key={title}
              aria-pressed={next === index}
              onClick={() => setNext(index)}
              className={next === index ? "selected" : ""}
            >
              <CornerDownRight size={14} />
              {title}
            </button>
          ))}
        </div>
      </div>
      <p className="lp-map-explanation" aria-live="polite">
        {next === null
          ? "A choice is a beginning. Follow it to the next question."
          : `“${nextChoices[next]}” opens a new question: what evidence would make this step worth taking?`}
      </p>
      <button className="lp-text-link" onClick={onDemo}>
        Open the full interactive demo <ArrowRight size={14} />
      </button>
    </div>
  );
}

export default function LandingPage({
  onStart,
  onDemo,
  hasSaved,
  onResume,
  onDelete,
  notice,
}: {
  onStart: (question?: string) => void;
  onDemo: () => void;
  hasSaved: boolean;
  onResume: () => void;
  onDelete: () => void;
  notice: string;
}) {
  const [savings, setSavings] = useState(40000);
  const [stage, setStage] = useState(0);
  const [priority, setPriority] = useState("security");
  const [question, setQuestion] = useState("");
  return (
    <main className="harness-landing" id="top">
      <section className="lp-hero">
        <div className="lp-hero-copy">
          <div className="lp-eyebrow">
            <span /> INTRODUCING A NEW WAY TO DECIDE
          </div>
          <h1>
            <span>
              Stop asking AI
              <br className="lp-desktop-break" /> what to do.
            </span>
            <span>
              Start testing
              <br className="lp-desktop-break" /> what could happen.
            </span>
          </h1>
          <p className="lp-hero-description">
            Crossroads is your personal AI decision harness. Explore possible
            futures, challenge assumptions, stress-test trade-offs, and make
            life’s biggest decisions with greater clarity.
          </p>
          <div className="lp-hero-actions">
            <button className="lp-primary" onClick={() => onStart()}>
              Put a decision to the test <ArrowRight size={18} />
            </button>
            <a className="lp-secondary" href="#how-it-works">
              See how Crossroads works <ArrowRight size={15} />
            </a>
          </div>
          <p className="lp-personal">
            Your decisions. Your priorities. Your future.
          </p>
          {hasSaved && (
            <div className="lp-saved">
              <button onClick={onResume}>
                Continue your saved exploration <ArrowRight size={13} />
              </button>
              <button onClick={onDelete}>Delete saved map</button>
            </div>
          )}
          {notice && (
            <p className="lp-personal" role="status">
              {notice}
            </p>
          )}
        </div>
        <div className="lp-hero-visual">
          <div className="lp-visual-coordinate">
            CONTEXT → POSSIBILITIES → PERSPECTIVE
          </div>
          <HeroHarness savings={savings} setSavings={setSavings} />
          <div className="lp-visual-under">
            <span>Not a prediction. A way to examine your options.</span>
            <span>
              YOU CHOOSE THE DIRECTION <ArrowUpRight size={12} />
            </span>
          </div>
        </div>
      </section>

      <section className="lp-category" id="how-it-works">
        <div className="lp-section-heading">
          <span className="lp-eyebrow">A NEW KIND OF DECISION HARNESS</span>
          <h2>
            AI can give you an answer.
            <br />
            <span>Crossroads helps you examine it.</span>
          </h2>
          <p>
            Important decisions deserve more than a single recommendation.
            Crossroads gives you the tools to explore alternatives, question
            assumptions, and understand how different choices could unfold.
          </p>
        </div>
        <div className="lp-contrast">
          <div className="lp-answer">
            <span className="lp-mini-label">A ONE-OFF EXCHANGE</span>
            <h3>Traditional AI advice</h3>
            <div className="lp-answer-excerpt">
              <span>“Should I make the leap?”</span>
              <p>
                There are benefits to both options. Consider your finances,
                career goals, and appetite for risk…
              </p>
              <span className="lp-answer-cursor" aria-hidden="true" />
            </div>
            <ul>
              {[
                "Generates an answer",
                "Provides generic pros and cons",
                "Can leave missing information assumed",
                "Gives you a static response",
                "Leaves you to connect the trade-offs",
              ].map((item) => (
                <li key={item}>
                  <span />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="lp-system">
            <div className="lp-system-heading">
              <GitBranch size={23} />
              <div>
                <span className="lp-mini-label">
                  AN EXPLORATION YOU CAN SHAPE
                </span>
                <h3>Crossroads Decision Harness</h3>
              </div>
            </div>
            <div className="lp-system-loop" aria-hidden="true">
              <span>Your context</span>
              <i />
              <span>Possible paths</span>
              <i />
              <span>New perspective</span>
              <div>
                CHANGE AN ASSUMPTION. EXPLORE AGAIN. <RotateCcw size={12} />
              </div>
            </div>
            <ul>
              {[
                "Understands your personal context",
                "Maps alternative paths",
                "Makes assumptions visible",
                "Lets you change important variables",
                "Stress-tests possible consequences",
                "Helps you compare trade-offs",
              ].map((item) => (
                <li key={item}>
                  <Check size={15} />
                  {item}
                </li>
              ))}
            </ul>
            <p>
              You bring the priorities.
              <br />
              <strong>You keep the final say.</strong>
            </p>
          </div>
        </div>
        <p className="lp-comparison-caption">
          An illustrative contrast with a single advice response—not a claim
          about every AI product or conversation.
        </p>
      </section>

      <section className="lp-workflow" aria-labelledby="lp-workflow-title">
        <div className="lp-section-heading">
          <span className="lp-eyebrow">
            FROM A QUESTION TO A CLEARER CHOICE
          </span>
          <h2 id="lp-workflow-title">
            A better way to make
            <br />
            <span>big decisions.</span>
          </h2>
          <p>
            One connected process. Explore each stage to see how your decision
            takes shape.
          </p>
        </div>
        <div
          className="lp-stage-track"
          aria-label="Explore the decision process"
        >
          {stages.map((item, index) => (
            <button
              key={item.name}
              onClick={() => setStage(index)}
              aria-pressed={stage === index}
              className={stage === index ? "selected" : ""}
            >
              <span className="lp-stage-number">0{index + 1}</span>
              <span className="lp-stage-name">{item.name}</span>
              <strong>{item.title}</strong>
              <small>{item.description}</small>
            </button>
          ))}
        </div>
        <div className="lp-stage-detail" aria-live="polite" key={stage}>
          <div>
            <span className="lp-mini-label">
              IN PRACTICE / {stages[stage].name.toUpperCase()}
            </span>
            <p>{stages[stage].example}</p>
          </div>
          <div>
            <span className="lp-stage-caption">{stages[stage].caption}</span>
            <div className="lp-stage-tags">
              {stages[stage].tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="lp-features" id="possibilities">
        <div className="lp-section-heading">
          <span className="lp-eyebrow">MORE THAN AN ANSWER</span>
          <h2>
            Put your decisions
            <br />
            <span>through their paces.</span>
          </h2>
        </div>
        <article className="lp-feature">
          <div className="lp-feature-copy">
            <span className="lp-feature-index">01 / EXPLORE</span>
            <h3>
              Map the
              <br />
              possibilities.
            </h3>
            <p>
              Every choice creates new possibilities. Explore them step by step.
            </p>
            <span className="lp-feature-aside">
              Follow a direction. Find the next decision. Come back and try
              another.
            </span>
          </div>
          <MiniMap onDemo={onDemo} />
        </article>
        <article className="lp-feature lp-feature-reverse">
          <div className="lp-feature-copy">
            <span className="lp-feature-index">02 / STRESS-TEST</span>
            <h3>
              Challenge the
              <br />
              assumptions.
            </h3>
            <p>
              Change what you assume and discover how your options might change.
            </p>
            <span className="lp-feature-aside">
              Try changing the savings below. The arithmetic changes
              immediately; the illustration shows the trade-off.
            </span>
          </div>
          <div className="lp-assumption-sandbox">
            <div className="lp-visual-caption">
              <span>CHANGE THE STARTING CONDITIONS</span>
              <SlidersHorizontal size={15} />
            </div>
            <label htmlFor="illustrative-savings">
              Current savings <strong>{pounds(savings)}</strong>
            </label>
            <input
              id="illustrative-savings"
              type="range"
              min="15000"
              max="40000"
              step="5000"
              value={savings}
              aria-valuetext={pounds(savings)}
              onChange={(event) => setSavings(Number(event.target.value))}
            />
            <div className="lp-range-labels">
              <span>£15,000</span>
              <span>£40,000</span>
            </div>
            <dl>
              <div>
                <dt>Income</dt>
                <dd>£90,000 gross / year</dd>
              </div>
              <div>
                <dt>Risk tolerance</dt>
                <dd>Moderate</dd>
              </div>
              <div>
                <dt>Available time</dt>
                <dd>
                  10 hours / week <small>assumed</small>
                </dd>
              </div>
            </dl>
            <div className="lp-local-result" role="status">
              <span>
                {runway(String(savings), "2500")}
                <small>months</small>
              </span>
              <p>
                Personal expense cover
                <br />
                <small>{pounds(savings)} ÷ £2,500/month, with no income.</small>
              </p>
            </div>
            <p className="lp-fine-print">
              Illustrative inputs. Living costs are assumed; business costs, tax
              and emergencies are excluded. No AI request or business forecast.
            </p>
          </div>
        </article>
        <article className="lp-feature">
          <div className="lp-feature-copy">
            <span className="lp-feature-index">03 / COMPARE</span>
            <h3>
              Understand
              <br />
              the trade-offs.
            </h3>
            <p>
              See the potential benefits, costs, risks, and uncertainties of
              each path.
            </p>
            <span className="lp-feature-aside">
              The trade-offs don’t disappear. You get to decide which ones
              matter more.
            </span>
          </div>
          <div className="lp-tradeoff-sandbox">
            <div className="lp-visual-caption">
              <span>WHAT MATTERS MORE TO YOU?</span>
              <span>Illustrative comparison</span>
            </div>
            <div className="lp-priority-buttons">
              {[
                ["security", "Financial security"],
                ["focus", "Time to build"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setPriority(value)}
                  aria-pressed={priority === value}
                  className={priority === value ? "selected" : ""}
                >
                  {label}
                </button>
              ))}
            </div>
            <div
              className={`lp-tradeoff-table ${priority === "focus" ? "focus" : "security"}`}
            >
              <table>
                <thead>
                  <tr>
                    <th scope="col">Trade-off</th>
                    <th scope="col">Full-time</th>
                    <th scope="col">Part-time</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Time to build</th>
                    <td>Dedicated focus</td>
                    <td>Limited hours</td>
                  </tr>
                  <tr>
                    <th scope="row">Income</th>
                    <td>Salary stops</td>
                    <td>Salary retained</td>
                  </tr>
                  <tr>
                    <th scope="row">Flexibility</th>
                    <td>Greater commitment</td>
                    <td>Gradual commitment</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p
              className="lp-priority-insight"
              key={priority}
              aria-live="polite"
            >
              <span>IF THIS IS YOUR PRIORITY</span>
              {priority === "security"
                ? "Building part-time preserves income, if the workload and employment terms allow it."
                : "Building full-time creates more focused time, if you can protect your cash buffer and accept the uncertainty."}
            </p>
            <p className="lp-fine-print">
              No scores. No universal winner. Conditions and priorities change
              the fit.
            </p>
          </div>
        </article>
      </section>

      <section className="lp-examples">
        <div className="lp-section-heading">
          <span className="lp-eyebrow">
            YOUR LIFE DOESN’T COME WITH A PLAYBOOK
          </span>
          <h2>
            For the decisions
            <br />
            <span>that shape your life.</span>
          </h2>
          <p>Start with a question that feels familiar. Make it your own.</p>
        </div>
        <div className="lp-example-list">
          {examples.map((example, index) => (
            <button
              key={example.category}
              onClick={() => onStart(example.question)}
            >
              <span className="lp-example-category">
                <small>0{index + 1}</small>
                {example.category}
              </span>
              <span>
                <strong>{example.question}</strong>
                <small>{example.detail}</small>
              </span>
              <ArrowUpRight size={24} />
            </button>
          ))}
        </div>
      </section>

      <section className="lp-final">
        <svg
          className="lp-final-motif"
          viewBox="0 0 1200 500"
          fill="none"
          aria-hidden="true"
        >
          <path d="M0 250 C200 250 250 250 400 250 C600 250 620 40 1200 40 M400 250 C600 250 620 460 1200 460" />
          <path
            className="lp-final-pulse"
            pathLength="1"
            d="M0 250 C200 250 250 250 400 250 C600 250 620 40 1200 40"
          />
          <circle cx="400" cy="250" r="5" />
        </svg>
        <span className="lp-eyebrow">
          THE NEXT CHAPTER IS STILL YOURS TO WRITE
        </span>
        <h2>
          You can’t see the future.
          <br />
          <span>
            But you can explore
            <br className="lp-mobile-break" /> your possibilities.
          </span>
        </h2>
        <p>
          Every important decision opens different paths. Crossroads helps you
          understand them before you choose.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onStart(question);
          }}
        >
          <label className="sr-only" htmlFor="landing-decision">
            Your decision
          </label>
          <input
            id="landing-decision"
            maxLength={2000}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="What’s on your mind?"
          />
          <button className="lp-primary" type="submit">
            Explore My Crossroads <ArrowRight size={17} />
          </button>
        </form>
        <span className="lp-final-note">
          Your context. Your choices. Always.
        </span>
      </section>
      <footer className="lp-footer">
        <span>
          <GitBranch size={18} />
          <strong>crossroads</strong>
          <span>A new kind of decision harness.</span>
        </span>
        <a href="#top">
          Back to the possibilities <ArrowUpRight size={14} />
        </a>
      </footer>
    </main>
  );
}
