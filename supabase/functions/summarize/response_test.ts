import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { corsHeaders, getClientIp, isAllowedOrigin, withRemaining } from "./response.ts";

const EXT_ORIGIN = "chrome-extension://jompmeahomjbfpbkhfokobijnflljkik";

function withOrigin(value: string, fn: () => void | Promise<void>): () => Promise<void> {
  return async () => {
    const prev = Deno.env.get("ALLOWED_ORIGIN");
    Deno.env.set("ALLOWED_ORIGIN", value);
    try {
      await fn();
    } finally {
      if (prev !== undefined) {
        Deno.env.set("ALLOWED_ORIGIN", prev);
      } else {
        Deno.env.delete("ALLOWED_ORIGIN");
      }
    }
  };
}

Deno.test("withRemaining: adds remaining to body", () => {
  const result = withRemaining({ summary: "test" }, 5);
  assertEquals(result, { summary: "test", remaining: 5 });
});

Deno.test("withRemaining: remaining zero", () => {
  const result = withRemaining({}, 0);
  assertEquals(result, { remaining: 0 });
});

Deno.test("getClientIp: from x-forwarded-for", () => {
  const req = new Request("http://localhost", {
    headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
  });
  assertEquals(getClientIp(req), "1.2.3.4");
});

Deno.test("getClientIp: from x-real-ip", () => {
  const req = new Request("http://localhost", {
    headers: { "x-real-ip": "9.8.7.6" },
  });
  assertEquals(getClientIp(req), "9.8.7.6");
});

Deno.test("getClientIp: no headers returns empty string", () => {
  const req = new Request("http://localhost");
  assertEquals(getClientIp(req), "");
});

Deno.test("getClientIp: prefers x-real-ip over x-forwarded-for", () => {
  const req = new Request("http://localhost", {
    headers: { "x-real-ip": "10.0.0.1", "x-forwarded-for": "spoofed, 10.0.0.1" },
  });
  assertEquals(getClientIp(req), "10.0.0.1");
});

Deno.test("getClientIp: trims whitespace", () => {
  const req = new Request("http://localhost", {
    headers: { "x-forwarded-for": "  1.2.3.4  " },
  });
  assertEquals(getClientIp(req), "1.2.3.4");
});

Deno.test(
  "isAllowedOrigin: matches configured extension origin",
  withOrigin(EXT_ORIGIN, () => {
    assertEquals(isAllowedOrigin(EXT_ORIGIN), true);
  }),
);

Deno.test(
  "isAllowedOrigin: rejects non-listed origin",
  withOrigin(EXT_ORIGIN, () => {
    assertEquals(isAllowedOrigin("https://evil.com"), false);
  }),
);

Deno.test(
  "isAllowedOrigin: rejects arbitrary chrome-extension origin",
  withOrigin(EXT_ORIGIN, () => {
    assertEquals(isAllowedOrigin("chrome-extension://aaaaaaaaaaaaaaaa"), false);
  }),
);

Deno.test(
  "isAllowedOrigin: accepts any origin in wildcard mode",
  withOrigin("*", () => {
    assertEquals(isAllowedOrigin("https://anything.example"), true);
  }),
);

Deno.test(
  "isAllowedOrigin: rejects all origins when ALLOWED_ORIGIN is empty (fail closed)",
  withOrigin("", () => {
    assertEquals(isAllowedOrigin(EXT_ORIGIN), false);
  }),
);

Deno.test(
  "corsHeaders: returns matching origin when allowlisted",
  withOrigin(EXT_ORIGIN, () => {
    const headers = corsHeaders(EXT_ORIGIN);
    assertEquals(headers["Access-Control-Allow-Origin"], EXT_ORIGIN);
    assertEquals(headers.Vary, "Origin");
  }),
);

Deno.test(
  "corsHeaders: returns empty for unknown origin",
  withOrigin(EXT_ORIGIN, () => {
    const headers = corsHeaders("https://evil.com");
    assertEquals(headers["Access-Control-Allow-Origin"], "");
  }),
);

Deno.test(
  "corsHeaders: returns empty when no origin provided",
  withOrigin(EXT_ORIGIN, () => {
    const headers = corsHeaders();
    assertEquals(headers["Access-Control-Allow-Origin"], "");
  }),
);

Deno.test(
  "corsHeaders: returns * in wildcard mode",
  withOrigin("*", () => {
    const headers = corsHeaders("https://anything.example");
    assertEquals(headers["Access-Control-Allow-Origin"], "*");
  }),
);

Deno.test(
  "corsHeaders: returns empty when ALLOWED_ORIGIN is empty (fail closed)",
  withOrigin("", () => {
    const headers = corsHeaders(EXT_ORIGIN);
    assertEquals(headers["Access-Control-Allow-Origin"], "");
  }),
);

Deno.test(
  "corsHeaders: allows authorization and content-type headers",
  withOrigin(EXT_ORIGIN, () => {
    const headers = corsHeaders();
    const allowed = headers["Access-Control-Allow-Headers"];
    assertEquals(allowed.includes("authorization"), true);
    assertEquals(allowed.includes("content-type"), true);
  }),
);
