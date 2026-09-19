import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { GATE_COOKIE, isValidGateValue } from "~/lib/auth";

export async function requireGate() {
  const jar = await cookies();
  const ok = await isValidGateValue(jar.get(GATE_COOKIE)?.value);
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
