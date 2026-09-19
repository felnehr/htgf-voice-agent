import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "~/lib/db";
import { conversations, intakes } from "~/lib/db/schema";
import { requireGate } from "~/lib/require-gate";
import { getSettings } from "~/lib/settings";
import { callerSchema, type Language } from "~/lib/types";

function languageFromBody(body: unknown, fallback: Language): Language {
  if (
    body &&
    typeof body === "object" &&
    "language" in body &&
    (body.language === "de" || body.language === "en")
  ) {
    return body.language;
  }
  return fallback;
}

export async function GET() {
  const denied = await requireGate();
  if (denied) return denied;

  const db = await getDb();
  const rows = await db
    .select({
      id: conversations.id,
      callerName: conversations.callerName,
      callerEmail: conversations.callerEmail,
      callerCompany: conversations.callerCompany,
      language: conversations.language,
      agentName: conversations.agentName,
      startedAt: conversations.startedAt,
      endedAt: conversations.endedAt,
      totalLatencySeconds: conversations.totalLatencySeconds,
      hasIntake: intakes.conversationId,
    })
    .from(conversations)
    .leftJoin(intakes, eq(intakes.conversationId, conversations.id))
    .orderBy(desc(conversations.startedAt));

  return NextResponse.json({
    conversations: rows.map((row) => ({
      ...row,
      startedAt: row.startedAt.toISOString(),
      endedAt: row.endedAt ? row.endedAt.toISOString() : null,
      hasIntake: Boolean(row.hasIntake),
    })),
  });
}

export async function POST(request: Request) {
  const denied = await requireGate();
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = callerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid caller" }, { status: 400 });
  }

  const settings = await getSettings();
  const session = { ...settings, language: languageFromBody(body, settings.language) };
  const id = crypto.randomUUID();
  const now = new Date();
  const snapshot = JSON.stringify({ ...session, caller: parsed.data });

  const db = await getDb();
  await db.insert(conversations).values({
    id,
    callerName: parsed.data.name,
    callerEmail: parsed.data.email,
    callerCompany: parsed.data.company,
    language: session.language,
    tone: settings.tone,
    agentName: settings.agentName,
    configSnapshot: snapshot,
    startedAt: now,
  });

  return NextResponse.json({
    id,
    settings: session,
    caller: parsed.data,
  });
}
