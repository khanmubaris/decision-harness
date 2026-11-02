"use client";
import { useEffect, useState, useRef, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import LandingPage from "@/components/LandingPage";
import PossibilityLoader from "@/components/PossibilityLoader";
import WhatIfDialog from "@/components/WhatIfDialog";
import BranchIntelligence from "@/components/BranchIntelligence";
import PathComparison from "@/components/PathComparison";
import {
  applyReconsideration,
  pairFor,
  objectiveSuggestions,
} from "@/lib/decision/harness";
import { BranchPrefetch } from "@/lib/decision/prefetch";
import { requestDecision } from "@/lib/decision/client";
import {
  ArrowRight,
  ArrowUpRight,
  GitBranch,
  Sparkles,
  ShieldCheck,
  ChevronLeft,
  X,
  Plus,
  Check,
  Scale,
  LoaderCircle,
  Eye,
  ChevronDown,
  Info,
} from "lucide-react";
import {
  attach,
  emptyContext,
  contextSchema,
  pathTo,
  resultSchema,
  scenarioSchema,
  type Context,
  type Scenario,
} from "@/lib/decision/schema";
import {
  createDemoTree,
  demoChoices,
  demoContext,
  demoQuestion,
  demoReconsider,
} from "@/lib/decision/demo";
import { DEFAULT_MODEL } from "@/lib/ai/models";
const DecisionGraph = dynamic(() => import("@/components/DecisionGraph"), {
  ssr: false,
});
const demoOnly = process.env.NEXT_PUBLIC_DEMO_ONLY === "true";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [provider, setProvider] = useState<Scenario["provider"]>({
    provider: "openai", model: DEFAULT_MODEL, baseUrl: "",
  });
  const [apiKey, setApiKey] = useState("");
  const [exploration, setExploration] = useState<Scenario["exploration"]>({
    branchingFactor: 2, maxDepth: 5,
  });
  const [context, setContext] = useState<Context>(emptyContext);
  const [form, setForm] = useState(false);
  const [profile, setProfile] = useState<Context | null>(null);
  const [profileMessage, setProfileMessage] = useState("");
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [selected, setSelected] = useState("root");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [handoffQuestion, setHandoffQuestion] = useState<string | null>(null);
  useEffect(() => {
    if (!handoffQuestion) return;
    const timer = setTimeout(() => setHandoffQuestion(null), 650);
    return () => clearTimeout(timer);
  }, [handoffQuestion]);
  const [error, setError] = useState("");
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [pins, setPins] = useState<string[]>([]);
  const [compare, setCompare] = useState(false);
  const [whatIf, setWhatIf] = useState(false);
  const [saved, setSaved] = useState<Scenario | null>(null);
  const [corrections, setCorrections] = useState("");
  const [notice, setNotice] = useState("");
  const lock = useRef(false);
  const [preloader] = useState(() => new BranchPrefetch());
  const branchStatus = useSyncExternalStore(
    preloader.subscribe,
    preloader.getSnapshot,
    preloader.getSnapshot,
  );
  useEffect(() => () => preloader.clear(), [preloader]);
  useEffect(() => preloader.setApiKey(apiKey), [apiKey, preloader]);
  useEffect(() => {
    if (!scenario || scenario.mode !== "live") {
      preloader.clear();
      return;
    }
    if (!busy) preloader.prepare(scenario, selected);
  }, [scenario, selected, busy, preloader]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("crossroads-v1");
      if (raw) {
        const value = JSON.parse(raw);
        if (value?.version === 1) {
          const parsed = scenarioSchema.safeParse(value.scenario);
          if (parsed.success) setSaved(parsed.data);
        }
      }
    } catch {}
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    async function loadProfile() {
      try {
        const raw = localStorage.getItem("crossroads-profile-v1");
        if (raw === "null") return; // Explicitly cleared defaults take precedence.
        if (raw) {
          const parsed = contextSchema.safeParse(JSON.parse(raw));
          if (parsed.success) {
            setProfile(parsed.data);
            setContext(parsed.data);
            return;
          }
        }
      } catch {
        /* Continue with optional installation defaults. */
      }
      try {
        const response = await fetch("/api/profile-defaults", {
          signal: controller.signal,
          cache: "no-store",
        });
        const parsed = contextSchema.safeParse((await response.json()).profile);
        if (!controller.signal.aborted && parsed.success) {
          setProfile(parsed.data);
          setContext((current) =>
            JSON.stringify(current) === JSON.stringify(emptyContext)
              ? parsed.data
              : current,
          );
        }
      } catch {
        /* Defaults are optional; the form stays usable. */
      }
    }
    void loadProfile();
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!form && !compare && !whatIf) return;
    const previous = document.activeElement as HTMLElement | null;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const selector =
      'button:not(:disabled), input, textarea, select:not(:disabled), [href], [tabindex="0"]';
    const focusable = () =>
      Array.from(dialog?.querySelectorAll<HTMLElement>(selector) || []);
    (focusable()[0] || dialog)?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) {
        setForm(false);
        setCompare(false);
        setWhatIf(false);
      }
      if (e.key === "Tab") {
        const els = focusable();
        if (!els.length) {
          e.preventDefault();
          dialog?.focus();
          return;
        }
        const first = els[0],
          last = els.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = original;
      previous?.focus();
    };
  }, [form, compare, whatIf, busy]);
  useEffect(() => {
    const details = document.querySelector<HTMLElement>(".details");
    details?.scrollTo({ top: 0 });
    if (detailsOpen && window.matchMedia("(max-width: 760px)").matches) {
      details?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
    }
  }, [selected, detailsOpen]);
  useEffect(() => {
    setDetailsOpen(false);
    if (scenario)
      document.querySelector<HTMLElement>(".workspace-heading h1")?.focus();
  }, [scenario?.id]);
  const current = scenario?.nodes.find((n) => n.id === selected);
  const path = scenario ? pathTo(scenario.nodes, selected) : [];
  const currentPair = scenario ? pairFor(scenario, selected) : [];
  const currentIsStale = Boolean(
    current && scenario?.staleNodeIds?.includes(current.id),
  );
  async function reconsider(nextContext: Context, nextCorrections: string) {
    if (!scenario || lock.current || currentPair.length !== scenario.exploration.branchingFactor) return;
    lock.current = true;
    preloader.clear();
    setBusy(true);
    setError("");
    try {
      const parentPath = pathTo(scenario.nodes, currentPair[0].parentId);
      const result =
        scenario.mode === "demo"
          ? demoReconsider(scenario, currentPair, nextContext)
          : await requestDecision({
              question: scenario.question,
              context: nextContext,
              provider: scenario.provider,
              exploration: scenario.exploration,
              apiKey,
              corrections: nextCorrections,
              path: parentPath,
              mode: "reconsider",
              alternatives: currentPair,
              previousContext: scenario.context,
            });
      const updated = applyReconsideration(
        scenario,
        currentPair,
        nextContext,
        nextCorrections,
        result,
      );
      setScenario(updated);
      setCorrections(nextCorrections);
      setPins((values) =>
        values.filter((id) => updated.nodes.some((node) => node.id === id)),
      );
      setCollapsed((values) =>
        values.filter((id) => updated.nodes.some((node) => node.id === id)),
      );
      setWhatIf(false);
      setNotice(
        "These two paths have been reconsidered. Review the highlighted changes; you decide what to do next.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function request(path: Scenario["nodes"]) {
    return requestDecision({
      question: scenario?.question || question,
      context: scenario?.context || context,
      path,
      provider: scenario?.provider ?? provider,
      exploration: scenario?.exploration ?? exploration,
      apiKey,
      corrections: scenario?.corrections || "",
    });
  }

  async function generate() {
    if (lock.current) return;
    preloader.clear();
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const data = await request([]);
      setHandoffQuestion(question);
      setScenario({
        id: crypto.randomUUID(),
        question,
        context,
        objective: data.objective,
        tradeoff: data.tradeoff,
        category: data.category,
        constraints: data.constraints,
        nodes: attach(data.choices),
        mode: "live",
        provider,
        exploration,
        corrections: "",
      });
      setSelected("root");
      setPins([]);
      setCollapsed([]);
      setForm(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not generate. Please retry.",
      );
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  async function expand() {
    if (
      !scenario ||
      !current ||
      current.depth >= scenario.exploration.maxDepth ||
      currentIsStale ||
      lock.current
    )
      return;
    setCollapsed((c) => c.filter((id) => id !== selected));
    if (scenario.nodes.some((n) => n.parentId === selected)) {
      setSelected(scenario.nodes.find((n) => n.parentId === selected)!.id);
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const choices =
        scenario.mode === "demo"
          ? demoChoices(path, scenario.context)
          : await preloader.expand(scenario, path);
      if (scenario.mode === "live" && !preloader.matches(scenario)) return;
      const nodes = attach(choices, selected, current.depth + 1);
      setScenario({ ...scenario, nodes: [...scenario.nodes, ...nodes] });
      setSelected(nodes[0].id);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not expand. Please retry.",
      );
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  function openDemo() {
    preloader.clear();
    const demo = createDemoTree();
    setScenario(demo);
    setSelected("root");
    setPins([]);
    setCollapsed(
      demo.nodes.filter((node) => node.depth < 5).map((node) => node.id),
    );
    setForm(false);
    setError("");
    setNotice("");
  }
  function start(q = question) {
    setQuestion(q);
    if (profile) setContext({ ...profile });
    setProfileMessage("");
    setError("");
    setForm(true);
  }
  function save() {
    if (!scenario) return;
    try {
      localStorage.setItem(
        "crossroads-v1",
        JSON.stringify({
          version: 1,
          scenario: { ...scenario, view: { selected, pins, collapsed } },
        }),
      );
      setSaved({ ...scenario, view: { selected, pins, collapsed } });
      setNotice("Saved on this device.");
    } catch {
      setNotice(
        "Browser storage is unavailable. Your current map is still open.",
      );
    }
  }
  function reset() {
    preloader.clear();
    setWhatIf(false);
    setCompare(false);
    setScenario(null);
    setCorrections("");
    setPins([]);
    setCollapsed([]);
    setError("");
    setNotice("");
  }
  const header = (
    <header className={`header ${!scenario ? "landing-header" : ""}`}>
      <button className="brand" onClick={reset} disabled={busy}>
        <span className="brand-icon">
          <GitBranch size={23} />
        </span>
        crossroads<span className="beta">BETA</span>
      </button>
      <nav>
        {scenario ? (
          <>
            <span className={`status ${scenario.mode}`}>
              <i />
              {scenario.mode === "demo"
                ? "Pre-generated demo"
                : "Live AI scenario"}
            </span>
            <button className="text-button" onClick={save}>
              Save locally
            </button>
            <button className="outline small" onClick={reset} disabled={busy}>
              <Plus size={15} /> New crossroads
            </button>
          </>
        ) : (
          <>
            <a href="#how-it-works">How it works</a>
            <button className="text-button" onClick={openDemo}>
              Try the demo <ArrowUpRight size={14} />
            </button>
            <span className="nav-label">A NEW KIND OF DECISION HARNESS</span>
          </>
        )}
      </nav>
    </header>
  );
  return (
    <>
      {header}
      {demoOnly && !scenario && (
        <div className="judge-demo-notice">
          <span>
            <strong>Hackathon showcase</strong> · Explore a fictional five-level
            decision tree. Live AI generation is disabled.
          </span>
          <button onClick={openDemo}>
            Open judge demo <ArrowRight size={14} />
          </button>
        </div>
      )}
      {!scenario ? (
        <LandingPage
          onStart={(value) => start(value ?? question)}
          onDemo={openDemo}
          hasSaved={Boolean(saved)}
          notice={notice}
          onResume={() => {
            if (!saved) return;
            setScenario(saved);
            setCorrections(saved.corrections);
            setSelected(
              saved.nodes.some((node) => node.id === saved.view?.selected)
                ? saved.view!.selected
                : "root",
            );
            setPins(
              (saved.view?.pins ?? []).filter((id) =>
                saved.nodes.some((node) => node.id === id),
              ),
            );
            setCollapsed(
              (saved.view?.collapsed ?? []).filter((id) =>
                saved.nodes.some((node) => node.id === id),
              ),
            );
          }}
          onDelete={() => {
            try {
              localStorage.removeItem("crossroads-v1");
              setSaved(null);
            } catch {
              setNotice("Could not clear browser storage.");
            }
          }}
        />
      ) : (
        <main className="workspace">
          <div className="workspace-heading">
            <div>
              <div className="eyebrow">
                {scenario.category.toUpperCase()} CROSSROADS
              </div>
              <h1 tabIndex={-1}>Your next chapter, unfolding.</h1>
              <details className="workspace-question">
                <summary>
                  <span>{scenario.question}</span>
                  <ChevronDown size={15} />
                </summary>
                <p>{scenario.question}</p>
              </details>
            </div>
            <div className="workspace-actions">
              {!current && (
                <button
                  className="outline what-if-trigger"
                  disabled={busy || currentPair.length !== scenario.exploration.branchingFactor}
                  onClick={() => setWhatIf(true)}
                >
                  <Sparkles size={15} /> What if things change?
                </button>
              )}
              <button
                className="outline"
                aria-expanded={detailsOpen}
                aria-controls="decision-details"
                onClick={() => setDetailsOpen((open) => !open)}
              >
                <Info size={15} />{" "}
                {detailsOpen ? "Hide details" : "Decision details"}
              </button>
              <button
                className="outline"
                disabled={pins.length !== 2}
                onClick={() => setCompare(true)}
              >
                <Scale size={16} /> Compare paths{" "}
                <span className="count">{pins.length}/2</span>
              </button>
            </div>
          </div>
          {scenario.lastChange && (
            <div className="revision-summary" role="status">
              <span className="eyebrow">
                {scenario.lastChange.inputs.length
                  ? "ASSUMPTIONS UPDATED"
                  : "ANALYSIS RECONSIDERED"}
              </span>
              <div>
                {scenario.lastChange.inputs.map((change) => (
                  <span className="changed-input" key={change.field}>
                    <strong>{change.field}</strong> {change.before}{" "}
                    <ArrowRight size={12} /> {change.after}
                  </span>
                ))}
              </div>
              {scenario.lastChange.previousRunway !== null &&
                scenario.lastChange.currentRunway !== null &&
                scenario.lastChange.previousRunway !==
                  scenario.lastChange.currentRunway && (
                  <p>
                    Personal expense cover:{" "}
                    <strong>
                      {scenario.lastChange.previousRunway} →{" "}
                      {scenario.lastChange.currentRunway} months
                    </strong>
                    , assuming no income. Business costs are excluded.
                  </p>
                )}
              <p>
                {scenario.exploration.branchingFactor} choices reconsidered.{" "}
                {scenario.staleNodeIds?.length
                  ? "Other paths are marked as using earlier assumptions."
                  : "Updated conclusions are highlighted in each path."}
              </p>
            </div>
          )}
          {scenario.mode === "demo" &&
            scenario.nodes.length === 62 &&
            !scenario.lastChange && (
              <div className="demo-tree-toolbar">
                <span>
                  <strong>Five levels ready</strong> · 62 authored choices · No
                  AI requests
                </span>
                <button
                  className="outline small"
                  onClick={() => {
                    setSelected("root");
                    setDetailsOpen(false);
                    setCollapsed(
                      collapsed.length
                        ? []
                        : scenario.nodes
                            .filter((node) => node.depth < 5)
                            .map((node) => node.id),
                    );
                  }}
                >
                  <GitBranch size={14} />
                  {collapsed.length
                    ? "Show all five levels"
                    : "Focus first choices"}
                </button>
              </div>
            )}
          <div className="map-toolbar">
            <div className="step-track">
              <span>YOUR EXPLORATION</span>
              {Array.from({ length: scenario.exploration.maxDepth }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  title={`Step ${n}`}
                  disabled={!path[n - 1]}
                  className={path.length >= n ? "done" : ""}
                  onClick={() => setSelected(path[n - 1].id)}
                >
                  {path.length > n ? <Check size={12} /> : n}
                </button>
              ))}
            </div>
            <span className="map-hint">Drag to explore · Scroll to zoom</span>
          </div>
          <div
            className={`explorer cinematic-explorer ${detailsOpen ? "details-open" : ""}`}
          >
            <div className="graph">
              <div className="canvas-atmosphere" aria-hidden="true" />
              <div className="canvas-intro">
                <span className="eyebrow">A LANDSCAPE OF POSSIBILITIES</span>
                <p>
                  {selected === "root"
                    ? "Where could this take you?"
                    : "Every path opens another."}
                </p>
              </div>
              <div className="canvas-count" aria-hidden="true">
                <span>{String(scenario.nodes.length).padStart(2, "0")}</span>{" "}
                POSSIBILITIES MAPPED
              </div>
              <DecisionGraph
                scenario={scenario}
                selected={selected}
                onSelect={(id) => {
                  if (!busy) {
                    setSelected(id);
                    setDetailsOpen(true);
                  }
                }}
                collapsed={collapsed}
                detailsOpen={detailsOpen}
              />
              <div className="graph-legend">
                <span>
                  <i /> Your explored path
                </span>
                <span>
                  <i /> Other possibilities
                </span>
              </div>
            </div>
            <aside
              id="decision-details"
              className="details"
              hidden={!detailsOpen}
            >
              {current ? (
                <>
                  <div className="detail-top">
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => setSelected(current.parentId)}
                    >
                      <ChevronLeft size={15} /> Back a step
                    </button>
                    <span>STEP {current.depth} OF {scenario.exploration.maxDepth}</span>
                  </div>
                  <div className="eyebrow">A POSSIBLE DIRECTION</div>
                  <h2>{current.title}</h2>
                  {currentIsStale && (
                    <div className="stale-analysis" role="status">
                      This path uses earlier assumptions. Reconsider it before
                      exploring further.
                    </div>
                  )}
                  <h3 className="intelligence-label">What could happen?</h3>
                  <p className="summary">{current.summary}</p>
                  {scenario.lastChange?.nodes
                    .find((node) => node.id === current.id)
                    ?.changes.find(
                      (change) => change.section === "What could happen?",
                    ) && <span className="updated-badge">Outcome updated</span>}
                  <div className="detail-tags">
                    <span>{current.horizon}</span>
                    <span>{current.uncertainty} uncertainty</span>
                  </div>
                  <div className="detail-actions">
                    <button
                      className="outline what-if-trigger"
                      disabled={busy || currentPair.length !== scenario.exploration.branchingFactor}
                      onClick={() => setWhatIf(true)}
                    >
                      <Sparkles size={15} /> What if things change?
                    </button>
                    {current.depth < scenario.exploration.maxDepth ? (
                      <button
                        className="primary"
                        disabled={busy || currentIsStale}
                        onClick={expand}
                      >
                        {busy ? (
                          <LoaderCircle className="spin" size={16} />
                        ) : (
                          <GitBranch size={16} />
                        )}{" "}
                        {busy
                          ? "Exploring possibilities…"
                          : scenario.nodes.some(
                                (n) => n.parentId === selected,
                              ) && !collapsed.includes(selected)
                            ? "Revisit next step"
                            : "Explore next step"}
                        <ArrowRight size={16} />
                      </button>
                    ) : (
                      <div className="finish">
                        <Check size={17} /> {scenario.exploration.maxDepth} steps explored. A possibility,
                        not a prediction.
                      </div>
                    )}
                    {scenario.mode === "live" &&
                      !currentIsStale &&
                      current.depth < scenario.exploration.maxDepth &&
                      !scenario.nodes.some(
                        (node) => node.parentId === selected,
                      ) && (
                        <p className="branch-preparation" role="status">
                          {branchStatus[selected] === "ready" ? (
                            <>
                              <Check size={12} /> Next paths are ready.
                            </>
                          ) : branchStatus[selected] === "loading" ||
                            branchStatus[selected] === "queued" ? (
                            <>
                              <span className="preparation-dot" /> Preparing the
                              next possibilities…
                            </>
                          ) : (
                            "Next paths will be generated when you explore."
                          )}
                        </p>
                      )}
                    <button
                      className="outline"
                      disabled={pins.length === 2 && !pins.includes(selected)}
                      onClick={() =>
                        setPins((p) =>
                          p.includes(selected)
                            ? p.filter((id) => id !== selected)
                            : [...p, selected],
                        )
                      }
                    >
                      <Scale size={15} />
                      {pins.includes(selected)
                        ? "Remove from comparison"
                        : "Add to comparison"}
                    </button>
                    {scenario.nodes.some((n) => n.parentId === selected) && (
                      <button
                        className="text-button"
                        onClick={() =>
                          setCollapsed((p) =>
                            p.includes(selected)
                              ? p.filter((id) => id !== selected)
                              : [...p, selected],
                          )
                        }
                      >
                        <Eye size={14} />
                        {collapsed.includes(selected)
                          ? "Show branches"
                          : "Collapse branches"}
                      </button>
                    )}
                  </div>
                  <BranchIntelligence node={current} scenario={scenario} />
                </>
              ) : (
                <>
                  <div className="eyebrow">YOUR STARTING POINT</div>
                  <h2>There’s more than one way forward.</h2>
                  <p className="summary">{scenario.tradeoff}</p>
                  <div className="detail-section">
                    <h3>What matters to you</h3>
                    <p>{scenario.objective}</p>
                  </div>
                  {scenario.constraints.length > 0 && (
                    <div className="detail-section">
                      <h3>Constraints</h3>
                      <ul>
                        {scenario.constraints.map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="context-summary">
                    <h3>Your supplied context</h3>
                    {Object.entries(scenario.context)
                      .filter(([, v]) => v)
                      .map(([k, v]) => (
                        <div key={k}>
                          <span>
                            {k === "offeredSalary" ? "offered salary" : k}
                          </span>
                          <strong>{v}</strong>
                        </div>
                      ))}
                  </div>
                  <div className="root-choices">
                    {scenario.nodes
                      .filter((n) => n.parentId === "root")
                      .map((n) => (
                        <button
                          className="outline"
                          key={n.id}
                          onClick={() => setSelected(n.id)}
                        >
                          {n.title}
                          <ArrowRight size={16} />
                        </button>
                      ))}
                  </div>
                  <p className="muted small-copy">
                    Choose a path on the map to see its assumptions, trade-offs
                    and next decisions.
                  </p>
                </>
              )}
              {scenario.mode === "live" && (
                <details className="corrections">
                  <summary>
                    Correct an assumption <ChevronDown size={13} />
                  </summary>
                  <label htmlFor="correction">
                    Add a correction. Applying it resets generated branches so
                    old assumptions do not persist.
                  </label>
                  <textarea
                    id="correction"
                    value={corrections}
                    onChange={(e) => setCorrections(e.target.value)}
                    maxLength={1500}
                  />
                  <button
                    className="outline"
                    disabled={busy || !corrections.trim()}
                    onClick={async () => {
                      if (lock.current) return;
                      preloader.clear();
                      lock.current = true;
                      setBusy(true);
                      setError("");
                      try {
                        const res = await fetch("/api/decision", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            question: scenario.question,
                            context: scenario.context,
                            path: [],
                            corrections,
                            provider: scenario.provider,
                            exploration: scenario.exploration,
                            apiKey,
                          }),
                          signal: AbortSignal.timeout(55000),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error);
                        const result = resultSchema.parse(data);
                        setScenario({
                          ...scenario,
                          ...{
                            objective: result.objective,
                            tradeoff: result.tradeoff,
                            constraints: result.constraints,
                          },
                          nodes: attach(result.choices),
                          corrections,
                          lastChange: undefined,
                          staleNodeIds: [],
                          view: undefined,
                        });
                        setSelected("root");
                        setPins([]);
                        setCollapsed([]);
                        setCorrections(corrections);
                      } catch (e) {
                        setError(
                          e instanceof Error
                            ? e.message
                            : "Could not apply correction.",
                        );
                      } finally {
                        lock.current = false;
                        setBusy(false);
                      }
                    }}
                  >
                    Apply & regenerate
                  </button>
                </details>
              )}
            </aside>
          </div>
          <div className="workspace-footer">
            <span>
              <Info size={13} /> Plausible scenarios, not predictions. You
              decide what comes next.
            </span>
            <span>
              {scenario.mode === "demo"
                ? "Fictional profile · Offline demo · No API request"
                : `${scenario.provider.model} · Generated with your ${scenario.provider.provider} key · No external research`}
            </span>
          </div>
          {notice && (
            <div className="notice" role="status">
              {notice}
              <button aria-label="Dismiss notice" onClick={() => setNotice("")}>
                <X size={14} />
              </button>
            </div>
          )}
        </main>
      )}
      {error && !form && (
        <div className="error-toast" role="alert">
          <Info size={18} />
          <div>
            {error}
            <button className="text-button" onClick={openDemo}>
              Open offline demo <ArrowRight size={14} />
            </button>
          </div>
          <button onClick={() => setError("")} aria-label="Dismiss error">
            <X size={18} />
          </button>
        </div>
      )}
      {form && (
        <div className="overlay">
          <section
            className={`modal context-modal ${busy ? "possibility-modal" : ""}`}
            tabIndex={-1}
            aria-busy={busy}
            role="dialog"
            aria-modal="true"
            aria-labelledby="context-title"
          >
            {busy ? (
              <PossibilityLoader question={question} />
            ) : (
              <>
                <button
                  className="close"
                  disabled={busy}
                  aria-label="Close context form"
                  onClick={() => setForm(false)}
                >
                  <X size={20} />
                </button>
                <div className="eyebrow">A LITTLE CONTEXT GOES A LONG WAY</div>
                <h2 id="context-title">Make this about you.</h2>
                <p>
                  Share only what feels relevant. Every context field is
                  optional.
                </p>
                {error && (
                  <div className="generation-error" role="alert">
                    <Info size={18} />
                    <div>
                      <strong>
                        We couldn’t bring your paths to life just yet.
                      </strong>
                      <p>{error}</p>
                      <p>
                        Your question and details are still here. Please try
                        again.
                      </p>
                      <button className="text-button" onClick={generate}>
                        Retry generation <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (demoOnly) openDemo();
                    else generate();
                  }}
                >
                  <label>
                    Your crossroads
                    <textarea
                      autoFocus
                      required={!demoOnly}
                      minLength={demoOnly ? undefined : 10}
                      maxLength={2000}
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="What decision are you considering?"
                    />
                  </label>
                  <div className="form-grid">
                    {(
                      [
                        ["location", "Location", "e.g. London, UK"],
                        ["age", "Age range", "e.g. 25–34"],
                        ...(/job|career|startup|work|invest|saving|cash|money|business|salary|degree|master|purchase|buy|home/i.test(
                          question,
                        )
                          ? [
                              ["income", "Annual gross income", "e.g. 70000"],
                              [
                                "offeredSalary",
                                "Offered annual salary",
                                "If relevant",
                              ],
                              ["savings", "Savings", "e.g. 25000"],
                              ["expenses", "Monthly expenses", "e.g. 2500"],
                            ]
                          : []),
                      ] as [keyof Context, string, string][]
                    ).map(([key, label, placeholder]) => (
                      <label key={key}>
                        {label}
                        <input
                          maxLength={key === "location" ? 150 : 50}
                          value={context[key]}
                          placeholder={placeholder}
                          onChange={(e) =>
                            setContext({ ...context, [key]: e.target.value })
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <label>
                    Primary objective
                    <input
                      list="objective-suggestions"
                      maxLength={500}
                      placeholder="e.g. More meaningful work, with room for family"
                      value={context.goal}
                      onChange={(e) =>
                        setContext({ ...context, goal: e.target.value })
                      }
                    />
                  </label>
                  <datalist id="objective-suggestions">
                    {objectiveSuggestions.map((goal) => (
                      <option key={goal} value={goal} />
                    ))}
                  </datalist>
                  <label>
                    Decision horizon
                    <select
                      value={context.decisionHorizon}
                      onChange={(event) =>
                        setContext({
                          ...context,
                          decisionHorizon: event.target
                            .value as Context["decisionHorizon"],
                        })
                      }
                    >
                      {["1 year", "3 years", "5 years", "10 years"].map(
                        (horizon) => (
                          <option key={horizon}>{horizon}</option>
                        ),
                      )}
                    </select>
                  </label>
                  <label>
                    Personal constraints
                    <input
                      maxLength={1000}
                      placeholder="Anything your possible futures should account for"
                      value={context.constraints}
                      onChange={(e) =>
                        setContext({ ...context, constraints: e.target.value })
                      }
                    />
                  </label>
                  <div className="risk-label">
                    Risk tolerance <span>Optional · default: moderate</span>
                  </div>
                  <div className="risk-options">
                    {(["Low", "Medium", "High"] as const).map((r) => (
                      <button
                        type="button"
                        aria-pressed={context.risk === r}
                        className={context.risk === r ? "selected" : ""}
                        key={r}
                        onClick={() => setContext({ ...context, risk: r })}
                      >
                        {r === "Medium" ? "Moderate" : r}
                      </button>
                    ))}
                  </div>
                  <div className="profile-defaults">
                    <div className="profile-actions">
                      <button
                        type="button"
                        className="outline"
                        disabled={busy}
                        onClick={() => {
                          try {
                            const parsed = contextSchema.parse(context);
                            localStorage.setItem(
                              "crossroads-profile-v1",
                              JSON.stringify(parsed),
                            );
                            setProfile({ ...parsed });
                            setProfileMessage(
                              "Your defaults are saved on this device. New explorations will prefill them.",
                            );
                          } catch {
                            setProfileMessage(
                              "Could not save defaults. Check your entries and browser storage settings.",
                            );
                          }
                        }}
                      >
                        Save as my defaults
                      </button>
                      {profile && (
                        <>
                          <button
                            type="button"
                            className="text-button"
                            disabled={busy}
                            onClick={() => {
                              setContext({ ...profile });
                              setProfileMessage(
                                "Your saved defaults have been filled in.",
                              );
                            }}
                          >
                            Use my defaults
                          </button>
                          <button
                            type="button"
                            className="text-button"
                            disabled={busy}
                            onClick={() => {
                              try {
                                localStorage.setItem(
                                  "crossroads-profile-v1",
                                  "null",
                                );
                                setProfile(null);
                                setContext({ ...emptyContext });
                                setProfileMessage(
                                  "Saved defaults removed. The form is now blank.",
                                );
                              } catch {
                                setProfileMessage(
                                  "Could not remove defaults. Browser storage is unavailable.",
                                );
                              }
                            }}
                          >
                            Clear defaults
                          </button>
                        </>
                      )}
                    </div>
                    <p>
                      Save your details in this browser to prefill future
                      explorations. Only save information you are comfortable
                      keeping on this device.
                    </p>
                    {profileMessage && <p role="status">{profileMessage}</p>}
                  </div>
                  <div className="model-picker">
                    <label htmlFor="ai-provider">Your AI provider</label>
                    <select
                      id="ai-provider"
                      value={provider.provider}
                      disabled={busy}
                      onChange={(e) => {
                        const next = e.target.value as Scenario["provider"]["provider"];
                        setProvider({
                          provider: next,
                          baseUrl: next === "compatible" ? provider.baseUrl : "",
                          model: next === "anthropic" ? "claude-sonnet-4-5" : next === "kimi" ? "kimi-k2.5" : DEFAULT_MODEL,
                        });
                      }}
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic (Claude)</option>
                      <option value="kimi">Kimi (Moonshot)</option>
                      <option value="compatible">Another OpenAI-compatible API</option>
                    </select>
                    <label htmlFor="ai-model">Model</label>
                    <input id="ai-model" required value={provider.model} maxLength={200} onChange={(e) => setProvider({ ...provider, model: e.target.value })} placeholder="Model name" />
                    {provider.provider === "compatible" && (
                      <label htmlFor="api-base-url">API base URL
                        <input id="api-base-url" required type="url" value={provider.baseUrl} maxLength={500} onChange={(e) => setProvider({ ...provider, baseUrl: e.target.value })} placeholder="https://api.example.com/v1" />
                      </label>
                    )}
                    <label htmlFor="api-key">Your API key</label>
                    <input id="api-key" required={!demoOnly} type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Used only for this browser session" />
                    <p id="model-description">Your key is sent only with requests to your selected provider, is never saved in this browser, and Crossroads never falls back to a server API key.</p>
                  </div>
                  <div className="form-grid exploration-config">
                    <label>Paths at each crossroads
                      <select value={exploration.branchingFactor} onChange={(e) => setExploration({ ...exploration, branchingFactor: Number(e.target.value) })}>
                        {[2, 3, 4].map((n) => <option key={n} value={n}>{n} paths</option>)}
                      </select>
                    </label>
                    <label>Exploration depth
                      <select value={exploration.maxDepth} onChange={(e) => setExploration({ ...exploration, maxDepth: Number(e.target.value) })}>
                        {[3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n} steps</option>)}
                      </select>
                    </label>
                  </div>
                  <p className="privacy">
                    <ShieldCheck size={14} /> Live mode sends your question and
                    context to the provider you choose. Your key stays in memory
                    for this session only; saved maps never include it.
                  </p>
                  {demoOnly && (
                    <p className="judge-form-notice">
                      This showcase opens the fictional startup decision tree.
                      Your entries let you preview the form; they are not
                      analysed or sent to an AI.
                    </p>
                  )}
                  <button className="primary" type="submit" disabled={busy}>
                    {busy ? (
                      <LoaderCircle size={17} className="spin" />
                    ) : (
                      <Sparkles size={17} />
                    )}{" "}
                    {busy
                      ? "Mapping your possibilities…"
                      : demoOnly
                        ? "Open five-level demo"
                        : "Generate my crossroads"}
                    <ArrowRight size={17} />
                  </button>
                  <div className="demo-links">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setQuestion(demoQuestion);
                        setContext(demoContext);
                      }}
                    >
                      Fill fictional career example
                    </button>
                    <button type="button" disabled={busy} onClick={openDemo}>
                      Use offline demo
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      )}
      {handoffQuestion && scenario && (
        <div className="overlay possibility-handoff" aria-hidden="true" inert>
          <div className="modal context-modal possibility-modal">
            <PossibilityLoader question={handoffQuestion} />
          </div>
        </div>
      )}
      {whatIf && scenario && (
        <WhatIfDialog
          scenario={scenario}
          pair={currentPair}
          busy={busy}
          onClose={() => {
            if (!busy) setWhatIf(false);
          }}
          onApply={reconsider}
        />
      )}
      {compare && scenario && (
        <div className="overlay">
          <section
            className="modal comparison"
            role="dialog"
            aria-modal="true"
            aria-labelledby="compare-title"
          >
            <button
              className="close"
              aria-label="Close comparison"
              onClick={() => setCompare(false)}
            >
              <X size={20} />
            </button>
            <div className="eyebrow">TWO PATHS. DIFFERENT PRIORITIES.</div>
            <h2 id="compare-title">A little more perspective.</h2>
            <p>
              Neither future is guaranteed. Look for the trade-offs that matter
              to you.
            </p>
            <PathComparison
              scenario={scenario}
              nodes={pins
                .map((id) => scenario.nodes.find((node) => node.id === id))
                .filter((node): node is NonNullable<typeof node> =>
                  Boolean(node),
                )}
            />
          </section>
        </div>
      )}
    </>
  );
}
