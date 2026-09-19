import { z } from "zod";

export const followUps = ["light", "standard", "thorough"] as const;
export type FollowUp = (typeof followUps)[number];

export const interviewFieldKeys = [
  "product",
  "stage",
  "sector",
  "team",
  "traction",
  "market",
  "competition",
  "fundingNeed",
  "round",
  "nextStep",
  "additionalInfo",
] as const;

export type InterviewFieldKey = (typeof interviewFieldKeys)[number];

export type LocalizedText = {
  de: string;
  en: string;
};

export type FieldBrief = {
  question: LocalizedText;
  depth: LocalizedText;
};

export type AgentScript = {
  speakingStyle: LocalizedText;
  extraInstructions: LocalizedText;
  summaryGuidance: LocalizedText;
  followUp: FollowUp;
  fields: Record<InterviewFieldKey, FieldBrief>;
};

const localizedTextSchema = z.object({
  de: z.string().max(4000).optional(),
  en: z.string().max(4000).optional(),
});

const fieldBriefSchema = z.object({
  question: localizedTextSchema.optional(),
  depth: localizedTextSchema.optional(),
});

export const agentScriptSchema = z.object({
  speakingStyle: localizedTextSchema.optional(),
  extraInstructions: localizedTextSchema.optional(),
  summaryGuidance: localizedTextSchema.optional(),
  followUp: z.enum(followUps).optional(),
  fields: z
    .object({
      product: fieldBriefSchema.optional(),
      stage: fieldBriefSchema.optional(),
      sector: fieldBriefSchema.optional(),
      team: fieldBriefSchema.optional(),
      traction: fieldBriefSchema.optional(),
      market: fieldBriefSchema.optional(),
      competition: fieldBriefSchema.optional(),
      fundingNeed: fieldBriefSchema.optional(),
      round: fieldBriefSchema.optional(),
      nextStep: fieldBriefSchema.optional(),
      additionalInfo: fieldBriefSchema.optional(),
    })
    .optional(),
});

export type AgentScriptInput = z.infer<typeof agentScriptSchema>;

export const INTERVIEW_GROUPS = [
  {
    id: "product",
    de: "Produkt & Stand",
    en: "Product & stage",
    keys: ["product", "stage", "sector"],
  },
  {
    id: "team",
    de: "Team & Traktion",
    en: "Team & traction",
    keys: ["team", "traction"],
  },
  {
    id: "market",
    de: "Markt & Wettbewerb",
    en: "Market & competition",
    keys: ["market", "competition"],
  },
  {
    id: "funding",
    de: "Finanzierung",
    en: "Funding",
    keys: ["fundingNeed", "round"],
  },
  {
    id: "close",
    de: "Abschluss",
    en: "Close",
    keys: ["nextStep", "additionalInfo"],
  },
] as const satisfies ReadonlyArray<{
  id: string;
  de: string;
  en: string;
  keys: readonly InterviewFieldKey[];
}>;

