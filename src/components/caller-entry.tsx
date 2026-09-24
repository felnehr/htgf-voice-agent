"use client";

import { Button } from "~/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import type { AgentSettings } from "~/lib/types";

const PREP = {
  de: [
    {
      label: "Team",
      hint: "Wer gründet mit, welche Rollen, relevante Vorerfahrung.",
    },
    {
      label: "Produkt",
      hint: "Was ihr baut — und ob es Idee, MVP oder live ist.",
    },
    {
      label: "Traktion",
      hint: "Nutzer, Umsatz, Piloten. Schätzungen reichen.",
    },
    {
      label: "Markt",
      hint: "Für wen das ist, und wer sonst im Raum steht.",
    },
    {
      label: "Runde",
      hint: "Wie viel ihr braucht, Pre-Seed bis Series A, wofür das Geld.",
    },
  ],
  en: [
    {
      label: "Team",
      hint: "Who is founding, roles, relevant background.",
    },
    {
      label: "Product",
      hint: "What you build — and whether it is idea, MVP, or live.",
    },
    {
      label: "Traction",
      hint: "Users, revenue, pilots. Approximations are fine.",
    },
    {
      label: "Market",
      hint: "Who you sell to, and who else is in the room.",
    },
    {
      label: "Round",
      hint: "How much, Pre-Seed to Series A, and what the money is for.",
    },
  ],
} as const;

function stepsFor(agentName: string, german: boolean) {
  return german
    ? [
        {
          label: "Mikrofon",
          hint: "Der Browser fragt gleich danach. Ohne Mikro kein Gespräch.",
        },
        {
          label: "Gespräch",
          hint: `Frei erzählen. ${agentName} stellt eine Frage nach der anderen.`,
        },
        {
          label: "Memo",
          hint: "Am Ende siehst du die Angaben und kannst korrigieren.",
        },
      ]
    : [
        {
          label: "Microphone",
          hint: "The browser will ask for it. No mic, no call.",
        },
        {
          label: "Conversation",
          hint: `Speak freely. ${agentName} asks one question at a time.`,
        },
        {
          label: "Memo",
          hint: "Afterwards you see the notes and can correct them.",
        },
      ];
}

export function CallerEntry({
  settings,
  name,
  email,
  company,
  website,
  error,
  pending,
  onName,
  onEmail,
  onCompany,
  onWebsite,
  onSubmit,
}: {
  settings: AgentSettings;
  name: string;
  email: string;
  company: string;
  website: string;
  error: string | null;
  pending: boolean;
  onName: (value: string) => void;
  onEmail: (value: string) => void;
  onCompany: (value: string) => void;
  onWebsite: (value: string) => void;
  onSubmit: () => void;
}) {
  const german = settings.language === "de";
  const copy = german ? "de" : "en";
  const steps = stepsFor(settings.agentName, german);

  return (
    <div className="grid flex-1 items-start gap-12 pb-16 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)] lg:gap-16">
      <div className="flex flex-col gap-12">
        <div className="flex max-w-xl flex-col gap-5">
          <p className="text-sm font-medium text-muted-foreground">
            {german ? "Erstgespräch" : "First conversation"}
          </p>
          <h1 className="font-heading text-[clamp(2.25rem,5vw,3.35rem)] leading-[1.04] tracking-tight text-pretty">
            {german
              ? `${settings.agentName} führt das Gespräch. Du erzählst.`
              : `${settings.agentName} runs the conversation. You talk.`}
          </h1>
          <p className="font-serif max-w-lg text-lg leading-snug text-muted-foreground">
            {german
              ? `Gesprochenes Erstgespräch im Browser, fünf bis zehn Minuten. Keine Folien. Hab ein paar Fakten bereit — ${settings.agentName} legt daraus ein Memo an.`
              : `A spoken first meeting in the browser, five to ten minutes. No slides. Have a few facts ready — ${settings.agentName} files them as a memo.`}
          </p>
        </div>

        <section className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
              <h2 className="font-heading text-xl tracking-tight">
                {german ? "Nimm das mit ins Gespräch" : "Bring this to the call"}
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                {german
                  ? "Ungefähre Zahlen reichen. Wenn etwas fehlt, sag es einfach."
                  : "Rough numbers are enough. If something is missing, just say so."}
              </p>
            </div>
            <dl className="max-w-lg">
              {PREP[copy].map((topic) => (
                <div
                  key={topic.label}
                  className="flex flex-col gap-1 border-t py-4"
                >
                  <dt className="text-[0.7rem] tracking-[0.16em] text-muted-foreground uppercase">
                    {topic.label}
                  </dt>
                  <dd className="text-[0.95rem] leading-relaxed text-pretty">
                    {topic.hint}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-xl tracking-tight">
              {german ? "So läuft es" : "How it works"}
            </h2>
            <ol className="flex flex-col gap-4">
              {steps.map((step, index) => (
                <li key={step.label} className="flex gap-4">
                  <span className="font-heading w-6 shrink-0 text-sm text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium">{step.label}</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {step.hint}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
      </div>

        <form
          className="flex flex-col gap-6 rounded-[2rem] bg-card p-7 lg:sticky lg:top-8"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="flex flex-col gap-1">
            <p className="text-[0.7rem] tracking-[0.16em] text-muted-foreground uppercase">
              {german ? "Loslegen" : "Start"}
            </p>
            <p className="font-heading text-xl tracking-tight">
              {german ? "Wer spricht?" : "Who is speaking?"}
            </p>
          </div>
          <FieldGroup>
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="caller-name">
                {german ? "Name" : "Name"}
              </FieldLabel>
              <Input
                id="caller-name"
                value={name}
                onChange={(event) => onName(event.currentTarget.value)}
                autoComplete="name"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="caller-email">E-Mail</FieldLabel>
              <Input
                id="caller-email"
                type="email"
                value={email}
                onChange={(event) => onEmail(event.currentTarget.value)}
                autoComplete="email"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="caller-company">
                {german ? "Firma" : "Company"}
              </FieldLabel>
              <Input
                id="caller-company"
                value={company}
                onChange={(event) => onCompany(event.currentTarget.value)}
                autoComplete="organization"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="caller-website">
                {german ? "Website" : "Website"}
              </FieldLabel>
              <Input
                id="caller-website"
                type="text"
                inputMode="url"
                value={website}
                onChange={(event) => onWebsite(event.currentTarget.value)}
                autoComplete="url"
                placeholder="https://"
              />
              <FieldDescription>
                {german
                  ? `Optional. ${settings.agentName} liest die Seite vor dem Gespräch.`
                  : `Optional. ${settings.agentName} reads the page before the call.`}
              </FieldDescription>
            </Field>
          </FieldGroup>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex flex-col gap-3">
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {german ? "Gespräch starten" : "Start conversation"}
            </Button>
            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              {german
                ? "Als Nächstes fragt der Browser nach dem Mikrofon."
                : "Next, the browser will ask for the microphone."}
            </p>
          </div>
        </form>
    </div>
  );
}
