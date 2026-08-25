export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
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
};
