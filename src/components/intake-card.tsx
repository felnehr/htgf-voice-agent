import type { ReactNode } from "react";
import { INTAKE_FIELDS, type Intake, type Language } from "~/lib/types";
import { cn } from "~/lib/utils";

export function IntakeCard({
  intake,
  language = "de",
  hideEyebrow = false,
  action,
}: {
  intake: Intake;
  language?: Language;
  hideEyebrow?: boolean;
  action?: ReactNode;
}) {
  return (
    <article className="flex flex-col gap-6">
      <div>
        {hideEyebrow && !action ? null : (
          <div className="flex items-center justify-between gap-3">
            {hideEyebrow ? <span /> : (
              <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                {language === "de" ? "Erstgespräch · Memo" : "First call · Memo"}
              </p>
            )}
            {action}
          </div>
        )}
        <h2
          className={cn(
            "font-heading text-3xl font-medium tracking-tight text-pretty",
            hideEyebrow ? null : "mt-2",
          )}
        >
          {intake.startup || (language === "de" ? "Ohne Titel" : "Untitled")}
        </h2>
        {intake.summary ? (
          <p className="font-serif mt-4 text-lg leading-snug text-pretty">
            {intake.summary}
          </p>
        ) : null}
      </div>
      <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {INTAKE_FIELDS.filter((field) => {
          if (field.key === "startup" || field.key === "summary") return false;
          if (field.key === "additionalInfo" && !intake.additionalInfo) return false;
          return true;
        }).map((field) => (
          <div
            key={field.key}
            className={cn(
              "flex flex-col gap-1 border-t pt-3",
              field.key === "additionalInfo" && "sm:col-span-2",
            )}
          >
            <dt className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
              {language === "de" ? field.de : field.en}
            </dt>
            <dd className="text-sm leading-relaxed">
              {intake[field.key] || "—"}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
