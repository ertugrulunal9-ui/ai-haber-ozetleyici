import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { verifyRequestSignature } from "./auth.ts";
import { HttpError } from "./errors.ts";

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

Deno.test("verifyRequestSignature: rejects when origin is missing", () => {
  const req = new Request("https://example.com", {
    method: "POST",
    headers: { authorization: "Bearer token-123" },
  });
  assertThrows(
    () => verifyRequestSignature(req, '{"test": true}'),
    HttpError,
  );
});

Deno.test(
  "verifyRequestSignature: accepts any origin when wildcard mode is enabled",
  withOrigin("*", () => {
    const req = new Request("https://example.com", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        authorization: "Bearer token-123",
      },
    });
    const token = verifyRequestSignature(req, '{"test": true}');
    assertEquals(token, "token-123");
  }),
);

Deno.test("verifyRequestSignature: rejects when authorization header is missing", () => {
  const req = new Request("https://example.com", {
    method: "POST",
    headers: { origin: EXT_ORIGIN },
  });
  assertThrows(
    () => verifyRequestSignature(req, '{"test": true}'),
    HttpError,
  );
});

Deno.test("verifyRequestSignature: rejects when bearer token is empty", () => {
  const req = new Request("https://example.com", {
    method: "POST",
    headers: {
      origin: EXT_ORIGIN,
      authorization: "Bearer   ",
    },
  });
  assertThrows(
    () => verifyRequestSignature(req, '{"test": true}'),
    HttpError,
  );
});

Deno.test("verifyRequestSignature: returns bearer token for allowlisted extension origin", () => {
  const req = new Request("https://example.com", {
    method: "POST",
    headers: {
      origin: EXT_ORIGIN,
      authorization: "Bearer token-123",
    },
  });
  const token = verifyRequestSignature(req, '{"test": true}');
  assertEquals(token, "token-123");
});

Deno.test("verifyRequestSignature: rejects non-allowlisted origin", () => {
  const req = new Request("https://example.com", {
    method: "POST",
    headers: {
      origin: "https://evil.example",
      authorization: "Bearer token-123",
    },
  });
  assertThrows(
    () => verifyRequestSignature(req, '{"test": true}'),
    HttpError,
  );
});

Deno.test(
  "verifyRequestSignature: rejects arbitrary chrome-extension origin not in allowlist",
  () => {
    const req = new Request("https://example.com", {
      method: "POST",
      headers: {
        origin: "chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        authorization: "Bearer token-123",
      },
    });
    assertThrows(
      () => verifyRequestSignature(req, '{"test": true}'),
      HttpError,
    );
  },
);

Deno.test(
  "verifyRequestSignature: rejects all origins when ALLOWED_ORIGIN is empty",
  withOrigin("", () => {
    const req = new Request("https://example.com", {
      method: "POST",
      headers: {
        origin: EXT_ORIGIN,
        authorization: "Bearer token-123",
      },
    });
    assertThrows(
      () => verifyRequestSignature(req, '{"test": true}'),
      HttpError,
    );
  }),
);
