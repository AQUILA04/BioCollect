import type { ConflictAction, SubmissionStatus } from "../../shared/biocollect";

const transitions: Record<SubmissionStatus, SubmissionStatus[]> = {
  DRAFT: ["SYNCED"],
  SYNCED: ["PROCESSING"],
  PROCESSING: ["VALIDATED", "SUSPECTED_DUPLICATE"],
  VALIDATED: [],
  SUSPECTED_DUPLICATE: ["VALIDATED", "REJECTED"],
  REJECTED: [],
};

export function canTransition(from: SubmissionStatus, to: SubmissionStatus): boolean {
  return transitions[from].includes(to);
}

export function assertTransition(from: SubmissionStatus, to: SubmissionStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Transition de statut interdite : ${from} → ${to}`);
  }
}

export function statusForConflictAction(action: ConflictAction): SubmissionStatus {
  if (action === "Forcer Faux Positif") return "VALIDATED";
  return "REJECTED";
}
