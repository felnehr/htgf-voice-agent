import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "~/lib/db";
import { intakes, messages } from "~/lib/db/schema";
import { canonicalizeIntake, canonicalizeTranscriptText } from "~/lib/intake";
import { intakeSchema, type Caller, type Intake } from "~/lib/types";

export const transcriptMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  createdAt: z.string().optional(),
});

export type TranscriptMessageInput = z.infer<typeof transcriptMessageSchema>;

export async function upsertTranscriptMessages(
  conversationId: string,
  rows: TranscriptMessageInput[],
) {
  if (rows.length === 0) return;
  const db = await getDb();
  await db
    .insert(messages)
    .values(
      rows.map((message) => ({
        // Deepgram's client ids restart at 1 on every page load. Scope them
        // to this conversation so upserts cannot overwrite another call.
        id: `${conversationId}:${message.id}`,
        conversationId,
        role: message.role,
        content: canonicalizeTranscriptText(message.content),
        createdAt: message.createdAt ? new Date(message.createdAt) : new Date(),
      })),
    )
    .onConflictDoUpdate({
      target: messages.id,
      set: {
        content: sql`excluded.content`,
      },
    });
}

export async function loadTranscript(conversationId: string) {
  const db = await getDb();
  return db.query.messages.findMany({
    where: eq(messages.conversationId, conversationId),
    orderBy: [asc(messages.createdAt)],
  });
}

export async function loadStoredIntake(conversationId: string): Promise<Intake | null> {
  const db = await getDb();
  const row = await db.query.intakes.findFirst({
    where: eq(intakes.conversationId, conversationId),
  });
  if (!row) return null;
  const parsed = intakeSchema.safeParse(JSON.parse(row.payload));
  return parsed.success ? parsed.data : null;
}

export async function writeIntake(conversationId: string, intake: Intake) {
  const db = await getDb();
  await db
    .insert(intakes)
    .values({
      conversationId,
      payload: JSON.stringify(intake),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: intakes.conversationId,
      set: {
        payload: JSON.stringify(intake),
        updatedAt: new Date(),
      },
    });
}

export async function writeCanonicalIntake(
  conversationId: string,
  intake: Intake,
  caller: Caller,
) {
  const canonical = canonicalizeIntake(intake, caller);
  await writeIntake(conversationId, canonical);
  return canonical;
}

export function callerFromConversation(conversation: {
  callerName: string;
  callerEmail: string;
  callerCompany: string;
}): Caller {
  return {
    name: conversation.callerName,
    email: conversation.callerEmail,
    company: conversation.callerCompany,
  };
}
