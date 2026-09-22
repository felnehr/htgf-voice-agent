import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  transcriptMessageSchema,
  upsertTranscriptMessages,
} from "~/lib/conversation-store";
import { getDb } from "~/lib/db";
import { conversations } from "~/lib/db/schema";
import { requireGate } from "~/lib/require-gate";

const payloadSchema = z.object({
  messages: z.array(transcriptMessageSchema),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const denied = await requireGate();
  if (denied) return denied;

  const { id } = await params;
  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
  }

  const db = await getDb();
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, id),
  });
  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await upsertTranscriptMessages(id, parsed.data.messages);
  return NextResponse.json({ ok: true });
}
