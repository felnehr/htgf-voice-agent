import type { Caller, Intake } from "~/lib/types";

const ROUND_ALIASES: Array<[RegExp, string]> = [
  [/\b(proceed|preceed|preceeding|prised|preisied|pri-?seed|pre\s*seed|preseed)\b/i, "Pre-Seed"],
  [/\bseries\s*a\b/i, "Series A"],
  [/\bseries\s*b\b/i, "Series B"],
];

function fold(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .replaceAll("ch", "k")
    .replaceAll(/[^a-z0-9]/g, "");
}

function editDistance(a: string, b: string): number {
  const rows: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array.from({ length: b.length + 1 }, () => 0),
  );
  for (let i = 0; i <= a.length; i += 1) rows[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) rows[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + cost,
      );
    }
  }
  return rows[a.length][b.length];
}

function closeToCompany(token: string, company: string): boolean {
  if (token.length < 4 || company.length < 4) return false;
  if (token.toLowerCase() === company.toLowerCase()) return true;
  // Short everyday names ("Test", "Orbit") must match exactly. Fuzzy matching
  // is for invented brand spellings like ikigize / Ichiga.
  if (company.length < 6) return false;
  const left = fold(token);
  const right = fold(company);
  if (left.length < 4 || right.length < 4) return false;
  const distance = editDistance(left, right);
  return distance > 0 && distance / Math.max(left.length, right.length) <= 0.5;
}

function restoreCompanyName(text: string, company: string): string {
  const target = company.trim();
  if (!target || !text) return text;
  const parts = target.split(/\s+/).filter((part) => part.length >= 4);
  return text.replace(/\b[\p{L}\p{N}][\p{L}\p{N}-]*\b/gu, (token) => {
    if (parts.length === 1 && closeToCompany(token, target)) return target;
    for (const part of parts) {
      if (closeToCompany(token, part)) return part;
    }
    return token;
  });
}

function restoreRoundTerms(text: string): string {
  return text.replace(
    /\b(proceed|preceed|preceeding|prised|preisied|pri-?seed|pre[\s-]*seed|preseed)\b/gi,
    "Pre-Seed",
  );
}

// Prompted letter-by-letter for German TTS ("Ha, Te, Ge, Ef") and English
// ("H-T-G-F"). Same text is the transcript — fold it back to the acronym.
function restoreHtgf(text: string): string {
  return text
    .replace(/\bHa[\s,.-]+Te[\s,.-]+Ge[\s,.-]+Ef\b/gi, "HTGF")
    .replace(/\bH(?:\s*[.-]\s*T)(?:\s*[.-]\s*G)(?:\s*[.-]\s*F)\b/g, "HTGF");
}

export function canonicalizeTranscriptText(text: string): string {
  return restoreHtgf(text);
}

function canonicalizeRound(round: string): string {
  const trimmed = round.trim();
  if (!trimmed) return trimmed;
  for (const [pattern, label] of ROUND_ALIASES) {
    if (pattern.test(trimmed) || pattern.test(fold(trimmed))) return label;
  }
  return restoreRoundTerms(trimmed);
}

export function canonicalizeIntake(intake: Intake, caller: Caller): Intake {
  const company = caller.company.trim();
  const rewrite = (value: string) =>
    restoreHtgf(restoreRoundTerms(restoreCompanyName(value, company)));
  return {
    startup: company || rewrite(intake.startup),
    sector: rewrite(intake.sector),
    stage: rewrite(intake.stage),
    team: rewrite(intake.team),
    product: rewrite(intake.product),
    traction: rewrite(intake.traction),
    market: rewrite(intake.market),
    competition: rewrite(intake.competition),
    fundingNeed: rewrite(intake.fundingNeed),
    round: canonicalizeRound(rewrite(intake.round)),
    nextStep: rewrite(intake.nextStep),
    additionalInfo: rewrite(intake.additionalInfo),
    summary: rewrite(intake.summary),
  };
}
