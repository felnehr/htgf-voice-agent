"use client";

import { cn } from "~/lib/utils";
import type { Language } from "~/lib/types";

const OPTIONS = [
  { value: "de" as const, label: "Deutsch", short: "DE" },
  { value: "en" as const, label: "English", short: "EN" },
] as const;

function GermanFlag() {
  return (
    <svg
      viewBox="0 0 16 12"
      className="h-3 w-4 overflow-hidden rounded-[2px] shadow-[0_0_0_1px_rgba(34,31,25,0.12)]"
      aria-hidden
    >
      <rect width="16" height="4" fill="#000" />
      <rect y="4" width="16" height="4" fill="#DD0000" />
      <rect y="8" width="16" height="4" fill="#FFCE00" />
    </svg>
  );
}

function BritishFlag() {
  return (
    <svg
      viewBox="0 0 16 12"
      className="h-3 w-4 overflow-hidden rounded-[2px] shadow-[0_0_0_1px_rgba(34,31,25,0.12)]"
      aria-hidden
    >
      <rect width="16" height="12" fill="#012169" />
      <path d="M0 0 16 12M16 0 0 12" stroke="#fff" strokeWidth="2.6" />
      <path d="M0 0 16 12M16 0 0 12" stroke="#C8102E" strokeWidth="1.3" />
      <path d="M8 0v12M0 6h16" stroke="#fff" strokeWidth="4" />
      <path d="M8 0v12M0 6h16" stroke="#C8102E" strokeWidth="2.2" />
    </svg>
  );
}

export function LanguageSwitch({
  value,
  onChange,
  disabled,
}: {
  value: Language;
  onChange: (language: Language) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={value === "de" ? "Sprache" : "Language"}
      className="flex items-center rounded-full bg-muted p-0.5"
    >
      {OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            aria-label={option.label}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-8 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-full px-2.5 text-[0.8rem] font-medium transition-colors",
              selected
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
              disabled && "pointer-events-none opacity-50",
            )}
          >
            {option.value === "de" ? <GermanFlag /> : <BritishFlag />}
            <span>{option.short}</span>
          </button>
        );
      })}
    </div>
  );
}
