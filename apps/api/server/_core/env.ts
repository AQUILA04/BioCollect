export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  /** Platform owner email promoted to Superadmin (idempotent). */
  ownerEmail: (
    process.env.OWNER_EMAIL ?? "francis.ahonsou@gmail.com"
  ).trim().toLowerCase(),
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  /** Issuer used by the API for token/userinfo (may be internal Docker hostname). */
  oidcIssuerUri:
    process.env.OIDC_ISSUER_URI ??
    process.env.OIDC_PUBLIC_ISSUER_URI ??
    "",
  oidcClientId:
    process.env.OIDC_CLIENT_ID ??
    process.env.VITE_KEYCLOAK_CLIENT_ID ??
    "biocollect-web",
  /** Optional confidential client secret (public PKCE clients leave empty). */
  oidcClientSecret: process.env.OIDC_CLIENT_SECRET ?? "",
  notificationHubBaseUrl: (process.env.NOTIFICATION_HUB_BASE_URL ?? "").replace(
    /\/$/,
    ""
  ),
  notificationHubFrom:
    process.env.NOTIFICATION_HUB_FROM ?? "notifications@optimizesolux.com",
  notificationHubOauthTokenUrl:
    process.env.NOTIFICATION_HUB_OAUTH_TOKEN_URL ??
    "https://auth.optimizesolux.com/realms/notification-hub/protocol/openid-connect/token",
  notificationHubOauthClientId:
    process.env.NOTIFICATION_HUB_OAUTH_CLIENT_ID ??
    "biocollect-notification-sender",
  notificationHubOauthClientSecret:
    process.env.NOTIFICATION_HUB_OAUTH_CLIENT_SECRET ?? "",
  /** Keycloak base URL (no /realms/...). Derived from OIDC issuer when unset. */
  keycloakUrl: (() => {
    const explicit = (process.env.KEYCLOAK_URL ?? "").replace(/\/$/, "");
    if (explicit) return explicit;
    const issuer =
      process.env.OIDC_ISSUER_URI ?? process.env.OIDC_PUBLIC_ISSUER_URI ?? "";
    return issuer.replace(/\/realms\/[^/]+\/?$/, "").replace(/\/$/, "");
  })(),
  keycloakRealm:
    process.env.KEYCLOAK_REALM ??
    process.env.VITE_KEYCLOAK_REALM ??
    "biocollect",
  keycloakAdminUsername: process.env.KEYCLOAK_ADMIN ?? "",
  keycloakAdminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD ?? "",
  /** Client used as clientId for execute-actions-email (must allow redirect). */
  keycloakActionsClientId:
    process.env.KEYCLOAK_ACTIONS_CLIENT_ID ??
    process.env.OIDC_CLIENT_ID ??
    process.env.VITE_KEYCLOAK_CLIENT_ID ??
    "biocollect-web",
  appPublicUrl: (process.env.APP_PUBLIC_URL ?? process.env.FRONTEND_URL ?? "")
    .trim()
    .replace(/\/$/, ""),
};
