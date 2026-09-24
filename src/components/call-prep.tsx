"use client";

import { useEffect, useState } from "react";
import { CallOrb } from "~/components/call-orb";
import { Button } from "~/components/ui/button";
import { websiteHost, type Caller, type Language } from "~/lib/types";

function stagesFor(caller: Caller, language: Language, agentName: string): string[] {
  const company = caller.company.trim();
  const host = caller.website ? websiteHost(caller.website) : "";
  if (language === "de") {
    return [
      `Schaue kurz nach ${company}…`,
      ...(host ? [`Lese ${host}…`] : []),
      `${agentName} bereitet das Gespräch vor…`,
    ];
  }
  return [
    `Looking up ${company}…`,
    ...(host ? [`Reading ${host}…`] : []),
    `${agentName} is getting ready…`,
  ];
}

export function CallPrep({
  caller,
  language,
  agentName,
  phase = "research",
  onStart,
}: {
  caller: Caller;
  language: Language;
  agentName: string;
  phase?: "research" | "ready" | "connecting" | "saving";
  onStart?: () => void;
}) {
  const stages = stagesFor(caller, language, agentName);
  const [step, setStep] = useState(0);
  const german = language === "de";

  useEffect(() => {
    if (phase !== "research" || stages.length < 2) return;
    const handle = window.setInterval(() => {
      setStep((current) => Math.min(current + 1, stages.length - 1));
    }, 2_400);
    return () => window.clearInterval(handle);
  }, [phase, stages.length]);

  const host = caller.website ? websiteHost(caller.website) : "";
  const status =
    phase === "saving"
      ? german
        ? "Memo wird gespeichert…"
        : "Saving the memo…"
      : phase === "ready"
        ? german
          ? "Bereit für das Gespräch."
          : "Ready for the conversation."
        : phase === "connecting"
          ? german
            ? "Mikrofon wird verbunden…"
            : "Connecting your microphone…"
          : stages[step];

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6">
      <CallOrb mode={phase === "ready" ? "idle" : "thinking"} volume={0} />
      <div className="flex max-w-sm flex-col items-center gap-2 text-center">
        <p className="font-heading text-2xl tracking-tight">{agentName}</p>
        <p key={status} className="text-sm text-muted-foreground">
          {status}
        </p>
        <p className="text-xs tracking-wide text-muted-foreground">
          {caller.company.trim()}
          {host ? ` · ${host}` : ""}
        </p>
      </div>
      {phase === "ready" ? (
        <Button size="lg" onClick={onStart}>
          {german ? "Gespräch beginnen" : "Begin conversation"}
        </Button>
      ) : null}
    </div>
  );
}
