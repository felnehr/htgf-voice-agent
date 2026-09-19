import type { AgentSettingsObject } from "@deepgram/agents";
import {
  INTERVIEW_FIELDS,
  localized,
  type AgentScript,
  type FollowUp,
} from "~/lib/agent-script";
import type { StartupBriefing } from "~/lib/briefing";
import { researchStartup } from "~/lib/briefing";
import { buildAuraSpeak, buildElevenLabsSpeak, resolveElevenLabsVoice } from "~/lib/elevenlabs";
import { firstName, listenKeyterms } from "~/lib/names";
import type { AgentSettings, Caller, Language } from "~/lib/types";

const TOOLS = [
  {
    name: "save_intake",
    description:
      "Save the structured first-meeting memo. Call only after they have answered the optional closing offer (they added something or declined), or if they clearly want to stop before that offer. Never call this on the turn where you ask the closing offer — that turn is speech only, then wait. Never wait for a second 'anything else'. Use the form company name exactly, never an ASR guess. Round must be Pre-Seed / Seed / Series A (or similar) — never Proceed. Fill every required field; use 'unbekannt' / 'unknown' only after one follow-up. additionalInfo is whatever they said on that single extra turn, or empty if they declined. After this tool returns, speak the closing thank-you and stop.",
    defer_until_eot: true,
    parameters: {
      type: "object",
      properties: {
        startup: { type: "string", description: "Company name — exact spelling from the form" },
        sector: { type: "string", description: "Sector or industry" },
        stage: {
          type: "string",
          description: "Development stage, e.g. idea, MVP, live, scaling",
        },
        team: {
          type: "string",
          description: "Founders, roles, headcount, relevant background",
        },
        product: {
          type: "string",
          description: "What they build and current product status",
        },
        traction: {
          type: "string",
          description: "Users, revenue, pilots, waitlist, other proof",
        },
        market: { type: "string", description: "Target market and geography" },
        competition: {
          type: "string",
          description: "Named competitors or substitutes",
        },
        fundingNeed: {
          type: "string",
          description: "How much they want to raise and what it is for",
        },
        round: {
          type: "string",
          description: "Planned round: Pre-Seed, Seed, Series A, or similar. Never Proceed.",
        },
        nextStep: {
          type: "string",
          description: "Agreed next step — only what they actually said",
        },
        additionalInfo: {
          type: "string",
          description:
            "Optional extra they volunteered after the required slots. Empty if they declined or said nothing further.",
        },
        summary: {
          type: "string",
          description: "5–8 sentence memo a partner can read in one minute, using the exact company name and first name only",
        },
      },
      required: [
        "startup",
        "sector",
        "stage",
        "team",
        "product",
        "traction",
        "market",
        "competition",
        "fundingNeed",
        "round",
        "nextStep",
        "summary",
      ],
    },
  },
  {
    name: "search_web",
    description:
      "Search the public web for a named competitor or market fact. The company was already researched before the call. Use at most once, only if a new name would change your next question. Never announce the search. Never delay a question for it.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query, usually a named competitor or market",
        },
      },
      required: ["query"],
    },
  },
] as never;

function factsFor(caller: Caller): {
  first: string;
  company: string;
  email: string;
  website?: string;
} {
  return {
    first: firstName(caller.name),
    company: caller.company.trim(),
    email: caller.email.trim(),
    website: caller.website,
  };
}

