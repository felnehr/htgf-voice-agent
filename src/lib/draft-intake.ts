import { firstName } from "~/lib/names";
import { canonicalizeIntake } from "~/lib/intake";
import {
  blankIntake,
  type Caller,
  type Intake,
  type Language,
} from "~/lib/types";

export type DraftTurn = {
  role: "user" | "assistant";
  content: string;
};

type Slot = Exclude<keyof Intake, "startup" | "summary">;

const CORE_SLOTS: Slot[] = [
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
];

const SLOT_PATTERNS: Array<[Slot, RegExp]> = [
  [
    "additionalInfo",
    /anything else|noch etwas|ergänz|jetzt gern|now is the moment|optional|weitere hinweise|was ich brauche|what i need/i,
  ],
  [
    "nextStep",
    /nächste[rn]? schritt|next step|wie geht (es|s) weiter|was passiert als nächstes|agreed next/i,
  ],
  ["round", /runde|round|pre-?seed|series [ab]|geplante runde|which round/i],
  [
    "fundingNeed",
    /finanz|funding|einsammeln|raise|kapital|how much|wie viel.*(holt|braucht|einsammeln)|what (is it|it is) for/i,
  ],
  ["competition", /wettbewerb|competitor|konkurrenz|alternative|an wem/i],
  ["team", /team|gründer|founder|rollen|headcount|wie viele seid|who is behind/i],
  [
    "stage",
    /wie weit|entwicklungsstand|\bstage\b|mvp|schon.*live|prototype|prototyp|idea or|skalierend/i,
  ],
  ["market", /markt|market|zielgruppe|geograph|who buys|kundenkreis|wo verkauft/i],
  [
    "traction",
    /traktion|traction|umsatz|revenue|nutzer|users|kunden habt|piloten|waitlist|arr|mrr|proof/i,
  ],
  ["sector", /sektor|sector|branche|industry/i],
  [
    "product",
    /produkt|product|was (ihr|sie) (macht|baut)|what (do you|you) (do|build)|beschreiben, was|was macht ihr/i,
  ],
];

function unknownLabel(language: Language) {
  return language === "de" ? "unbekannt" : "unknown";
}

function classifyAssistant(text: string): Slot | null {
  if (
    /ich habe (gelesen|gefunden)|i (read|found|saw)|stimmt das|is that (right|correct)|wie würdest du beschreiben/i.test(
      text,
    )
  ) {
    return "product";
  }
  for (const [slot, pattern] of SLOT_PATTERNS) {
    if (pattern.test(text)) return slot;
  }
  return null;
}

function isAffirmative(text: string) {
  return /^(ja|yes|genau|stimmt|richtig|korrekt|jo|yep|yeah|das stimmt|klingt (richtig|gut)|sounds (right|good|correct)|that('s| is) (right|correct|it)|das klingt richtig)\b/i.test(
    text.trim(),
  );
}

function isDecline(text: string) {
  return /^(nein|no|nö|nee|nichts|nothing|kein|nope|passt so|that's all|das (war'?s|wars|reicht))\b/i.test(
    text.trim(),
  );
}

const SEPARABLE_PREFIXES = [
  "zusammen",
  "zurück",
  "entgegen",
  "weiter",
  "wieder",
  "empor",
  "nieder",
  "auf",
  "aus",
  "ein",
  "mit",
  "nach",
  "vor",
  "weg",
  "fort",
  "fest",
  "los",
  "her",
  "hin",
  "bei",
  "ab",
  "an",
  "zu",
];

function looksLikeFiniteVerb(word: string) {
  return word.length >= 4 && /(?:iert|[ae]lt|[ae]rt|igte|te|ten|t|en)$/i.test(word);
}

function splitSeparableVerb(verb: string): { finite: string; prefix: string } | null {
  const lower = verb.toLowerCase();
  for (const prefix of SEPARABLE_PREFIXES) {
    if (!lower.startsWith(prefix) || lower.length < prefix.length + 3) continue;
    const finite = verb.slice(prefix.length);
    if (!looksLikeFiniteVerb(finite)) continue;
    return { finite, prefix };
  }
  return null;
}

function isCompanyOrPronoun(word: string, company: string) {
  const token = word.toLowerCase();
  return (
    token === company.trim().toLowerCase() ||
    /^(ihr|sie|er|es|man|you|they|it)$/i.test(word)
  );
}

// "ikigize Kurse … aufbaut" is a dass-clause. Memo fields need main-clause order.
function rewriteGermanHypothesis(clause: string, company: string) {
  const words = clause.split(/\s+/).filter(Boolean);
  if (words.length < 3) return clause;
  const verb = words.at(-1);
  if (!verb || !looksLikeFiniteVerb(verb)) return clause;
  const subject = isCompanyOrPronoun(words[0] ?? "", company)
    ? company.trim() || (words[0] ?? "")
    : (words[0] ?? "");
  const middle = words.slice(1, -1).join(" ");
  const separable = splitSeparableVerb(verb);
  if (separable) {
    return `${subject} ${separable.finite} ${middle} ${separable.prefix}`.replace(/\s+/g, " ").trim();
  }
  return `${subject} ${verb} ${middle}`.replace(/\s+/g, " ").trim();
}

