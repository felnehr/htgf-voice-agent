"use client";

import { useEffect, useState } from "react";
import { CallOrb } from "~/components/call-orb";
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
}: {
  caller: Caller;
  language: Language;
  agentName: string;
}) {
  const stages = stagesFor(caller, language, agentName);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (stages.length < 2) return;
    const handle = window.setInterval(() => {
      setStep((current) => Math.min(current + 1, stages.length - 1));
    }, 2_400);
    return () => window.clearInterval(handle);
  }, [stages.length]);

  const host = caller.website ? websiteHost(caller.website) : "";

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6">
      <CallOrb mode="thinking" volume={0} />
      <div className="flex max-w-sm flex-col items-center gap-2 text-center">
        <p className="font-heading text-2xl tracking-tight">{agentName}</p>
        <p key={stages[step]} className="text-sm text-muted-foreground">
          {stages[step]}
        </p>
        <p className="text-xs tracking-wide text-muted-foreground">
          {caller.company.trim()}
          {host ? ` · ${host}` : ""}
        </p>
      </div>
    </div>
  );
}
