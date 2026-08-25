import {
  OAUTH_STATE_COOKIE,
  encodeOAuthState,
  pkceChallengeS256,
  randomPkceVerifier,
} from "@shared/const";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export type StartLoginOptions = {
  /** Use Keycloak registration screen instead of login. */
  mode?: "login" | "register";
};

function keycloakIssuer(): string {
  const url = (import.meta.env.VITE_KEYCLOAK_URL as string | undefined)?.replace(
    /\/$/,
    ""
  );
  const realm =
    (import.meta.env.VITE_KEYCLOAK_REALM as string | undefined) || "biocollect";
  if (!url) {
    console.error(
      "[Auth] VITE_KEYCLOAK_URL is not set. Configure Keycloak URL for the SPA build."
    );
    return "";
  }
  return `${url}/realms/${realm}`;
}

/**
 * Start Keycloak OIDC login (local account or optional Google SSO on the KC page).
 * Call from an event handler — not during render — so the state cookie stays in sync.
 */
export const startLogin = (options?: StartLoginOptions) => {
  const issuer = keycloakIssuer();
  const clientId =
    (import.meta.env.VITE_KEYCLOAK_CLIENT_ID as string | undefined) ||
    "biocollect-web";
  if (!issuer) return;

  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const nonce = crypto.randomUUID();
  const codeVerifier = randomPkceVerifier();

  document.cookie = `${OAUTH_STATE_COOKIE}=${nonce}; Path=/; Max-Age=600; SameSite=None; Secure`;

  void (async () => {
    const codeChallenge = await pkceChallengeS256(codeVerifier);
    const state = encodeOAuthState({ redirectUri, nonce, codeVerifier });

    const path =
      options?.mode === "register"
        ? "protocol/openid-connect/registrations"
        : "protocol/openid-connect/auth";

    const url = new URL(`${issuer}/${path}`);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid profile email");
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");

    window.location.href = url.toString();
  })();
};