function extractHypothesis(text: string, company: string, language: Language): string | null {
  const clipped = text.match(
    /(?:dass|that)\s+(.+?)(?:\s*[—–-]\s*|\s+(?:stimmt das|is that|oder wie|right\b))/i,
  );
  const loose = text.match(/(?:gelesen|found|read),?\s+(?:dass|that)\s+(.+)/i);
  const raw = (clipped?.[1] ?? loose?.[1] ?? "")
    .replace(/\s*[—–-]\s*.*$/, "")
    .replace(/[?,.;:]+$/, "")
    .trim();
  if (!raw) return null;
  return language === "de" ? rewriteGermanHypothesis(raw, company) : raw;
}

function appendValue(current: string, next: string, unknown: string) {
  const incoming = next.replace(/\s+/g, " ").trim();
  if (!incoming) return current;
  if (!current || current === unknown) return incoming;
  if (current.includes(incoming)) return current;
  return `${current} ${incoming}`.replace(/\s+/g, " ").trim();
}

function harvestLooseFacts(text: string, draft: Intake, unknown: string) {
  if (!draft.round || draft.round === unknown) {
    const round = text.match(/\b(pre-?seed|seed|series\s*[ab])\b/i)?.[0];
    if (round) draft.round = round;
  }
  if (!draft.fundingNeed || draft.fundingNeed === unknown) {
    const amount = text.match(
      /\b(\d+(?:[.,]\d+)?\s*(?:k|m|mio|million|tausend|€|euro)s?)\b/i,
    )?.[0];
    if (amount) draft.fundingNeed = amount;
  }
}

function fillValue(
  draft: Intake,
  slot: Slot,
  answer: string,
  assistantText: string,
  unknown: string,
  company: string,
  language: Language,
) {
  const spoken = answer.trim();
  if (!spoken) return;

  if (slot === "additionalInfo" && isDecline(spoken)) {
    draft.additionalInfo = "";
    return;
  }

  if (isAffirmative(spoken) && slot === "product") {
    const hypothesis = extractHypothesis(assistantText, company, language);
    draft.product = appendValue(draft.product, hypothesis || spoken, unknown);
    return;
  }

  if (isAffirmative(spoken) && draft[slot] && draft[slot] !== unknown) {
    return;
  }

  draft[slot] = appendValue(draft[slot], spoken, unknown);
}

function sentenceFor(
  language: Language,
  labelDe: string,
  labelEn: string,
  value: string,
) {
  const clipped = value.replace(/[.;]+$/u, "").trim();
  return language === "de" ? `${labelDe}: ${clipped}.` : `${labelEn}: ${clipped}.`;
}

function buildSummary(
  draft: Intake,
  caller: Caller,
  language: Language,
  unknown: string,
  early: boolean,
) {
  const first = firstName(caller.name);
  const company = caller.company.trim() || draft.startup;
  const lines: string[] = [];

  if (language === "de") {
    lines.push(
      early
        ? `Das Gespräch mit ${first} von ${company} wurde vorzeitig beendet.`
        : `${first} hat ${company} vorgestellt.`,
    );
  } else {
    lines.push(
      early
        ? `The call with ${first} of ${company} ended before every topic was covered.`
        : `${first} introduced ${company}.`,
    );
  }

  const extras: Array<[Slot, string, string]> = [
    ["stage", "Stand", "Stage"],
    ["team", "Team", "Team"],
    ["traction", "Traktion", "Traction"],
    ["market", "Markt", "Market"],
    ["competition", "Wettbewerb", "Competition"],
    ["fundingNeed", "Finanzierungsbedarf", "Funding need"],
    ["round", "Runde", "Round"],
    ["nextStep", "Nächster Schritt", "Next step"],
  ];

  if (draft.product && draft.product !== unknown) {
    const product = draft.product.replace(/[.;]+$/u, "").trim();
    const startsAsSentence = new RegExp(
      `^${company.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "i",
    ).test(product);
    lines.push(startsAsSentence ? `${product}.` : sentenceFor(language, "Produkt", "Product", product));
  }

  for (const [slot, de, en] of extras) {
    const value = draft[slot];
    if (value && value !== unknown) {
      lines.push(sentenceFor(language, de, en, value));
    }
  }

  return lines.join(" ").replace(/\s+/g, " ").trim();
}

export function draftIntakeFromTranscript(
  turns: DraftTurn[],
  caller: Caller,
  language: Language,
): Intake {
  const unknown = unknownLabel(language);
  const draft = blankIntake(caller.company.trim());
  let lastSlot: Slot | null = null;
  let lastAssistant = "";

  for (const turn of turns) {
    const content = turn.content.trim();
    if (!content) continue;

    if (turn.role === "assistant") {
      lastAssistant = content;
      lastSlot = classifyAssistant(content) ?? lastSlot;
      continue;
    }

    harvestLooseFacts(content, draft, unknown);
    if (lastSlot) {
      fillValue(draft, lastSlot, content, lastAssistant, unknown, caller.company, language);
      continue;
    }
    if (!draft.product || draft.product === unknown) {
      fillValue(draft, "product", content, lastAssistant, unknown, caller.company, language);
    } else {
      draft.additionalInfo = appendValue(draft.additionalInfo, content, unknown);
    }
  }

  for (const slot of CORE_SLOTS) {
    if (!draft[slot]) draft[slot] = unknown;
  }

  const missing = CORE_SLOTS.filter((slot) => draft[slot] === unknown).length;
  const early = missing > 0;
  draft.summary = buildSummary(draft, caller, language, unknown, early);

  return canonicalizeIntake(draft, caller);
}

export function hasDraftableTranscript(turns: Array<{ content: string }>) {
  return turns.some((turn) => turn.content.trim().length > 0);
}
