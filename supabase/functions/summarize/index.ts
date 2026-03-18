import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { verifyRequestSignature } from "./auth.ts";
import { getRequiredEnv } from "./env.ts";
import { HttpError } from "./errors.ts";
import { actionHandlers } from "./handlers.ts";
import { getLimitState, incrementUsage } from "./limits.ts";
import { parseRawBody, parseRequest } from "./request.ts";
import { corsHeaders, getClientIp, json, withRemaining } from "./response.ts";

const supabaseUrl = getRequiredEnv("SUPABASE_URL");
const supabaseServiceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  try {
    const rawBody = await req.text();
    await verifyRequestSignature(req, rawBody);

    const body = parseRawBody(rawBody);

    const input = parseRequest(body);
    const db = createClient(supabaseUrl, supabaseServiceRoleKey);
    const today = new Date().toISOString().slice(0, 10);
    const limits = await getLimitState(db, input.deviceId, today, getClientIp(req));
    const handler = actionHandlers[input.action];

    const result = await handler({ db, today, limits }, input);

    if (result.incrementUsageBucket) {
      const nextLimits = await incrementUsage({
        db,
        today,
        limits,
        deviceId: input.deviceId,
        bucket: result.incrementUsageBucket,
      });
      return json({ ...result.body, remaining: nextLimits.summary.deviceRemaining }, result.status ?? 200, origin);
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
