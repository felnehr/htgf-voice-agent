# Erstgespräch

Web-based voice agent for a first conversation with a founder. The caller speaks in the browser; the agent interviews until it can store a structured memo.

## What it is

Two surfaces, one demo PIN:

- **Caller** (`/`) — name, email, company, then a live call
- **Admin** (`/admin`) — conversation history, transcript, intake memo, settings

The voice plane is [Deepgram Voice Agent](https://developers.deepgram.com/docs/voice-agent) in the browser, with [ElevenLabs](https://elevenlabs.io) (Emma) for speech. Next.js mints a short-lived Deepgram token and owns UI, PIN, persistence, and tools. Audio does not pass through Vercel.

## Stack

- Next.js App Router, Tailwind, shadcn
- Deepgram Agent (`@deepgram/react`) — STT, turn-taking, Claude Haiku via Deepgram
- ElevenLabs Turbo 2.5 — Emma’s voice (German + English)
- Drizzle + libSQL (SQLite file locally, Turso on Vercel)
- Tavily for a pre-call company lookup and optional `search_web`

LiveKit is intentionally not used. A second worker would slow the weekend down without helping the interview product.

## Setup

```bash
cp .env.example .env.local
# set DEMO_PIN, DEEPGRAM_API_KEY, and ELEVENLABS_API_KEY
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Default PIN is `htgf` if `DEMO_PIN` is unset.

You need:

- A Deepgram key with access to the Voice Agent API and Member-or-higher permission so `/v1/auth/grant` works
- An ElevenLabs key, with the **Emma** voice available on that account (My Voices, or set `ELEVENLABS_VOICE_ID`)

Optional:

- `TAVILY_API_KEY` — company lookup before the call, and `search_web` during it
- `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` — durable history on Vercel
- `ELEVENLABS_VOICE_ID` / `ELEVENLABS_VOICE_NAME` — if Emma is not the name on the account

## Settings

In Admin → Einstellungen:

- Agent name (default Emma, to match the voice)
- Language (`de` / `en`)
- Tone (`warm` / `direct`)

They apply to the **next** call. The spoken voice stays Emma.

## Deploy

Vercel-only. Set the same env vars in the project.

Without Turso, SQLite writes go to `/tmp` on Vercel and will not survive cold starts. For a durable demo, create a Turso database and paste the URL and token.

## Tradeoffs

- LLM is Deepgram-managed Anthropic (`claude-haiku-4-5`). Putting your own Anthropic key in the browser Settings message would leak it.
- ElevenLabs TTS is wired through Deepgram’s speak endpoint. The ElevenLabs API key is included in the Voice Agent Settings payload, so it is visible to a signed-in demo client. Use a dedicated ElevenLabs key.
- History is SQLite. That is enough for the challenge; swap the connection string for Turso when you need it to last.
