import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const code = readFileSync(
  resolve(__dirname, "../extension/background/auth-manager.js"),
  "utf-8",
);

const REDIRECT = "https://abcdefghijklmnopabcdefghijklmnop.chromiumapp.org/";
let store;
let authFlow;

function loadAuthManager({ bundledKey }) {
  // auth-manager.js expects these globals from background.js.
  const globals = {
    CONFIG: { EDGE_URL: "https://proj.supabase.co/functions/v1/summarize", SUPABASE_PUBLISHABLE_KEY: bundledKey },
    parseJson: async (response) => response.json(),
    createApiError: (errCode, status = 0, details = null) =>
      Object.assign(new Error(errCode), { code: errCode, status, details }),
  };
  return new Function(
    ...Object.keys(globals),
    `${code}\nreturn { signInWithGoogle, describeAuthError };`,
  )(...Object.values(globals));
}

beforeEach(() => {
  store = {};
  authFlow = { responseUrl: `${REDIRECT}?code=abc`, lastError: undefined, calls: 0 };
  globalThis.chrome = {
    runtime: {},
    storage: {
      local: {
        get: async (key) => (key in store ? { [key]: store[key] } : {}),
        set: async (items) => Object.assign(store, items),
        remove: async (key) => {
          delete store[key];
        },
      },
    },
    identity: {
      getRedirectURL: () => REDIRECT,
      launchWebAuthFlow: (_opts, callback) => {
        authFlow.calls++;
        globalThis.chrome.runtime.lastError = authFlow.lastError ? { message: authFlow.lastError } : undefined;
        callback(authFlow.lastError ? undefined : authFlow.responseUrl);
        globalThis.chrome.runtime.lastError = undefined;
      },
    },
  };
  globalThis.fetch = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ access_token: "at", refresh_token: "rt", expires_in: 3600, user: { email: "a@b.c" } }),
  }));
});

async function rejection(promise) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected rejection");
}

describe("signInWithGoogle", () => {
  it("fails with auth_config before opening the Google window when the key is missing", async () => {
    const auth = loadAuthManager({ bundledKey: "__SUPABASE" + "_PUBLISHABLE_KEY__" });
    const error = await rejection(auth.signInWithGoogle());
    expect(error.code).toBe("auth_config");
    expect(authFlow.calls).toBe(0);
  });

  it("uses a publishable key stored at runtime when the build has none", async () => {
    store.supabasePublishableKey = "sb_publishable_stored";
    const auth = loadAuthManager({ bundledKey: "__SUPABASE" + "_PUBLISHABLE_KEY__" });
    await auth.signInWithGoogle();
    expect(fetch.mock.calls[0][1].headers.apikey).toBe("sb_publishable_stored");
  });

  it("reports auth_cancelled with Chrome's reason when the window fails", async () => {
    authFlow.lastError = "The user did not approve access.";
    const auth = loadAuthManager({ bundledKey: "sb_publishable_x" });
    const error = await rejection(auth.signInWithGoogle());
    expect(error.code).toBe("auth_cancelled");
    expect(auth.describeAuthError(error).message).toBe("The user did not approve access.");
  });

  it("reports auth_provider with the provider's message from the redirect", async () => {
    authFlow.responseUrl = `${REDIRECT}?error=server_error&error_description=Database+error+saving+new+user`;
    const auth = loadAuthManager({ bundledKey: "sb_publishable_x" });
    const error = await rejection(auth.signInWithGoogle());
    expect(error.code).toBe("auth_provider");
    expect(auth.describeAuthError(error).message).toBe("Database error saving new user");
  });

  it("reports auth_no_code when the redirect carries neither code nor error", async () => {
    authFlow.responseUrl = REDIRECT;
    const auth = loadAuthManager({ bundledKey: "sb_publishable_x" });
    const error = await rejection(auth.signInWithGoogle());
    expect(error.code).toBe("auth_no_code");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps the HTTP status and Supabase message when the code exchange fails", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error_code: "flow_state_not_found", msg: "invalid flow state, no valid flow state found" }),
    });
    const auth = loadAuthManager({ bundledKey: "sb_publishable_x" });
    const error = await rejection(auth.signInWithGoogle());
    expect(auth.describeAuthError(error)).toEqual({
      code: "unauthorized",
      status: 400,
      message: "invalid flow state, no valid flow state found",
    });
  });

  it("exchanges the code and returns the session on success", async () => {
    const auth = loadAuthManager({ bundledKey: "sb_publishable_x" });
    const session = await auth.signInWithGoogle();
    expect(session).toMatchObject({ accessToken: "at", refreshToken: "rt", email: "a@b.c" });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://proj.supabase.co/auth/v1/token?grant_type=pkce");
    expect(JSON.parse(init.body).auth_code).toBe("abc");
  });
});
