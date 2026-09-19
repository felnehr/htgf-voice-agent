import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "~/lib/db";
import { conversations } from "~/lib/db/schema";
import { requireGate } from "~/lib/require-gate";

const bodySchema = z.object({
  totalLatencySeconds: z.number().nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const denied = await requireGate();
  if (denied) return denied;

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  const db = await getDb();
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, id),
  });
  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db
    .update(conversations)
    .set({
      endedAt: new Date(),
      totalLatencySeconds:
        parsed.success && parsed.data.totalLatencySeconds != null
          ? String(parsed.data.totalLatencySeconds)
          : conversation.totalLatencySeconds,
    })
    .where(eq(conversations.id, id));

  return NextResponse.json({ ok: true });
}
