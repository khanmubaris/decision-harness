# Verification record

Completed locally on 1 November 2026.

## Passed

- Clean dependency installation using pinned direct dependencies and committed-ready `package-lock.json`.
- `npm run build`: production build, TypeScript validation and static page generation succeeded.
- `npm run typecheck`: passed.
- `npm test`: **10 passing tests**, including:
  - All 32 possible demo paths reach exactly five steps and preserve ancestry.
  - Offline responses conform to the live output schema.
  - Deterministic runway calculation and invalid-input handling.
  - The real OpenAI SDK serialises strict Structured Outputs and parses a simulated Responses reply.
  - User context, selected history and corrections reach the SDK request.
  - Missing credentials, invalid JSON, oversized requests, broken ancestry and sixth-step expansion fail cleanly.
  - Unrelated origins are rejected; the actual browser Host is accepted when Next uses an internal bind address.
- Production HTTP homepage returned 200. A valid same-origin request without a key returned 503 with the documented setup message.
- Browser bundles contain no `OPENAI_API_KEY`, Responses endpoint or `zodTextFormat` integration references. Server code is not bundled into the client.
- `.env.local` is ignored by Git.

## Browser checks performed

Using the in-app browser against the production application:

- Landing page and context form render correctly.
- Desktop view and 390px mobile view inspected; mobile document width equals viewport width.
- Relocation example omits irrelevant salary fields.
- Offline career demo: select startup, expand through steps 2, 3, 4 and 5, verify completion state.
- Pin two selections and open the side-by-side comparison.
- Backtrack, collapse descendants, verify a leaf disappears, revisit cached descendants.
- Save, reload, restore the complete graph and explore the other initial choice.
- Missing-key error remains recoverable and offers an explicitly labelled offline demo.
- Mobile branch selection and expansion work.

An isolated production instance on port 3001, connected to the **local simulated upstream** in `tests/mock-openai.ts`, additionally verified:

- Visible loading state with a disabled generation button.
- Full browser → Next route → OpenAI SDK → structured-response parsing → graph rendering flow.
- Subsequent expansion with preserved ancestry.
- Assumption correction resets previously expanded branches.
- Simulated OpenAI 429 produces a readable rate-limit message and re-enables generation.

The simulated server and isolated app instance were stopped after testing. The normal app remains on port 3000.

## Real OpenAI verification

After the API key was configured on 1 November 2026, the server was restarted and real OpenAI generation was tested in the browser using only the fictional career profile.

- Initial generation produced context-aware startup and current-role alternatives.
- The first expansion repeated the initial trade-off. The prompt was tightened to treat selected history as committed scenario premises, explicitly prohibit repeating the original question, and supply committed actions and next-decision candidates.
- A fresh live scenario then completed **five successive decision steps**: accept the startup offer → lean into leadership scope → negotiate decision rights → own a strategic technical area → set a 30-day definition of success.
- Two generated selections were compared, and the live scenario was saved locally.
- The ten automated tests and production build passed again after the prompt change.
- Live model output fit the 1280px desktop viewport without horizontal overflow.

These checks establish working account access and end-to-end live generation for this fictional example, not a guarantee that every scenario will be accurate or coherent. The earlier simulated tests remain useful for repeatable error cases.

## Not verified / incomplete

- The original browser journeys were exercised through the in-app browser. The standalone Playwright suite was subsequently executed for the loading-experience update (see below).
- No public deployment or GitHub publication was performed.
- Financial projection charts, exports and share links are outside this MVP.

## Run the simulated upstream yourself

This fixture uses no real API key and no credits. In separate terminals:

```sh
npx tsx tests/mock-openai.ts
OPENAI_API_KEY=test-placeholder-not-a-real-key OPENAI_BASE_URL=http://127.0.0.1:4010/v1 npm run start -- --port 3001
```

