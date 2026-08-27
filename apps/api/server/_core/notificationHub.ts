import { randomUUID } from "crypto";
import { ENV } from "./env";

export type NotificationChannel = "EMAIL" | "SMS" | "WHATSAPP";

export type SendNotificationInput = {
  channel: NotificationChannel;
  to: string[];
  subject?: string;
  body?: string;
  from?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
};

type CachedToken = {
  accessToken: string;
  expiresAtMs: number;
};

let cachedToken: CachedToken | null = null;

export function isNotificationHubConfigured(): boolean {
  return Boolean(ENV.notificationHubBaseUrl);
}

async function fetchClientCredentialsToken(): Promise<string | null> {
  if (!ENV.notificationHubOauthClientSecret) {
    console.warn(
      "[NotificationHub] OAUTH client secret missing; cannot obtain token"
    );
    return null;
  }

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAtMs > now + 30_000) {
    return cachedToken.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: ENV.notificationHubOauthClientId,
    client_secret: ENV.notificationHubOauthClientSecret,
  });

  const response = await fetch(ENV.notificationHubOauthTokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.warn(
      `[NotificationHub] Token request failed (${response.status})${
        detail ? `: ${detail}` : ""
      }`
    );
    return null;
  }

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) {
    console.warn("[NotificationHub] Token response missing access_token");
    return null;
  }

  const expiresInSec = typeof data.expires_in === "number" ? data.expires_in : 300;
  cachedToken = {
    accessToken: data.access_token,
    expiresAtMs: now + expiresInSec * 1000,
  };
  return data.access_token;
}

/**
 * Send a notification via OptimizeSolux notification-hub.
 * Returns true when the hub accepted the request (HTTP 202/2xx).
 * When the hub is not configured, logs a warning and returns false (no-op).
 */
export async function sendNotification(
  input: SendNotificationInput
): Promise<boolean> {
  if (!isNotificationHubConfigured()) {
    console.warn(
      "[NotificationHub] NOTIFICATION_HUB_BASE_URL not set; skipping send"
    );
    return false;
  }

  if (!input.to.length) {
    console.warn("[NotificationHub] No recipients; skipping send");
    return false;
  }

  try {
    const token = await fetchClientCredentialsToken();
    if (!token) return false;

    const response = await fetch(
      `${ENV.notificationHubBaseUrl}/v1/notifications`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Idempotency-Key": input.idempotencyKey ?? randomUUID(),
          "X-App-Id": "biocollect",
        },
        body: JSON.stringify({
          channel: input.channel,
          from: input.from ?? ENV.notificationHubFrom,
          to: input.to,
          subject: input.subject,
          body: input.body,
          metadata: input.metadata ?? { app: "biocollect" },
        }),
      }
    );

    if (!response.ok && response.status !== 202) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[NotificationHub] Send failed (${response.status})${
          detail ? `: ${detail}` : ""
        }`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[NotificationHub] Send error:", error);
    return false;
  }
}
