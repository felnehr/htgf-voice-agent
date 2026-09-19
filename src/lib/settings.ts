import { eq } from "drizzle-orm";
import { getDb } from "~/lib/db";
import { settings } from "~/lib/db/schema";
import {
  DEFAULT_SETTINGS,
  agentSettingsSchema,
  resolveAgentSettings,
  type AgentSettings,
} from "~/lib/types";

const SETTINGS_ID = "default";

function parseScript(raw: string | null | undefined) {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

export function settingsFromRecord(input: {
  agentName: string;
  language: string;
  tone: string;
  script?: unknown;
}): AgentSettings {
  const parsed = agentSettingsSchema.safeParse({
    agentName: input.agentName,
    language: input.language,
    tone: input.tone,
    script: input.script,
  });
  return parsed.success ? resolveAgentSettings(parsed.data) : DEFAULT_SETTINGS;
}

export function settingsFromSnapshot(
  snapshot: string,
  fallback: { agentName: string; language: string; tone: string },
): AgentSettings {
  try {
    const parsed = JSON.parse(snapshot) as Record<string, unknown>;
    return settingsFromRecord({
      agentName:
        typeof parsed.agentName === "string" ? parsed.agentName : fallback.agentName,
      language:
        typeof parsed.language === "string" ? parsed.language : fallback.language,
      tone: typeof parsed.tone === "string" ? parsed.tone : fallback.tone,
      script: parsed.script,
    });
  } catch {
    return settingsFromRecord(fallback);
  }
}

export async function getSettings(): Promise<AgentSettings> {
  const db = await getDb();
  const row = await db.query.settings.findFirst({
    where: eq(settings.id, SETTINGS_ID),
  });
  if (!row) {
    return DEFAULT_SETTINGS;
  }
  return settingsFromRecord({
    agentName: row.agentName,
    language: row.language,
    tone: row.tone,
    script: parseScript(row.script),
  });
}

export async function saveSettings(next: AgentSettings): Promise<AgentSettings> {
  const value = resolveAgentSettings(agentSettingsSchema.parse(next));
  const db = await getDb();
  await db
    .insert(settings)
    .values({
      id: SETTINGS_ID,
      agentName: value.agentName,
      language: value.language,
      tone: value.tone,
      script: JSON.stringify(value.script),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: settings.id,
      set: {
        agentName: value.agentName,
        language: value.language,
        tone: value.tone,
        script: JSON.stringify(value.script),
        updatedAt: new Date(),
      },
    });
  return value;
}
