function getAllowedOrigins(): string[] {
  return (Deno.env.get("ALLOWED_ORIGIN") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function withRemaining(
  body: Record<string, unknown>,
  remaining: number,
): Record<string, unknown> {
  return { ...body, remaining };
}

// Prefer x-real-ip (set directly by the reverse proxy, not a client-appendable chain)
// over x-forwarded-for (clients can prepend spoofed entries to the chain).
export function getClientIp(req: Request): string {
  return (req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? "").trim();
}

export function isAllowedOrigin(origin: string): boolean {
  const origins = getAllowedOrigins();
  if (origins.length === 0) return false;
  if (origins.includes("*")) return true;
  return origins.includes(origin.trim());
}

export function corsHeaders(requestOrigin?: string): Record<string, string> {
  const origins = getAllowedOrigins();
  const origin = origins.includes("*")
    ? "*"
    : requestOrigin && isAllowedOrigin(requestOrigin)
      ? requestOrigin
      : "";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type",
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
