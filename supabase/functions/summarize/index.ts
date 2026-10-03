import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { verifyRequestSignature } from "./auth.ts";
import { getRequiredEnv } from "./env.ts";
import { HttpError } from "./errors.ts";
import { getArticleCache, storeArticleCache, actionHandlers } from "./handlers.ts";
import {
  assertAiBurstRateLimit,
  assertAiRequestAllowed,
  getLimitState,
  releaseUsage,
  reserveUsage,
} from "./limits.ts";
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
      if (!input.text) throw new HttpError(400, { error: "bad_request" });
      assertAiRequestAllowed(limits, "summary");
      await assertAiBurstRateLimit(db, limits.clientIp, userId, "summary");

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

      // Reserve the quota before the AI call; give it back if the call fails.
      const usageParams = { db, today, limits, deviceId: userId, bucket: "summary" as const };
      const reserved = await reserveUsage(usageParams);

      let stream: ReadableStream<Uint8Array>;
      try {
        stream = await runOpenAiStream(
          buildPrompt(input, "summarize"),
          (summary, keywords) => {
            if (input.url) {
              storeArticleCache(db, input.url, input.lang, summary, keywords).catch(() => {});
            }
          },
          reserved.summary.deviceRemaining,
        );
      } catch (error) {
        await releaseUsage(usageParams).catch((releaseError) =>
          console.error("usage_release_failed", releaseError)
        );
        throw error;
      }

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

    return json(
      withRemaining(result.body, result.remaining ?? limits.summary.deviceRemaining),
      result.status ?? 200,
      origin,
    );
  } catch (error) {
    if (error instanceof HttpError) {
      return json(error.body, error.status, origin);
    }

    console.error("summarize_function_error", error);
    return json({ error: "internal_error" }, 500, origin);
  }
});
