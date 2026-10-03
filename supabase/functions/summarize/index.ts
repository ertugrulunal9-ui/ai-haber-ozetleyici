import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { verifyRequestSignature } from "./auth.ts";
import { getRequiredEnv } from "./env.ts";
import { HttpError } from "./errors.ts";
import { actionHandlers } from "./handlers.ts";
import { getLimitState } from "./limits.ts";
import { parseRawBody, parseRequest } from "./request.ts";
import { corsHeaders, getClientIp, json, withRemaining } from "./response.ts";

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
    const rawBody = await req.text();
    const authToken = verifyRequestSignature(req, rawBody);
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(authToken);

    if (userError || !userData?.user?.id) {
      throw new HttpError(401, { error: "unauthorized" });
    }

    const body = parseRawBody(rawBody);
    const userId = userData.user.id;
    const input = parseRequest(body);
    const db = createClient(supabaseUrl, supabaseServiceRoleKey);
    const today = new Date().toISOString().slice(0, 10);
    const limits = await getLimitState(db, userId, today, getClientIp(req));
    const handler = actionHandlers[input.action];

    const result = await handler({ db, today, limits, userId }, input);

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
