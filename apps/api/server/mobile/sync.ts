import type { Express, Request, Response } from "express";
import { z } from "zod";
import { createSyncedSubmission } from "../db";
import { isValidMinioPath } from "../biocollect/mockScaleBiometrics";
import { runMockDeduplication } from "../biocollect/submissionPipeline";
import { createSyncSession, getActiveOperatorCampaignAssignment, getMobileCampaignAssignments, getTenantProjectConfiguration, getTenantSyncBundle, listTenantProjects, requireTenantRole, updateSyncSessionProgress } from "../tenantDb";
import { sdk } from "../_core/sdk";
import type { User } from "../../drizzle/schema";
import type { TenantRole, UserRole } from "../../shared/biocollect";
import { normalizeFormSteps } from "@biocollect/form-engine";

const tenantIdSchema = z.string().min(1).max(80);
const attachmentSchema = z.object({
  id: z.string().min(1).max(120),
  type: z.enum(["fingerprint", "photo"]),
  minioPath: z.string().min(10).max(1024),
  capturedAt: z.number().int().nonnegative(),
  fingerType: z.string().min(2).max(64).optional(),
  nfiqScore: z.number().int().min(1).max(5).optional(),
});
const queuedSubmissionSchema = z.object({
  id: z.string().min(1).max(120),
  projectId: z.string().min(1).max(80),
  campaignId: z.string().min(1).max(80).optional(),
  formId: z.string().min(1).max(80),
  data: z.record(z.string(), z.unknown()),
  attachments: z.array(attachmentSchema).min(1).max(20),
});
const pushBodySchema = z.object({
  tenantId: tenantIdSchema,
  campaignId: z.string().min(1).max(80).optional(),
  totalOffline: z.number().int().min(0).max(100_000).optional(),
  selectedForSync: z.number().int().min(1).max(100).optional(),
  submissions: z.array(queuedSubmissionSchema).min(1).max(100),
});

type MobileUser = Pick<User, "id" | "role">;
type MobileSubmission = z.infer<typeof queuedSubmissionSchema>;
type MobileDependencies = {
  requireTenantRole: typeof requireTenantRole;
  listTenantProjects: typeof listTenantProjects;
  getTenantSyncBundle: typeof getTenantSyncBundle;
  getTenantProjectConfiguration: typeof getTenantProjectConfiguration;
  getMobileCampaignAssignments: typeof getMobileCampaignAssignments;
  getActiveOperatorCampaignAssignment: typeof getActiveOperatorCampaignAssignment;
  createSyncSession: typeof createSyncSession;
  updateSyncSessionProgress: typeof updateSyncSessionProgress;
  createSyncedSubmission: typeof createSyncedSubmission;
  runMockDeduplication: typeof runMockDeduplication;
  isValidMinioPath: typeof isValidMinioPath;
};

const defaultDependencies: MobileDependencies = { requireTenantRole, listTenantProjects, getTenantSyncBundle, getTenantProjectConfiguration, getMobileCampaignAssignments, getActiveOperatorCampaignAssignment, createSyncSession, updateSyncSessionProgress, createSyncedSubmission, runMockDeduplication, isValidMinioPath };
const mobileRoles: TenantRole[] = ["Administrateur", "Superviseur", "Enquêteur"];

function message(error: unknown) { return error instanceof Error ? error.message : "Erreur de synchronisation mobile."; }