Open http://localhost:3001 and use the fictional career example. The map's trade-off explicitly says `SIMULATED API TEST`. Include `[rate-limit]` in the question to exercise error recovery. Stop both processes afterward. Do not use this setup when demonstrating real AI generation.

## Paths of Possibility loading experience — 1 November 2026

- Production build, TypeScript check, and all 12 unit tests passed.
- All nine Playwright browser/API tests passed (seven on the first browser run, two after correcting ambiguous test selectors).
- Held the initial request open and verified active SVG/CSS animations at 5, 45, and 50 seconds. Released the mocked response after 50 seconds and immediately selected a real decision path, without waiting for the outgoing overlay.
- Simulated a 503 response: the animation unmounted, a friendly inline error appeared, and Retry submitted the same question/context/model and successfully opened the graph.
- Verified loading and successful completion at 390 × 844, with no horizontal overflow and the dialog fitting within the viewport.
- Emulated reduced motion: no active SVG animations, a visible static tree and message, no animated node entrance.
- Existing offline five-step exploration, persistence, comparison, collapse, live ancestry, API validation, and failure recovery tests passed.
- Inspected desktop, mobile, and reduced-motion screenshots in `docs/loading-*.png`.

Direct in-app browser control was disabled. Tests used an isolated Playwright headless browser and mocked decision responses, without OpenAI calls. The pinned Playwright browser binary was missing and its download stalled, so a temporary ignored configuration used the already-installed Chromium headless shell (revision 1234). The temporary configuration was removed afterward. Standard test setup remains `npx playwright install chromium` followed by `npm run test:e2e`.

The generation request, model selection, and API timeouts were unchanged. A decorative 650ms exit overlay uses `pointer-events: none` and does not hold the result or block interaction. The production app was rebuilt and restarted on port 3000.

## Immersive decision landscape — 1 November 2026

The map now opens with the full canvas available. Selecting a node reveals the detail panel; the header toggle can hide or reopen it. Long original questions can be expanded in the header. A glowing present marker, atmospheric background, curved mint/violet connections, traveling pulses, and decision cards with a possible-upside excerpt replace the basic diagram styling. Descendants retain the color of their original branch. On narrow screens, nodes use a readable vertical layout with side connections, and selecting a path scrolls its details into view. Reduced motion disables traveling pulses, orbital motion, and animated camera movement.

Screenshot artifacts: `docs/map-desktop.png`, `docs/map-desktop-expanded.png`, `docs/map-mobile.png`, and `docs/map-mobile-expanded.png`.

Final verification passed against the rebuilt production server: all 13 Playwright tests, all 12 unit tests, TypeScript, and the production build. Browser coverage includes desktop/mobile selection and expansion, hiding/reopening details, keyboard activation, reduced motion, maximum-length generated copy fitting inside cards, the existing five-step journey, comparison/persistence/collapse, and 5/45/50-second loading with successful completion and failure/Retry. Tests used mocked responses and the existing isolated Chromium binary; no new live OpenAI requests were needed. The temporary browser configuration was removed after testing.

## One-level-ahead preparation — 1 November 2026

Both initial paths now start background preparation as soon as the first result is shown. The active pair's next choices are cached in memory, without appearing in the graph or triggering further preparation until the user explores that level. Revealing the next pair prepares their next step. The cache retains ready results and shares ongoing requests, uses a two-request concurrency limit with foreground queue priority, and stops at step five. It preserves the selected model, full ancestry, context, and applied corrections.

Background failures stay quiet and do not automatically retry. Explicit exploration retries a failed preparation. Starting over, switching scenarios, regenerating, or applying corrections invalidates cached work; late responses cannot populate the new scope. Cancellation is passed from browser to the route and upstream SDK. A small detail-panel status reports whether the next paths are being prepared or ready.