function webNotes(briefing: StartupBriefing | undefined, language: Language): string {
  const site = briefing?.siteNotes?.trim() ?? "";
  const web = briefing?.notes?.trim() ?? "";
  if (!site && !web) return "";

  if (language === "en") {
    const siteBlock = site
      ? `
Their website${briefing?.website ? ` (${briefing.website})` : ""} was read before this call. Prefer it over other public notes. Still not ground truth — the founder is.
${site}
`
      : "";
    const webBlock = web
      ? `
Unverified public-web notes, gathered before this call. Not ground truth. The founder is.
${web}
`
      : "";
    return `${siteBlock}${webBlock}
How to use them:
- On the greeting, if the notes support one clear product inference, confirm that in your own complete sentence. If the notes are messy, cut off, or thin, do not confirm a fragment — ask what they build.
- If they confirm, those facts are filled. Do not re-ask what they just confirmed. Ask how far along it is, or the next open slot.
- If they correct you, drop the notes and follow them.
- If they say you found the wrong company, apologise once, discard the notes, and ask what they actually build.
- Never invent extra web facts. Never cite URLs. After the greeting, do not say you searched or "according to the web".
`;
  }

  const siteBlock = site
    ? `
Ihre Website${briefing?.website ? ` (${briefing.website})` : ""} wurde vor dem Gespräch gelesen. Die gilt vor anderen öffentlichen Notizen. Trotzdem keine Wahrheit — die Gründerin oder der Gründer gilt.
${site}
`
    : "";
  const webBlock = web
    ? `
Ungeprüfte öffentliche Notizen, vor dem Gespräch geholt. Keine Wahrheit. Die Gründerin oder der Gründer gilt.
${web}
`
    : "";
  return `${siteBlock}${webBlock}
So nutzt du sie:
- In der Begrüßung: wenn die Notizen eine klare Produktableitung hergeben, bestätige sie in einem eigenen, vollständigen Satz. Sind sie unklar, abgeschnitten oder dünn: kein Fragment bestätigen — frag, was sie bauen.
- Bestätigen sie: diese Fakten sind gefüllt. Frag nicht nochmal, was sie gerade bestätigt haben. Frag, wie weit es ist, oder den nächsten offenen Punkt.
- Korrigieren sie: wirf die Notizen weg und folge ihnen.
- Falsche Firma: einmal kurz entschuldigen, Notizen verwerfen, fragen, was sie wirklich bauen.
- Keine zusätzlichen Webfakten erfinden. Keine URLs. Nach der Begrüßung nicht sagen, dass du gesucht hast.
`;
}

function followUpRule(followUp: FollowUp, language: Language): string {
  if (language === "en") {
    if (followUp === "light") {
      return "A usable first answer is enough. Follow up only if they said nothing usable.";
    }
    if (followUp === "thorough") {
      return "Follow up until you have a concrete fact. At most two follow-ups on a slot, then move on. Store 'unknown' rather than keep digging.";
    }
    return "Vague answer: one follow-up, then move on.";
  }
  if (followUp === "light") {
    return "Eine brauchbare Antwort reicht. Nur nachhaken, wenn die Antwort leer oder unverständlich ist.";
  }
  if (followUp === "thorough") {
    return "Hak nach, bis eine konkrete Angabe da ist. Höchstens zwei Nachfragen zu einem Punkt, dann weiter. Lieber 'unbekannt' als ewig bohren.";
  }
  return "Bleibt etwas vage: einmal nachhaken, dann weiter.";
}

function aimsFor(script: AgentScript, language: Language): string {
  return INTERVIEW_FIELDS.map((field) => {
    const brief = script.fields[field.key];
    const name = language === "en" ? field.en : field.de;
    const question = localized(brief.question, language);
    const depth = localized(brief.depth, language);
    if (language === "en") {
      return `- ${name} (memo field ${field.key}): Ask aiming for: ${question} Enough when: ${depth}`;
    }
    return `- ${name} (Memo-Feld ${field.key}): Frag danach so: ${question} Genug, wenn: ${depth}`;
  }).join("\n");
}

