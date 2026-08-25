import { AXIOS_TIMEOUT_MS, COOKIE_NAME, ONE_YEAR_MS, decodeOAuthState } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import axios, { type AxiosInstance } from "axios";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

export type OidcTokenResponse = {
  access_token: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
};

export type OidcUserInfo = {
  sub: string;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
};

function issuerBase(): string {
  return ENV.oidcIssuerUri.replace(/\/$/, "");
}

class OidcService {
  constructor(private client: AxiosInstance) {
    if (!ENV.oidcIssuerUri) {
      console.error(
        "[OIDC] OIDC_ISSUER_URI is not configured. Set OIDC_ISSUER_URI (e.g. https://auth.optimizesolux.com/realms/biocollect)."
      );
    } else {
      console.log("[OIDC] Initialized with issuer:", ENV.oidcIssuerUri);
    }
  }

  async exchangeCodeForToken(
    code: string,
    state: string,
    codeVerifier: string
  ): Promise<OidcTokenResponse> {
    const { redirectUri } = decodeOAuthState(state);
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: ENV.oidcClientId,
      code_verifier: codeVerifier,
    });
    if (ENV.oidcClientSecret) {
      body.set("client_secret", ENV.oidcClientSecret);
    }

    const { data } = await this.client.post<OidcTokenResponse>(
      `${issuerBase()}/protocol/openid-connect/token`,
      body.toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    return data;
  }

  async getUserInfo(accessToken: string): Promise<OidcUserInfo> {
    const { data } = await this.client.get<Record<string, unknown>>(
      `${issuerBase()}/protocol/openid-connect/userinfo`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const sub = typeof data.sub === "string" ? data.sub : "";
    if (!sub) {
      throw new Error("OIDC userinfo missing sub");
    }

    const given =
      typeof data.given_name === "string" ? data.given_name : "";
    const family =
      typeof data.family_name === "string" ? data.family_name : "";
    const preferred =
      typeof data.preferred_username === "string"
        ? data.preferred_username
        : "";
    const fullName =
      typeof data.name === "string" && data.name.trim()
        ? data.name.trim()
        : [given, family].filter(Boolean).join(" ").trim() ||
          preferred ||
          null;

    const email = typeof data.email === "string" ? data.email : null;

    // Keycloak may expose identity provider via claims when using social login.
    const idp =
      (typeof data.identity_provider === "string" && data.identity_provider) ||
      (typeof (data as { idp?: string }).idp === "string" &&
        (data as { idp?: string }).idp) ||
      null;

    return {
      sub,
      openId: sub,
      name: fullName,
      email,
      loginMethod: idp === "google" ? "google" : idp ?? "keycloak",
    };
  }
}

const createHttpClient = (): AxiosInstance =>
  axios.create({ timeout: AXIOS_TIMEOUT_MS });

class SDKServer {
  private readonly oidc: OidcService;

  constructor(client: AxiosInstance = createHttpClient()) {
    this.oidc = new OidcService(client);
  }

  async exchangeCodeForToken(
    code: string,
    state: string,
    codeVerifier: string
  ): Promise<OidcTokenResponse> {
    return this.oidc.exchangeCodeForToken(code, state, codeVerifier);
  }

  async getUserInfo(accessToken: string): Promise<OidcUserInfo> {
    return this.oidc.getUserInfo(accessToken);
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) return new Map<string, string>();
    return new Map(Object.entries(parseCookieHeader(cookieHeader)));
  }

  private getSessionSecret() {
    return new TextEncoder().encode(ENV.cookieSecret);
  }

  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    return this.signSession(
      {
        openId,
        appId: ENV.oidcClientId,
        name: options.name || "",
      },
      options
    );
  }

  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);

    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(this.getSessionSecret());
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<{ openId: string; appId: string; name: string } | null> {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }

    try {
      const { payload } = await jwtVerify(cookieValue, this.getSessionSecret(), {
        algorithms: ["HS256"],
      });
      const { openId, appId, name } = payload as Record<string, unknown>;

      if (!isNonEmptyString(openId) || !isNonEmptyString(appId)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }

      return {
        openId,
        appId,
        name: typeof name === "string" ? name : "",
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);

    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }

    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }

    const signedInAt = new Date();
    let user = await db.getUserByOpenId(session.openId);

    if (!user) {
      await db.upsertUser({
        openId: session.openId,
        name: session.name || null,
        lastSignedIn: signedInAt,
      });
      user = await db.getUserByOpenId(session.openId);
    }

    if (!user) {
      throw ForbiddenError("User not found");
    }

    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt,
    });

    return user;
  }
}

export type AuthenticatedUser = User & {
  taskUid?: string;
  isCron?: boolean;
};

export const sdk = new SDKServer();
