import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requestSchema } from "@/lib/decision/schema";
import { generate } from "@/lib/ai/engine";
export const runtime = "nodejs";
export const maxDuration = 60;
let requests = 0;
let active = 0;
export async function POST(req: Request) {
  if (process.env.NEXT_PUBLIC_DEMO_ONLY === "true")
    return NextResponse.json(
      {
        error:
          "Live generation is disabled for this showcase. Open the offline demo to explore all five levels.",
      },
      { status: 503 },
    );
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
          "Please enter a decision of 10–2,000 characters, choose a supported model, and check your context.",
      },
      { status: 400 },
    );
  const path = parsed.data.path;
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
      alternatives.length !== 2 ||
      alternatives[0].id === alternatives[1].id ||
      alternatives.some(
        (node) => node.parentId !== parent || node.depth !== path.length + 1,
      )
    ) {
      return NextResponse.json(
        { error: "Choose two sibling paths to reconsider." },
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
  if (!process.env.OPENAI_API_KEY)
    return NextResponse.json(
      {
        error:
          "Live AI is not configured. Add OPENAI_API_KEY to .env.local and restart the server, or open the labelled offline demo.",
      },
      { status: 503 },
    );
  if (active >= 3 || requests >= Number(process.env.MAX_AI_REQUESTS || 100))
    return NextResponse.json(
      {
        error:
          "The demo server’s request limit has been reached. Try later or use the offline demo.",
      },
      { status: 429 },
    );
  requests++;
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
    const status = error instanceof OpenAI.APIError ? error.status : undefined;
    const message =
      status === 429
        ? "OpenAI is rate-limited or out of credits. Retry shortly or use the offline demo."
        : status === 401
          ? "The server API key was rejected. Check your .env.local configuration."
          : status === 403 || status === 404
            ? "The selected model is unavailable to this API project. Choose another model for a new exploration."
            : error instanceof OpenAI.APIConnectionTimeoutError
              ? "Generation timed out. Your exploration is safe; please retry."
              : "Could not generate a valid scenario. Please retry, or use the offline demo.";
    return NextResponse.json(
      { error: message },
      { status: status === 429 ? 429 : 502 },
    );
  } finally {
    active--;
  }
}