export function createMobileSyncHandlers(dependencies: MobileDependencies = defaultDependencies) {
  async function authorize(user: MobileUser, tenantId: string) {
    const access = await dependencies.requireTenantRole({ tenantId, userId: user.id, userRole: user.role as UserRole, allowed: mobileRoles });
    if (!access) throw new Error("Accès refusé à cet espace d’entité.");
    return access;
  }

  async function pull(user: MobileUser, rawTenantId: string) {
    const tenantId = tenantIdSchema.parse(rawTenantId);
    await authorize(user, tenantId);
    const projects = await dependencies.listTenantProjects(tenantId);
    const assignments = await dependencies.getMobileCampaignAssignments(tenantId, user.id);
    const bundles = await Promise.all(projects.filter(project => project.isActive && assignments.some(assignment => assignment.projectId === project.id)).map(project => dependencies.getTenantSyncBundle(tenantId, project.id)));
    return {
      serverTime: Date.now(),
      projects: bundles.flatMap(bundle => bundle?.project && bundle.biometricConfig && bundle.formSchema ? [{
        projectId: bundle.project.id,
        projectName: bundle.project.name,
        requiredFingers: bundle.biometricConfig.requiredFingers as string[],
        nfiqThreshold: bundle.biometricConfig.nfiqThreshold,
        matchingThreshold: bundle.biometricConfig.matchingThreshold,
        downloadedAt: Date.now(),
        campaigns: assignments.filter(assignment => assignment.projectId === bundle.project.id).map(assignment => ({ campaignId: assignment.campaignId, campaignName: assignment.campaignName, teamId: assignment.teamId, teamName: assignment.teamName })),
        forms: [{ id: bundle.formSchema.id, name: bundle.formSchema.name, fields: bundle.formSchema.fields, steps: normalizeFormSteps(bundle.formSchema.name, bundle.formSchema.fields as any[], bundle.formSchema.steps as any[] | null) }],
      }] : []),
    };
  }

  async function pushOne(user: MobileUser, tenantId: string, submission: MobileSubmission) {
    const configuration = await dependencies.getTenantProjectConfiguration(tenantId, submission.projectId);
    if (!configuration?.project || !configuration.config || !configuration.project.isActive) throw new Error("Projet biométrique indisponible dans cet espace.");
    const fingerprints = submission.attachments.filter(item => item.type === "fingerprint");
    if (!fingerprints.length) throw new Error("Au moins une empreinte doit être soumise.");
    const normalized = fingerprints.map(item => {
      if (!item.fingerType || item.nfiqScore === undefined) throw new Error("Chaque empreinte doit indiquer son doigt et son score NFIQ.");
      if (!dependencies.isValidMinioPath(item.minioPath)) throw new Error("Chaque empreinte doit référencer un chemin MinIO valide.");
      return { fingerType: item.fingerType, minioPath: item.minioPath, nfiqScore: item.nfiqScore };
    });
    if (normalized.some(item => item.nfiqScore > configuration.config!.nfiqThreshold)) throw new Error("La qualité NFIQ d’au moins une empreinte ne satisfait pas le seuil du projet.");
    const receivedFingers = new Set(normalized.map(item => item.fingerType));
    if ((configuration.config.requiredFingers as string[]).some(finger => !receivedFingers.has(finger))) throw new Error("Des empreintes obligatoires sont absentes.");
    const synced = await dependencies.createSyncedSubmission({ projectId: submission.projectId, formSchemaId: submission.formId, data: submission.data, attachments: normalized, investigatorId: user.id });
    if (!synced) throw new Error("Impossible de créer le dossier synchronisé.");
    const deduplication = await dependencies.runMockDeduplication(synced.id);
    return { id: submission.id, deduplicationSucceeded: deduplication?.status === "VALIDATED" };
  }

  async function push(user: MobileUser, rawBody: unknown) {
    const { tenantId, campaignId, totalOffline, selectedForSync, submissions } = pushBodySchema.parse(rawBody);
    await authorize(user, tenantId);
    const selected = selectedForSync ?? submissions.length;
    if (selected !== submissions.length) throw new Error("Le nombre d’éléments sélectionnés ne correspond pas au lot transmis.");
    const batchCampaignId = campaignId ?? submissions[0]?.campaignId;
    if (batchCampaignId && submissions.some(submission => (submission.campaignId ?? batchCampaignId) !== batchCampaignId)) throw new Error("Un lot de synchronisation ne peut concerner qu’une seule campagne.");
    const assignment = batchCampaignId ? await dependencies.getActiveOperatorCampaignAssignment({ tenantId, campaignId: batchCampaignId, operatorId: user.id, projectId: submissions[0]!.projectId }) : null;
    if (batchCampaignId && (!assignment || submissions.some(submission => submission.projectId !== submissions[0]!.projectId))) throw new Error("L’opérateur doit appartenir à une équipe active de cette campagne.");
    const syncSessionId = assignment ? await dependencies.createSyncSession({ campaignId: assignment.campaignId, teamId: assignment.teamId, operatorId: user.id, totalOffline: totalOffline ?? submissions.length, selectedForSync: selected }) : null;
    const acceptedSubmissionIds: string[] = [];
    const rejected: Array<{ id: string; reason: string }> = [];
    let deduplicationSuccessCount = 0;
    try {
      for (const submission of submissions) {
        try {
          const result = await pushOne(user, tenantId, submission);
          acceptedSubmissionIds.push(result.id);
          if (result.deduplicationSucceeded) deduplicationSuccessCount += 1;
        } catch (error) { rejected.push({ id: submission.id, reason: message(error) }); }
        if (syncSessionId) await dependencies.updateSyncSessionProgress({ syncSessionId, receivedCount: acceptedSubmissionIds.length, failedCount: rejected.length, deduplicationSuccessCount });
      }
      if (syncSessionId) await dependencies.updateSyncSessionProgress({ syncSessionId, receivedCount: acceptedSubmissionIds.length, failedCount: rejected.length, deduplicationSuccessCount, status: "COMPLETED" });
    } catch (error) {
      if (syncSessionId) await dependencies.updateSyncSessionProgress({ syncSessionId, receivedCount: acceptedSubmissionIds.length, failedCount: rejected.length, deduplicationSuccessCount, status: "FAILED" });
      throw error;
    }
    return { syncSessionId, acceptedSubmissionIds, rejected };
  }
  return { pull, push };
}

type MobileSyncHandlers = ReturnType<typeof createMobileSyncHandlers>;
type RouteOptions = { handlers?: MobileSyncHandlers; authenticate?: (req: Request) => Promise<MobileUser> };

export function registerMobileSyncRoutes(app: Express, options: RouteOptions = {}) {
  const handlers = options.handlers ?? createMobileSyncHandlers();
  const authenticate = options.authenticate ?? ((req: Request) => sdk.authenticateRequest(req));
  app.get("/api/mobile/sync/pull", async (req: Request, res: Response) => {
    try { const user = await authenticate(req); res.json(await handlers.pull(user, String(req.query.tenantId ?? ""))); }
    catch (error) { res.status(401).json({ error: message(error) }); }
  });
  app.post("/api/mobile/sync/push", async (req: Request, res: Response) => {
    try { const user = await authenticate(req); res.json(await handlers.push(user, req.body)); }
    catch (error) { res.status(401).json({ error: message(error) }); }
  });
}
