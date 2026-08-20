import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createFormSchema,
  createProject,
  createSyncedSubmission,
  findValidatedReference,
  getDashboardData,
  getProjectConfiguration,
  getPublishedSyncBundle,
  getSubmissionWithAttachments,
  listConflictCases,
  listFormSchemas,
  listProjects,
  resolveConflict,
  updateProjectBiometricConfiguration,
  updateSubmissionStatus,
} from "../db";
import { CONFLICT_ACTIONS, FORM_FIELD_TYPES } from "../../shared/biocollect";
import { createMockWebhookResult, isValidMinioPath } from "../biocollect/mockScaleBiometrics";
import { assertTransition } from "../biocollect/workflow";
import { adminProcedure, investigatorProcedure, protectedProcedure, router, supervisorProcedure } from "../_core/trpc";

const formFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(160),
  type: z.enum(FORM_FIELD_TYPES),
  required: z.boolean(),
  options: z.array(z.string().min(1).max(120)).optional(),
  condition: z.object({
    fieldId: z.string().min(1),
    operator: z.enum(["equals", "notEquals", "isFilled"]),
    value: z.string().optional(),
  }).optional(),
});

const projectIdSchema = z.object({ projectId: z.string().min(1) });

async function runMockDeduplication(submissionId: string) {
  const synced = await getSubmissionWithAttachments(submissionId);
  if (!synced) throw new TRPCError({ code: "NOT_FOUND", message: "Dossier introuvable." });
  assertTransition("SYNCED", "PROCESSING");
  await updateSubmissionStatus(submissionId, "PROCESSING");
  const reference = await findValidatedReference(synced.projectId, submissionId);
  const result = createMockWebhookResult(synced.attachments.map(item => item.minioPath), Boolean(reference));
  if (result.outcome === "MATCH" && reference) {
    assertTransition("PROCESSING", "SUSPECTED_DUPLICATE");
    return updateSubmissionStatus(submissionId, "SUSPECTED_DUPLICATE", {
      matchedSubmissionId: reference.id,
      similarityScore: result.similarityScore,
    });
  }
  assertTransition("PROCESSING", "VALIDATED");
  return updateSubmissionStatus(submissionId, "VALIDATED", { matchedSubmissionId: null, similarityScore: null });
}

export const biocollectRouter = router({
  projects: router({
    list: supervisorProcedure.query(() => listProjects()),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(3).max(160),
        description: z.string().max(2000).optional(),
        requiredFingers: z.array(z.string().min(2).max(60)).min(1).max(10),
        nfiqThreshold: z.number().int().min(1).max(5),
        matchingThreshold: z.number().int().min(1).max(100),
      }))
      .mutation(({ ctx, input }) => createProject({ ...input, createdBy: ctx.user.id })),
    configuration: supervisorProcedure.input(projectIdSchema).query(({ input }) => getProjectConfiguration(input.projectId)),
    updateConfiguration: adminProcedure
      .input(z.object({
        projectId: z.string().min(1),
        requiredFingers: z.array(z.string().min(2).max(60)).min(1).max(10),
        nfiqThreshold: z.number().int().min(1).max(5),
        matchingThreshold: z.number().int().min(1).max(100),
      }))
      .mutation(({ input }) => updateProjectBiometricConfiguration(input)),
  }),
  forms: router({
    list: supervisorProcedure.input(projectIdSchema).query(({ input }) => listFormSchemas(input.projectId)),
    create: adminProcedure
      .input(z.object({
        projectId: z.string().min(1),
        name: z.string().min(3).max(160),
        fields: z.array(formFieldSchema).max(100),
        isPublished: z.boolean(),
      }))
      .mutation(({ input }) => createFormSchema(input)),
  }),
  sync: router({
    pull: investigatorProcedure.input(projectIdSchema).query(({ input }) => getPublishedSyncBundle(input.projectId)),
    push: investigatorProcedure
      .input(z.object({
        projectId: z.string().min(1),
        formSchemaId: z.string().min(1).optional(),
        data: z.record(z.string(), z.unknown()),
        attachments: z.array(z.object({
          fingerType: z.string().min(2).max(60),
          minioPath: z.string().min(10).max(1024),
          nfiqScore: z.number().int().min(1).max(5),
        })).min(1).max(10),
      }))
      .mutation(async ({ ctx, input }) => {
        const configuration = await getProjectConfiguration(input.projectId);
        const project = configuration?.project;
        const biometricConfig = configuration?.config;
        if (!project || !biometricConfig) throw new TRPCError({ code: "NOT_FOUND", message: "Projet biométrique introuvable." });
        if (!project.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "Le projet est inactif." });
        if (input.attachments.some(item => !isValidMinioPath(item.minioPath))) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Chaque fichier soumis doit référencer un chemin MinIO valide." });
        }
        if (input.attachments.some(item => item.nfiqScore > biometricConfig.nfiqThreshold)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "La qualité NFIQ d’au moins une empreinte ne satisfait pas le seuil du projet." });
        }
        const requiredFingers = biometricConfig.requiredFingers as string[];
        const capturedFingers = new Set(input.attachments.map(item => item.fingerType));
        if (requiredFingers.some(finger => !capturedFingers.has(finger))) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Des empreintes obligatoires sont absentes." });
        }
        const synced = await createSyncedSubmission({ ...input, investigatorId: ctx.user!.id });
        if (!synced) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "La soumission n’a pas pu être créée." });
        return runMockDeduplication(synced.id);
      }),
  }),
  dashboard: supervisorProcedure.query(() => getDashboardData()),
  conflicts: router({
    list: supervisorProcedure.query(() => listConflictCases()),
    resolve: supervisorProcedure
      .input(z.object({
        suspectedSubmissionId: z.string().min(1),
        targetSubmissionId: z.string().min(1),
        action: z.enum(CONFLICT_ACTIONS),
        reason: z.string().max(2000).optional(),
      }))
      .mutation(({ ctx, input }) => resolveConflict({ ...input, resolvedBy: ctx.user!.id })),
  }),
  session: protectedProcedure.query(({ ctx }) => ({ role: ctx.user.role, name: ctx.user.name })),
});
