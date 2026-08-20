import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const state = vi.hoisted(() => ({
  reference: null as { id: string } | null,
  submission: null as any,
  updates: [] as string[],
  resolveInput: null as any,
  configurationUpdate: null as any,
}));

vi.mock("../db", () => ({
  getProjectConfiguration: vi.fn(async () => ({
    project: { id: "project-1", isActive: true },
    config: { requiredFingers: ["RIGHT_THUMB"], nfiqThreshold: 3, matchingThreshold: 85 },
  })),
  updateProjectBiometricConfiguration: vi.fn(async (input: any) => { state.configurationUpdate = input; return { project: { id: input.projectId }, config: input }; }),
  createSyncedSubmission: vi.fn(async (input: any) => {
    state.submission = { id: "submission-1", projectId: input.projectId, status: "SYNCED", attachments: input.attachments };
    return state.submission;
  }),
  getSubmissionWithAttachments: vi.fn(async () => state.submission),
  updateSubmissionStatus: vi.fn(async (_id: string, status: string, patch?: Record<string, unknown>) => {
    state.updates.push(status);
    state.submission = { ...state.submission, status, ...patch };
    return state.submission;
  }),
  findValidatedReference: vi.fn(async () => state.reference),
  resolveConflict: vi.fn(async (input: any) => { state.resolveInput = input; return { id: input.suspectedSubmissionId, status: "REJECTED" }; }),
  listProjects: vi.fn(async () => []),
  createProject: vi.fn(),
  listFormSchemas: vi.fn(async () => []),
  createFormSchema: vi.fn(),
  getPublishedSyncBundle: vi.fn(),
  getDashboardData: vi.fn(async () => ({ summary: {}, evolution: [] })),
  listConflictCases: vi.fn(async () => []),
}));

import { appRouter } from "../routers";

function context(role: "Administrateur" | "Superviseur" | "Enquêteur"): TrpcContext {
  return {
    user: { id: 42, openId: "test-user", name: "Test", email: "test@example.com", loginMethod: "test", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("intégration tRPC du pipeline BioCollect", () => {
  beforeEach(() => { state.reference = null; state.submission = null; state.updates = []; state.resolveInput = null; state.configurationUpdate = null; });

  it("synchronise un dossier Enquêteur et déclenche automatiquement VALIDATED", async () => {
    const caller = appRouter.createCaller(context("Enquêteur"));
    const result = await caller.biocollect.sync.push({ projectId: "project-1", data: { nom: "Ada" }, attachments: [{ fingerType: "RIGHT_THUMB", minioPath: "minio://biocollect/fingerprints/ada.wsq", nfiqScore: 2 }] });
    expect(result?.status).toBe("VALIDATED");
    expect(state.updates).toEqual(["PROCESSING", "VALIDATED"]);
  });

  it("met un dossier en SUSPECTED_DUPLICATE en présence d’un MATCH", async () => {
    state.reference = { id: "validated-previous" };
    const caller = appRouter.createCaller(context("Enquêteur"));
    const result = await caller.biocollect.sync.push({ projectId: "project-1", data: { nom: "Ada" }, attachments: [{ fingerType: "RIGHT_THUMB", minioPath: "minio://biocollect/fingerprints/duplicate-ada.wsq", nfiqScore: 1 }] });
    expect(result?.status).toBe("SUSPECTED_DUPLICATE");
    expect(result?.matchedSubmissionId).toBe("validated-previous");
    expect(state.updates).toEqual(["PROCESSING", "SUSPECTED_DUPLICATE"]);
  });

  it("refuse une synchronisation qui ne référence pas MinIO", async () => {
    const caller = appRouter.createCaller(context("Enquêteur"));
    await expect(caller.biocollect.sync.push({ projectId: "project-1", data: {}, attachments: [{ fingerType: "RIGHT_THUMB", minioPath: "https://example.com/fingerprint.wsq", nfiqScore: 1 }] })).rejects.toMatchObject({ code: "BAD_REQUEST" } satisfies Partial<TRPCError>);
  });

  it("refuse le pipeline de synchronisation à un Superviseur", async () => {
    const caller = appRouter.createCaller(context("Superviseur"));
    await expect(caller.biocollect.sync.pull({ projectId: "project-1" })).rejects.toMatchObject({ code: "FORBIDDEN" } satisfies Partial<TRPCError>);
  });

  it("enregistre exactement l’action de conflit choisie par un Superviseur", async () => {
    const caller = appRouter.createCaller(context("Superviseur"));
    await caller.biocollect.conflicts.resolve({ suspectedSubmissionId: "new-1", targetSubmissionId: "existing-1", action: "Forcer Faux Positif", reason: "Données démographiques différentes" });
    expect(state.resolveInput).toMatchObject({ action: "Forcer Faux Positif", resolvedBy: 42 });
  });

  it("autorise un Administrateur à mettre à jour les seuils biométriques", async () => {
    const caller = appRouter.createCaller(context("Administrateur"));
    await caller.biocollect.projects.updateConfiguration({ projectId: "project-1", requiredFingers: ["RIGHT_THUMB", "LEFT_THUMB"], nfiqThreshold: 2, matchingThreshold: 91 });
    expect(state.configurationUpdate).toEqual({ projectId: "project-1", requiredFingers: ["RIGHT_THUMB", "LEFT_THUMB"], nfiqThreshold: 2, matchingThreshold: 91 });
  });
});
