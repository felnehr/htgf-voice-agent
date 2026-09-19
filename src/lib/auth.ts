export const GATE_COOKIE = "htgf_gate";

function pin(): string {
  return process.env.DEMO_PIN?.trim() || "htgf";
}

export async function gateToken(): Promise<string> {
  const data = new TextEncoder().encode(`htgf-gate:${pin()}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function pinMatches(candidate: string): Promise<boolean> {
  const expected = pin();
  const left = new TextEncoder().encode(candidate);
  const right = new TextEncoder().encode(expected);
  if (left.length !== right.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < left.length; i += 1) {
    mismatch |= left[i]! ^ right[i]!;
  }
  return mismatch === 0;
}

export async function isValidGateValue(value: string | undefined): Promise<boolean> {
  if (!value) {
    return false;
  }
  return value === (await gateToken());
}
