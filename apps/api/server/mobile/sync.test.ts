import { describe, expect, it, vi } from "vitest";
import { createMobileSyncHandlers } from "./sync";

const user = { id: 7, role: "Enquêteur" as const };
const assignment = { campaignId: "campaign-1", campaignName: "Recensement 2026", projectId: "project-1", teamId: "team-1", teamName: "Équipe Nord" };
const bundle = {
  project: { id: "project-1", name: "Collecte pilote", isActive: true },
  config: { requiredFingers: ["RIGHT_THUMB"], nfiqThreshold: 3, matchingThreshold: 85 },
  form: { id: "form-1", name: "Enrôlement", fields: [] },
};

function createDependencies() {
  return {
    requireTenantRole: vi.fn(async ({ tenantId }: { tenantId: string }) => tenantId === "tenant-1" ? { role: "Enquêteur" } : null),
    listTenantProjects: vi.fn(async () => [{ id: "project-1", name: "Collecte pilote", isActive: true }]),
    getTenantSyncBundle: vi.fn(async () => ({ project: bundle.project, biometricConfig: bundle.config, formSchema: bundle.form })),
    getTenantProjectConfiguration: vi.fn(async (tenantId: string, projectId: string) => tenantId === "tenant-1" && projectId === "project-1" ? { project: bundle.project, config: bundle.config } : null),
    getMobileCampaignAssignments: vi.fn(async () => [assignment]),
    getActiveOperatorCampaignAssignment: vi.fn(async () => ({ campaignId: assignment.campaignId, teamId: assignment.teamId })),
    createSyncSession: vi.fn(async () => "sync-1"),
    updateSyncSessionProgress: vi.fn(async () => undefined),
    createSyncedSubmission: vi.fn(async () => ({ id: "server-submission" })),
    runMockDeduplication: vi.fn(async () => ({ id: "server-submission", status: "VALIDATED" })),
    isValidMinioPath: vi.fn((path: string) => path.startsWith("minio://")),
  };
}

const validPush = {
  tenantId: "tenant-1",
  campaignId: "campaign-1",
  totalOffline: 3,
  selectedForSync: 1,
  submissions: [{
    id: "mobile-1", projectId: "project-1", campaignId: "campaign-1", formId: "form-1", data: { name: "Awa" },
    attachments: [{ id: "fp-1", type: "fingerprint" as const, minioPath: "minio://biocollect/tenant-1/project-1/fingerprint_RIGHT_THUMB.bin", capturedAt: 1, fingerType: "RIGHT_THUMB", nfiqScore: 2 }],
  }],
};

describe("API mobile Pull/Push", () => {
  it("retourne uniquement les campagnes actives affectées à l’opérateur", async () => {
    const dependencies = createDependencies();
    const handlers = createMobileSyncHandlers(dependencies as any);
    const result = await handlers.pull(user, "tenant-1");
    expect(result.projects).toEqual([{ projectId: "project-1", projectName: "Collecte pilote", requiredFingers: ["RIGHT_THUMB"], nfiqThreshold: 3, matchingThreshold: 85, downloadedAt: expect.any(Number), campaigns: [{ campaignId: "campaign-1", campaignName: "Recensement 2026", teamId: "team-1", teamName: "Équipe Nord" }], forms: [{ id: "form-1", name: "Enrôlement", fields: [], steps: [{ id: "legacy", label: "Enrôlement", order: 0, kind: "fields", fieldIds: [] }] }] }]);
    expect(dependencies.requireTenantRole).toHaveBeenCalledWith(expect.objectContaining({ tenantId: "tenant-1", userId: 7, allowed: expect.arrayContaining(["Enquêteur"]) }));
  });

  it("crée et renseigne une session de synchronisation pendant le pipeline biométrique", async () => {
    const dependencies = createDependencies();
    const handlers = createMobileSyncHandlers(dependencies as any);
    await expect(handlers.push(user, validPush)).resolves.toEqual({ syncSessionId: "sync-1", acceptedSubmissionIds: ["mobile-1"], rejected: [] });
    expect(dependencies.createSyncSession).toHaveBeenCalledWith({ campaignId: "campaign-1", teamId: "team-1", operatorId: 7, totalOffline: 3, selectedForSync: 1 });
    expect(dependencies.createSyncedSubmission).toHaveBeenCalledWith(expect.objectContaining({ projectId: "project-1", formSchemaId: "form-1", investigatorId: 7, attachments: [{ fingerType: "RIGHT_THUMB", minioPath: expect.stringContaining("minio://"), nfiqScore: 2 }] }));
    expect(dependencies.runMockDeduplication).toHaveBeenCalledWith("server-submission");
    expect(dependencies.updateSyncSessionProgress).toHaveBeenLastCalledWith({ syncSessionId: "sync-1", receivedCount: 1, failedCount: 0, deduplicationSuccessCount: 1, status: "COMPLETED" });
  });

  it("refuse l’accès à un tenant dont l’agent n’est pas membre", async () => {
    const handlers = createMobileSyncHandlers(createDependencies() as any);
    await expect(handlers.pull(user, "tenant-interdit")).rejects.toThrow("Accès refusé");
  });

  it("rejette un dossier invalide sans interrompre la session de synchronisation", async () => {
    const dependencies = createDependencies();
    const handlers = createMobileSyncHandlers(dependencies as any);
    const result = await handlers.push(user, { ...validPush, submissions: [{ ...validPush.submissions[0], id: "invalid", attachments: [{ ...validPush.submissions[0].attachments[0], minioPath: "https://unsafe.example/fp" }] }] });
    expect(result.acceptedSubmissionIds).toEqual([]);
    expect(result.rejected[0]).toMatchObject({ id: "invalid", reason: expect.stringContaining("MinIO") });
    expect(dependencies.updateSyncSessionProgress).toHaveBeenLastCalledWith({ syncSessionId: "sync-1", receivedCount: 0, failedCount: 1, deduplicationSuccessCount: 0, status: "COMPLETED" });
    expect(dependencies.createSyncedSubmission).not.toHaveBeenCalled();
  });
});
