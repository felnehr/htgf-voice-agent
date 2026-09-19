"use client";

import { useEffect, useRef, useState } from "react";
import {
  AgentProvider,
  useAgentClientTool,
  useAgentConversation,
  useAgentMicrophone,
  useAgentMode,
  useAgentPlayer,
  useAgentState,
  type AgentSettingsObject,
  type ConversationEntry,
} from "@deepgram/react";
import { MicIcon, MicOffIcon, PhoneOffIcon } from "lucide-react";
import { toast } from "sonner";
import { CallOrb } from "~/components/call-orb";
import { CallPrep } from "~/components/call-prep";
import {
  CALL_START_CUE,
  CallTranscript,
  liveTurns,
} from "~/components/call-transcript";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { firstName } from "~/lib/names";
import { intakeSchema, type Caller, type Intake, type Language } from "~/lib/types";

function lastAssistantText(conversation: ConversationEntry[]): string {
  const turns = liveTurns(conversation);
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i];
    if (turn?.role === "assistant") return turn.content;
  }
  return "";
}

function isClosingThanks(text: string): boolean {
  return /(danke für das gespräch|ich habe die angaben|recorded your details|thanks for the (call|conversation))/i.test(
    text,
  );
}

function isOpenClosingTurn(text: string): boolean {
  const spoken = text.trim();
  if (!spoken) return false;
  if (isClosingThanks(spoken)) return false;
  if (/[?？]\s*$/.test(spoken)) return true;
  return /(jetzt gern|now is the moment|anything else|noch etwas sagen|möchtest|want to (add|tell)|ergänz|was ich brauche|what i need|habe.*was ich brauche)/i.test(
    spoken,
  );
}

const MODE_LABEL: Record<Language, Record<string, string>> = {
  de: {
    idle: "Bereit",
    listening: "Hört zu",
    thinking: "Einen Moment…",
    speaking: "Spricht",
  },
  en: {
    idle: "Ready",
    listening: "Listening",
    thinking: "One moment…",
    speaking: "Speaking",
  },
};

