import express from "express";
import type { Server } from "http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMobileSyncHandlers, registerMobileSyncRoutes } from "./sync";

const user = { id: 7, role: "Enquêteur" as const };
const servers: Server[] = [];

async function request(app: express.Express, path: string, init?: RequestInit) {
  const server = await new Promise<Server>(resolve => { const value = app.listen(0, () => resolve(value)); });
  servers.push(server);
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Adresse de test indisponible.");
  return fetch(`http://127.0.0.1:${address.port}${path}`, init);
}

afterEach(async () => { await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve())))); });

function dependencies() {
  return {
    requireTenantRole: vi.fn(async () => ({ role: "Enquêteur" })),
    listTenantProjects: vi.fn(async () => [{ id: "project-1", name: "Collecte pilote", isActive: true }]),
    getTenantSyncBundle: vi.fn(async () => ({ project: { id: "project-1", name: "Collecte pilote", isActive: true }, biometricConfig: { requiredFingers: ["RIGHT_THUMB"], nfiqThreshold: 3, matchingThreshold: 85 }, formSchema: { id: "form-1", name: "Enrôlement", fields: [] } })),
    getTenantProjectConfiguration: vi.fn(async () => ({ project: { id: "project-1", isActive: true }, config: { requiredFingers: ["RIGHT_THUMB"], nfiqThreshold: 3 } })),
    getMobileCampaignAssignments: vi.fn(async () => [{ campaignId: "campaign-1", campaignName: "Recensement", projectId: "project-1", teamId: "team-1", teamName: "Équipe Nord" }]),
    getActiveOperatorCampaignAssignment: vi.fn(async () => ({ campaignId: "campaign-1", teamId: "team-1" })),
    createSyncSession: vi.fn(async () => "sync-1"),
    updateSyncSessionProgress: vi.fn(async () => undefined),
    createSyncedSubmission: vi.fn(async () => ({ id: "server-1" })),
    runMockDeduplication: vi.fn(async () => ({ status: "VALIDATED" })),
    isValidMinioPath: vi.fn(() => true),
  };
}

describe("routes HTTP mobiles", () => {
  it("sert le bundle Pull limité à la campagne active de l’opérateur", async () => {
    const app = express();
    const handlers = createMobileSyncHandlers(dependencies() as any);
    registerMobileSyncRoutes(app, { handlers, authenticate: vi.fn(async () => user) });
    const response = await request(app, "/api/mobile/sync/pull?tenantId=tenant-1", { headers: { Authorization: "Bearer test" } });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ projects: [{ projectId: "project-1", campaigns: [{ campaignId: "campaign-1", teamId: "team-1" }], forms: [{ id: "form-1" }] }] });
  });

  it("retourne les identifiants acceptés et la session de synchronisation", async () => {
    const app = express(); app.use(express.json());
    const handlers = createMobileSyncHandlers(dependencies() as any);
    registerMobileSyncRoutes(app, { handlers, authenticate: vi.fn(async () => user) });
    const response = await request(app, "/api/mobile/sync/push", { method: "POST", headers: { Authorization: "Bearer test", "Content-Type": "application/json" }, body: JSON.stringify({ tenantId: "tenant-1", campaignId: "campaign-1", totalOffline: 2, selectedForSync: 1, submissions: [{ id: "local-1", projectId: "project-1", campaignId: "campaign-1", formId: "form-1", data: { name: "Awa" }, attachments: [{ id: "fp-1", type: "fingerprint", minioPath: "minio://tenant/fp", capturedAt: 1, fingerType: "RIGHT_THUMB", nfiqScore: 2 }] }] }) });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ syncSessionId: "sync-1", acceptedSubmissionIds: ["local-1"], rejected: [] });
  });
});
