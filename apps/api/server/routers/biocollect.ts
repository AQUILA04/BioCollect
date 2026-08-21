import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createSyncedSubmission, resolveConflict } from "../db";
import { isValidMinioPath } from "../biocollect/mockScaleBiometrics";
import { runMockDeduplication } from "../biocollect/submissionPipeline";
import { assertTenantProject, createTenant, createTenantForm, createTenantProject, getTenantDashboard, getTenantProjectConfiguration, getTenantSyncBundle, listAllTenants, listTenantConflictCases, listTenantForms, listTenantProjects, listUserTenants, requireTenantRole, selectActiveTenant, tenantOwnsSubmission, updateTenantBySuperadmin, updateTenantProjectConfiguration } from "../tenantDb";
import { CONFLICT_ACTIONS, FORM_FIELD_TYPES, FORM_STEP_KINDS, TENANT_ROLES } from "../../shared/biocollect";
import { validateFormSteps } from "@biocollect/form-engine";
import { protectedProcedure, router, superadminProcedure } from "../_core/trpc";

const tenantIdSchema = z.object({ tenantId: z.string().min(1) });
const projectIdSchema = z.object({ tenantId: z.string().min(1), projectId: z.string().min(1) });
const formFieldSchema = z.object({
  id: z.string().min(1), label: z.string().min(1).max(160), type: z.enum(FORM_FIELD_TYPES), required: z.boolean(),
  options: z.array(z.string().min(1).max(120)).optional(),
  condition: z.object({ fieldId: z.string().min(1), operator: z.enum(["equals", "notEquals", "isFilled"]), value: z.string().optional() }).optional(),
});
const formStepSchema = z.object({
  id: z.string().min(1).max(120), label: z.string().min(1).max(160), order: z.number().int().min(0).max(23),
  kind: z.enum(FORM_STEP_KINDS), fieldIds: z.array(z.string().min(1).max(120)).max(100),
});

async function requireTenant(ctx: { user: { id: number; role: any } | null }, tenantId: string, allowed: (typeof TENANT_ROLES)[number][]) {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  const access = await requireTenantRole({ tenantId, userId: ctx.user.id, userRole: ctx.user.role, allowed });
  if (!access) throw new TRPCError({ code: "FORBIDDEN", message: "Vous n’avez pas accès à cet espace d’entité." });
  return access;
}

