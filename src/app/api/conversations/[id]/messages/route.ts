import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "~/lib/db";
import { conversations, messages } from "~/lib/db/schema";
import { requireGate } from "~/lib/require-gate";

const payloadSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string().min(1),
      role: z.enum(["user", "assistant"]),
      content: z.string(),
      createdAt: z.string().optional(),
    }),
  ),
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

  if (parsed.data.messages.length === 0) {
    return NextResponse.json({ ok: true });
  }

  await db
    .insert(messages)
    .values(
      parsed.data.messages.map((message) => ({
        // Deepgram's client ids restart at 1 on every page load. Scope them
        // to this conversation so upserts cannot overwrite another call.
        id: `${id}:${message.id}`,
        conversationId: id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt ? new Date(message.createdAt) : new Date(),
      })),
    )
    .onConflictDoUpdate({
      target: messages.id,
      set: {
        content: sql`excluded.content`,
      },
    });

  return NextResponse.json({ ok: true });
}
