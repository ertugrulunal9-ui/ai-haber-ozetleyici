import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { corsHeaders, getClientIp, withRemaining } from "./response.ts";

// --- withRemaining ---

Deno.test("withRemaining: adds remaining to body", () => {
  const result = withRemaining({ summary: "test" }, 5);
  assertEquals(result, { summary: "test", remaining: 5 });
});

Deno.test("withRemaining: remaining zero", () => {
  const result = withRemaining({}, 0);
  assertEquals(result, { remaining: 0 });
});

// --- getClientIp ---

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

Deno.test("getClientIp: trims whitespace", () => {
  const req = new Request("http://localhost", {
    headers: { "x-forwarded-for": "  1.2.3.4  " },
  });
  assertEquals(getClientIp(req), "1.2.3.4");
});

// --- corsHeaders ---

Deno.test("corsHeaders: allowed origin returned", () => {
  const headers = corsHeaders("chrome-extension://jompmeahomjbfpbkhfokobijnflljkik");
  assertEquals(
    headers["Access-Control-Allow-Origin"],
    "chrome-extension://jompmeahomjbfpbkhfokobijnflljkik",
  );
  assertEquals(headers["Vary"], "Origin");
});

Deno.test("corsHeaders: unknown origin returns empty", () => {
  const headers = corsHeaders("https://evil.com");
  assertEquals(headers["Access-Control-Allow-Origin"], "");
});

Deno.test("corsHeaders: no origin returns empty", () => {
  const headers = corsHeaders();
  assertEquals(headers["Access-Control-Allow-Origin"], "");
});

Deno.test("corsHeaders: includes required custom headers", () => {
  const headers = corsHeaders();
  const allowed = headers["Access-Control-Allow-Headers"];
  assertEquals(allowed.includes("x-app-signature"), true);
  assertEquals(allowed.includes("x-app-timestamp"), true);
  assertEquals(allowed.includes("content-type"), true);
});