export const biocollectRouter = router({
  tenants: router({
    mine: protectedProcedure.query(({ ctx }) => listUserTenants(ctx.user!.id, ctx.user!.role)),
    create: protectedProcedure.input(z.object({ name: z.string().min(3).max(160), slug: z.string().min(3).max(80).optional() })).mutation(({ ctx, input }) => createTenant({ name: input.name, requestedSlug: input.slug, userId: ctx.user!.id })),
    select: protectedProcedure.input(tenantIdSchema).mutation(({ ctx, input }) => selectActiveTenant({ tenantId: input.tenantId, userId: ctx.user!.id, userRole: ctx.user!.role })),
    all: superadminProcedure.query(() => listAllTenants()),
    createBySuperadmin: superadminProcedure.input(z.object({ name: z.string().min(3).max(160), slug: z.string().min(3).max(80).optional() })).mutation(({ ctx, input }) => createTenant({ name: input.name, requestedSlug: input.slug, userId: ctx.user!.id })),
    updateBySuperadmin: superadminProcedure.input(z.object({ tenantId: z.string().min(1), name: z.string().min(3).max(160), isActive: z.boolean() })).mutation(({ input }) => updateTenantBySuperadmin(input)),
  }),
  projects: router({
    list: protectedProcedure.input(tenantIdSchema).query(async ({ ctx, input }) => { await requireTenant(ctx, input.tenantId, ["Administrateur", "Superviseur"]); return listTenantProjects(input.tenantId); }),
    create: protectedProcedure.input(z.object({ tenantId: z.string().min(1), name: z.string().min(3).max(160), description: z.string().max(2000).optional(), requiredFingers: z.array(z.string().min(2).max(60)).min(1).max(10), nfiqThreshold: z.number().int().min(1).max(5), matchingThreshold: z.number().int().min(1).max(100) })).mutation(async ({ ctx, input }) => { await requireTenant(ctx, input.tenantId, ["Administrateur"]); return createTenantProject({ ...input, createdBy: ctx.user!.id }); }),
    configuration: protectedProcedure.input(projectIdSchema).query(async ({ ctx, input }) => { await requireTenant(ctx, input.tenantId, ["Administrateur", "Superviseur"]); return getTenantProjectConfiguration(input.tenantId, input.projectId); }),
    updateConfiguration: protectedProcedure.input(z.object({ tenantId: z.string().min(1), projectId: z.string().min(1), requiredFingers: z.array(z.string().min(2).max(60)).min(1).max(10), nfiqThreshold: z.number().int().min(1).max(5), matchingThreshold: z.number().int().min(1).max(100) })).mutation(async ({ ctx, input }) => { await requireTenant(ctx, input.tenantId, ["Administrateur"]); return updateTenantProjectConfiguration(input); }),
  }),
  forms: router({
    list: protectedProcedure.input(projectIdSchema).query(async ({ ctx, input }) => { await requireTenant(ctx, input.tenantId, ["Administrateur", "Superviseur"]); return listTenantForms(input.tenantId, input.projectId); }),
    create: protectedProcedure.input(z.object({ tenantId: z.string().min(1), projectId: z.string().min(1), name: z.string().min(3).max(160), fields: z.array(formFieldSchema).min(1).max(100), steps: z.array(formStepSchema).min(1).max(24).optional(), isPublished: z.boolean() })).mutation(async ({ ctx, input }) => {
      await requireTenant(ctx, input.tenantId, ["Administrateur"]);
      if (input.steps?.length && validateFormSteps(input.fields, input.steps).length) throw new TRPCError({ code: "BAD_REQUEST", message: "La structure des étapes du formulaire est invalide." });
      return createTenantForm(input);
    }),
  }),
  sync: router({
    pull: protectedProcedure.input(projectIdSchema).query(async ({ ctx, input }) => { await requireTenant(ctx, input.tenantId, ["Administrateur", "Superviseur", "Enquêteur"]); return getTenantSyncBundle(input.tenantId, input.projectId); }),
    push: protectedProcedure.input(z.object({ tenantId: z.string().min(1), projectId: z.string().min(1), formSchemaId: z.string().min(1).optional(), data: z.record(z.string(), z.unknown()), attachments: z.array(z.object({ fingerType: z.string().min(2).max(60), minioPath: z.string().min(10).max(1024), nfiqScore: z.number().int().min(1).max(5) })).min(1).max(10) })).mutation(async ({ ctx, input }) => {
      await requireTenant(ctx, input.tenantId, ["Administrateur", "Superviseur", "Enquêteur"]);
      const configuration = await getTenantProjectConfiguration(input.tenantId, input.projectId);
      if (!configuration?.project || !configuration.config) throw new TRPCError({ code: "NOT_FOUND", message: "Projet biométrique introuvable dans cet espace." });
      if (!configuration.project.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "Le projet est inactif." });
      if (input.attachments.some(item => !isValidMinioPath(item.minioPath))) throw new TRPCError({ code: "BAD_REQUEST", message: "Chaque fichier soumis doit référencer un chemin MinIO valide." });
      if (input.attachments.some(item => item.nfiqScore > configuration.config!.nfiqThreshold)) throw new TRPCError({ code: "BAD_REQUEST", message: "La qualité NFIQ d’au moins une empreinte ne satisfait pas le seuil du projet." });
      const required = configuration.config.requiredFingers as string[];
      if (required.some(finger => !new Set(input.attachments.map(item => item.fingerType)).has(finger))) throw new TRPCError({ code: "BAD_REQUEST", message: "Des empreintes obligatoires sont absentes." });
      const synced = await createSyncedSubmission({ projectId: input.projectId, formSchemaId: input.formSchemaId, data: input.data, attachments: input.attachments, investigatorId: ctx.user!.id });
      if (!synced) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return runMockDeduplication(synced.id);
    }),
  }),
  dashboard: protectedProcedure.input(tenantIdSchema).query(async ({ ctx, input }) => { await requireTenant(ctx, input.tenantId, ["Administrateur", "Superviseur"]); return getTenantDashboard(input.tenantId); }),
  conflicts: router({
    list: protectedProcedure.input(tenantIdSchema).query(async ({ ctx, input }) => { await requireTenant(ctx, input.tenantId, ["Administrateur", "Superviseur"]); return listTenantConflictCases(input.tenantId); }),
    resolve: protectedProcedure.input(z.object({ tenantId: z.string().min(1), suspectedSubmissionId: z.string().min(1), targetSubmissionId: z.string().min(1), action: z.enum(CONFLICT_ACTIONS), reason: z.string().max(2000).optional() })).mutation(async ({ ctx, input }) => {
      await requireTenant(ctx, input.tenantId, ["Administrateur", "Superviseur"]);
      if (!await tenantOwnsSubmission(input.tenantId, input.suspectedSubmissionId) || !await tenantOwnsSubmission(input.tenantId, input.targetSubmissionId)) throw new TRPCError({ code: "FORBIDDEN", message: "Les dossiers doivent appartenir au même espace." });
      return resolveConflict({ ...input, resolvedBy: ctx.user!.id });
    }),
  }),
  session: protectedProcedure.query(({ ctx }) => ({ role: ctx.user!.role, name: ctx.user!.name, isSuperadmin: ctx.user!.role === "Superadmin" })),
});
