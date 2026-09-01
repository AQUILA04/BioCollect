import type { SubmissionStatus } from "../../../api/shared/biocollect";
import type { TranslationKey } from "@biocollect/i18n";

export const FINGER_TYPES = [
  "RIGHT_THUMB",
  "LEFT_THUMB",
  "RIGHT_INDEX",
  "LEFT_INDEX",
  "RIGHT_MIDDLE",
  "LEFT_MIDDLE",
  "RIGHT_RING",
  "LEFT_RING",
  "RIGHT_LITTLE",
  "LEFT_LITTLE",
] as const;

const FINGER_LABEL_KEYS: Record<string, TranslationKey> = {
  RIGHT_THUMB: "projects.fingerRightThumb",
  LEFT_THUMB: "projects.fingerLeftThumb",
  RIGHT_INDEX: "projects.fingerRightIndex",
  LEFT_INDEX: "projects.fingerLeftIndex",
  RIGHT_MIDDLE: "projects.fingerRightMiddle",
  LEFT_MIDDLE: "projects.fingerLeftMiddle",
  RIGHT_RING: "projects.fingerRightRing",
  LEFT_RING: "projects.fingerLeftRing",
  RIGHT_LITTLE: "projects.fingerRightLittle",
  LEFT_LITTLE: "projects.fingerLeftLittle",
};

export function fingerLabelKey(finger: string): TranslationKey {
  return FINGER_LABEL_KEYS[finger] ?? "projects.fingerRightThumb";
}

export const STATUS_CLASS: Record<SubmissionStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SYNCED: "bg-blue-50 text-blue-700",
  PROCESSING: "bg-amber-50 text-amber-700",
  VALIDATED: "bg-emerald-50 text-emerald-700",
  SUSPECTED_DUPLICATE: "bg-rose-50 text-rose-700",
  REJECTED: "bg-slate-200 text-slate-700",
};

export function formatDate(value: Date | string | number) {
  return new Date(value).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}
