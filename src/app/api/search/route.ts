import { NextResponse } from "next/server";
import { z } from "zod";
import { requireGate } from "~/lib/require-gate";
import { SearchProviderError, searchWeb } from "~/lib/search";

const bodySchema = z.object({
  query: z.string().min(1).max(300),
});

export async function POST(request: Request) {
  const denied = await requireGate();
  if (denied) return denied;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  try {
    return NextResponse.json(await searchWeb(parsed.data.query));
  } catch (error) {
    if (error instanceof SearchProviderError) {
      return NextResponse.json({ error: "Search provider failed" }, { status: 502 });
    }
    throw error;
  }
}
