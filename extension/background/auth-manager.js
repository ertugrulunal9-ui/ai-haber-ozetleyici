// Supabase session management: sign-in, sign-up, Google OAuth, token refresh.
// Depends on globals: CONFIG, parseJson, createApiError

const AUTH_STORAGE_KEY = "supabaseAuthSession";
const AUTH_CONFIG_STORAGE_KEY = "supabasePublishableKey";
const PUBLISHABLE_KEY_PLACEHOLDER = "__SUPABASE" + "_PUBLISHABLE_KEY__";
const SESSION_REFRESH_BUFFER_SECONDS = 60;

async function ensureSupabaseSession(options = {}) {
  const { forceRefresh = false } = options;
  const currentSession = await getStoredAuthSession();

  if (currentSession && !forceRefresh && !isSessionExpiringSoon(currentSession)) {
    return currentSession;
  }

  if (currentSession?.refreshToken) {
    try {
      const refreshedSession = await refreshSupabaseSession(currentSession.refreshToken);
      await setStoredAuthSession(refreshedSession);
      return refreshedSession;
    } catch {
      await clearStoredAuthSession();
    }
  }

  throw createApiError("needs_auth");
}

async function signInWithEmail(email, password) {
  const response = await fetch(getSupabaseAuthUrl("/token?grant_type=password"), {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ email, password }),
  });

  const payload = await parseJson(response);
  if (!response.ok) {
    throw createApiError("unauthorized", response.status, payload);
  }

  return normalizeAuthSession(payload);
}

async function signUpWithEmail(email, password) {
  const response = await fetch(getSupabaseAuthUrl("/signup"), {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ email, password }),
  });

  const payload = await parseJson(response);
  if (!response.ok) {
    throw createApiError("unauthorized", response.status, payload);
  }

  // Email confirmation required — session will be null
  if (!payload?.session?.access_token && !payload?.access_token) {
    return { needsEmailConfirmation: true };
  }

  return normalizeAuthSession(payload);
}

async function signInWithGoogle() {
  const redirectUrl = chrome.identity.getRedirectURL();
  const { codeVerifier, codeChallenge } = await generatePkceChallenge();

  const params = new URLSearchParams({
    provider: "google",
    redirect_to: redirectUrl,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const authUrl = `${getSupabaseAuthUrl("/authorize")}?${params}`;

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, async (responseUrl) => {
      if (chrome.runtime.lastError || !responseUrl) {
        reject(createApiError("unauthorized"));
        return;
      }
      try {
        const url = new URL(responseUrl);
        const code = url.searchParams.get("code");
        if (!code) {
          reject(createApiError("unauthorized"));
          return;
        }
        const tokenResponse = await fetch(getSupabaseAuthUrl("/token?grant_type=pkce"), {
          method: "POST",
          headers: await getAuthHeaders(),
          body: JSON.stringify({ auth_code: code, code_verifier: codeVerifier }),
        });
        const payload = await parseJson(tokenResponse);
        if (!tokenResponse.ok) {
          reject(createApiError("unauthorized", tokenResponse.status, payload));
          return;
        }
        resolve(normalizeAuthSession(payload));
      } catch {
        reject(createApiError("unauthorized"));
      }
    });
  });
}

