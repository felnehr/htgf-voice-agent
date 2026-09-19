export class ElevenLabsConfigError extends Error {
  constructor(
    message: string,
    readonly code:
      | "missing_key"
      | "list_failed"
      | "voice_missing"
      | "voice_unusable" = "missing_key",
  ) {
    super(message);
    this.name = "ElevenLabsConfigError";
  }
}

const MODEL_ID = "eleven_turbo_v2_5" as const;
const PREMADE_FALLBACKS = ["bella", "sarah", "alice", "jessica", "lily"];

type Voice = {
  voice_id: string;
  name: string;
  category?: string;
};

type ResolvedVoice = {
  apiKey: string;
  voiceId: string;
  voiceName: string;
};

let cachedVoice: ResolvedVoice | undefined;

function requireApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) {
    throw new ElevenLabsConfigError(
      "ELEVENLABS_API_KEY is not set. Add it to .env.local to use ElevenLabs.",
      "missing_key",
    );
  }
  return key;
}

function scoreVoice(voice: Voice, wanted: string): number {
  const name = voice.name.toLowerCase().trim();
  let score = 0;
  if (name === wanted) score = 3;
  else if (
    name.startsWith(wanted) ||
    name.startsWith(`${wanted} `) ||
    name.startsWith(`${wanted}-`)
  ) {
    score = 2;
  } else if (name.includes(wanted)) score = 1;
  if (score > 0 && voice.category === "premade") score += 0.5;
  return score;
}

async function listVoices(apiKey: string): Promise<Voice[]> {
  const response = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": apiKey },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new ElevenLabsConfigError(
      "Could not list ElevenLabs voices. Check ELEVENLABS_API_KEY.",
      "list_failed",
    );
  }
  const data = (await response.json()) as { voices?: Voice[] };
  return data.voices ?? [];
}

function pickNamedVoice(voices: Voice[], wanted: string): Voice | undefined {
  const ranked = voices
    .map((voice) => ({ voice, score: scoreVoice(voice, wanted) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.voice;
}

function pickPremadeFallback(voices: Voice[]): Voice | undefined {
  const premade = voices.filter((voice) => voice.category === "premade");
  for (const name of PREMADE_FALLBACKS) {
    const match = premade.find((voice) => voice.name.toLowerCase().startsWith(name));
    if (match) return match;
  }
  return premade[0];
}

export async function resolveElevenLabsVoice(): Promise<ResolvedVoice> {
  if (cachedVoice) return cachedVoice;

  const apiKey = requireApiKey();
  const voices = await listVoices(apiKey);
  const fromEnv = process.env.ELEVENLABS_VOICE_ID?.trim();
  const wanted = process.env.ELEVENLABS_VOICE_NAME?.trim();
  const named = wanted ? pickNamedVoice(voices, wanted.toLowerCase()) : undefined;
  const chosen = fromEnv
    ? (voices.find((voice) => voice.voice_id === fromEnv) ?? {
        voice_id: fromEnv,
        name: wanted || "ElevenLabs",
      })
    : named?.category === "premade"
      ? named
      : pickPremadeFallback(voices);

  if (!chosen) {
    throw new ElevenLabsConfigError(
      "No free ElevenLabs premade voice is available on this account. Set ELEVENLABS_VOICE_ID to a premade voice.",
      "voice_missing",
    );
  }

  cachedVoice = {
    apiKey,
    voiceId: chosen.voice_id,
    voiceName: chosen.name,
  };
  return cachedVoice;
}

export function buildElevenLabsSpeak(
  voiceId: string,
  apiKey: string,
  language: "de" | "en",
) {
  const languageCode = language === "de" ? "de" : "en";
  return {
    provider: {
      type: "eleven_labs" as const,
      model_id: MODEL_ID,
      language_code: language === "de" ? "de" : "en-US",
    },
    endpoint: {
      url: `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/multi-stream-input?language_code=${languageCode}`,
      headers: {
        "xi-api-key": apiKey,
      },
    },
  };
}

export function buildAuraSpeak(language: "de" | "en") {
  return {
    provider: {
      type: "deepgram" as const,
      model: language === "de" ? "aura-2-elara-de" : "aura-2-orpheus-en",
    },
  };
}
