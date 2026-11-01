import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { contextSchema } from "@/lib/decision/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Optional private defaults for this local installation, never bundled into JS.
export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  const host = request.headers.get("host") || new URL(request.url).host;
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)) {
    return Response.json({ profile: null }, { headers });
  }
  try {
    const raw = await readFile(
      join(process.cwd(), ".crossroads", "profile.json"),
      "utf8",
    );
    const parsed = contextSchema.safeParse(JSON.parse(raw));
    return Response.json(
      { profile: parsed.success ? parsed.data : null },
      { headers },
    );
  } catch {
    return Response.json({ profile: null }, { headers });
  }
}
