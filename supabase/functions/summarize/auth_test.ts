import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { verifyRequestSignature } from "./auth.ts";
import { HttpError } from "./errors.ts";

const EXT_ORIGIN = "chrome-extension://jompmeahomjbfpbkhfokobijnflljkik";

function withOrigin(value: string, fn: () => Promise<void>): () => Promise<void> {
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

Deno.test("verifyRequestSignature: rejects when origin is missing", async () => {
  const req = new Request("https://example.com", {
    method: "POST",
    headers: { authorization: "Bearer token-123" },
  });
  await assertRejects(
    () => verifyRequestSignature(req, '{"test": true}'),
    HttpError,
  );
});

Deno.test(
  "verifyRequestSignature: accepts any origin when wildcard mode is enabled",
  withOrigin("*", async () => {
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

Deno.test("verifyRequestSignature: rejects when authorization header is missing", async () => {
  const req = new Request("https://example.com", {
    method: "POST",
    headers: { origin: EXT_ORIGIN },
  });
  await assertRejects(
    () => verifyRequestSignature(req, '{"test": true}'),
    HttpError,
  );
});

Deno.test("verifyRequestSignature: rejects when bearer token is empty", async () => {
  const req = new Request("https://example.com", {
    method: "POST",
    headers: {
      origin: EXT_ORIGIN,
      authorization: "Bearer   ",
    },
  });
  await assertRejects(
    () => verifyRequestSignature(req, '{"test": true}'),
    HttpError,
  );
});

Deno.test("verifyRequestSignature: returns bearer token for allowlisted extension origin", async () => {
  const req = new Request("https://example.com", {
    method: "POST",
    headers: {
      origin: EXT_ORIGIN,
      authorization: "Bearer token-123",
    },
  });
  const token = await verifyRequestSignature(req, '{"test": true}');
  assertEquals(token, "token-123");
});

Deno.test("verifyRequestSignature: rejects non-allowlisted origin", async () => {
  const req = new Request("https://example.com", {
    method: "POST",
    headers: {
      origin: "https://evil.example",
      authorization: "Bearer token-123",
    },
  });
  await assertRejects(
    () => verifyRequestSignature(req, '{"test": true}'),
    HttpError,
  );
});

Deno.test(
  "verifyRequestSignature: rejects arbitrary chrome-extension origin not in allowlist",
  async () => {
    const req = new Request("https://example.com", {
      method: "POST",
      headers: {
        origin: "chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        authorization: "Bearer token-123",
      },
    });
    await assertRejects(
      () => verifyRequestSignature(req, '{"test": true}'),
      HttpError,
    );
  },
);

Deno.test(
  "verifyRequestSignature: rejects all origins when ALLOWED_ORIGIN is empty",
  withOrigin("", async () => {
    const req = new Request("https://example.com", {
      method: "POST",
      headers: {
        origin: EXT_ORIGIN,
        authorization: "Bearer token-123",
      },
    });
    await assertRejects(
      () => verifyRequestSignature(req, '{"test": true}'),
      HttpError,
    );
  }),
);
