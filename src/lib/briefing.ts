import { eq } from "drizzle-orm";
import { z } from "zod";
import { extractWebsite, searchWeb } from "~/lib/search";
import { getDb } from "~/lib/db";
import { conversations } from "~/lib/db/schema";
import type { Caller, Language } from "~/lib/types";

export const startupBriefingSchema = z.object({
  found: z.boolean(),
  query: z.string(),
  hypothesis: z.string(),
  notes: z.string(),
  website: z.string().optional(),
  siteNotes: z.string().optional(),
});

export type StartupBriefing = z.infer<typeof startupBriefingSchema>;

const emptyBriefing = (query: string): StartupBriefing => ({
  found: false,
  query,
  hypothesis: "",
  notes: "",
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mentionsCompany(text: string, company: string): boolean {
  const needle = company.trim();
  if (needle.length < 3 || !text) return false;
  return new RegExp(`\\b${escapeRegExp(needle)}\\b`, "i").test(text);
}

const EMPTY_SIGNALS = [
  /nicht (öffentlich |genau )?bekannt/i,
  /keine (öffentlichen |genauen |spezifischen )?(informationen|angaben|treffer|ergebnisse)/i,
  /keine informationen (über|zu)/i,
  /liegen mir keine/i,
  /leider (liegen|gibt|finde|konnte|haben)/i,
  /nichts (im netz |online )?gefunden/i,
  /konnte (nichts|keine)/i,
  /not (publicly )?known/i,
  /no (public |specific )?(information|results|data)/i,
  /no information (about|on|for)/i,
  /could not find/i,
  /couldn't find/i,
  /didn't find/i,
  /nicht gefunden/i,
  /insufficient information/i,
  /keine konkrete/i,
];

function isUninformative(text: string): boolean {
  return !text.trim() || EMPTY_SIGNALS.some((pattern) => pattern.test(text));
}

function speakable(text: string, max = 140): string {
  const cleaned = text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_`#>•]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  const sentence = cleaned.split(/(?<=[.!?])\s/)[0] ?? cleaned;
  if (sentence.length <= max) return sentence.replace(/[.!?…]+$/, "").trim();

  let acc = "";
  for (const part of sentence.split(",")) {
    const next = acc ? `${acc},${part}` : part;
    if (acc && next.length > max) break;
    acc = next;
    if (!acc.includes(",") && acc.length > max) break;
  }
  const cut = acc.length > 40 && acc.length <= max ? acc : sentence.slice(0, max);
  const atWord = cut.lastIndexOf(" ");
  const chosen = cut.length > max && atWord > 40 ? cut.slice(0, atWord) : cut;
  return chosen.replace(/[,:;–.!?\s]+$/, "").trim();
}

function pickClaim(answer: string, results: Array<{ title: string; snippet: string }>, company: string): string {
  if (answer && mentionsCompany(answer, company)) return speakable(answer);
  const hit = results.find((item) => mentionsCompany(`${item.title} ${item.snippet}`, company));
  if (hit) return speakable(hit.snippet || hit.title);
  return speakable(answer);
}

function notesFrom(
  answer: string,
  results: Array<{ title: string; snippet: string }>,
): string {
  const lines: string[] = [];
  if (answer.trim()) lines.push(answer.trim());
  for (const hit of results.slice(0, 3)) {
    const bit = [hit.title.trim(), hit.snippet.trim()].filter(Boolean).join(" — ");
    if (bit) lines.push(bit);
  }
  const text = lines.join("\n");
  return text.length > 1_200 ? `${text.slice(0, 1_197).trim()}…` : text;
}

export function researchQuery(company: string, language: Language): string {
  const name = company.trim();
  return language === "de"
    ? `Was macht das Startup ${name}?`
    : `What does the startup ${name} do?`;
}

export async function researchStartup(
  caller: Caller,
  language: Language,
): Promise<StartupBriefing> {
  const query = researchQuery(caller.company, language);
  const website = caller.website;
  try {
    const [result, site] = await Promise.all([
      searchWeb(query, {
        language,
        searchDepth: "fast",
        includeAnswer: "advanced",
        maxResults: 5,
      }),
      website
        ? extractWebsite(website, { language }).catch(() => null)
        : Promise.resolve(null),
    ]);
    const corpus = [
      result.answer,
      ...result.results.map((item) => `${item.title} ${item.snippet}`),
      site?.content ?? "",
    ].join("\n");
    const fromSite =
      site?.content && mentionsCompany(site.content, caller.company)
        ? speakable(site.content, 160)
        : "";
    const fromWeb = pickClaim(result.answer, result.results, caller.company);
    const hypothesis =
      fromSite && !isUninformative(fromSite)
        ? fromSite
        : fromWeb;
    const found =
      Boolean(hypothesis) &&
      !isUninformative(hypothesis) &&
      (Boolean(site?.content) || mentionsCompany(corpus, caller.company));
    if (!found) {
      return {
        ...emptyBriefing(query),
        ...(website ? { website } : {}),
      };
    }
    return {
      found: true,
      query,
      hypothesis,
      notes: notesFrom(result.answer, result.results),
      ...(website ? { website } : {}),
      ...(site?.content ? { siteNotes: site.content } : {}),
    };
  } catch {
    return {
      ...emptyBriefing(query),
      ...(website ? { website } : {}),
    };
  }
}

function parseSnapshot(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function briefingForConversation(conversation: {
  id: string;
  callerName: string;
  callerEmail: string;
  callerCompany: string;
  language: string;
  configSnapshot: string;
}): Promise<StartupBriefing> {
  const snapshot = parseSnapshot(conversation.configSnapshot);
  const cached = startupBriefingSchema.safeParse(snapshot.briefing);
  if (cached.success) return cached.data;

  const callerFromSnapshot = snapshot.caller as { website?: unknown } | undefined;
  const website =
    typeof callerFromSnapshot?.website === "string" ? callerFromSnapshot.website : undefined;

  const briefing = await researchStartup(
    {
      name: conversation.callerName,
      email: conversation.callerEmail,
      company: conversation.callerCompany,
      website,
    },
    conversation.language === "en" ? "en" : "de",
  );

  const db = await getDb();
  await db
    .update(conversations)
    .set({
      configSnapshot: JSON.stringify({ ...snapshot, briefing }),
    })
    .where(eq(conversations.id, conversation.id));

  return briefing;
}
