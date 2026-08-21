import { createMockWebhookResult } from "./mockScaleBiometrics";
import { assertTransition } from "./workflow";
import { findValidatedReference, getSubmissionWithAttachments, updateSubmissionStatus } from "../db";

export async function runMockDeduplication(submissionId: string) {
  const synced = await getSubmissionWithAttachments(submissionId);
  if (!synced) throw new Error("Dossier introuvable.");
  assertTransition("SYNCED", "PROCESSING");
  await updateSubmissionStatus(submissionId, "PROCESSING");
  const reference = await findValidatedReference(synced.projectId, submissionId);
  const result = createMockWebhookResult(synced.attachments.map(item => item.minioPath), Boolean(reference));
  if (result.outcome === "MATCH" && reference) {
    assertTransition("PROCESSING", "SUSPECTED_DUPLICATE");
    return updateSubmissionStatus(submissionId, "SUSPECTED_DUPLICATE", { matchedSubmissionId: reference.id, similarityScore: result.similarityScore });
  }
  assertTransition("PROCESSING", "VALIDATED");
  return updateSubmissionStatus(submissionId, "VALIDATED", { matchedSubmissionId: null, similarityScore: null });
}