export const INTERVIEW_FIELDS = [
  {
    key: "product",
    de: "Produkt",
    en: "Product",
    memoDe: "Produkt",
    memoEn: "Product",
    blurbDe: "Was sie bauen, in der Sache.",
    blurbEn: "What they actually build.",
  },
  {
    key: "stage",
    de: "Entwicklungsstand",
    en: "Stage",
    memoDe: "Stage",
    memoEn: "Stage",
    blurbDe: "Idee, Prototyp, live, skalierend.",
    blurbEn: "Idea, prototype, live, scaling.",
  },
  {
    key: "sector",
    de: "Sektor",
    en: "Sector",
    memoDe: "Sektor",
    memoEn: "Sector",
    blurbDe: "Branche — oft schon aus dem Produkt klar.",
    blurbEn: "Industry — often obvious from the product.",
  },
  {
    key: "team",
    de: "Team",
    en: "Team",
    memoDe: "Team",
    memoEn: "Team",
    blurbDe: "Wer dahintersteht.",
    blurbEn: "Who is behind it.",
  },
  {
    key: "traction",
    de: "Traktion",
    en: "Traction",
    memoDe: "Traktion",
    memoEn: "Traction",
    blurbDe: "Ein Beweis, dass es sich bewegt.",
    blurbEn: "Proof that it is moving.",
  },
  {
    key: "market",
    de: "Markt",
    en: "Market",
    memoDe: "Markt",
    memoEn: "Market",
    blurbDe: "Wer kauft, wo.",
    blurbEn: "Who buys, and where.",
  },
  {
    key: "competition",
    de: "Wettbewerb",
    en: "Competition",
    memoDe: "Wettbewerb",
    memoEn: "Competition",
    blurbDe: "An wem sie sich messen.",
    blurbEn: "Who they measure against.",
  },
  {
    key: "fundingNeed",
    de: "Finanzierungsbedarf",
    en: "Funding need",
    memoDe: "Finanzierungsbedarf",
    memoEn: "Funding need",
    blurbDe: "Wie viel, wofür.",
    blurbEn: "How much, and what for.",
  },
  {
    key: "round",
    de: "Geplante Runde",
    en: "Planned round",
    memoDe: "Geplante Runde",
    memoEn: "Planned round",
    blurbDe: "Pre-Seed, Seed, Series A.",
    blurbEn: "Pre-Seed, Seed, Series A.",
  },
  {
    key: "nextStep",
    de: "Nächster Schritt",
    en: "Next step",
    memoDe: "Nächster Schritt",
    memoEn: "Next step",
    blurbDe: "Nur das, was sie selbst sagen.",
    blurbEn: "Only what they actually say.",
  },
  {
    key: "additionalInfo",
    de: "Optionale Ergänzung",
    en: "Optional extra",
    memoDe: "Weitere Hinweise",
    memoEn: "Additional notes",
    blurbDe: "Einmal anbieten, dann Schluss.",
    blurbEn: "Offer once, then stop.",
  },
] as const satisfies ReadonlyArray<{
  key: InterviewFieldKey;
  de: string;
  en: string;
  memoDe: string;
  memoEn: string;
  blurbDe: string;
  blurbEn: string;
}>;

export const FOLLOW_UP_OPTIONS = [
  {
    value: "light",
    de: {
      title: "Knapp",
      body: "Eine brauchbare Antwort reicht. Nur nachhaken, wenn gar nichts Konkretes da ist.",
    },
    en: {
      title: "Light",
      body: "A usable first answer is enough. Follow up only if nothing concrete was said.",
    },
  },
  {
    value: "standard",
    de: {
      title: "Einmal nachhaken",
      body: "Bleibt etwas schwammig, eine Rückfrage — dann weiter. So führen wir das Gespräch sonst.",
    },
    en: {
      title: "One follow-up",
      body: "If an answer is vague, ask once, then move on. This is the usual pace.",
    },
  },
  {
    value: "thorough",
    de: {
      title: "Gründlich",
      body: "Nachfassen, bis eine konkrete Angabe da ist. Höchstens zweimal, dann weiter — nicht ewig bohren.",
    },
    en: {
      title: "Thorough",
      body: "Keep going until there is a concrete fact. Two follow-ups at most, then move on.",
    },
  },
] as const satisfies ReadonlyArray<{
  value: FollowUp;
  de: { title: string; body: string };
  en: { title: string; body: string };
}>;

