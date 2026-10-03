import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { verifyRequestSignature } from "./auth.ts";
import { getRequiredEnv } from "./env.ts";
import { HttpError } from "./errors.ts";
import { getArticleCache, storeArticleCache, actionHandlers } from "./handlers.ts";
import { getLimitState, incrementUsage, assertAiRequestAllowed, assertAiBurstRateLimit } from "./limits.ts";
import { assertContentLengthWithinLimit, parseRawBody, parseRequest } from "./request.ts";
import { corsHeaders, getClientIp, json, withRemaining } from "./response.ts";
import { buildPrompt } from "./prompt.ts";
import { runOpenAiStream } from "./openai.ts";

const supabaseUrl = getRequiredEnv("SUPABASE_URL");
const supabaseServiceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const supabaseAnonKey = getRequiredEnv("SUPABASE_ANON_KEY");
const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  try {
    assertContentLengthWithinLimit(req);
    const rawBody = await req.text();
    const authToken = verifyRequestSignature(req);
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(authToken);

    if (userError || !userData?.user?.id) {
      throw new HttpError(401, { error: "unauthorized" });
    }

    const body = parseRawBody(rawBody);
    const userId = userData.user.id;
    const input = parseRequest(body);
    const deviceId = input.deviceId;
    const db = createClient(supabaseUrl, supabaseServiceRoleKey);
    const today = new Date().toISOString().slice(0, 10);
    const limits = await getLimitState(db, userId, today, getClientIp(req));

    // ── Streaming path for summarize ─────────────────────────────────
    const rawRecord = body as Record<string, unknown>;
    const isStream = rawRecord.stream === true && input.action === "summarize";

    if (isStream) {
      assertAiRequestAllowed(limits, "summary");
      await assertAiBurstRateLimit(db, limits.clientIp, userId, "summary");
      if (!input.text) throw new HttpError(400, { error: "bad_request" });

      // Serve from cache without consuming quota
      if (input.url) {
        const cached = await getArticleCache(db, input.url, input.lang);
        if (cached) {
          return json(
            { summary: cached.summary, keywords: cached.keywords, cached: true },
            200,
            origin,
          );
        }
      }

      const nextLimits = await incrementUsage({
        db,
        today,
        limits,
        deviceId: userId,
        bucket: "summary",
      });
      const remaining = nextLimits.summary.deviceRemaining;

      const stream = await runOpenAiStream(
        buildPrompt(input, "summarize"),
        (summary, keywords) => {
          if (input.url) {
            storeArticleCache(db, input.url, input.lang, summary, keywords).catch(() => {});
          }
        },
        remaining,
      );

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          ...corsHeaders(origin),
        },
      });
    }

    // ── Standard JSON path ────────────────────────────────────────────
    const handler = actionHandlers[input.action];
    const result = await handler({ db, today, limits, userId, deviceId }, input);

    if (result.incrementUsageBucket) {
      const nextLimits = await incrementUsage({
        db,
        today,
        limits,
        deviceId: userId,
        bucket: result.incrementUsageBucket,
      });
      return json(
        { ...result.body, remaining: nextLimits.summary.deviceRemaining },
        result.status ?? 200,
        origin,
      );
    }

    return json(withRemaining(result.body, limits.summary.deviceRemaining), result.status ?? 200, origin);
  } catch (error) {
    if (error instanceof HttpError) {
      return json(error.body, error.status, origin);
    }

    console.error("summarize_function_error", error);
    return json({ error: "internal_error" }, 500, origin);
  }
});
