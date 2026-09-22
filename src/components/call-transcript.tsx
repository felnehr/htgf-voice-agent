"use client";

import { useEffect, useRef, useState } from "react";
import type { ConversationEntry } from "@deepgram/react";
import { canonicalizeTranscriptText } from "~/lib/intake";
import { cn } from "~/lib/utils";
import type { Language } from "~/lib/types";

export function coalesceTurns(entries: ConversationEntry[]): ConversationEntry[] {
  const merged: ConversationEntry[] = [];
  for (const entry of entries) {
    const last = merged[merged.length - 1];
    if (last && last.role === entry.role) {
      last.content = `${last.content} ${entry.content}`.replace(/\s+/g, " ").trim();
      last.timestamp = entry.timestamp;
      continue;
    }
    merged.push({ ...entry });
  }
  return merged;
}

export const CALL_START_CUE = "[[call_start]]";

export function liveTurns(entries: ConversationEntry[]): ConversationEntry[] {
  return coalesceTurns(
    entries.filter((entry) => entry.content.trim() !== CALL_START_CUE),
  ).map((entry) => ({
    ...entry,
    content: canonicalizeTranscriptText(entry.content),
  }));
}

export function CallTranscript({
  conversation,
  callerName,
  agentName,
  language,
  className,
}: {
  conversation: ConversationEntry[];
  callerName: string;
  agentName: string;
  language: Language;
  className?: string;
}) {
  const turns = liveTurns(conversation);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  const syncScrollState = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setPinned(distance < 56);
    setScrolled(el.scrollTop > 8);
  };

  useEffect(() => {
    if (!pinned) return;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, pinned]);

  const jumpToLatest = () => {
    setPinned(true);
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] bg-card",
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-10 h-10 bg-linear-to-b from-card to-transparent transition-opacity",
          scrolled ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        ref={scrollerRef}
        onScroll={syncScrollState}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 [scrollbar-width:thin]"
      >
        <ol className="flex flex-col gap-5">
          {turns.length === 0 ? (
            <li className="text-sm text-muted-foreground">
              {language === "de"
                ? "Sobald du sprichst, erscheint das Gespräch hier."
                : "The conversation appears here as soon as you speak."}
            </li>
          ) : (
            turns.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-1">
                <span className="text-[0.7rem] tracking-[0.16em] text-muted-foreground uppercase">
                  {entry.role === "user" ? callerName : agentName}
                </span>
                <p className="text-[0.95rem] leading-relaxed text-pretty">
                  {entry.content}
                </p>
              </li>
            ))
          )}
        </ol>
        <div ref={endRef} className="h-px" />
      </div>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 bg-linear-to-t from-card to-transparent transition-opacity",
          pinned ? "opacity-0" : "opacity-100",
        )}
      />
      {!pinned && turns.length > 0 ? (
        <button
          type="button"
          onClick={jumpToLatest}
          className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 cursor-pointer rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium tracking-wide text-primary-foreground"
        >
          {language === "de" ? "Zum neuesten" : "Jump to latest"}
        </button>
      ) : null}
    </div>
  );
}
