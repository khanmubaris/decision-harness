# Crossroads — The Personal AI Decision Harness

**[Open the live Crossroads demo →](https://decision-harness.vercel.app)**

No sign-in or API key required. Choose **Open judge demo**, then **Show all five levels**. The public showcase uses pre-generated scenarios.

[70-second demo script and screen cues](DEMO.md#70-second-hackathon-demo).

**Stop asking AI what to do. Start testing what could happen.**

Explore possible futures, challenge assumptions, and make life's important decisions with greater clarity.

Crossroads helps individuals make life's biggest decisions with greater clarity, confidence and understanding. It combines personal context, structured exploration, inspectable evaluations, assumption checks and comparison. It does not predict the future or choose for the user. The landing page introduces a new kind of decision harness through an interactive, clearly labelled illustration. The decision workspace keeps its existing graph, context, loading, comparison and stress-testing flows.

## Run locally

```sh
npm install
cp .env.example .env.local
# Add your OPENAI_API_KEY to .env.local for live generation.
npm run dev
```

Open http://localhost:3000. **Try the demo** works without an API key. It is explicitly labelled **Pre-generated demo** and uses authored scenarios, not live AI. **Put a decision to the test → Fill fictional career example → Generate my crossroads** sends the fictional profile to the selected OpenAI model. Failed live requests never silently switch to demo content.

For a production check:

```sh
npm run build
npm start
```

## The decision workflow

1. **Understand:** a free-form question plus an optional decision profile: primary objective, risk tolerance, decision horizon and personal constraints. Location and relevant financial context remain available. Saved personal defaults still prefill the form.
2. **Explore:** two meaningful initial choices and up to five successive decision steps, with accumulated history. The animated loading experience and cinematic React Flow graph remain intact.
3. **Evaluate:** each selected path explains what could happen, why, upside, downside, assumptions, goal alignment and next decisions. New evaluations also cover relevant financial implications, lifestyle, opportunity cost and reversibility.
4. **Challenge:** inspect concrete stress tests and use **What if things change?** to revise inputs. Savings and expense cover recalculate locally while typing. Reconsidering qualitative analysis requires an explicit action.
5. **Compare:** pin two paths and compare relevant qualitative dimensions, including conditions that would make each path a better choice. Comparison uses already-generated evaluations and makes no extra AI call.
6. **Reflect:** long-term journals and actual-outcome tracking are future work, not implemented today. The current app can explicitly save and restore a scenario, changed inputs, evaluations, selected branch, comparison pins and collapsed branches locally.

The app is exclusively for individuals. There are no enterprise workflows, team features, accounts, payment integration, external research integrations or autonomous specialist agents.

## What If and trustworthy updates

**What if things change?** reconsiders the selected node and its sibling, preserving their identities and original actions. At the starting point it reconsiders the two initial choices. Live mode sends the updated profile, applied assumptions, two original alternatives and committed parent history to the same selected model. The response includes validated alternative IDs. Application code restores the original labels, actions and ordering, so cosmetic model wording cannot replace a user’s choices.

Changes appear in a before/after input summary, updated node badges and highlighted intelligence sections with inspectable previous text. Descendants of reconsidered choices are removed because they depended on the old evaluation. Other nodes are visibly marked as using earlier assumptions and must be reconsidered before further expansion. Reviewing another pair with unchanged current inputs does not invalidate already-reviewed paths again.

If reconsideration fails, the current map stays unchanged and the edited inputs remain available for Retry. Background caches are invalidated before re-evaluation; obsolete responses cannot repopulate the map.

Savings divided by monthly living expenses is a deterministic **personal expense-cover calculation**, assuming no income. It excludes business costs, taxes and emergencies; it is not a business-runway forecast. Money inputs must use the same currency. Gross salary is never treated as take-home income. No success probabilities, arbitrary scores, investment-return forecasts or fabricated statistics are generated.

## Fictional founder demonstration

> I'm 29, earning £90,000 in London. I have £40,000 in savings and I'm considering leaving my job to build an AI startup. Should I quit now or continue working while building the business?

**Try the demo** now prepares a complete five-level tree (62 choices) locally. Use **Show all five levels** to see its compact overview or explore the prepared branches one step at a time. Selecting an overview node opens its full analysis.

The two paths are **Quit and build full-time** and **Stay employed and build part-time**. The demo explicitly adds a £2,500 monthly living-expense assumption and a six-month protected personal buffer. Changing savings from £40,000 to £15,000 changes no-income expense cover from **16 to 6 months**. The authored full-time analysis then explains the lack of margin above that floor; the employed path retains its income-versus-time trade-off. The UI clearly distinguishes these local, authored updates from live model reasoning. Other demo inputs are recorded as context, not interpreted by an AI.

See [DEMO.md](DEMO.md) for the hackathon pitch and complete demonstration narrative.

## Architecture

```text
app/page.tsx                     Profile, graph and scenario state; landing entry points
components/LandingPage.tsx        Interactive consumer landing and illustrative controls
app/landing.css                  Responsive landing composition and reduced-motion styles
app/api/decision/route.ts         Validation, ancestry/alternative checks, request limits
components/DecisionGraph.tsx      Interactive graph and revision/staleness badges
components/PossibilityLoader.tsx  Looping SVG loading experience
components/BranchIntelligence.tsx Inspectable evaluation and changed conclusions
components/WhatIfDialog.tsx       Assumption editing and local calculation preview
components/PathComparison.tsx     Qualitative side-by-side comparison
lib/ai/instructions.ts            Understand/explore/evaluate/challenge/compare responsibilities
lib/ai/engine.ts                  One Responses API call with Structured Outputs
lib/decision/schema.ts            Validated profiles, evaluations and persistent state
lib/decision/harness.ts           Comparison, selected-pair revisions and invalidation
lib/decision/prefetch.ts          Scoped cache and bounded background preparation
lib/decision/client.ts            Validated browser requests and cancellation
lib/finance/calculate.ts          Deterministic arithmetic, separate from AI reasoning
lib/decision/demo.ts              Explicitly offline fictional founder scenario
```

Next.js App Router, TypeScript, React, React Flow, OpenAI Node SDK, Zod and Lucide. No new dependencies were needed for the pivot. The responsibilities are separated in code and prompts; they do not pretend to be separate completed processing stages or independent agents.

OpenAI Responses uses a validated structured schema. Users choose GPT-5.4 mini (default) or GPT-5.4; the selected model is preserved across expansions and reconsiderations. Model access depends on the configured project. Current structured profile inputs and applied corrections take precedence over older facts in the original question. Short justifications expose the basis for a scenario without purporting to expose private model reasoning.

Older saved maps still load, and previously saved career-offer demos retain their career-specific expansion choices. Missing decision horizons default to three years; missing evaluation fields are not invented. Relevant legacy comparison fields remain available, and unassessed dimensions are labelled accordingly.

## Configuration, requests and storage

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Server-only key; never use a `NEXT_PUBLIC_` prefix. |
| `MAX_AI_REQUESTS` | Per-process request cap, default 100; resets on server restart. |

Initial generation makes one request, then up to two background requests prepare the next step for both paths. Revealing another pair prepares one level further; cached results never recursively generate the whole tree. Selecting an unprepared pair, including in a restored scenario, can start preparation. Foreground exploration shares an ongoing request or uses its ready result. Background failures remain quiet and retry only on explicit exploration. At most two preparations run concurrently per open exploration. Cached preparations live only in memory; revealed branches can be saved locally. Unused preparations still consume API usage.

What If calculations and comparisons use no AI request. Explicit live reconsideration uses one request, followed by applicable background preparation. The server allows at most three concurrent upstream requests, caps output at 6,000 tokens and times out upstream requests after 45 seconds with SDK retries disabled. Cancellation is forwarded upstream when a scenario changes. These are request controls, not a monetary spending guarantee.

Questions and context are sent to OpenAI in live mode. `store:false` disables Responses application-state storage; it does not promise zero provider retention. `.env*` files are ignored except `.env.example`. Opt-in maps and personal defaults are stored in this browser's localStorage in plain text. Use **Delete saved map**, **Clear defaults**, or browser site-data controls to remove them.

Local installation defaults may be supplied in `.crossroads/profile.json`, matching the context schema. The directory is Git-ignored; defaults are read at runtime, returned without caching only to localhost, and never embedded in the bundle. Browser defaults take precedence. Do not package this private directory for deployment.

## Verification and limits

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Tests cover the five-step graph, comparison, persistence, collapse, loading, mobile, reduced motion, bounded preloading, structured API wiring, local calculations, What If changes, stale-branch handling and failures. Mocked responses verify integration, not live model quality. [VALIDATION.md](VALIDATION.md) records completed checks and their limits.

Outcomes are hypothetical and may be wrong. No external facts are verified. Live quality and latency vary. Long-term journals, outcome tracking, external data, advanced financial simulation, automated evaluation feedback loops and multi-user features remain outside today's scope.

## Contributing

Crossroads is open source under the [ISC license](LICENSE). Contributions, issue reports, design feedback, and new fictional demo scenarios are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), follow the [Code of Conduct](CODE_OF_CONDUCT.md), and report security concerns privately as described in [SECURITY.md](SECURITY.md).

Before opening a pull request, run:

```sh
npm test
npm run build
```

Good first contributions include improving accessibility, refining the decision graph, adding test coverage, and creating clearly labelled offline demo scenarios. Please do not add real personal data, API keys, outcome claims, invented probabilities, or financial predictions.

## Project status

This is an early, working open-source project. The public site is a keyless showcase with authored scenarios. Live AI generation remains available only when a maintainer configures their own server-side OpenAI key.

## Hackathon showcase deployment

Set `NEXT_PUBLIC_DEMO_ONLY=true` at both build time and runtime to publish the interface without live AI. The page clearly labels the showcase, form submission opens the authored five-level tree, and the live decision endpoint returns a disabled message. No OpenAI key is needed. Remove the flag and rebuild to restore live generation.

For Vercel, link the project and deploy with:

```sh
vercel deploy --prod --yes --build-env NEXT_PUBLIC_DEMO_ONLY=true --env NEXT_PUBLIC_DEMO_ONLY=true
```

`.vercelignore` excludes local environment files, personal defaults, screenshots and build artifacts from upload.

The current production release was published with the Vercel CLI. Automatic GitHub deployments are not connected; repeat the production deployment command above after code changes.