Validation passed: 18 unit tests, 18 Playwright tests, the production build (including TypeScript), and formatting checks. New browser checks verify two preloads before selection, no recursive generation, ready-cache reuse, sharing a pending request, silent speculative failure followed by successful explicit retry, corrected-context preparation, selected-model preservation, and reset during background work. Unit tests additionally verify queue bounds/priority, invalidation for context/model/root-ID changes, ignored late responses, final-depth/offline exclusions, and cancellation of an isolated mock upstream SDK request. Existing loading (5/45/50 seconds), mobile, reduced-motion, graph navigation, persistence, and comparison checks still pass. Browser responses were mocked; no live OpenAI calls were used for these tests. The temporary ignored browser configuration was removed after testing, and the rebuilt app remains on port 3000.

## Personal AI Decision Harness pivot — 1 November 2026

P0 and P1 were implemented incrementally in the existing application. The landing positioning and hackathon narrative now describe personal decision exploration and assumption testing. The decision profile includes an objective, risk tolerance, constraints and a decision horizon. Structured branch evaluations add lifestyle, opportunity cost, reversibility, stress tests, relevant qualitative comparison dimensions and the conditions under which each path would fit better.

What If supports local expense-cover previews, explicit qualitative reconsideration of the selected sibling pair, changed-input summaries, updated sections with previous text, descendant invalidation and visible stale-analysis markers on other branches. The current selection, pins, collapsed branches, revised context and evaluations persist through opt-in local saving. Existing graph navigation, five-step expansion, comparison, animation and bounded one-level-ahead preparation remain available. Older profiles default to a three-year horizon, older evaluations are not fabricated, and saved career-offer demos retain their own expansion choices. No P2 journals, outcome tracking, external data integrations, enterprise workflows, accounts or payments were added.

### Completed checks

- Production build and TypeScript passed; all **25 unit tests** passed.
- All **22 distinct browser tests** passed: 21 passed in the full run; a comparison selector was narrowed to its dialog, and all nine affected journey/harness tests passed on the final rebuilt server.
- Desktop and 390px mobile founder workflows: select a path, inspect assumptions, change savings from GBP 40000 to GBP 15000, observe local cover changing 16 → 6 months without API calls in offline mode, reconsider, inspect changed analysis, compare both alternatives, save, reload, restore the selected branch and expand further.
- Simulated live reconsideration preserves new horizon/context inputs and original alternatives; a failure preserves both the original map and edited form, and Retry succeeds.
- Later-pair reconsideration removes dependent descendants and marks other paths stale. Stale paths cannot expand until reconsidered. Reviewing with unchanged current inputs does not invalidate already-reviewed branches again.
- Currency parsing accepts full GBP/USD/EUR amounts and rejects malformed grouping and shorthand. Explicitly different currencies do not produce a misleading expense-cover quotient.
- Response mapping rejects unknown/duplicate alternative IDs, restores original action/label identity and preserves ordering even if the model rewords or reorders its response.
- Existing five-step exploration, comparison, collapse, persistence, pending-request sharing, model preservation, background failure handling, 5/45/50-second loading, mobile and reduced-motion checks passed.
- Desktop/mobile screenshots of What If, comparison, the graph and landing were inspected. Main artifacts: `docs/what-if-desktop.png`, `docs/what-if-mobile.png`, `docs/decision-comparison-desktop.png`, `docs/decision-comparison-mobile.png`, `docs/personal-decision-landing.png`.

### Real OpenAI verification

The fictional founder example was also tested through the production `/api/decision` route with GPT-5.4 mini. The first real reconsideration check caught model rewording of action labels. The implementation was corrected to use validated alternative IDs and preserve labels/actions in code. Explicit before/after context and expense-cover inputs were added to make revision reasoning specific.

On the final build, both initial generation and reconsideration returned HTTP 200 in approximately **8 seconds each**, with two alternatives, six comparison dimensions per alternative and two stress tests per alternative. Reconsideration retained both original actions and changed both explanations. The full-time path described GBP 15000 as six months of personal expenses under the supplied no-income assumption, excluding business costs, taxes and emergencies; the employed path explained why retaining gross salary mattered more with the smaller buffer. This verifies working live integration for the fictional example, not a guarantee of every future model outcome.

