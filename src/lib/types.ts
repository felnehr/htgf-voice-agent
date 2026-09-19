import { z } from "zod";
import {
  agentScriptSchema,
  DEFAULT_SCRIPT,
  mergeScript,
  type AgentScript,
} from "~/lib/agent-script";

export const languages = ["de", "en"] as const;
export type Language = (typeof languages)[number];

export const tones = ["warm", "direct"] as const;
export type Tone = (typeof tones)[number];

export const agentSettingsSchema = z.object({
  agentName: z.string().min(1).max(80),
  language: z.enum(languages),
  tone: z.enum(tones),
  script: agentScriptSchema.optional(),
});

export type AgentSettings = {
  agentName: string;
  language: Language;
  tone: Tone;
  script: AgentScript;
};

export function resolveAgentSettings(
  input: z.infer<typeof agentSettingsSchema>,
): AgentSettings {
  return {
    agentName: input.agentName,
    language: input.language,
    tone: input.tone,
    script: mergeScript(input.script),
  };
}

export function normalizeWebsite(raw: string): string | null | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    const path = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
    return `${url.protocol}//${url.host}${path}${url.search}`;
  } catch {
    return null;
  }
}

export function websiteHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export const callerSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  company: z.string().min(1).max(160),
  website: z
    .string()
    .max(400)
    .optional()
    .transform((value) => normalizeWebsite(value ?? ""))
    .refine((value) => value !== null, { message: "invalid_website" })
    .optional(),
});

export type Caller = Omit<z.infer<typeof callerSchema>, "website"> & {
  website?: string;
};

export const intakeSchema = z.object({
  startup: z.string().default(""),
  sector: z.string().default(""),
  stage: z.string().default(""),
  team: z.string().default(""),
  product: z.string().default(""),
  traction: z.string().default(""),
  market: z.string().default(""),
  competition: z.string().default(""),
  fundingNeed: z.string().default(""),
  round: z.string().default(""),
  nextStep: z.string().default(""),
  additionalInfo: z.string().default(""),
  summary: z.string().default(""),
});

export type Intake = z.infer<typeof intakeSchema>;

export function blankIntake(startup = ""): Intake {
  return intakeSchema.parse({ startup });
}

export const INTAKE_FIELDS = [
  { key: "startup", de: "Startup", en: "Startup" },
  { key: "sector", de: "Sektor", en: "Sector" },
  { key: "stage", de: "Stage", en: "Stage" },
  { key: "team", de: "Team", en: "Team" },
  { key: "product", de: "Produkt", en: "Product" },
  { key: "traction", de: "Traktion", en: "Traction" },
  { key: "market", de: "Markt", en: "Market" },
  { key: "competition", de: "Wettbewerb", en: "Competition" },
  { key: "fundingNeed", de: "Finanzierungsbedarf", en: "Funding need" },
  { key: "round", de: "Geplante Runde", en: "Planned round" },
  { key: "nextStep", de: "Nächster Schritt", en: "Next step" },
  { key: "additionalInfo", de: "Weitere Hinweise", en: "Additional notes" },
  { key: "summary", de: "Zusammenfassung", en: "Summary" },
] as const satisfies ReadonlyArray<{
  key: keyof Intake;
  de: string;
  en: string;
}>;

export const DEFAULT_SETTINGS: AgentSettings = {
  agentName: "Emma",
  language: "de",
  tone: "warm",
  script: DEFAULT_SCRIPT,
};
