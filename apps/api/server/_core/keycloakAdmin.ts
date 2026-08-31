import { ENV } from "./env";

type TokenCache = { accessToken: string; expiresAtMs: number };
let adminTokenCache: TokenCache | null = null;

const ADMIN_FETCH_TIMEOUT_MS = 15_000;
const ADMIN_FETCH_DEFAULTS: RequestInit = {
  redirect: "manual",
  signal: AbortSignal.timeout(ADMIN_FETCH_TIMEOUT_MS),
};

export type KeycloakUser = {
  id: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled?: boolean;
  emailVerified?: boolean;
  requiredActions?: string[];
};

function assertAdminConfigured() {
  if (!ENV.keycloakUrl) {
    throw new Error(
      "KEYCLOAK_URL (or OIDC_ISSUER_URI) is required for user invitations."
    );
  }
  if (!ENV.keycloakAdminUsername || !ENV.keycloakAdminPassword) {
    throw new Error(
      "KEYCLOAK_ADMIN and KEYCLOAK_ADMIN_PASSWORD are required for user invitations."
    );
  }
}

async function readResponseJson<T>(response: Response, label: string): Promise<T> {
  const body = await response.text();
  const trimmed = body.trim();
  if (!trimmed || trimmed.startsWith("<")) {
    throw new Error(
      `Keycloak a renvoyé une page HTML au lieu de JSON (${label}, HTTP ${response.status}). Vérifiez KEYCLOAK_URL (${ENV.keycloakUrl || "non défini"}).`
    );
  }
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error(
      `Réponse Keycloak invalide (${label}, HTTP ${response.status}). Vérifiez KEYCLOAK_URL.`
    );
  }
}

function assertNoRedirect(response: Response, label: string) {
  if (response.status >= 300 && response.status < 400) {
    throw new Error(
      `Keycloak a redirigé la requête (${label}, HTTP ${response.status}). Vérifiez KEYCLOAK_URL (${ENV.keycloakUrl || "non défini"}).`
    );
  }
}

async function getAdminAccessToken(): Promise<string> {
  assertAdminConfigured();
  const now = Date.now();
  if (adminTokenCache && adminTokenCache.expiresAtMs > now + 30_000) {
    return adminTokenCache.accessToken;
  }

  const tokenUrl = `${ENV.keycloakUrl}/realms/master/protocol/openid-connect/token`;
  const body = new URLSearchParams({
    grant_type: "password",
    client_id: "admin-cli",
    username: ENV.keycloakAdminUsername,
    password: ENV.keycloakAdminPassword,
  });

  const response = await fetch(tokenUrl, {
    ...ADMIN_FETCH_DEFAULTS,
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  assertNoRedirect(response, "token");
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Keycloak admin token failed (${response.status})${detail ? `: ${detail}` : ""}`
    );
  }

  const data = await readResponseJson<{
    access_token?: string;
    expires_in?: number;
  }>(response, "token");
  if (!data.access_token) {
    throw new Error("Keycloak admin token response missing access_token");
  }

  adminTokenCache = {
    accessToken: data.access_token,
    expiresAtMs: now + (data.expires_in ?? 60) * 1000,
  };
  return data.access_token;
}

async function adminFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = await getAdminAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${ENV.keycloakUrl}${path}`, {
    ...ADMIN_FETCH_DEFAULTS,
    ...init,
    headers,
    signal: init.signal ?? ADMIN_FETCH_DEFAULTS.signal,
  });
}

function realmUsersPath(suffix = ""): string {
  return `/admin/realms/${encodeURIComponent(ENV.keycloakRealm)}/users${suffix}`;
}

export async function findKeycloakUserByEmail(
  email: string
): Promise<KeycloakUser | null> {
  const normalized = email.trim().toLowerCase();
  const response = await adminFetch(
    `${realmUsersPath()}?email=${encodeURIComponent(normalized)}&exact=true`
  );
  assertNoRedirect(response, "user lookup");
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Keycloak user lookup failed (${response.status})${detail ? `: ${detail}` : ""}`
    );
  }
  const users = await readResponseJson<KeycloakUser[]>(response, "user lookup");
  return users.find(u => u.email?.toLowerCase() === normalized) ?? users[0] ?? null;
}

async function executeActionsEmail(
  userId: string,
  actions: string[] = ["UPDATE_PASSWORD"]
): Promise<void> {
  const redirectUri = ENV.appPublicUrl
    ? `${ENV.appPublicUrl}/spaces`
    : undefined;

  const query = new URLSearchParams({
    client_id: ENV.keycloakActionsClientId,
  });
  if (redirectUri) query.set("redirect_uri", redirectUri);

  const path = `${realmUsersPath(`/${encodeURIComponent(userId)}/execute-actions-email`)}?${query}`;
  let response = await adminFetch(path, {
    method: "PUT",
    body: JSON.stringify(actions),
  });

  if (!response.ok && redirectUri) {
    // Retry without redirect_uri if client whitelist rejects it.
    const fallback = `${realmUsersPath(`/${encodeURIComponent(userId)}/execute-actions-email`)}?client_id=${encodeURIComponent(ENV.keycloakActionsClientId)}`;
    response = await adminFetch(fallback, {
      method: "PUT",
      body: JSON.stringify(actions),
    });
  }

  assertNoRedirect(response, "execute-actions-email");
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Keycloak execute-actions-email failed (${response.status})${detail ? `: ${detail}` : ""}`
    );
  }
}

