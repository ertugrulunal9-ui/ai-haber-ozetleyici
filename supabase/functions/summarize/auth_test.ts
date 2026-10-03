import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { verifyRequestSignature } from "./auth.ts";
import { HttpError } from "./errors.ts";

const EXT_ORIGIN = "chrome-extension://jompmeahomjbfpbkhfokobijnflljkik";

function withEnv(
  env: Record<string, string>,
  fn: () => void | Promise<void>,
): () => Promise<void> {
  return async () => {
    const previous = new Map<string, string | undefined>();
    for (const [key, value] of Object.entries(env)) {
      previous.set(key, Deno.env.get(key));
      Deno.env.set(key, value);
    }

    try {
      await fn();
    } finally {
      for (const [key, value] of previous.entries()) {
        if (value === undefined) {
          Deno.env.delete(key);
        } else {
          Deno.env.set(key, value);
        }
      }
    }
  };
}

function makeRequest(overrides: { authorization?: string; origin?: string } = {}): Request {
  const headers: Record<string, string> = {
    authorization: overrides.authorization ?? "Bearer token-123",
  };

  if (overrides.origin !== "") {
    headers.origin = overrides.origin ?? EXT_ORIGIN;
  }

  return new Request("https://example.com", { method: "POST", headers });
}

Deno.test(
  "verifyRequestSignature: rejects when origin is missing",
  withEnv({ ALLOWED_ORIGIN: EXT_ORIGIN }, () => {
    assertThrows(
      () => verifyRequestSignature(makeRequest({ origin: "" })),
      HttpError,
    );
  }),
);

Deno.test(
  "verifyRequestSignature: accepts valid request for allowlisted extension origin",
  withEnv({ ALLOWED_ORIGIN: EXT_ORIGIN }, () => {
    const token = verifyRequestSignature(makeRequest());
    assertEquals(token, "token-123");
  }),
);

Deno.test(
  "verifyRequestSignature: accepts any origin when wildcard mode is enabled",
  withEnv({ ALLOWED_ORIGIN: "*" }, () => {
    const token = verifyRequestSignature(makeRequest({ origin: "https://evil.example" }));
    assertEquals(token, "token-123");
  }),
);

Deno.test(
  "verifyRequestSignature: rejects when authorization header is missing",
  withEnv({ ALLOWED_ORIGIN: EXT_ORIGIN }, () => {
    const req = new Request("https://example.com", {
      method: "POST",
      headers: { origin: EXT_ORIGIN },
    });

    assertThrows(
      () => verifyRequestSignature(req),
      HttpError,
    );
  }),
);

Deno.test(
  "verifyRequestSignature: rejects when bearer token is empty",
  withEnv({ ALLOWED_ORIGIN: EXT_ORIGIN }, () => {
    assertThrows(
      () => verifyRequestSignature(makeRequest({ authorization: "Bearer   " })),
      HttpError,
    );
  }),
);

Deno.test(
  "verifyRequestSignature: rejects non-allowlisted origin",
  withEnv({ ALLOWED_ORIGIN: EXT_ORIGIN }, () => {
    assertThrows(
      () => verifyRequestSignature(makeRequest({ origin: "https://evil.example" })),
      HttpError,
    );
  }),
);

Deno.test(
  "verifyRequestSignature: rejects all origins when ALLOWED_ORIGIN is empty",
  withEnv({ ALLOWED_ORIGIN: "" }, () => {
    assertThrows(
      () => verifyRequestSignature(makeRequest()),
      HttpError,
    );
  }),
);