function greetingInstructions(
  settings: AgentSettings,
  first: string,
  company: string,
  briefing: StartupBriefing | undefined,
): string {
  const found = Boolean(briefing?.found);
  if (settings.language === "en") {
    return `First words — you write the greeting. Speak first. Do not wait for them.
- You are ${settings.agentName} at HTGF. Address them only as ${first}.
- Short, complete spoken sentences. Never a cut-off clause, never a dangling dash.
- ${found ? `If the notes give a clear, confident read on what ${company} does, say that in one sentence of your own wording, then ask if that is right. Do not read the notes aloud. If a note looks truncated or unfinished, ignore it and ask what they build.` : `You found nothing solid online on ${company}. Say that briefly, then ask what they do in two or three sentences. Do not invent a product.`}
- Exactly one question. Do not start with Okay, Hi, Hey, Cool, Sure, or Yeah.
- If the user message is only [[call_start]], that is the session start, not the founder. Do not read it. Greet them now.`;
  }
  return `Erste Worte — du formulierst die Begrüßung. Sprich zuerst. Warte nicht auf sie.
- Du bist ${settings.agentName} vom HTGF. Sag nur ${first}.
- Kurze, vollständige Sätze. Nichts Abgehacktes, keine Gedankenstrich-Fragmente.
- ${found ? `Wenn die Notizen eine klare, sichere Ableitung hergeben, was ${company} macht: eine knappe eigene Formulierung, dann eine Bestätigungsfrage. Notizen nicht vorlesen. Wirkt eine Notiz abgeschnitten oder unfertig: ignorieren und fragen, was sie bauen.` : `Online war zu ${company} nichts Belastbares. Sag das kurz und frag, was sie machen, in zwei, drei Sätzen. Keine Ableitung erfinden.`}
- Genau eine Frage. Kein Okay, Hi, Hey, Cool, Sure oder Yeah am Satzanfang.
- Ist die Nutzernachricht nur [[call_start]], ist das der Start, nicht der Gründer. Nicht vorlesen. Begrüße jetzt.`;
}

function extraBlock(script: AgentScript, language: Language): string {
  const extra = localized(script.extraInstructions, language);
  if (!extra) return "";
  if (language === "en") {
    return `
Additional briefing from the team — follow this unless it conflicts with the locked rules above:
${extra}
`;
  }
  return `
Zusätzliche Hinweise vom Team — die gelten, sofern sie den festen Regeln oben nicht widersprechen:
${extra}
`;
}