export const DEFAULT_SCRIPT: AgentScript = {
  speakingStyle: {
    de: "Duzen. Kurze, natürliche Sätze, die sich gut vorlesen lassen. Spiegel einen konkreten Fakt aus der letzten Antwort, dann frag das Nächste — nicht die ganze Antwort nachsprechen. Die Gründerin oder der Gründer soll sich ernst genommen fühlen.",
    en: "Short spoken sentences. Reflect one concrete fact from their last answer, then ask the next thing — do not parrot the whole answer. Make them feel heard, then steer.",
  },
  extraInstructions: { de: "", en: "" },
  summaryGuidance: {
    de: "5–8 Sätze, die ein Partner in einer Minute lesen kann. Exakter Firmenname, nur der Vorname.",
    en: "5–8 sentences a partner can read in one minute. Exact company name, first name only.",
  },
  followUp: "standard",
  fields: {
    product: {
      question: {
        de: "Was bauen sie — in zwei, drei Sätzen, nicht als Pitch-Folie?",
        en: "What do they build, in two or three sentences, not as a pitch slide?",
      },
      depth: {
        de: "Klar, was das Produkt tut und für wen. Kommt nur ein Schlagwort, einmal nach dem konkreten Nutzen fragen.",
        en: "Clear what the product does and for whom. If you only get a buzzword, ask once for the concrete job it does.",
      },
    },
    stage: {
      question: {
        de: "Wie weit ist die Entwicklung — Idee, Prototyp, live, skalierend?",
        en: "How far along is it — idea, prototype, live, scaling?",
      },
      depth: {
        de: "Eine grobe Stage reicht. Nachhaken, wenn unklar ist, ob schon etwas existiert, das jemand nutzen kann.",
        en: "A rough stage is enough. Follow up if it is unclear whether anything exists that someone can use.",
      },
    },
    sector: {
      question: {
        de: "In welcher Branche oder welchem Sektor sind sie unterwegs?",
        en: "Which sector or industry are they in?",
      },
      depth: {
        de: "Wenn der Sektor aus dem Produkt offensichtlich ist, nicht extra fragen — einfach ins Memo schreiben.",
        en: "If the sector is obvious from the product, do not ask — just write it into the memo.",
      },
    },
    team: {
      question: {
        de: "Wer ist im Team, welche Rollen, welche relevante Herkunft?",
        en: "Who is on the team, which roles, what relevant background?",
      },
      depth: {
        de: "Mindestens: allein oder Team, grobe Rollen. Wenn nur 'wir' ohne Namen oder Herkunft kommt, einmal nachhaken.",
        en: "At least: solo or a team, rough roles. If you only get 'we' with no names or background, ask once.",
      },
    },
    traction: {
      question: {
        de: "Welche Traktion gibt es — Nutzer, Umsatz, Piloten, Warteliste?",
        en: "What traction is there — users, revenue, pilots, waitlist?",
      },
      depth: {
        de: "Eine konkrete Zahl oder ein klarer Beweis. 'Viel Interesse' oder 'etwas Traction' ist nicht genug — einmal nach einer Zahl fragen.",
        en: "A concrete number or a clear proof point. 'Lots of interest' or 'some traction' is not enough — ask once for a number.",
      },
    },
    market: {
      question: {
        de: "Wer kauft das, und in welchem Markt oder welcher Region?",
        en: "Who buys it, and in which market or geography?",
      },
      depth: {
        de: "Zielkunde und Geografie. Wenn nur 'alle' oder 'der Markt' kommt, einmal konkretisieren. Darf mit Wettbewerb in einer Frage zusammengehen.",
        en: "Buyer and geography. If they say 'everyone' or 'the market', ask once for something concrete. May share a question with competition.",
      },
    },
    competition: {
      question: {
        de: "An wem messen sie sich — namentlich genannte Wettbewerber oder Alternativen?",
        en: "Who do they measure against — named competitors or substitutes?",
      },
      depth: {
        de: "Mindestens ein Name oder die klare Aussage, dass es niemanden Vergleichbares gibt. 'Viele' ohne Namen: einmal nachhaken.",
        en: "At least one name, or a clear claim that nothing comparable exists. 'Lots of people' with no names: ask once.",
      },
    },
    fundingNeed: {
      question: {
        de: "Wie viel wollen sie einsammeln, und wofür?",
        en: "How much do they want to raise, and what is it for?",
      },
      depth: {
        de: "Eine Größenordnung und der Verwendungszweck. 'Wir brauchen Kapital' ist zu dünn. Darf mit der Runde in einer Frage zusammengehen.",
        en: "An order of magnitude and what it is for. 'We need capital' is too thin. May share a question with the planned round.",
      },
    },
    round: {
      question: {
        de: "Welche Runde ist geplant — Pre-Seed, Seed, Series A?",
        en: "Which round is planned — Pre-Seed, Seed, Series A?",
      },
      depth: {
        de: "Die geplante Runde. Proceed, Preceed oder Pri-Seed heißt Pre-Seed — nicht entschuldigen und nochmal fragen.",
        en: "The planned round. Proceed, Preceed, or Pri-Seed means Pre-Seed — do not apologise and re-ask.",
      },
    },
    nextStep: {
      question: {
        de: "Was ist der nächste Schritt aus ihrer Sicht?",
        en: "What is the next step from their side?",
      },
      depth: {
        de: "Muss von ihnen kommen. Nicht erfinden. Wenn nur 'mal schauen' kommt, einmal nachhaken, sonst 'unbekannt'.",
        en: "Must come from them. Do not invent it. If they only say 'we'll see', ask once, otherwise store 'unknown'.",
      },
    },
    additionalInfo: {
      question: {
        de: "Sag, dass du für dieses Erstgespräch hast, was du brauchst. Biete dann eine optionale Ergänzung an — ungefähr: Wenn du uns noch etwas sagen möchtest, damit wir besser verstehen, wo ihr steht und was ihr sucht, jetzt gern.",
        en: "Say you have what you need for this first conversation. Then offer one optional extra — close to: If there is anything else you want to tell us to help us understand where you stand and what you are looking for, now is the moment.",
      },
      depth: {
        de: "Einmal anbieten, dann auf die Antwort warten. Erst danach speichern. Nie nachhaken. Was sie sagen, kommt in additionalInfo. Sagen sie nein, bleibt das Feld leer.",
        en: "Offer once, then wait for the answer. Save only after that. Never follow up. Put what they add in additionalInfo. If they decline, leave it empty.",
      },
    },
  },
};

