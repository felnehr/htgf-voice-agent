import { desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "~/lib/db";
import { conversations, intakes } from "~/lib/db/schema";
import {
  buildMemoCsv,
  memoCsvFilename,
  parseIntakePayload,
  type MemoExportRecord,
} from "~/lib/memo-export";
import { requireGate } from "~/lib/require-gate";

const idsSchema = z.object({
  conversationIds: z.array(z.string().min(1)).min(1).max(500),
});

const markSchema = idsSchema.extend({
  exported: z.boolean(),
});

async function loadExportRecords(ids: string[]): Promise<MemoExportRecord[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: conversations.id,
      callerName: conversations.callerName,
      callerEmail: conversations.callerEmail,
      callerCompany: conversations.callerCompany,
      language: conversations.language,
      startedAt: conversations.startedAt,
      payload: intakes.payload,
    })
    .from(conversations)
    .innerJoin(intakes, eq(intakes.conversationId, conversations.id))
    .where(inArray(conversations.id, ids))
    .orderBy(desc(conversations.startedAt));

  return rows.flatMap((row) => {
    const intake = parseIntakePayload(row.payload);
    if (!intake) return [];
    return [
      {
        id: row.id,
        callerName: row.callerName,
        callerEmail: row.callerEmail,
        callerCompany: row.callerCompany,
        language: row.language,
        startedAt: row.startedAt,
        intake,
      },
    ];
  });
}

async function markExported(ids: string[], exported: boolean) {
  if (ids.length === 0) return;
  const db = await getDb();
  await db
    .update(intakes)
    .set({ exportedAt: exported ? new Date() : null })
    .where(inArray(intakes.conversationId, ids));
}

export async function POST(request: Request) {
  const denied = await requireGate();
  if (denied) return denied;

  const parsed = idsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid export" }, { status: 400 });
  }

  const records = await loadExportRecords(parsed.data.conversationIds);
  if (records.length === 0) {
    return NextResponse.json({ error: "No memos" }, { status: 400 });
  }

  await markExported(
    records.map((record) => record.id),
    true,
  );

  const filename = memoCsvFilename();
  return new NextResponse(buildMemoCsv(records), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Export-Count": String(records.length),
    },
  });
}

export async function PATCH(request: Request) {
  const denied = await requireGate();
  if (denied) return denied;

  const parsed = markSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid mark" }, { status: 400 });
  }

  const records = await loadExportRecords(parsed.data.conversationIds);
  await markExported(
    records.map((record) => record.id),
    parsed.data.exported,
  );

  return NextResponse.json({
    ok: true,
    count: records.length,
  });
}