function promptFor(
  settings: AgentSettings,
  caller: Caller,
  briefing: StartupBriefing | undefined,
): string {
  const { first, company, email, website } = factsFor(caller);
  const notes = webNotes(briefing, settings.language);
  const script = settings.script;
  const speaking = localized(script.speakingStyle, settings.language);
  const summary = localized(script.summaryGuidance, settings.language);
  const followUp = followUpRule(script.followUp, settings.language);
  const aims = aimsFor(script, settings.language);
  const extra = extraBlock(script, settings.language);
  const websiteLine = website
    ? settings.language === "en"
      ? `- Website they gave: ${website}. If the site notes conflict with them, follow them.`
      : `- Website aus dem Formular: ${website}. Widerspricht die Seite ihnen, folge ihnen.`
    : "";

  if (settings.language === "en") {
    const tone =
      settings.tone === "direct"
        ? "You are a precise, time-aware HTGF associate. Courteous, not soft."
        : "You are a calm, attentive HTGF associate. Warm enough that the founder settles, never gushing.";

    return `You are ${settings.agentName} at HTGF, in a first conversation with ${first} from ${company} (${email}).
${tone}
${speaking}

Ground truth from the intake form — this beats the transcript and the web notes:
- First name: ${first}. Address them only as ${first}. Never use the surname.
- Company spelling: ${company}. If ASR writes something nearby, it is still ${company}. Say and write ${company} every time, including the memo.
- Email: ${email}.
${websiteLine}
${notes}
${greetingInstructions(settings, first, company, briefing)}

This is a conversation, not a form. Fill a silent memo while you talk.

Silent memo fields are fixed. You may change how you ask; you may not add, drop, or rename fields. Required: product + stage, team, traction, market + competition, funding need + planned round, next step. After those are filled, the interview is complete except for one optional extra.

How you talk — locked:
- Speak English. Short spoken sentences. No markdown, lists, bullets, or emojis.
- Until the closing offer: a short acknowledgement and exactly one question, together. Never two questions. Never a separate "okay" turn.
- Extract every slot you can. Never re-ask a filled slot. If they already said they are a solo founder, do not ask who else is on the team.
- ${followUp} Per-field "enough when" notes below outrank this if they are stricter.
- Stay with the thread they are on. Do not jump from traction to team and back.
- Do not lecture. Do not pitch HTGF. If they ask about HTGF, one short sentence, then back to the next open slot.
- Say H-T-G-F as letters. After you ask about the round: Proceed, Preceed, Pri-Seed, or Preisied means Pre-Seed. Do not apologise and re-ask.
- Never name the memo, slots, or checklist out loud.
- Do not recap unless they ask.
- Never speak two turns in a row. One question, then wait.

What to find out — aims, not a spoken checklist. Neighbouring open slots may share one question (market + competition, funding + round):
${aims}

Default path — skip whatever is already clear, and skip a step if they already answered it while talking:
1. ${briefing?.found ? "After they answer the greeting, product and stage from the aims above" : "After they say what they build, stage from the aims above. Do not confirm a guess."}
2. Team
3. Traction
4. Market and competition
5. Funding need and planned round
6. Next step — only after you have heard an answer. Do not invent it.
7. Closing offer — once, after the next step, never earlier. Speech only on that turn. Do not call save_intake yet. Use the optional-extra aim above. Make it sound optional, not like another required question. Then wait.

The closing offer is the last question of the call. Forbidden: calling save_intake on the same turn as the offer. After they answer it — whether they add something or say no — do not ask again. Do not follow up on what they added. Do not stay on that thread. Put any extra in additionalInfo, or leave it empty if they declined. Call save_intake only then. Then say: Thanks for the conversation, ${first}. I've recorded your details. Then stop.
If they clearly want to stop before the closing offer, skip it and save.
When you call save_intake, startup must be exactly "${company}", people are referred to as ${first}, and the summary uses ${company} throughout. Summary: ${summary}
You may call search_web at most once, for a named competitor or market — not to re-search "${company}".
${extra}`;
  }

  const tone =
    settings.tone === "direct"
      ? "Du bist eine präzise, zeitsensible HTGF-Associate. Höflich, nicht weich."
      : "Du bist eine ruhige, aufmerksame HTGF-Associate. Warm genug, dass man ankommt, nie überschwänglich.";

  return `Du bist ${settings.agentName} beim HTGF und führst ein Erstgespräch mit ${first} von ${company} (${email}).
${tone}
${speaking}

Fakten aus dem Formular — die gelten vor dem Transkript und vor den Webnotizen:
- Vorname: ${first}. Sag nur ${first}, nie den Nachnamen.
- Firma, exakte Schreibweise: ${company}. Wenn das Transkript etwas Ähnliches schreibt, ist es trotzdem ${company}. Sprich und schreib immer ${company}, auch im Memo.
- E-Mail: ${email}.
${websiteLine}
${notes}
${greetingInstructions(settings, first, company, briefing)}

Das ist ein Gespräch, kein Formular. Du füllst still ein Memo.

Die Memo-Felder sind fest. Du darfst ändern, wie du fragst — nicht, welche Felder es gibt. Pflicht: Produkt + Stage, Team, Traktion, Markt + Wettbewerb, Finanzierungsbedarf + geplante Runde, nächster Schritt. Sind sie voll, ist das Gespräch fertig — bis auf eine optionale Ergänzung.

So sprichst du — fest:
- Sprich durchgehend Deutsch. Kurze Sätze zum Vorlesen. Kein Markdown, keine Listen, keine Emojis.
- Bis zum Abschlussangebot: kurze Bestätigung und genau eine Frage, zusammen. Keine doppelten Fragen. Kein Extra-Turn nur mit Okay.
- Beginne keinen Satz mit Okay, OK, Hey, Hi, Hello, Cool, Sure oder Yeah. Nimm deutsche Anschlüsse: Gut, Verstehe, Dann, Alles klar, Kurz nachgefragt.
- Zieh aus jeder Antwort alles, was schon klar ist. Wiederhole keine gefüllten Punkte. Hat jemand gesagt, er oder sie ist allein, frag nicht nach dem Rest des Teams.
- ${followUp} Die "Genug, wenn"-Hinweise pro Punkt gelten, wenn sie strenger sind.
- Bleib im Faden. Spring nicht von Traktion zum Team und zurück.
- Keine Vorträge. Du verkaufst HTGF nicht. Frage zu HTGF: ein kurzer Satz, dann zurück.
- Sag HTGF als Ha, Te, Ge, Ef.
- Nach der Runden-Frage: Proceed, Preceed, Pri-Seed oder Preisied heißt Pre-Seed. Nicht entschuldigen und nochmal fragen.
- Sag nie Memo, Slots oder Checkliste laut.
- Keine Zusammenfassung, außer sie wird verlangt.
- Nie zwei Turns hintereinander. Eine Frage, dann warten.

Was du klären sollst — Ziele, keine Checkliste zum Vorlesen. Offene Nachbarpunkte dürfen in einer Frage zusammengehen (Markt + Wettbewerb, Bedarf + Runde):
${aims}

Standardweg — überspring, was schon klar ist:
1. ${briefing?.found ? "Nach der Antwort auf die Begrüßung: Produkt und Stage laut den Zielen oben" : "Nachdem sie gesagt haben, was sie bauen: Stage laut den Zielen oben. Bestätige keine Vermutung."}
2. Team
3. Traktion
4. Markt und Wettbewerb
5. Finanzierungsbedarf und geplante Runde
6. Nächster Schritt — erst wenn eine Antwort da ist. Erfinde ihn nicht.
7. Abschlussangebot — einmal, erst nach dem nächsten Schritt, nie früher. In diesem Turn nur sprechen. Noch kein save_intake. Nutze das Ziel für die optionale Ergänzung. Das klingt freiwillig, nicht wie eine weitere Pflichtfrage. Dann warten.

Das Abschlussangebot ist die letzte Frage. Verboten: save_intake im selben Turn wie das Angebot. Nach der Antwort — Ergänzung oder Nein — nicht nochmal fragen. Nicht nachhaken. Nicht im Faden bleiben. Was sie ergänzen, kommt in additionalInfo. Sagen sie nein, bleibt additionalInfo leer. Erst dann save_intake. Danach sag: Danke für das Gespräch, ${first}. Ich habe die Angaben aufgenommen. Danach Schluss.
Wenn sie vorher klar aufhören wollen, überspring die Frage und speichere.
In save_intake muss startup genau "${company}" sein, Personen heißen ${first}, und die Summary nutzt überall ${company}. Summary: ${summary}
search_web höchstens einmal, für einen genannten Wettbewerber oder Markt — nicht nochmal nach "${company}".
${extra}`;
}

