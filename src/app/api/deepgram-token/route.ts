import { NextResponse } from "next/server";
import { requireGate } from "~/lib/require-gate";

export async function GET() {
  const denied = await requireGate();
  if (denied) return denied;

  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "DEEPGRAM_API_KEY is not set" },
      { status: 500 },
    );
  }

  const upstream = await fetch("https://api.deepgram.com/v1/auth/grant", {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ttl_seconds: 60 }),
  });

  const data = (await upstream.json()) as { access_token?: string; err_msg?: string };
  if (!upstream.ok || !data.access_token) {
    const detail = data.err_msg || "Could not mint Deepgram token";
    return NextResponse.json(
      {
        error: detail,
        hint:
          detail.toLowerCase().includes("permission")
            ? "The key needs Member-or-higher access so /v1/auth/grant can mint a Voice Agent token."
            : undefined,
      },
      { status: 502 },
    );
  }

  return new NextResponse(data.access_token, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "no-store",
    },
  });
}
