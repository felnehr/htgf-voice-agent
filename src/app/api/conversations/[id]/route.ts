import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "~/lib/db";
import { conversations, intakes, messages } from "~/lib/db/schema";
import { requireGate } from "~/lib/require-gate";
import { intakeSchema } from "~/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const denied = await requireGate();
  if (denied) return denied;

  const { id } = await params;
  const db = await getDb();
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, id),
  });
  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [messageRows, intakeRow] = await Promise.all([
    db.query.messages.findMany({
      where: eq(messages.conversationId, id),
      orderBy: [asc(messages.createdAt)],
    }),
    db.query.intakes.findFirst({
      where: eq(intakes.conversationId, id),
    }),
  ]);

  const intake = intakeRow
    ? intakeSchema.safeParse(JSON.parse(intakeRow.payload)).data ?? null
    : null;

  return NextResponse.json({
    conversation: {
      ...conversation,
      startedAt: conversation.startedAt.toISOString(),
      endedAt: conversation.endedAt ? conversation.endedAt.toISOString() : null,
    },
    messages: messageRows.map((row) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
    })),
    intake,
  });
}
