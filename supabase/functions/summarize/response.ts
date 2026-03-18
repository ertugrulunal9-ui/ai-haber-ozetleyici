import { getRequiredEnv } from "./env.ts";

const allowedOrigins = getRequiredEnv("ALLOWED_ORIGIN")
  .split(",")
  .map((s) => s.trim());

export function withRemaining(
  body: Record<string, unknown>,
  remaining: number,
): Record<string, unknown> {
  return { ...body, remaining };
}

export function getClientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "").trim();
}

export function corsHeaders(requestOrigin?: string): Record<string, string> {
  const origin =
    requestOrigin && allowedOrigins.includes(requestOrigin)
      ? requestOrigin
      : "";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "content-type, x-app-signature, x-app-timestamp",
    Vary: "Origin",
  };
}

export function json(
  data: Record<string, unknown>,
  status: number,
  requestOrigin: string,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(requestOrigin),
    },
  });
}