function pickLocalized(
  value: { de?: string; en?: string } | undefined,
  fallback: LocalizedText,
): LocalizedText {
  return {
    de: value?.de?.trim() ? value.de : fallback.de,
    en: value?.en?.trim() ? value.en : fallback.en,
  };
}

function pickOptionalLocalized(
  value: { de?: string; en?: string } | undefined,
): LocalizedText {
  return {
    de: value?.de ?? "",
    en: value?.en ?? "",
  };
}

export function mergeScript(input?: AgentScriptInput): AgentScript {
  const fields = Object.fromEntries(
    interviewFieldKeys.map((key) => {
      const incoming = input?.fields?.[key];
      const fallback = DEFAULT_SCRIPT.fields[key];
      return [
        key,
        {
          question: pickLocalized(incoming?.question, fallback.question),
          depth: pickLocalized(incoming?.depth, fallback.depth),
        },
      ];
    }),
  ) as AgentScript["fields"];

  return {
    speakingStyle: pickLocalized(input?.speakingStyle, DEFAULT_SCRIPT.speakingStyle),
    extraInstructions: pickOptionalLocalized(input?.extraInstructions),
    summaryGuidance: pickLocalized(input?.summaryGuidance, DEFAULT_SCRIPT.summaryGuidance),
    followUp: input?.followUp ?? DEFAULT_SCRIPT.followUp,
    fields,
  };
}

export function localized(text: LocalizedText, language: "de" | "en"): string {
  return text[language].trim();
}

export function sameScript(left: AgentScript, right: AgentScript): boolean {
  if (left.followUp !== right.followUp) return false;
  if (left.speakingStyle.de !== right.speakingStyle.de) return false;
  if (left.speakingStyle.en !== right.speakingStyle.en) return false;
  if (left.extraInstructions.de !== right.extraInstructions.de) return false;
  if (left.extraInstructions.en !== right.extraInstructions.en) return false;
  if (left.summaryGuidance.de !== right.summaryGuidance.de) return false;
  if (left.summaryGuidance.en !== right.summaryGuidance.en) return false;
  return interviewFieldKeys.every((key) => {
    const a = left.fields[key];
    const b = right.fields[key];
    return (
      a.question.de === b.question.de &&
      a.question.en === b.question.en &&
      a.depth.de === b.depth.de &&
      a.depth.en === b.depth.en
    );
  });
}

export function fieldChanged(
  script: AgentScript,
  key: InterviewFieldKey,
  language: "de" | "en",
): boolean {
  const current = script.fields[key];
  const fallback = DEFAULT_SCRIPT.fields[key];
  return (
    current.question[language] !== fallback.question[language] ||
    current.depth[language] !== fallback.depth[language]
  );
}
