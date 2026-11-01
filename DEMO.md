# Crossroads — The Personal AI Decision Harness

## The pitch

“Coding agents have harnesses that help them explore solutions, test assumptions, and improve their results.

But when humans face life's biggest decisions, we're still relying on intuition, spreadsheets, and generic advice.

Crossroads brings the harness concept to personal decision-making.

It helps people explore possible futures, understand trade-offs, challenge assumptions, and see how their circumstances affect their choices.

We don't predict your future.

We help you explore it before you choose.”

Consumer-facing tagline: **Stop asking AI what to do. Start testing what could happen.**

## Before presenting

1. Run the app on http://localhost:3000. Rehearse at desktop and phone widths.
2. For live generation, configure the server API key and choose a model in the profile. Use the fictional example rather than personal information. Background preparation creates additional requests for both paths.
3. Keep **Try the demo** ready. It is explicitly labelled **Pre-generated demo**. Its What If calculations and authored cash-buffer analysis work without API calls. Never present this as live AI output.
4. The example adds a clearly stated £2,500 monthly-expense assumption. The user's £40,000 savings then cover 16 months of personal expenses with no income; business costs are unknown and excluded.

## Show the new landing first

Select either path in the illustrative hero, inspect its assumptions, then try **What if your savings decreased?** The local expense-cover calculation changes from 16 to 6 months; no AI request is made. The connected Define → Explore → Challenge → Stress-test → Decide walkthrough, savings slider and priority comparison are also interactive. **Put a decision to the test** opens the real profile workflow; all four example questions prefill it.

## Five-level presentation tree

**Try the demo** prepares all 62 choices across five decision levels immediately, without API requests. It starts with the first pair visible for a readable walkthrough. Click **Show all five levels** for the complete branching overview, then select any compact node to inspect it. **Focus first choices** returns to the guided view. **Explore next step** reveals prepared branches through level five; there is no sixth decision level. Saved demos retain the entire tree and collapsed branches.

## A two-minute walkthrough

**0–20 seconds — Understand**

“I'm 29, earning £90,000 in London. I have £40,000 in savings and I'm considering leaving my job to build an AI startup. Should I quit now or continue working while building the business?”

Show the lightweight profile: objective, moderate risk comfort, a three-year horizon and a six-month protected personal buffer. Use **Put a decision to the test → Fill fictional career example → Generate my crossroads**, or disclose that you are opening the authored offline demonstration.

**20–45 seconds — Explore**

Show the two paths: **Quit and build full-time** and **Stay employed and build part-time**. Select the first. The intelligence panel explains the possible outcome, reasoning, upside, downside, assumptions and next decisions. Expand one level to demonstrate accumulated history; use **Back a step** to return. The app supports five successive steps. The live app prepares the next level while the user reads.

**45–80 seconds — Challenge**

Open **What if things change?** Change savings from `GBP 40000` to `GBP 15000`. Point out that the calculation immediately changes **16 months → 6 months**, without an AI call.

Click **Reconsider these paths**. In live mode this requests updated qualitative reasoning. In demo mode it uses explicitly authored rules. Show the changed-input banner, updated path badges, and **Why? → Previously**. Six months leaves no margin above the demo's protected personal buffer; business costs would consume more. The employed path still has a meaningful cost in time and energy. Neither is declared universally correct.

Explain that later branches relying on the old analysis are cleared, and other old evaluations are visibly marked for review.

**80–105 seconds — Compare**

Pin each initial path with **Add to comparison**, then open **Compare paths**. Discuss financial stability, growth, lifestyle, risk and flexibility. Read **What would make each path a better choice?**

“Focused entrepreneurship may fit someone with evidence of demand and a protected buffer. Continued employment may fit someone prioritising security and reversibility, if they can sustain the workload. Your priorities change the balance.”

**105–120 seconds — Human control**

Show **Save locally** and explain that the revised context, analysis and selected branch can be restored. This is not an outcome-tracking journal. Long-term reflection and actual-result feedback are future work.

“Crossroads is a personal decision harness: understand, explore, evaluate, challenge and compare. The human still makes the decision.”

## Technical explanation if asked

A single selected OpenAI model generates validated structured alternatives and evaluations. Separate responsibilities in the prompt cover context extraction, expansion, evaluation, assumption inspection and comparison. Reconsideration preserves the chosen alternatives and committed history. Arithmetic runs in code; comparison reuses existing assessments; preloading is bounded and cached. No external research, invented probabilities, arbitrary scores or autonomous specialist agents are involved.
