import type { SubmissionStatus } from "../../../api/shared/biocollect";

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
