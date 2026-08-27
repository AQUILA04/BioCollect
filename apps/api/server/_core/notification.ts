import { TRPCError } from "@trpc/server";
import { ENV } from "./env";
import { sendNotification } from "./notificationHub";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const trimValue = (value: string): string => value.trim();
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const validatePayload = (input: NotificationPayload): NotificationPayload => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required.",
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required.",
    });
  }

  const title = trimValue(input.title);
  const content = trimValue(input.content);

  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`,
    });
  }

  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`,
    });
  }

  return { title, content };
};

/**
 * Notify the platform owner via notification-hub (EMAIL).
 * Returns `true` if the hub accepted the request, `false` when unavailable.
 */
export async function notifyOwner(
  payload: NotificationPayload
): Promise<boolean> {
  const { title, content } = validatePayload(payload);
  const ownerEmail = ENV.ownerEmail;
  if (!ownerEmail) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "OWNER_EMAIL is not configured.",
    });
  }

  return sendNotification({
    channel: "EMAIL",
    to: [ownerEmail],
    subject: title,
    body: `<p>${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`,
    metadata: { source: "biocollect.notifyOwner" },
  });
}
