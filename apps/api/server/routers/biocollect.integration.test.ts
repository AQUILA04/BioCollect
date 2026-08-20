import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const state = vi.hoisted(() => ({ reference: null as { id: string } | null, submission: null as any, updates: [] as string[], resolveInput: null as any, tenantCreate: null as any, tenantSelection: null as any, tenantUpdate: null as any, configurationUpdate: null as any }));

vi.mock("../tenantDb", () => ({
  requireTenantRole: vi.fn(async ({ tenantId }: { tenantId: string }) => tenantId === "tenant-a" ? { tenant: { id: "tenant-a", isActive: true }, role: "Administrateur" } : null),
  createTenant: vi.fn(async (input: any) => { state.tenantCreate = input; return { id: "tenant-new", name: input.name, slug: "nouvel-espace" }; }),
  selectActiveTenant: vi.fn(async (input: any) => { state.tenantSelection = input; return { id: input.tenantId }; }),
  updateTenantBySuperadmin: vi.fn(async (input: any) => { state.tenantUpdate = input; return { id: input.tenantId, ...input }; }),
  listUserTenants: vi.fn(async () => []), listAllTenants: vi.fn(async () => []), listTenantProjects: vi.fn(async () => []),
  createTenantProject: vi.fn(), getTenantProjectConfiguration: vi.fn(async (tenantId: string) => tenantId === "tenant-a" ? { project: { id: "project-1", isActive: true }, config: { requiredFingers: ["RIGHT_THUMB"], nfiqThreshold: 3, matchingThreshold: 85 } } : null),
  updateTenantProjectConfiguration: vi.fn(async (input: any) => { state.configurationUpdate = input; return { project: { id: input.projectId }, config: input }; }),
  listTenantForms: vi.fn(async () => []), createTenantForm: vi.fn(), getTenantSyncBundle: vi.fn(), getTenantDashboard: vi.fn(async () => ({ summary: {}, evolution: [] })), listTenantConflictCases: vi.fn(async () => []),
  tenantOwnsSubmission: vi.fn(async (tenantId: string, submissionId: string) => tenantId === "tenant-a" && submissionId !== "outside"), assertTenantProject: vi.fn(async () => true),
}));

vi.mock("../db", () => ({
  createSyncedSubmission: vi.fn(async (input: any) => { state.submission = { id: "submission-1", projectId: input.projectId, status: "SYNCED", attachments: input.attachments }; return state.submission; }),
  getSubmissionWithAttachments: vi.fn(async () => state.submission),
  updateSubmissionStatus: vi.fn(async (_id: string, status: string, patch?: Record<string, unknown>) => { state.updates.push(status); state.submission = { ...state.submission, status, ...patch }; return state.submission; }),
  findValidatedReference: vi.fn(async () => state.reference),
  resolveConflict: vi.fn(async (input: any) => { state.resolveInput = input; return { id: input.suspectedSubmissionId, status: "REJECTED" }; }),
}));

import { appRouter } from "../routers";

function context(role: "Superadmin" | "Administrateur" | "Superviseur" | "Enquêteur"): TrpcContext { return { user: { id: 42, openId: "test-user", name: "Test", email: "test@example.com", loginMethod: "test", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] }; }
const validPush = { tenantId: "tenant-a", projectId: "project-1", data: { nom: "Ada" }, attachments: [{ fingerType: "RIGHT_THUMB", minioPath: "minio://biocollect/fingerprints/ada.wsq", nfiqScore: 2 }] };

describe("isolation multi-tenant tRPC", () => {
  beforeEach(() => { state.reference = null; state.submission = null; state.updates = []; state.resolveInput = null; state.tenantCreate = null; state.tenantSelection = null; state.tenantUpdate = null; state.configurationUpdate = null; });
  it("synchronise un dossier dans un espace autorisé et déclenche VALIDATED", async () => { const result = await appRouter.createCaller(context("Enquêteur")).biocollect.sync.push(validPush); expect(result?.status).toBe("VALIDATED"); expect(state.updates).toEqual(["PROCESSING", "VALIDATED"]); });
  it("refuse toute synchronisation dans un tenant non autorisé", async () => { await expect(appRouter.createCaller(context("Enquêteur")).biocollect.sync.push({ ...validPush, tenantId: "tenant-b" })).rejects.toMatchObject({ code: "FORBIDDEN" }); });
  it("produit SUSPECTED_DUPLICATE dans le tenant autorisé", async () => { state.reference = { id: "validated-previous" }; const result = await appRouter.createCaller(context("Enquêteur")).biocollect.sync.push({ ...validPush, attachments: [{ ...validPush.attachments[0], minioPath: "minio://biocollect/fingerprints/duplicate-ada.wsq" }] }); expect(result?.status).toBe("SUSPECTED_DUPLICATE"); expect(result?.matchedSubmissionId).toBe("validated-previous"); });
  it("autorise un Superadmin à créer un tenant depuis le back-office", async () => { const result = await appRouter.createCaller(context("Superadmin")).biocollect.tenants.createBySuperadmin({ name: "Entité Nord" }); expect(result.id).toBe("tenant-new"); expect(state.tenantCreate).toMatchObject({ name: "Entité Nord", userId: 42 }); });
  it("permet à une personne authentifiée de créer puis sélectionner son espace", async () => { const caller = appRouter.createCaller(context("Enquêteur")); const created = await caller.biocollect.tenants.create({ name: "Collectif Sud" }); expect(created.id).toBe("tenant-new"); await caller.biocollect.tenants.select({ tenantId: "tenant-a" }); expect(state.tenantSelection).toMatchObject({ tenantId: "tenant-a", userId: 42 }); });
  it("refuse à un Administrateur de créer un tenant Superadmin", async () => { await expect(appRouter.createCaller(context("Administrateur")).biocollect.tenants.createBySuperadmin({ name: "Interdit" })).rejects.toMatchObject({ code: "FORBIDDEN" }); });
  it("permet au Superadmin de modifier l’état d’un tenant", async () => { await appRouter.createCaller(context("Superadmin")).biocollect.tenants.updateBySuperadmin({ tenantId: "tenant-a", name: "Entité renommée", isActive: false }); expect(state.tenantUpdate).toMatchObject({ tenantId: "tenant-a", name: "Entité renommée", isActive: false }); });
  it("refuse la résolution d’un conflit qui traverse deux espaces", async () => { await expect(appRouter.createCaller(context("Superviseur")).biocollect.conflicts.resolve({ tenantId: "tenant-a", suspectedSubmissionId: "new-1", targetSubmissionId: "outside", action: "Forcer Faux Positif" })).rejects.toMatchObject({ code: "FORBIDDEN" }); });
  it("enregistre la configuration d’un projet uniquement dans le tenant actif", async () => { await appRouter.createCaller(context("Administrateur")).biocollect.projects.updateConfiguration({ tenantId: "tenant-a", projectId: "project-1", requiredFingers: ["RIGHT_THUMB", "LEFT_THUMB"], nfiqThreshold: 2, matchingThreshold: 91 }); expect(state.configurationUpdate).toMatchObject({ tenantId: "tenant-a", projectId: "project-1" }); });
});