export type InviteKeycloakUserInput = {
  email: string;
  firstName?: string;
  lastName?: string;
  /** When true, always (re)send the setup email. */
  resendEmail?: boolean;
};

/**
 * Find or create a Keycloak user and send UPDATE_PASSWORD setup email.
 * Returns the Keycloak user id (OIDC `sub`).
 */
export async function inviteOrEnsureKeycloakUser(
  input: InviteKeycloakUserInput
): Promise<{ user: KeycloakUser; created: boolean; emailSent: boolean }> {
  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error("Email is required");

  let user = await findKeycloakUserByEmail(email);
  let created = false;

  if (!user) {
    const createResponse = await adminFetch(realmUsersPath(), {
      method: "POST",
      body: JSON.stringify({
        username: email,
        email,
        firstName: input.firstName?.trim() || undefined,
        lastName: input.lastName?.trim() || undefined,
        enabled: true,
        emailVerified: true,
        requiredActions: ["UPDATE_PASSWORD"],
      }),
    });

    assertNoRedirect(createResponse, "create user");
    if (createResponse.status !== 201 && createResponse.status !== 204) {
      // Race: user created concurrently
      if (createResponse.status === 409) {
        user = await findKeycloakUserByEmail(email);
      } else {
        const detail = await createResponse.text().catch(() => "");
        throw new Error(
          `Keycloak create user failed (${createResponse.status})${detail ? `: ${detail}` : ""}`
        );
      }
    } else {
      created = true;
      const location = createResponse.headers.get("Location");
      const idFromLocation = location?.split("/").pop();
      if (idFromLocation) {
        user = {
          id: idFromLocation,
          email,
          username: email,
          firstName: input.firstName,
          lastName: input.lastName,
          requiredActions: ["UPDATE_PASSWORD"],
        };
      } else {
        user = await findKeycloakUserByEmail(email);
      }
    }
  }

  if (!user?.id) {
    throw new Error("Keycloak user id missing after invite");
  }

  // Ensure UPDATE_PASSWORD is present before mailing.
  const shouldMail = Boolean(created || input.resendEmail);
  const full = await adminFetch(realmUsersPath(`/${encodeURIComponent(user.id)}`));
  assertNoRedirect(full, "get user");
  if (full.ok) {
    const current = await readResponseJson<KeycloakUser & Record<string, unknown>>(
      full,
      "get user"
    );
    const requiredActions = Array.from(
      new Set([...(current.requiredActions ?? []), "UPDATE_PASSWORD"])
    );
    await adminFetch(realmUsersPath(`/${encodeURIComponent(user.id)}`), {
      method: "PUT",
      body: JSON.stringify({
        ...current,
        email,
        username: current.username || email,
        enabled: true,
        emailVerified: true,
        firstName: input.firstName?.trim() || current.firstName,
        lastName: input.lastName?.trim() || current.lastName,
        requiredActions,
      }),
    });
    user = { ...user, ...current, requiredActions };
  }

  let emailSent = false;
  if (shouldMail || created || (user.requiredActions ?? []).includes("UPDATE_PASSWORD")) {
    try {
      await executeActionsEmail(user.id, ["UPDATE_PASSWORD"]);
      emailSent = true;
    } catch (error) {
      console.warn(
        `[KeycloakAdmin] Invitation email failed for ${email}:`,
        error instanceof Error ? error.message : error
      );
      if (input.resendEmail) throw error;
    }
  }

  return { user, created, emailSent };
}

/** Re-send UPDATE_PASSWORD email for an existing Keycloak user id (OIDC sub). */
export async function resendKeycloakInviteEmail(openId: string): Promise<void> {
  const response = await adminFetch(realmUsersPath(`/${encodeURIComponent(openId)}`));
  assertNoRedirect(response, "get user");
  if (!response.ok) {
    throw new Error(`Keycloak user ${openId} not found (${response.status})`);
  }
  const current = await readResponseJson<KeycloakUser & Record<string, unknown>>(
    response,
    "get user"
  );
  const requiredActions = Array.from(
    new Set([...(current.requiredActions ?? []), "UPDATE_PASSWORD"])
  );
  await adminFetch(realmUsersPath(`/${encodeURIComponent(openId)}`), {
    method: "PUT",
    body: JSON.stringify({ ...current, requiredActions }),
  });
  await executeActionsEmail(openId, ["UPDATE_PASSWORD"]);
}

export function isKeycloakAdminConfigured(): boolean {
  return Boolean(
    ENV.keycloakUrl &&
      ENV.keycloakAdminUsername &&
      ENV.keycloakAdminPassword
  );
}

/** Reset cached admin token (tests only). */
export function resetKeycloakAdminTokenCacheForTests(): void {
  adminTokenCache = null;
}
