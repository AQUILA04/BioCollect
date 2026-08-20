import { describe, expect, it } from "vitest";
import { createMockWebhookResult, isValidMinioPath } from "./mockScaleBiometrics";

describe("mock ScaleBiometrics autonome", () => {
  it("retourne NO_MATCH quand aucun scénario de doublon n’est fourni", () => {
    expect(createMockWebhookResult(["minio://biocollect/fingerprints/new.wsq"], true)).toEqual({ outcome: "NO_MATCH", similarityScore: null });
  });

  it("retourne un MATCH déterministe pour un scénario duplicate avec référence", () => {
    const first = createMockWebhookResult(["minio://biocollect/fingerprints/duplicate-right-thumb.wsq"], true);
    const second = createMockWebhookResult(["minio://biocollect/fingerprints/duplicate-right-thumb.wsq"], true);
    expect(first.outcome).toBe("MATCH");
    expect(first.similarityScore).toBeGreaterThanOrEqual(75);
    expect(first).toEqual(second);
  });

  it("valide strictement les chemins MinIO", () => {
    expect(isValidMinioPath("minio://biocollect/fingerprints/a.wsq")).toBe(true);
    expect(isValidMinioPath("https://storage.example/a.wsq")).toBe(false);
    expect(isValidMinioPath("minio://bucket")).toBe(false);
  });
});