export function CallSession({
  conversationId,
  caller,
  language,
  agentName,
  onEnded,
  onMicReady,
}: {
  conversationId: string;
  caller: Caller;
  language: Language;
  agentName: string;
  onEnded: (intake: Intake | null) => void;
  onMicReady?: () => void;
}) {
  const [agent, setAgent] = useState<NonNullable<AgentSettingsObject> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const prepMicRef = useRef<MediaStream | null>(null);

  const releasePrepMic = () => {
    prepMicRef.current?.getTracks().forEach((track) => track.stop());
    prepMicRef.current = null;
    onMicReady?.();
  };

  const tokenError = (detail?: string) => {
    if (detail === "Insufficient permissions.") {
      return language === "de"
        ? "Deepgram-Key darf kein Voice-Agent-Token erzeugen. Lege in der Deepgram Console einen Key mit Rolle Member oder höher an."
        : "This Deepgram key cannot mint a Voice Agent token. Create a Member-or-higher key in the Deepgram console.";
    }
    return (
      detail ||
      (language === "de" ? "Deepgram-Token fehlgeschlagen" : "Deepgram token failed")
    );
  };

  useEffect(() => {
    void navigator.mediaDevices
      .getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      .then((stream) => {
        prepMicRef.current = stream;
      })
      .catch(() => {
        setMicError(
          language === "de"
            ? "Mikrofonzugriff wird benötigt."
            : "Microphone access is required.",
        );
      });
    return () => {
      prepMicRef.current?.getTracks().forEach((track) => track.stop());
      prepMicRef.current = null;
    };
  }, [language]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/conversations/${conversationId}/agent-config`)
      .then(async (response) => {
        const data = (await response.json().catch(() => null)) as {
          agent?: NonNullable<AgentSettingsObject>;
          error?: string;
        } | null;
        if (!response.ok || !data?.agent) {
          throw new Error(
            data?.error ||
              (language === "de"
                ? "Agent-Konfiguration fehlgeschlagen"
                : "Could not load the agent"),
          );
        }
        if (!cancelled) setAgent(data.agent);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId, language]);

  if (error || micError) {
    return (
      <div className="flex max-w-lg flex-col gap-3">
        <p className="text-destructive">{error || micError}</p>
        <p className="text-sm text-muted-foreground">
          {language === "de"
            ? "Für die Stimme: ELEVENLABS_API_KEY in .env.local setzen, Dev-Server neu starten, dann ein neues Gespräch beginnen."
            : "For the voice: set ELEVENLABS_API_KEY in .env.local, restart the dev server, then start a new conversation."}
        </p>
      </div>
    );
  }

  if (!agent) {
    return (
      <CallPrep caller={caller} language={language} agentName={agentName} />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
    <AgentProvider
      key={conversationId}
      config={{
        auth: {
          tokenFactory: async () => {
            const response = await fetch("/api/deepgram-token");
            if (!response.ok) {
              const data = (await response.json().catch(() => null)) as {
                error?: string;
              } | null;
              throw new Error(tokenError(data?.error));
            }
            return response.text();
          },
        },
        audio: {
          input: { encoding: "linear16", sampleRate: 16_000 },
          output: { encoding: "linear16", sampleRate: 24_000 },
        },
        agent,
        tags: ["htgf", "first-call"],
      }}
      playerSampleRate={24_000}
      microphoneOptions={{
        sampleRate: 16_000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }}
      onError={(message) => {
        const text =
          message.code === "FAILED_TO_SPEAK"
            ? language === "de"
              ? "Die Stimme ist ausgefallen. Bitte neu verbinden."
              : "The voice failed. Please reconnect."
            : tokenError(message.description);
        setConnectError(text);
        toast.error(text);
      }}
      onWarning={(message) => {
        if (message.code !== "SPEAK_REQUEST_FAILED") return;
        toast.warning(
          language === "de"
            ? message.description || "Die Stimme wurde abgelehnt."
            : message.description || "The voice was rejected.",
        );
      }}
      onSdkError={(err) => {
        const text = tokenError(err.message);
        setConnectError(text);
        toast.error(text);
      }}
      onLatencyReport={(report) => {
        if (typeof report.total_latency === "number") {
          setLatency(report.total_latency);
        }
      }}
    >
      <CallRoom
        conversationId={conversationId}
        caller={caller}
        language={language}
        agentName={agentName}
        latency={latency}
        connectError={connectError}
        onClearConnectError={() => setConnectError(null)}
        onEnded={onEnded}
        onMicReady={releasePrepMic}
      />
    </AgentProvider>
    </div>
  );
}

function CallRoom({
  conversationId,
  caller,
  language,
  agentName,
  latency,
  connectError,
  onClearConnectError,
  onEnded,
  onMicReady,
}: {
  conversationId: string;
  caller: Caller;
  language: Language;
  agentName: string;
  latency: number | null;
  connectError: string | null;
  onClearConnectError: () => void;
  onEnded: (intake: Intake | null) => void;
  onMicReady?: () => void;
}) {
  const { start, stop, isConnecting, isConnected } = useAgentState();
  const { mode } = useAgentMode();
  const { conversation, sendUserMessage } = useAgentConversation();
  const { micActive, micMuted, setMicMuted, getInputVolume } = useAgentMicrophone();
  const { getOutputVolume } = useAgentPlayer();
  const [volume, setVolume] = useState(0);
  const [ending, setEnding] = useState(false);
  const [wrapUp, setWrapUp] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [userMuted, setUserMuted] = useState(false);
  const intakeRef = useRef<Intake | null>(null);
  const endingRef = useRef(false);
  const heardClosingRef = useRef(false);
  const kickedOffRef = useRef(false);

  useAgentClientTool("save_intake", async (fn) => {
    const parsed = intakeSchema.safeParse(JSON.parse(fn.arguments || "{}"));
    if (!parsed.success) {
      return JSON.stringify({ ok: false, error: "invalid_intake" });
    }
    const response = await fetch(`/api/conversations/${conversationId}/intake`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    if (!response.ok) {
      return JSON.stringify({ ok: false });
    }
    const body = (await response.json()) as { intake?: Intake };
    intakeRef.current = body.intake ?? parsed.data;
    setWrapUp(true);
    return JSON.stringify({ ok: true });
  });

  useAgentClientTool("search_web", async (fn) => {
    const args = JSON.parse(fn.arguments || "{}") as { query?: string };
    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: args.query ?? caller.company }),
    });
    return JSON.stringify(await response.json());
  });

  const connect = () => {
    setStartError(null);
    onClearConnectError();
    start().catch((err: Error) => {
      const message = err.message || "Deepgram-Verbindung fehlgeschlagen";
      setStartError(message);
      toast.error(message);
    });
  };

  useEffect(() => {
    connect();
    return () => stop();
    // Connect once the provider is ready. start/stop identities are stable enough
    // that we only want the mount/unmount cycle, not a restart loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount start
  }, []);

  useEffect(() => {
    if (micActive) onMicReady?.();
  }, [micActive, onMicReady]);

  useEffect(() => {
    if (!isConnected || kickedOffRef.current) return;
    kickedOffRef.current = true;
    sendUserMessage(CALL_START_CUE);
  }, [isConnected, sendUserMessage]);

  useEffect(() => {
    setMicMuted(userMuted || mode === "speaking");
  }, [mode, setMicMuted, userMuted]);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const next = mode === "speaking" ? getOutputVolume() : getInputVolume();
      setVolume(next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [getInputVolume, getOutputVolume, mode]);

  const persistTurns = (turns: ReturnType<typeof liveTurns>) => {
    if (turns.length === 0) return;
    void fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: turns.map((entry) => ({
          id: entry.id,
          role: entry.role,
          content: entry.content,
          createdAt: new Date(entry.timestamp).toISOString(),
        })),
      }),
    });
  };

  useEffect(() => {
    const turns = liveTurns(conversation);
    if (turns.length === 0) return;
    if (!isConnected && conversation.length === 0) return;
    const handle = window.setTimeout(() => persistTurns(turns), 400);
    return () => window.clearTimeout(handle);
  }, [conversation, conversationId, isConnected]);

  const hangUp = async (result?: Intake | null) => {
    if (endingRef.current) return;
    endingRef.current = true;
    setEnding(true);
    persistTurns(liveTurns(conversation));
    stop();
    await fetch(`/api/conversations/${conversationId}/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ totalLatencySeconds: latency }),
    });
    onEnded(result !== undefined ? result : intakeRef.current);
  };

  useEffect(() => {
    if (!wrapUp) return;
    persistTurns(liveTurns(conversation));

    if (mode === "thinking" || mode === "speaking") {
      if (mode === "speaking") heardClosingRef.current = true;
      return;
    }

    const last = lastAssistantText(conversation);
    if (isOpenClosingTurn(last)) {
      setUserMuted(false);
      return;
    }

    setUserMuted(true);
    const closingDone =
      heardClosingRef.current && (mode === "listening" || mode === "idle");
    const delay = closingDone ? 900 : heardClosingRef.current ? 9000 : 12_000;
    const handle = window.setTimeout(() => {
      persistTurns(liveTurns(conversation));
      void hangUp(intakeRef.current);
    }, delay);
    return () => window.clearTimeout(handle);
    // hangUp closes over latest latency/stop; wrap-up should track speech and last turn.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional wrap-up watcher
  }, [wrapUp, mode, conversation]);

  const labels = MODE_LABEL[language];
  const callReady =
    micActive || mode === "speaking" || Boolean(startError || connectError);

  if (!callReady) {
    return <CallPrep caller={caller} language={language} agentName={agentName} />;
  }

  return (
    <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-6 overflow-hidden lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:grid-rows-1 lg:gap-8">
      <div className="flex min-h-0 shrink-0 flex-col items-center justify-center gap-5 py-1 lg:min-h-0 lg:gap-6 lg:py-2">
        <CallOrb mode={mode} volume={volume} />
        <div className="flex flex-col items-center gap-1">
          <p className="font-heading text-2xl tracking-tight">{agentName}</p>
          <p className="text-sm text-muted-foreground">
            {startError || connectError
              ? language === "de"
                ? "Nicht verbunden"
                : "Not connected"
              : isConnecting
                ? language === "de"
                  ? "Mikrofon wird verbunden…"
                  : "Connecting your microphone…"
                : labels[mode]}
          </p>
          {startError || connectError ? (
            <p className="max-w-sm text-center text-sm text-destructive">
              {startError || connectError}
            </p>
          ) : null}
          {latency != null ? (
            <p className="text-xs tracking-wide text-muted-foreground">
              {language === "de" ? "Antwort in" : "Reply in"} {latency.toFixed(2)}s
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {startError || connectError ? (
            <Button variant="outline" onClick={connect}>
              {language === "de" ? "Erneut verbinden" : "Reconnect"}
            </Button>
          ) : null}
          <Button
            variant="outline"
            onClick={() => setUserMuted((muted) => !muted)}
            disabled={!isConnected}
          >
            {userMuted || micMuted ? (
              <MicOffIcon data-icon="inline-start" />
            ) : (
              <MicIcon data-icon="inline-start" />
            )}
            {userMuted
              ? language === "de"
                ? "Stumm"
                : "Muted"
              : language === "de"
                ? "Mikro"
                : "Mic"}
          </Button>
          <Button
            variant="destructive"
            onClick={() => void hangUp()}
            disabled={ending}
          >
            {ending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <PhoneOffIcon data-icon="inline-start" />
            )}
            {language === "de" ? "Auflegen" : "Hang up"}
          </Button>
        </div>
      </div>
      <div className="relative min-h-0 min-w-0">
        <CallTranscript
          className="absolute inset-0"
          conversation={conversation}
          callerName={firstName(caller.name)}
          agentName={agentName}
          language={language}
        />
      </div>
    </div>
  );
}
