import { NextResponse } from "next/server";
import { requireGate } from "~/lib/require-gate";
import { getSettings, saveSettings } from "~/lib/settings";
import { agentSettingsSchema, resolveAgentSettings } from "~/lib/types";

export async function GET() {
  const denied = await requireGate();
  if (denied) return denied;
  return NextResponse.json({ settings: await getSettings() });
}

export async function PUT(request: Request) {
  const denied = await requireGate();
  if (denied) return denied;

  const parsed = agentSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
  }

  const settings = await saveSettings(resolveAgentSettings(parsed.data));
  return NextResponse.json({ settings });
}