Browser tests used isolated headless Chromium and mocked API responses. Real checks were separate API requests using only the fictional profile; the key was never printed or embedded in the frontend. Direct in-app browser control remained disabled. Temporary test configuration and execution scripts were removed, and the rebuilt application remains available on port 3000. The README and DEMO narrative have been updated for the new pitch.

## Complete landing-page redesign — 1 November 2026

Replaced the previous landing DOM with `components/LandingPage.tsx`, styled separately in `app/landing.css`. The new hero introduces the personal decision harness with the requested headline, an interactive authored startup example, path insights, inspectable assumptions and a savings What If control. The page continues through a qualified advice comparison, connected five-stage walkthrough, three interactive feature showcases, four real-workflow example links and a final freeform CTA. Existing scenario orchestration and backend generation logic were preserved. No dependencies were added.

Verification against the running production application:

- `npm run build`: passed, including TypeScript checks; production server restarted at http://localhost:3000.
- `npm test`: **25 passed**.
- Full Playwright suite: **29 passed**, including five-step exploration, saved state, comparisons, reconsideration, background preparation, generation failures/Retry, and loading at 5, 45 and 50 seconds.
- After the final timeline alignment adjustment, rebuilt and reran all **7 landing tests**, all passing.
- New primary CTA opens the existing context form. Each of the four requested examples prefills its exact question. The final freeform CTA preserves typed input. The hero and feature illustrations make no AI requests; their demo link opens the actual offline exploration.
- Tested path selection, assumption disclosure, savings changes (16 → 6 months), shared slider state, stage selection, priority comparison and miniature graph exploration.
- Checked 1440, 1280, 768, 390 and 320px layouts for page/panel overflow, desktop CTA placement above 800px, and reduced-motion behavior. No browser page errors observed.
- Captured and visually inspected the actual homepage using an isolated Playwright Chromium browser. Direct computer-use browser access remains disabled; no personal browser was used. Desktop, full-page, mobile, hero detail, workflow and mobile comparison screenshots are in `docs/landing-harness-*.png`.

Main screenshots: `docs/landing-harness-desktop.png`, `docs/landing-harness-full.png`, `docs/landing-harness-mobile-viewport.png`, `docs/landing-harness-mobile.png`. These checks use authored demo content or mocked generation responses; no live AI request was needed for this landing-only change.

## Complete five-level offline demo — 1 November 2026

The presentation demo now materialises all 62 authored choices across five decision levels (plus the starting point), with valid ancestry and no sixth level. It opens with folded branches for guided exploration; **Show all five levels** displays a compact, selectable overview on desktop and mobile. **Focus first choices** restores the guided view. Selecting an overview node opens full analysis, and saves retain all prepared nodes plus the current selection and folded branches. Live generation remains incremental.

Validation: production build and 26 unit tests passed. The 13 existing journey, map and harness browser checks passed; two new desktop/mobile checks verify the entire 63-node overview, 32 fifth-level leaves, direct selection of a fifth-level node, the five-step stopping point, save/restore, no horizontal overflow and zero AI requests. Following visual review, compact overview cards were refined and the affected browser checks rerun successfully. Screenshots were captured in an isolated Chromium browser.

## Keyless hackathon showcase preparation

Added explicit `NEXT_PUBLIC_DEMO_ONLY=true` build/runtime mode. The landing page labels the showcase; the context form explains that entries are not analysed and its primary action opens the authored demo. The decision API refuses live requests in this mode even if a local key exists. Deployment uploads exclude `.env*` and `.crossroads/`.

The showcase production build passed. An isolated browser verified the banner, context-form-to-demo flow, all 63 graph nodes, selectable analysis and zero AI requests. A direct request confirmed that the live endpoint returns the showcase-disabled response. Hosting authentication is required before publication.
