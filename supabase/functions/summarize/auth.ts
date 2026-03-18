import { HttpError } from "./errors.ts";

const hmacSecret = Deno.env.get("APP_HMAC_SECRET")?.trim() ?? "";
const MAX_CLOCK_DRIFT_SECONDS = 300;

export async function verifyRequestSignature(
  req: Request,
  rawBody: string,
): Promise<void> {
  const timestamp = req.headers.get("x-app-timestamp");
  const signature = req.headers.get("x-app-signature");

  if (!timestamp || !signature) {
    return;
  }

  if (!hmacSecret) {
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  const reqTime = parseInt(timestamp, 10);
  if (isNaN(reqTime) || Math.abs(now - reqTime) > MAX_CLOCK_DRIFT_SECONDS) {
    throw new HttpError(401, { error: "unauthorized" });
  }

  const message = timestamp + "." + rawBody;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(hmacSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const signatureBytes = hexToBytes(signature);
  if (!signatureBytes) {
    throw new HttpError(401, { error: "unauthorized" });
  }

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    new TextEncoder().encode(message),
  );

  if (!valid) {
    throw new HttpError(401, { error: "unauthorized" });
  }
}

export function hexToBytes(hex: string): Uint8Array<ArrayBuffer> | null {
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
    return null;
  }

  const bytes = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
