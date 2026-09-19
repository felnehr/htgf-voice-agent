"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import {
  DEFAULT_SCRIPT,
  FOLLOW_UP_OPTIONS,
  INTERVIEW_FIELDS,
  INTERVIEW_GROUPS,
  fieldChanged,
  sameScript,
  type AgentScript,
  type FollowUp,
  type InterviewFieldKey,
} from "~/lib/agent-script";
import type { AgentSettings, Language, Tone } from "~/lib/types";
import { cn } from "~/lib/utils";

type LocalizedKey = "speakingStyle" | "extraInstructions" | "summaryGuidance";

function cloneScript(script: AgentScript): AgentScript {
  return structuredClone(script);
}

export function SettingsForm({ initial }: { initial: AgentSettings }) {
  const [agentName, setAgentName] = useState(initial.agentName);
  const [language, setLanguage] = useState<Language>(initial.language);
  const [tone, setTone] = useState<Tone>(initial.tone);
  const [script, setScript] = useState<AgentScript>(() => cloneScript(initial.script));
  const [saved, setSaved] = useState<AgentSettings>(initial);
  const [copyLang, setCopyLang] = useState<Language>(initial.language);
  const [pending, setPending] = useState(false);

  const dirty = useMemo(() => {
    return (
      agentName !== saved.agentName ||
      language !== saved.language ||
      tone !== saved.tone ||
      !sameScript(script, saved.script)
    );
  }, [agentName, language, saved, script, tone]);

  useEffect(() => {
    if (!dirty) return;
    const onLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const setLocalized = (key: LocalizedKey, value: string) => {
    setScript((current) => ({
      ...current,
      [key]: { ...current[key], [copyLang]: value },
    }));
  };

  const setFollowUp = (value: FollowUp) => {
    setScript((current) => ({ ...current, followUp: value }));
  };

  const setFieldText = (
    key: InterviewFieldKey,
    part: "question" | "depth",
    value: string,
  ) => {
    setScript((current) => ({
      ...current,
      fields: {
        ...current.fields,
        [key]: {
          ...current.fields[key],
          [part]: { ...current.fields[key][part], [copyLang]: value },
        },
      },
    }));
  };

  const resetField = (key: InterviewFieldKey) => {
    setScript((current) => ({
      ...current,
      fields: {
        ...current.fields,
        [key]: {
          question: {
            ...current.fields[key].question,
            [copyLang]: DEFAULT_SCRIPT.fields[key].question[copyLang],
          },
          depth: {
            ...current.fields[key].depth,
            [copyLang]: DEFAULT_SCRIPT.fields[key].depth[copyLang],
          },
        },
      },
    }));
  };

  const resetScript = () => {
    if (
      !window.confirm(
        "Gesprächsleitfaden auf den Standard zurücksetzen? Name, Sprache und Tonalität bleiben.",
      )
    ) {
      return;
    }
    setScript(cloneScript(DEFAULT_SCRIPT));
  };

  const applySaved = (next: AgentSettings) => {
    setAgentName(next.agentName);
    setLanguage(next.language);
    setTone(next.tone);
    setScript(cloneScript(next.script));
    setSaved(next);
  };

  const save = async () => {
    setPending(true);
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentName, language, tone, script }),
    });
    setPending(false);
    if (!response.ok) {
      toast.error("Einstellungen konnten nicht gespeichert werden.");
      return;
    }
    const body = (await response.json()) as { settings?: AgentSettings };
    if (body.settings) applySaved(body.settings);
    toast.success("Gilt für das nächste Gespräch.");
  };

  return (
    <form
      className="flex flex-col gap-16 pb-24"
      onSubmit={(event) => {
        event.preventDefault();
        if (!dirty || pending) return;
        void save();
      }}
    >
      <section className="flex flex-col gap-8">
        <SectionIntro
          eyebrow="Der Agent"
          title="Wie er sich vorstellt"
        />
        <FieldGroup className="max-w-xl">
          <Field>
            <FieldLabel htmlFor="agent-name">Name</FieldLabel>
            <Input
              id="agent-name"
              value={agentName}
              onChange={(event) => setAgentName(event.currentTarget.value)}
              required
            />
            <FieldDescription>
              So stellt sich der Agent am Anfang vor.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Standardsprache</FieldLabel>
            <ToggleGroup
              value={[language]}
              onValueChange={(value) => {
                if (value[0] === "de" || value[0] === "en") {
                  setLanguage(value[0]);
                  setCopyLang(value[0]);
                }
              }}
            >
              <ToggleGroupItem value="de">Deutsch</ToggleGroupItem>
              <ToggleGroupItem value="en">English</ToggleGroupItem>
            </ToggleGroup>
            <FieldDescription>
              Vorgabe auf der Caller-Seite. Dort lässt sich Deutsch und
              English mit den Flaggen umschalten.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Tonalität</FieldLabel>
            <ToggleGroup
              value={[tone]}
              onValueChange={(value) => {
                if (value[0] === "warm" || value[0] === "direct") setTone(value[0]);
              }}
            >
              <ToggleGroupItem value="warm">Warm</ToggleGroupItem>
              <ToggleGroupItem value="direct">Direkt</ToggleGroupItem>
            </ToggleGroup>
            <FieldDescription>
              Warm nimmt die Gründerin oder den Gründer mit. Direkt spart Zeit
              und hakt schwammige Aussagen schneller nach.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </section>

      <section className="flex flex-col gap-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionIntro
            eyebrow="Gesprächsleitfaden"
            title="Wie gesprochen wird"
            body={
              copyLang === "de"
                ? "Diese Texte gelten für deutsche Gespräche."
                : "These texts are used in English conversations."
            }
          />
          <ToggleGroup
            value={[copyLang]}
            onValueChange={(value) => {
              if (value[0] === "de" || value[0] === "en") setCopyLang(value[0]);
            }}
          >
            <ToggleGroupItem value="de">Deutsch</ToggleGroupItem>
            <ToggleGroupItem value="en">English</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <Field className="max-w-2xl">
          <FieldLabel htmlFor="speaking-style">Sprechweise</FieldLabel>
          <Textarea
            id="speaking-style"
            value={script.speakingStyle[copyLang]}
            onChange={(event) => setLocalized("speakingStyle", event.currentTarget.value)}
            className="font-serif min-h-28 text-base leading-relaxed"
          />
          <FieldDescription>
            Nähe, Tempo, wie viel zurückgespiegelt wird. Eine Frage pro Turn und
            keine Listen zum Vorlesen bleiben — das hält das Gespräch in der Spur.
          </FieldDescription>
        </Field>

        <div className="flex max-w-2xl flex-col gap-3">
          <p className="text-sm font-medium">Wie gründlich nachfragen</p>
          <p className="text-sm text-muted-foreground">
            Gilt für alle Punkte, außer ein Punkt unten ist ausdrücklich strenger.
          </p>
          <div role="radiogroup" aria-label="Wie gründlich nachfragen" className="flex flex-col">
            {FOLLOW_UP_OPTIONS.map((option) => {
              const selected = script.followUp === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setFollowUp(option.value)}
                  className={cn(
                    "flex flex-col items-start gap-1 border-l-2 px-4 py-3 text-left transition-colors",
                    selected
                      ? "border-berry bg-fond"
                      : "border-transparent hover:bg-muted/70",
                  )}
                >
                  <span className="font-heading text-[1.05rem] tracking-tight">
                    {option.de.title}
                  </span>
                  <span className="text-sm leading-relaxed text-muted-foreground">
                    {option.de.body}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-10">
        <SectionIntro
          eyebrow="Was geklärt werden soll"
          title="Fragen zum Memo"
          body="Jedes Thema landet in einem festen Memofeld. Du änderst die Frage und wann eine Antwort reicht — nicht die Felder selbst."
        />

        {INTERVIEW_GROUPS.map((group) => (
          <div key={group.id} className="flex flex-col gap-8">
            <h3 className="font-heading text-xl tracking-tight">{group.de}</h3>
            <div className="flex flex-col gap-10">
              {group.keys.map((key) => {
                const field = INTERVIEW_FIELDS.find((item) => item.key === key);
                if (!field) return null;
                const changed = fieldChanged(script, key, copyLang);
                const index = String(
                  INTERVIEW_FIELDS.findIndex((item) => item.key === key) + 1,
                ).padStart(2, "0");
                return (
                  <article key={key} className="flex flex-col gap-5 border-t pt-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex gap-4">
                        <span className="font-heading text-sm tracking-[0.18em] text-berry">
                          {index}
                        </span>
                        <div className="flex flex-col gap-1">
                          <h4 className="font-heading text-2xl tracking-tight">
                            {field.de}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {field.blurbDe} Landet im Memo als {field.memoDe}.
                          </p>
                        </div>
                      </div>
                      {changed ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => resetField(key)}
                        >
                          Standard
                        </Button>
                      ) : null}
                    </div>
                    <div className="grid gap-5 md:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor={`question-${key}`}>
                          Wonach fragen
                        </FieldLabel>
                        <Textarea
                          id={`question-${key}`}
                          value={script.fields[key].question[copyLang]}
                          onChange={(event) =>
                            setFieldText(key, "question", event.currentTarget.value)
                          }
                          className="min-h-24 text-sm leading-relaxed"
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor={`depth-${key}`}>
                          Wann ist die Antwort genug?
                        </FieldLabel>
                        <Textarea
                          id={`depth-${key}`}
                          value={script.fields[key].depth[copyLang]}
                          onChange={(event) =>
                            setFieldText(key, "depth", event.currentTarget.value)
                          }
                          className="min-h-24 text-sm leading-relaxed"
                        />
                      </Field>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <section className="flex max-w-2xl flex-col gap-8">
        <SectionIntro
          eyebrow="Danach"
          title="Wie das Memo geschrieben wird"
        />
        <Field>
          <FieldLabel htmlFor="summary-guidance">Zusammenfassung</FieldLabel>
          <Textarea
            id="summary-guidance"
            value={script.summaryGuidance[copyLang]}
            onChange={(event) => setLocalized("summaryGuidance", event.currentTarget.value)}
            className="font-serif min-h-24 text-base leading-relaxed"
          />
          <FieldDescription>
            Länge und Ton der Memo-Zusammenfassung. Firmenname und Vorname
            setzt der Agent weiter selbst ein.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="extra-instructions">Zusätzliche Hinweise</FieldLabel>
          <Textarea
            id="extra-instructions"
            value={script.extraInstructions[copyLang]}
            onChange={(event) =>
              setLocalized("extraInstructions", event.currentTarget.value)
            }
            placeholder={
              copyLang === "de"
                ? "z. B. Bei Deep-Tech genauer nach der IP fragen. Social Impact mit ins Memo nehmen, wenn er erwähnt wird."
                : "e.g. Dig into IP on deep tech. If they mention social impact, take it into the memo."
            }
            className="min-h-28 text-sm leading-relaxed"
          />
          <FieldDescription>
            Freie Hinweise für dieses Gespräch. Sie ergänzen den Leitfaden,
            ersetzen ihn nicht — und können keine neuen Memofelder anlegen.
          </FieldDescription>
        </Field>
      </section>

      <div className="sticky bottom-0 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-t bg-background/92 px-6 py-4 backdrop-blur-sm sm:-mx-10 sm:px-10">
        <Button type="button" variant="ghost" onClick={resetScript}>
          Leitfaden zurücksetzen
        </Button>
        <Button type="submit" disabled={!dirty || pending}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          Speichern
        </Button>
      </div>
    </form>
  );
}

function SectionIntro({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="flex max-w-xl flex-col gap-2">
      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
        {eyebrow}
      </p>
      <h2 className="font-heading text-3xl tracking-tight">{title}</h2>
      {body ? (
        <p className="font-serif text-base leading-snug text-muted-foreground">
          {body}
        </p>
      ) : null}
    </div>
  );
}
