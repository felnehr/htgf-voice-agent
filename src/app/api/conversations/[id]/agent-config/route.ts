import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { buildAgentSettings } from "~/lib/agent-config";
import { briefingForConversation } from "~/lib/briefing";
import { getDb } from "~/lib/db";
import { conversations } from "~/lib/db/schema";
import { ElevenLabsConfigError } from "~/lib/elevenlabs";
import { requireGate } from "~/lib/require-gate";
import { settingsFromSnapshot } from "~/lib/settings";

type Params = { params: Promise<{ id: string }> };

function callerWebsite(snapshot: string): string | undefined {
  try {
    const parsed = JSON.parse(snapshot) as { caller?: { website?: unknown } };
    return typeof parsed.caller?.website === "string" ? parsed.caller.website : undefined;
  } catch {
    return undefined;
  }
}

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

  try {
    const { agent } = await buildAgentSettings(
      settingsFromSnapshot(conversation.configSnapshot, {
        agentName: conversation.agentName,
        language: conversation.language,
        tone: conversation.tone,
      }),
      {
        name: conversation.callerName,
        email: conversation.callerEmail,
        company: conversation.callerCompany,
        website: callerWebsite(conversation.configSnapshot),
      },
      briefingForConversation(conversation),
    );
    return NextResponse.json({ agent });
  } catch (error) {
    if (error instanceof ElevenLabsConfigError) {
      const german = conversation.language === "de";
      const messages: Record<ElevenLabsConfigError["code"], { de: string; en: string }> = {
        missing_key: {
          de: "ELEVENLABS_API_KEY fehlt. Ohne den Key kann die Stimme nicht sprechen.",
          en: "ELEVENLABS_API_KEY is missing. The voice cannot speak without it.",
        },
        list_failed: {
          de: "ElevenLabs-Stimmen konnten nicht geladen werden. Prüfe ELEVENLABS_API_KEY.",
          en: "Could not list ElevenLabs voices. Check ELEVENLABS_API_KEY.",
        },
        voice_missing: {
          de: "Keine kostenlose ElevenLabs-Premade-Stimme gefunden. Setze ELEVENLABS_VOICE_ID auf eine Premade-Stimme.",
          en: "No free ElevenLabs premade voice was found. Set ELEVENLABS_VOICE_ID to a premade voice.",
        },
        voice_unusable: {
          de: "Diese ElevenLabs-Stimme ist über die API nicht nutzbar. Setze ELEVENLABS_VOICE_ID auf eine Premade-Stimme.",
          en: "This ElevenLabs voice cannot be used via the API. Set ELEVENLABS_VOICE_ID to a premade voice.",
        },
      };
      const copy = messages[error.code];
      return NextResponse.json(
        { error: german ? copy.de : copy.en },
        { status: 503 },
      );
    }
    throw error;
  }
}
