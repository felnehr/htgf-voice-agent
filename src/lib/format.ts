import type { Language } from "~/lib/types";

export function formatWhen(value: Date | string, language: Language = "de") {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatLatency(seconds: string | number | null | undefined) {
  if (seconds == null || seconds === "") return null;
  const value = typeof seconds === "string" ? Number(seconds) : seconds;
  if (!Number.isFinite(value)) return null;
  return `${value.toFixed(2)}s`;
}
