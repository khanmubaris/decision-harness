import { NextResponse } from "next/server";
import { requestSchema } from "@/lib/decision/schema";
import { generate, ProviderError } from "@/lib/ai/engine";
export const runtime = "nodejs";
export const maxDuration = 60;
let active = 0;
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin) {
    // Next can construct req.url with its bind address (0.0.0.0).
    // Compare against the actual HTTP Host used by the browser instead.
    const host = req.headers.get("host") || new URL(req.url).host;
    let sameOrigin = false;
    try {
      const parsedOrigin = new URL(origin);
      sameOrigin =
        parsedOrigin.host === host &&
        ["http:", "https:"].includes(parsedOrigin.protocol);
    } catch {}
    if (!sameOrigin)
      return NextResponse.json(
        { error: "Cross-origin requests are not allowed." },
        { status: 403 },
      );
  }
  let raw;
  try {
    const text = await req.text();
    if (text.length > 50000)
      return NextResponse.json(
        { error: "This scenario is too large." },
        { status: 413 },
      );
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request." },
      { status: 400 },
    );
  }
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json(
      {
        error:
          "Enter a decision, a supported provider/model, and your own API key, then check your context.",
      },
      { status: 400 },
    );
  const path = parsed.data.path;
  if (!parsed.data.apiKey)
    return NextResponse.json(
      { error: "Enter your own API key to generate live paths." },
      { status: 400 },
    );
  if (path.length >= parsed.data.exploration.maxDepth)
    return NextResponse.json(
      { error: "This exploration has reached its selected depth." },
      { status: 400 },
    );
  if (
    path.some(
      (n, i) =>
        n.depth !== i + 1 || n.parentId !== (i === 0 ? "root" : path[i - 1].id),
    ) ||
    new Set(path.map((n) => n.id)).size !== path.length
  )
    return NextResponse.json(
      { error: "The selected path is invalid. Start a new exploration." },
      { status: 400 },
    );
  if (parsed.data.mode === "reconsider") {
    const alternatives = parsed.data.alternatives;
    const parent = path.at(-1)?.id ?? "root";
    if (
      alternatives.length !== parsed.data.exploration.branchingFactor ||
      new Set(alternatives.map((node) => node.id)).size !== alternatives.length ||
      alternatives.some(
        (node) => node.parentId !== parent || node.depth !== path.length + 1,
      )
    ) {
      return NextResponse.json(
      { error: "Choose all sibling paths to reconsider." },
        { status: 400 },
      );
    }
  } else if (parsed.data.alternatives.length) {
    return NextResponse.json(
      {
        error: "Alternatives are only accepted when reconsidering a decision.",
      },
      { status: 400 },
    );
  }
  if (active >= 3)
    return NextResponse.json(
      {
        error:
          "This service is busy. Please retry shortly.",
      },
      { status: 429 },
    );
  active++;
  try {
    const result = await generate(parsed.data, req.signal);
    if (
      parsed.data.mode === "reconsider" &&
      result.choices.some(
        (choice, index) =>
          choice.title !== parsed.data.alternatives[index].title ||
          choice.action !== parsed.data.alternatives[index].action,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "The response changed the selected choices. Your original map is safe; please retry.",
        },
        { status: 502 },
      );
    }
    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof ProviderError ? error.status : undefined;
    const message =
      status === 429
        ? "Your AI provider is rate-limited or out of credits. Retry shortly."
        : status === 401
          ? "That API key was rejected. Check the provider and key, then retry."
          : status === 403 || status === 404
            ? "The selected model is unavailable to this API key. Choose another model and retry."
            : error instanceof DOMException && error.name === "TimeoutError"
              ? "Generation timed out. Your exploration is safe; please retry."
              : "Could not generate valid paths. Please check your provider details and retry.";
    return NextResponse.json(
      { error: message },
      { status: status === 429 ? 429 : 502 },
    );
  } finally {
    active--;
  }
}