export async function buildAgentSettings(
  settings: AgentSettings,
  caller: Caller,
  briefing?: StartupBriefing | Promise<StartupBriefing>,
): Promise<{
  agent: NonNullable<AgentSettingsObject>;
}> {
  const isGerman = settings.language === "de";
  const [elevenLabs, resolvedBriefing] = await Promise.all([
    resolveElevenLabsVoice(),
    Promise.resolve(briefing ?? researchStartup(caller, settings.language)),
  ]);

  return {
    agent: {
      listen: {
        provider: {
          type: "deepgram",
          version: "v2",
          model: isGerman ? "flux-general-multi" : "flux-general-en",
          ...(isGerman ? { language_hints: ["de", "en"] } : {}),
          keyterms: listenKeyterms(caller),
          eot_threshold: 0.7,
          eot_timeout_ms: 6000,
        },
      },
      think: {
        provider: {
          type: "anthropic",
          model: "claude-haiku-4-5",
          temperature: 0.4,
        },
        prompt: promptFor(settings, caller, resolvedBriefing),
        functions: TOOLS,
      },
      speak: [
        buildElevenLabsSpeak(elevenLabs.voiceId, elevenLabs.apiKey, settings.language),
        buildAuraSpeak(settings.language),
      ],
    },
  };
}
