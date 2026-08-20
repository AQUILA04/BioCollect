export type MockWebhookResult = {
  outcome: "MATCH" | "NO_MATCH";
  similarityScore: number | null;
};

function stableScore(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return 75 + (hash % 24);
}

/**
 * Simule de manière déterministe le webhook ScaleBiometrics, sans appel réseau.
 * Un chemin MinIO contenant "duplicate" provoque un MATCH pour tester le pipeline.
 */
export function createMockWebhookResult(minioPaths: string[], hasReference: boolean): MockWebhookResult {
  const marker = minioPaths.join("|");
  const isDuplicateScenario = /duplicate/i.test(marker);

  if (hasReference && isDuplicateScenario) {
    return { outcome: "MATCH", similarityScore: stableScore(marker) };
  }

  return { outcome: "NO_MATCH", similarityScore: null };
}

export function isValidMinioPath(path: string): boolean {
  return /^minio:\/\/[a-z0-9][a-z0-9.-]*\/.+/i.test(path);
}
