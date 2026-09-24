"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "~/lib/utils";
import { CallerEntry } from "~/components/caller-entry";
import { CallSession } from "~/components/call-session";
import { IntakeEditor } from "~/components/intake-editor";
import { SiteHeader } from "~/components/site-header";
import { Button } from "~/components/ui/button";
import {
  blankIntake,
  callerSchema,
  DEFAULT_SETTINGS,
  type AgentSettings,
  type Caller,
  type Intake,
  type Language,
} from "~/lib/types";

const LANGUAGE_KEY = "htgf-caller-language";

function readStoredLanguage(): Language | null {
  try {
    const value = localStorage.getItem(LANGUAGE_KEY);
    return value === "de" || value === "en" ? value : null;
  } catch {
    return null;
  }
}

function writeStoredLanguage(language: Language) {
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    return;
  }
}

type Phase = "form" | "call" | "done";

export function CallerApp() {
  const [settings, setSettings] = useState<AgentSettings>(DEFAULT_SETTINGS);
  const [language, setLanguage] = useState<Language>(DEFAULT_SETTINGS.language);
  const [phase, setPhase] = useState<Phase>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [caller, setCaller] = useState<Caller | null>(null);
  const [intake, setIntake] = useState<Intake | null>(null);
  const [memoDirty, setMemoDirty] = useState(false);
  const micWarmupRef = useRef<MediaStream | null>(null);

  const releaseMicWarmup = () => {
    micWarmupRef.current?.getTracks().forEach((track) => track.stop());
    micWarmupRef.current = null;
  };

  useEffect(() => {
    const stored = readStoredLanguage();
    if (stored) setLanguage(stored);
  }, []);

  useEffect(() => {
    fetch("/api/settings")
      .then((response) => response.json())
      .then((data: { settings?: AgentSettings }) => {
        if (data.settings) {
          setSettings(data.settings);
          if (!readStoredLanguage()) setLanguage(data.settings.language);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const changeLanguage = (next: Language) => {
    if (phase === "call") return;
    setLanguage(next);
    writeStoredLanguage(next);
  };

  useEffect(() => {
    if (phase !== "done" || !conversationId || intake || memoDirty) return;
    let cancelled = false;
    fetch(`/api/conversations/${conversationId}`)
      .then((response) => response.json())
      .then((data: { intake?: Intake | null }) => {
        if (!cancelled && data.intake) setIntake(data.intake);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [conversationId, intake, memoDirty, phase]);

  useEffect(() => {
    return () => {
      micWarmupRef.current?.getTracks().forEach((track) => track.stop());
      micWarmupRef.current = null;
    };
  }, []);

  const german = language === "de";
  const callerSettings = { ...settings, language };
  const fallbackIntake = useMemo(
    () => blankIntake(caller?.company ?? ""),
    [caller?.company],
  );

  const startCall = async () => {
    setError(null);
    const parsed = callerSchema.safeParse({ name, email, company, website });
    if (!parsed.success) {
      const invalidWebsite = parsed.error.issues.some(
        (issue) => issue.message === "invalid_website",
      );
      setError(
        invalidWebsite
          ? german
            ? "Bitte eine gültige Website angeben, oder das Feld leer lassen."
            : "Enter a valid website, or leave the field empty."
          : german
            ? "Bitte Name, gültige E-Mail und Firma angeben."
            : "Please enter name, a valid email, and company.",
      );
      return;
    }
    setPending(true);
    void navigator.mediaDevices
      .getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      .then(async (stream) => {
        micWarmupRef.current = stream;
        const unlock = new AudioContext({ sampleRate: 24_000 });
        await unlock.resume().catch(() => undefined);
        void unlock.close();
      })
      .catch(() => undefined);
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed.data, language }),
      });
      if (!response.ok) {
        throw new Error(
          german ? "Gespräch konnte nicht gestartet werden." : "Could not start the call.",
        );
      }
      const data = (await response.json()) as { id: string };
      setCaller(parsed.data);
      setConversationId(data.id);
      setPhase("call");
    } catch (err) {
      releaseMicWarmup();
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-1 flex-col px-6 sm:px-10",
        phase === "call"
          ? "h-dvh max-h-dvh min-h-0 max-w-5xl gap-6 overflow-hidden py-6"
          : phase === "form"
            ? "min-h-full max-w-6xl gap-10 py-8"
            : "min-h-full max-w-5xl gap-10 py-8",
      )}
    >
      <SiteHeader
        variant="caller"
        language={language}
        onLanguageChange={changeLanguage}
        languageLocked={phase === "call"}
      />
      {phase === "form" ? (
        <CallerEntry
          settings={callerSettings}
          name={name}
          email={email}
          company={company}
          website={website}
          error={error}
          pending={pending}
          onName={setName}
          onEmail={setEmail}
          onCompany={setCompany}
          onWebsite={setWebsite}
          onSubmit={() => void startCall()}
        />
      ) : null}

      {phase === "call" && conversationId && caller ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <CallSession
            conversationId={conversationId}
            caller={caller}
            language={language}
            agentName={settings.agentName}
            onMicReady={releaseMicWarmup}
            onEnded={(result) => {
              releaseMicWarmup();
              setIntake(result);
              setPhase("done");
            }}
          />
        </div>
      ) : null}

      {phase === "done" && caller ? (
        <div className="flex flex-1 flex-col gap-10 pb-16">
          {!intake ? (
            <p className="font-serif max-w-xl text-lg leading-snug text-muted-foreground">
              {german
                ? "Das Gespräch ist gespeichert. Der Agent hat noch kein Memo hinterlegt — tippe auf Memo bearbeiten, um die Felder selbst auszufüllen."
                : "The call is saved. The agent has not filed a memo yet — tap Edit memo to fill in the fields yourself."}
            </p>
          ) : null}
          {conversationId ? (
            <section className="rounded-[2rem] bg-card px-7 py-8 sm:px-10">
              <IntakeEditor
                conversationId={conversationId}
                initial={intake ?? fallbackIntake}
                language={language}
                onSaved={setIntake}
                onDirtyChange={setMemoDirty}
              />
            </section>
          ) : null}
          <div>
            <Button
              variant="outline"
              onClick={() => {
                if (
                  memoDirty &&
                  !window.confirm(
                    german
                      ? "Nicht gespeicherte Korrekturen gehen verloren. Trotzdem fortfahren?"
                      : "Unsaved corrections will be lost. Continue anyway?",
                  )
                ) {
                  return;
                }
                setPhase("form");
                setConversationId(null);
                setCaller(null);
                setWebsite("");
                setIntake(null);
                setMemoDirty(false);
              }}
            >
              {german ? "Weiteres Gespräch" : "Another conversation"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
