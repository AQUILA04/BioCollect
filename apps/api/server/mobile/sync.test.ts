import { describe, expect, it, vi } from "vitest";
import { createMobileSyncHandlers } from "./sync";

const user = { id: 7, role: "Enquêteur" as const };
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
    createSyncedSubmission: vi.fn(async () => ({ id: "server-submission" })),
    runMockDeduplication: vi.fn(async () => ({ id: "server-submission", status: "VALIDATED" })),
    isValidMinioPath: vi.fn((path: string) => path.startsWith("minio://")),
  };
}

const validPush = {
  tenantId: "tenant-1",
  submissions: [{
    id: "mobile-1", projectId: "project-1", formId: "form-1", data: { name: "Awa" },
    attachments: [{ id: "fp-1", type: "fingerprint" as const, minioPath: "minio://biocollect/tenant-1/project-1/fingerprint_RIGHT_THUMB.bin", capturedAt: 1, fingerType: "RIGHT_THUMB", nfiqScore: 2 }],
  }],
};

describe("API mobile Pull/Push", () => {
  it("retourne uniquement les bundles publiés des projets actifs appartenant au tenant autorisé", async () => {
    const dependencies = createDependencies();
    const handlers = createMobileSyncHandlers(dependencies as any);
    const result = await handlers.pull(user, "tenant-1");
    expect(result.projects).toEqual([{ projectId: "project-1", projectName: "Collecte pilote", requiredFingers: ["RIGHT_THUMB"], nfiqThreshold: 3, matchingThreshold: 85, downloadedAt: expect.any(Number), forms: [{ id: "form-1", name: "Enrôlement", fields: [] }] }]);
    expect(dependencies.requireTenantRole).toHaveBeenCalledWith(expect.objectContaining({ tenantId: "tenant-1", userId: 7, allowed: expect.arrayContaining(["Enquêteur"]) }));
  });

  it("accepte un dossier mobile conforme, puis déclenche le pipeline biométrique", async () => {
    const dependencies = createDependencies();
    const handlers = createMobileSyncHandlers(dependencies as any);
    await expect(handlers.push(user, validPush)).resolves.toEqual({ acceptedSubmissionIds: ["mobile-1"], rejected: [] });
    expect(dependencies.createSyncedSubmission).toHaveBeenCalledWith(expect.objectContaining({ projectId: "project-1", formSchemaId: "form-1", investigatorId: 7, attachments: [{ fingerType: "RIGHT_THUMB", minioPath: expect.stringContaining("minio://"), nfiqScore: 2 }] }));
    expect(dependencies.runMockDeduplication).toHaveBeenCalledWith("server-submission");
  });

  it("refuse l’accès à un tenant dont l’agent n’est pas membre", async () => {
    const handlers = createMobileSyncHandlers(createDependencies() as any);
    await expect(handlers.pull(user, "tenant-interdit")).rejects.toThrow("Accès refusé");
  });

  it("rejette un dossier qui ne fournit pas de chemin MinIO valide sans interrompre la file", async () => {
    const dependencies = createDependencies();
    const handlers = createMobileSyncHandlers(dependencies as any);
    const result = await handlers.push(user, { ...validPush, submissions: [{ ...validPush.submissions[0], id: "invalid", attachments: [{ ...validPush.submissions[0].attachments[0], minioPath: "https://unsafe.example/fp" }] }] });
    expect(result.acceptedSubmissionIds).toEqual([]);
    expect(result.rejected[0]).toMatchObject({ id: "invalid", reason: expect.stringContaining("MinIO") });
    expect(dependencies.createSyncedSubmission).not.toHaveBeenCalled();
  });
});
