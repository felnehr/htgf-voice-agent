"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { IntakeCard } from "~/components/intake-card";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";
import { INTAKE_FIELDS, type Intake, type Language } from "~/lib/types";
import { cn } from "~/lib/utils";

const LONG_FIELDS = new Set<keyof Intake>([
  "summary",
  "team",
  "product",
  "traction",
  "market",
  "competition",
  "fundingNeed",
  "nextStep",
  "additionalInfo",
]);

function sameIntake(left: Intake, right: Intake) {
  return INTAKE_FIELDS.every((field) => left[field.key] === right[field.key]);
}

export function IntakeEditor({
  conversationId,
  initial,
  language = "de",
  onSaved,
  onDirtyChange,
}: {
  conversationId: string;
  initial: Intake;
  language?: Language;
  onSaved?: (intake: Intake) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const german = language === "de";
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [draft, setDraft] = useState<Intake>(initial);
  const [saved, setSaved] = useState<Intake>(initial);
  const [pending, setPending] = useState(false);
  const dirty = useMemo(() => !sameIntake(draft, saved), [draft, saved]);

  useEffect(() => {
    setDraft(initial);
    setSaved(initial);
  }, [initial]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const setField = (key: keyof Intake, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const cancel = () => {
    if (
      dirty &&
      !window.confirm(
        german
          ? "Nicht gespeicherte Korrekturen gehen verloren. Trotzdem abbrechen?"
          : "Unsaved corrections will be lost. Cancel anyway?",
      )
    ) {
      return;
    }
    setDraft(saved);
    setMode("view");
  };

  const save = async () => {
    setPending(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/intake`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!response.ok) {
        throw new Error(
          german ? "Memo konnte nicht gespeichert werden." : "Could not save the memo.",
        );
      }
      const body = (await response.json()) as { intake?: Intake };
      const next = body.intake ?? draft;
      setDraft(next);
      setSaved(next);
      onSaved?.(next);
      setMode("view");
      toast.success(german ? "Memo aktualisiert." : "Memo updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : german ? "Fehler" : "Error");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
          {german ? "Erstgespräch · Memo" : "First call · Memo"}
        </p>
        {mode === "view" ? (
          <Button size="lg" type="button" onClick={() => setMode("edit")}>
            {german ? "Memo bearbeiten" : "Edit memo"}
          </Button>
        ) : (
          <Button size="lg" type="button" variant="outline" onClick={cancel}>
            {german ? "Abbrechen" : "Cancel"}
          </Button>
        )}
      </div>

      {mode === "view" ? (
        <IntakeCard intake={draft} language={language} hideEyebrow />
      ) : (
        <form
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (!dirty || pending) return;
            void save();
          }}
        >
          <div className="flex flex-col gap-2">
            <label htmlFor="memo-startup" className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
              {german ? "Startup" : "Startup"}
            </label>
            <input
              id="memo-startup"
              value={draft.startup}
              onChange={(event) => setField("startup", event.currentTarget.value)}
              maxLength={4000}
              className={cn(
                "w-full min-w-0 !rounded-[8px] border border-input bg-transparent px-3 py-2 outline-none",
                "font-heading text-3xl font-medium tracking-tight",
                "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                "placeholder:text-muted-foreground",
              )}
              placeholder={german ? "Name des Startups" : "Startup name"}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="memo-summary" className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
              {german ? "Zusammenfassung" : "Summary"}
            </label>
            <Textarea
              id="memo-summary"
              value={draft.summary}
              onChange={(event) => setField("summary", event.currentTarget.value)}
              maxLength={4000}
              className="font-serif min-h-28 !rounded-[8px] text-lg leading-snug"
              placeholder={
                german
                  ? "Kurze Zusammenfassung des Gesprächs"
                  : "Short summary of the call"
              }
            />
          </div>
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {INTAKE_FIELDS.filter((field) => field.key !== "startup" && field.key !== "summary").map(
              (field) => {
                const id = `memo-${field.key}`;
                const label = german ? field.de : field.en;
                return (
                  <div
                    key={field.key}
                    className={cn(
                      "flex min-w-0 flex-col gap-2 border-t pt-3",
                      field.key === "additionalInfo" && "sm:col-span-2",
                    )}
                  >
                    <label
                      htmlFor={id}
                      className="text-xs tracking-[0.14em] text-muted-foreground uppercase"
                    >
                      {label}
                    </label>
                    <Textarea
                      id={id}
                      value={draft[field.key]}
                      onChange={(event) => setField(field.key, event.currentTarget.value)}
                      maxLength={4000}
                      placeholder={
                        field.key === "additionalInfo"
                          ? german
                            ? "Optional — was sie darüber hinaus gesagt haben"
                            : "Optional — anything they added beyond the required points"
                          : undefined
                      }
                      className={
                        LONG_FIELDS.has(field.key)
                          ? "min-h-24 !rounded-[8px] text-sm leading-relaxed"
                          : "min-h-12 !rounded-[8px] text-sm leading-relaxed"
                      }
                    />
                  </div>
                );
              },
            )}
          </div>
          <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t bg-card pt-5 pb-1">
            <Button size="lg" type="button" variant="outline" onClick={cancel}>
              {german ? "Abbrechen" : "Cancel"}
            </Button>
            <Button size="lg" type="submit" disabled={!dirty || pending}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {german ? "Änderungen speichern" : "Save changes"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
