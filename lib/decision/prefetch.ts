import { pathTo, type Choice, type Scenario } from "./schema";
import { requestDecision } from "./client";

export type BranchStatus = "queued" | "loading" | "ready" | "failed";
type Loader = (
  scenario: Scenario,
  path: Scenario["nodes"],
  signal: AbortSignal,
) => Promise<Choice[]>;
type Entry = {
  id: string;
  status: BranchStatus;
  controller: AbortController;
  run: () => Promise<Choice[]>;
  promise: Promise<Choice[]>;
  resolve: (choices: Choice[]) => void;
  reject: (error: unknown) => void;
};

// Expansion doesn't change the scope. Regeneration, corrections, model/context
// changes, and a new scenario do. Root IDs also distinguish same-input regenerations.
function scopeOf(scenario: Scenario) {
  return JSON.stringify([
    scenario.id,
    scenario.question,
    scenario.context,
    scenario.model,
    scenario.corrections,
    scenario.nodes
      .filter((node) => node.parentId === "root")
      .map((node) => node.id),
  ]);
}

export function nextPair(scenario: Scenario, selected: string) {
  const current = scenario.nodes.find((node) => node.id === selected);
  const children = scenario.nodes.filter((node) => node.parentId === selected);
  const pair = children.length
    ? children
    : scenario.nodes.filter(
        (node) => node.parentId === (current?.parentId ?? "root"),
      );
  return pair.filter(
    (node) =>
      node.depth < 5 &&
      !scenario.staleNodeIds?.includes(node.id) &&
      !scenario.nodes.some((child) => child.parentId === node.id),
  );
}

/** Memory-only, scenario-scoped cache. Cached choices never enter the graph until explored. */
export class BranchPrefetch {
  private scope = "";
  private epoch = 0;
  private running = 0;
  private entries = new Map<string, Entry>();
  private queue: Entry[] = [];
  private snapshot: Readonly<Record<string, BranchStatus>> = {};
  private listeners = new Set<() => void>();

  constructor(
    private readonly loader: Loader = async (scenario, path, signal) => {
      const { question, context, model, corrections } = scenario;
      return (
        await requestDecision(
          { question, context, model, corrections, path },
          signal,
        )
      ).choices;
    },
  ) {}

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.snapshot;
  matches(scenario: Scenario) {
    return this.scope === scopeOf(scenario);
  }

  clear() {
    this.epoch++;
    for (const entry of this.entries.values()) {
      entry.controller.abort();
      entry.reject(new DOMException("This exploration changed.", "AbortError"));
    }
    this.entries.clear();
    this.queue = [];
    this.running = 0;
    this.scope = "";
    this.publish();
  }

  prepare(scenario: Scenario, selected: string) {
    if (scenario.mode !== "live") return;
    this.activate(scenario);
    for (const node of nextPair(scenario, selected)) {
      // A failed speculative request stays failed until explicitly explored.
      // It never displays an error or starts an automatic retry loop.
      void this.get(scenario, pathTo(scenario.nodes, node.id), false).catch(
        () => {},
      );
    }
  }

  expand(scenario: Scenario, path: Scenario["nodes"]) {
    this.activate(scenario);
    return this.get(scenario, path, true);
  }

  private activate(scenario: Scenario) {
    if (this.matches(scenario)) return;
    this.clear();
    this.scope = scopeOf(scenario);
  }
  private publish() {
    this.snapshot = Object.fromEntries(
      [...this.entries].map(([id, entry]) => [id, entry.status]),
    );
    this.listeners.forEach((listener) => listener());
  }
  private get(
    scenario: Scenario,
    path: Scenario["nodes"],
    foreground: boolean,
  ): Promise<Choice[]> {
    const node = path.at(-1);
    if (!node || node.depth >= 5)
      return Promise.reject(
        new Error("This path has no further generated steps."),
      );
    const cached = this.entries.get(node.id);
    if (cached && !(foreground && cached.status === "failed")) {
      if (foreground && cached.status === "queued") {
        this.queue = [
          cached,
          ...this.queue.filter((entry) => entry !== cached),
        ];
      }
      return cached.promise;
    }
    const controller = new AbortController();
    let resolve!: Entry["resolve"], reject!: Entry["reject"];
    const promise = new Promise<Choice[]>((yes, no) => {
      resolve = yes;
      reject = no;
    });
    const entry: Entry = {
      id: node.id,
      status: "queued",
      controller,
      promise,
      resolve,
      reject,
      run: () => this.loader(scenario, path, controller.signal),
    };
    this.entries.set(node.id, entry);
    if (foreground) this.queue.unshift(entry);
    else this.queue.push(entry);
    this.publish();
    queueMicrotask(() => this.pump());
    return promise;
  }
  private pump() {
    while (this.running < 2 && this.queue.length) {
      const entry = this.queue.shift()!;
      const epoch = this.epoch;
      this.running++;
      entry.status = "loading";
      this.publish();
      void Promise.resolve()
        .then(() => {
          if (epoch !== this.epoch)
            throw new DOMException("This exploration changed.", "AbortError");
          return entry.run();
        })
        .then(
          (choices) => {
            if (epoch !== this.epoch) return;
            entry.status = "ready";
            entry.resolve(choices);
          },
          (error: unknown) => {
            if (epoch !== this.epoch) return;
            entry.status = "failed";
            entry.reject(error);
          },
        )
        .finally(() => {
          if (epoch !== this.epoch) return;
          this.running--;
          this.publish();
          this.pump();
        });
    }
  }
}
