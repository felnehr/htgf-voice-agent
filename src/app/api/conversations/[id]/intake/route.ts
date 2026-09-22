import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  callerFromConversation,
  writeCanonicalIntake,
  writeIntake,
} from "~/lib/conversation-store";
import { getDb } from "~/lib/db";
import { conversations } from "~/lib/db/schema";
import { requireGate } from "~/lib/require-gate";
import { intakeSchema } from "~/lib/types";

type Params = { params: Promise<{ id: string }> };

async function loadConversation(id: string) {
  const db = await getDb();
  return db.query.conversations.findFirst({
    where: eq(conversations.id, id),
  });
}

async function readIntake(request: Request) {
  return intakeSchema.safeParse(await request.json().catch(() => null));
}

export async function POST(request: Request, { params }: Params) {
  const denied = await requireGate();
  if (denied) return denied;

  const { id } = await params;
  const parsed = await readIntake(request);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid intake" }, { status: 400 });
  }

  const conversation = await loadConversation(id);
  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const intake = await writeCanonicalIntake(
    id,
    parsed.data,
    callerFromConversation(conversation),
  );
  return NextResponse.json({ ok: true, intake });
}

export async function PUT(request: Request, { params }: Params) {
  const denied = await requireGate();
  if (denied) return denied;

  const { id } = await params;
  const parsed = await readIntake(request);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid intake" }, { status: 400 });
  }

  const conversation = await loadConversation(id);
  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const intake = parsed.data;
  await writeIntake(id, intake);
  return NextResponse.json({ ok: true, intake });
}
