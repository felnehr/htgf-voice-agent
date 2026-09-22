import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  callerFromConversation,
  loadStoredIntake,
  loadTranscript,
  transcriptMessageSchema,
  upsertTranscriptMessages,
  writeCanonicalIntake,
} from "~/lib/conversation-store";
import { getDb } from "~/lib/db";
import { conversations } from "~/lib/db/schema";
import {
  draftIntakeFromTranscript,
  hasDraftableTranscript,
} from "~/lib/draft-intake";
import { requireGate } from "~/lib/require-gate";
import type { Language } from "~/lib/types";

const bodySchema = z.object({
  totalLatencySeconds: z.number().nullable().optional(),
  messages: z.array(transcriptMessageSchema).optional(),
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

  if (parsed.success && parsed.data.messages?.length) {
    await upsertTranscriptMessages(id, parsed.data.messages);
  }

  await db
    .update(conversations)
    .set({
      endedAt: conversation.endedAt ?? new Date(),
      totalLatencySeconds:
        parsed.success && parsed.data.totalLatencySeconds != null
          ? String(parsed.data.totalLatencySeconds)
          : conversation.totalLatencySeconds,
    })
    .where(eq(conversations.id, id));

  const existing = await loadStoredIntake(id);
  if (existing) {
    return NextResponse.json({ ok: true, intake: existing });
  }

  const transcript = await loadTranscript(id);
  if (!hasDraftableTranscript(transcript)) {
    return NextResponse.json({ ok: true, intake: null });
  }

  const caller = callerFromConversation(conversation);
  const language: Language = conversation.language === "en" ? "en" : "de";
  const intake = await writeCanonicalIntake(
    id,
    draftIntakeFromTranscript(
      transcript.map((row) => ({
        role: row.role === "user" ? "user" : "assistant",
        content: row.content,
      })),
      caller,
      language,
    ),
    caller,
  );

  return NextResponse.json({ ok: true, intake });
}
