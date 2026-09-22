"use client";

import { useState } from "react";
import { IntakeCard } from "~/components/intake-card";
import { MemoExportButton } from "~/components/memo-export-button";
import { Button } from "~/components/ui/button";
import { canonicalizeTranscriptText } from "~/lib/intake";
import type { Intake, Language } from "~/lib/types";
import { cn } from "~/lib/utils";

type TranscriptMessage = {
  id: string;
  role: string;
  content: string;
};

export function ConversationRecord({
  conversationId,
  company,
  callerName,
  callerEmail,
  agentName,
  when,
  language,
  intake,
  messages,
}: {
  conversationId: string;
  company: string;
  callerName: string;
  callerEmail: string;
  agentName: string;
  when: string;
  language: Language;
  intake?: Intake;
  messages: TranscriptMessage[];
}) {
  const [tab, setTab] = useState<"memo" | "transcript">("memo");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-x-8 lg:gap-y-3">
        <h1 className="font-heading order-1 min-w-0 text-4xl tracking-tight lg:flex-1">
          {company}
        </h1>
        <div className="order-2 flex w-full flex-col gap-1 lg:order-3">
          <p className="text-muted-foreground">
            {callerName} · {callerEmail}
          </p>
          <p className="text-sm text-muted-foreground">{when}</p>
        </div>
        <div
          role="tablist"
          aria-label="Gespräch"
          className="order-3 grid w-full max-w-md grid-cols-2 gap-1 rounded-full bg-muted p-1 lg:order-2 lg:w-80 lg:shrink-0"
        >
          <Button
            type="button"
            role="tab"
            id="conversation-tab-memo"
            aria-controls="conversation-panel-memo"
            aria-selected={tab === "memo"}
            size="lg"
            variant={tab === "memo" ? "default" : "ghost"}
            className="w-full"
            onClick={() => setTab("memo")}
          >
            Memo
          </Button>
          <Button
            type="button"
            role="tab"
            id="conversation-tab-transcript"
            aria-controls="conversation-panel-transcript"
            aria-selected={tab === "transcript"}
            size="lg"
            variant={tab === "transcript" ? "default" : "ghost"}
            className="w-full"
            onClick={() => setTab("transcript")}
          >
            Transkript
          </Button>
        </div>
      </div>

      <section
        id="conversation-panel-transcript"
        role="tabpanel"
        aria-labelledby="conversation-tab-transcript"
        hidden={tab !== "transcript"}
        className={cn("flex-col gap-5", tab === "transcript" ? "flex" : "hidden")}
      >
        <TranscriptList
          callerName={callerName}
          agentName={agentName}
          messages={messages}
        />
      </section>

      <section
        id="conversation-panel-memo"
        role="tabpanel"
        aria-labelledby="conversation-tab-memo"
        hidden={tab !== "memo"}
        className={cn("flex-col gap-5", tab === "memo" ? "flex" : "hidden")}
      >
        {intake ? (
          <IntakeCard
            intake={intake}
            language={language}
            action={<MemoExportButton conversationId={conversationId} />}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Der Agent hat noch kein Memo gespeichert.
          </p>
        )}
      </section>
    </div>
  );
}

function TranscriptList({
  callerName,
  agentName,
  messages,
}: {
  callerName: string;
  agentName: string;
  messages: TranscriptMessage[];
}) {
  if (messages.length === 0) {
    return <p className="text-sm text-muted-foreground">Noch kein Transkript.</p>;
  }

  return (
    <ol className="flex flex-col gap-5">
      {messages.map((row) => (
        <li key={row.id} className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            {row.role === "user" ? callerName : agentName}
          </span>
          <p className="text-[0.95rem] leading-relaxed">
            {canonicalizeTranscriptText(row.content)}
          </p>
        </li>
      ))}
    </ol>
  );
}