async function signOut() {
  const session = await getStoredAuthSession();
  if (session?.accessToken) {
    try {
      await fetch(getSupabaseAuthUrl("/logout"), {
        method: "POST",
        headers: {
          ...(await getAuthHeaders()),
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
    } catch { /* best-effort */ }
  }
  await clearStoredAuthSession();
}

async function refreshSupabaseSession(refreshToken) {
  const response = await fetch(getSupabaseAuthUrl("/token?grant_type=refresh_token"), {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const payload = await parseJson(response);
  if (!response.ok) {
    throw createApiError("unauthorized", response.status, payload);
  }

  return normalizeAuthSession(payload);
}

async function getStoredAuthSession() {
  const stored = await chrome.storage.local.get(AUTH_STORAGE_KEY);
  try {
    return normalizeStoredAuthSession(stored[AUTH_STORAGE_KEY] ?? null);
  } catch {
    await clearStoredAuthSession();
    return null;
  }
}

async function setStoredAuthSession(session) {
  await chrome.storage.local.set({
    [AUTH_STORAGE_KEY]: {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
      email: session.email || "",
    },
  });
}

async function clearStoredAuthSession() {
  await chrome.storage.local.remove(AUTH_STORAGE_KEY);
}

async function setStoredPublishableKey(value) {
  const key = typeof value === "string" ? value.trim() : "";
  if (!key) {
    throw createApiError("auth_config");
  }

  await chrome.storage.local.set({ [AUTH_CONFIG_STORAGE_KEY]: key });
  await clearStoredAuthSession();
}

function normalizeStoredAuthSession(session) {
  if (!session || typeof session !== "object") {
    return null;
  }

  const accessToken = typeof session.accessToken === "string" ? session.accessToken.trim() : "";
  const refreshToken = typeof session.refreshToken === "string" ? session.refreshToken.trim() : "";
  const expiresAt = Number(session.expiresAt);

  if (!accessToken || !refreshToken || !Number.isFinite(expiresAt) || expiresAt <= 0) {
    throw createApiError("unauthorized");
  }

  return {
    accessToken,
    refreshToken,
    expiresAt,
    email: typeof session.email === "string" ? session.email : "",
  };
}

function normalizeAuthSession(payload) {
  const session = payload?.session && typeof payload.session === "object" ? payload.session : payload;
  const accessToken = typeof session?.access_token === "string" ? session.access_token.trim() : "";
  const refreshToken = typeof session?.refresh_token === "string" ? session.refresh_token.trim() : "";
  const rawExpiresAt = Number(session?.expires_at);
  const rawExpiresIn = Number(session?.expires_in);
  const expiresAt =
    Number.isFinite(rawExpiresAt) && rawExpiresAt > 0
      ? rawExpiresAt
      : Number.isFinite(rawExpiresIn) && rawExpiresIn > 0
        ? Math.floor(Date.now() / 1000) + rawExpiresIn
        : 0;

  if (!accessToken || !refreshToken || !Number.isFinite(expiresAt) || expiresAt <= 0) {
    throw createApiError("unauthorized");
  }

  const user = payload?.user && typeof payload.user === "object" ? payload.user
    : payload?.session?.user && typeof payload.session.user === "object" ? payload.session.user
    : null;

  return {
    accessToken,
    refreshToken,
    expiresAt,
    email: typeof user?.email === "string" ? user.email : "",
  };
}

function isSessionExpiringSoon(session) {
  return session.expiresAt <= Math.floor(Date.now() / 1000) + SESSION_REFRESH_BUFFER_SECONDS;
}

async function getAuthHeaders() {
  const publishableKey = await getPublishableKey();
  return {
    "Content-Type": "application/json",
    apikey: publishableKey,
    Authorization: `Bearer ${publishableKey}`,
  };
}

async function getPublishableKey() {
  const bundledKey = CONFIG.SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
  if (bundledKey && bundledKey !== PUBLISHABLE_KEY_PLACEHOLDER) {
    return bundledKey;
  }

  const stored = await chrome.storage.local.get(AUTH_CONFIG_STORAGE_KEY);
  const storedKey = typeof stored[AUTH_CONFIG_STORAGE_KEY] === "string"
    ? stored[AUTH_CONFIG_STORAGE_KEY].trim()
    : "";

  if (!storedKey) {
    throw createApiError("auth_config");
  }

  return storedKey;
}

function getSupabaseAuthUrl(path) {
  return `${new URL(CONFIG.EDGE_URL).origin}/auth/v1${path}`;
}

async function generatePkceChallenge() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const codeVerifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier));
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return { codeVerifier, codeChallenge };
}
