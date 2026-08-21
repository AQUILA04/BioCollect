import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createSyncedSubmission, resolveConflict } from "../db";
import { isValidMinioPath } from "../biocollect/mockScaleBiometrics";
import { runMockDeduplication } from "../biocollect/submissionPipeline";
import { assertTenantProject, createTenant, createTenantCampaign, createTenantForm, createTenantProject, createTenantReferenceDataSet, createTenantSelectionType, createTenantTeam, deleteTenantReferenceDataSet, deleteTenantSelectionType, getTenantDashboard, getTenantProjectConfiguration, getTenantReferenceDataSet, getTenantSelectionType, getTenantSyncBundle, listAllTenants, listTenantCampaigns, listTenantConflictCases, listTenantForms, listTenantInvestigators, listTenantProjects, listTenantReferenceDataSetUsage, listTenantReferenceDataSetVersions, listTenantReferenceDataSets, listTenantSelectionTypes, listTenantSyncSessions, listTenantTeams, listUserTenants, requireTenantRole, selectActiveTenant, tenantOwnsSubmission, updateTenantBySuperadmin, updateTenantCampaignStatus, updateTenantProjectConfiguration, updateTenantReferenceDataSet, updateTenantSelectionType } from "../tenantDb";
import { CAMPAIGN_STATUSES, CONFLICT_ACTIONS, FORM_FIELD_TYPES, FORM_STEP_KINDS, TEAM_MEMBER_ROLES, TENANT_ROLES, type FormField, type SelectionOption } from "../../shared/biocollect";
import { validateFormSteps } from "@biocollect/form-engine";
import { protectedProcedure, router, superadminProcedure } from "../_core/trpc";
import { normalizeSelectionOptions, parseReferenceDataFile } from "../reference-data";
import { storagePut } from "../storage";
import { isValidSelectionType } from "../selection-type-validation";

const tenantIdSchema = z.object({ tenantId: z.string().min(1) });
const projectIdSchema = z.object({ tenantId: z.string().min(1), projectId: z.string().min(1) });
const selectionOptionSchema = z.object({ value: z.string().min(1).max(120), label: z.string().min(1).max(160) });
const selectionTypeLevelSchema = z.object({ id: z.string().min(1).max(96), label: z.string().min(1).max(80), order: z.number().int().min(0).max(15) });
const selectionTypeNodeSchema = z.object({ id: z.string().min(1).max(36), levelId: z.string().min(1).max(96), value: z.string().min(1).max(120), label: z.string().min(1).max(160), parentNodeId: z.string().min(1).max(36).nullable().optional() });
const formFieldSchema = z.object({
  id: z.string().min(1), label: z.string().min(1).max(160), type: z.enum(FORM_FIELD_TYPES), required: z.boolean(),
  options: z.array(z.union([z.string().min(1).max(160), selectionOptionSchema])).max(10_000).optional(),
  referenceDataSetId: z.string().min(1).max(120).optional(),
  referenceDataSetVersion: z.number().int().min(1).optional(),
  selectionTypeId: z.string().min(1).max(120).optional(),
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

async function materializeFormFields(tenantId: string, fields: FormField[]) {
  return Promise.all(fields.map(async field => {
    if (field.referenceDataSetId && field.type !== "multiple choice") throw new TRPCError({ code: "BAD_REQUEST", message: "Seuls les champs de sélection peuvent utiliser un référentiel." });
    if (field.selectionTypeId && field.type !== "hierarchical selection") throw new TRPCError({ code: "BAD_REQUEST", message: "Seul un champ hiérarchique peut utiliser ce type personnalisé." });
    if (field.type === "hierarchical selection") { if (!field.selectionTypeId) throw new TRPCError({ code: "BAD_REQUEST", message: "Un type de sélection hiérarchique est obligatoire." }); const type = await getTenantSelectionType(tenantId, field.selectionTypeId); if (!type?.nodes?.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Le type hiérarchique est introuvable ou ne contient aucun nœud." }); return { ...field, hierarchicalDefinition: { selectionTypeId: type.id, key: type.key, name: type.name, levels: type.levels, nodes: type.nodes } }; }
    if (field.type !== "multiple choice") return field;
    if (field.referenceDataSetId) {
      const referenceData = await getTenantReferenceDataSet(tenantId, field.referenceDataSetId);
      if (!referenceData) throw new TRPCError({ code: "BAD_REQUEST", message: "Le référentiel sélectionné est introuvable dans cet espace." });
      const options = normalizeSelectionOptions(referenceData.options as Array<string | SelectionOption>);
      if (!options.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Le référentiel sélectionné ne contient aucune option." });
      return { ...field, options, referenceDataSetVersion: referenceData.currentVersion };
    }
    const options = normalizeSelectionOptions(field.options);
    if (!options.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Chaque champ de sélection doit contenir au moins une option." });
    return { ...field, options };
  }));
}

function safeSourceFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 180) || "referentiel";
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
  referenceData: router({
    list: protectedProcedure.input(tenantIdSchema).query(async ({ ctx, input }) => { await requireTenant(ctx, input.tenantId, ["Administrateur", "Superviseur"]); return listTenantReferenceDataSets(input.tenantId); }),
    history: protectedProcedure.input(z.object({ tenantId: z.string().min(1), referenceDataSetId: z.string().min(1) })).query(async ({ ctx, input }) => { await requireTenant(ctx, input.tenantId, ["Administrateur", "Superviseur"]); return listTenantReferenceDataSetVersions(input.tenantId, input.referenceDataSetId); }),
    usage: protectedProcedure.input(z.object({ tenantId: z.string().min(1), referenceDataSetId: z.string().min(1) })).query(async ({ ctx, input }) => { await requireTenant(ctx, input.tenantId, ["Administrateur", "Superviseur"]); return listTenantReferenceDataSetUsage(input.tenantId, input.referenceDataSetId); }),
    create: protectedProcedure.input(z.object({ tenantId: z.string().min(1), type: z.string().regex(/^[a-z][a-z0-9_-]*$/).max(96), name: z.string().min(3).max(160), options: z.array(selectionOptionSchema).min(1).max(10_000) })).mutation(async ({ ctx, input }) => {
      await requireTenant(ctx, input.tenantId, ["Administrateur"]);
      const options = normalizeSelectionOptions(input.options);
      if (new Set(options.map(option => option.value)).size !== options.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Les valeurs d’un référentiel doivent être uniques." });
      return createTenantReferenceDataSet({ ...input, options, createdBy: ctx.user!.id });
    }),
    update: protectedProcedure.input(z.object({ tenantId: z.string().min(1), referenceDataSetId: z.string().min(1), type: z.string().regex(/^[a-z][a-z0-9_-]*$/).max(96), name: z.string().min(3).max(160), options: z.array(selectionOptionSchema).min(1).max(10_000) })).mutation(async ({ ctx, input }) => {
      await requireTenant(ctx, input.tenantId, ["Administrateur"]);
      const options = normalizeSelectionOptions(input.options);
      if (new Set(options.map(option => option.value)).size !== options.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Les valeurs d’un référentiel doivent être uniques." });
      const updated = await updateTenantReferenceDataSet({ ...input, options, updatedBy: ctx.user!.id });
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Référentiel introuvable dans cet espace." });
      return updated;
    }),
    delete: protectedProcedure.input(z.object({ tenantId: z.string().min(1), referenceDataSetId: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      await requireTenant(ctx, input.tenantId, ["Administrateur"]);
      if (!await deleteTenantReferenceDataSet(input.tenantId, input.referenceDataSetId)) throw new TRPCError({ code: "NOT_FOUND", message: "Référentiel introuvable dans cet espace." });
      return { success: true };
    }),
    preview: protectedProcedure.input(z.object({ tenantId: z.string().min(1), fileName: z.string().min(3).max(255), contentBase64: z.string().min(4).max(7_000_000) })).mutation(async ({ ctx, input }) => {
      await requireTenant(ctx, input.tenantId, ["Administrateur"]);
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(input.contentBase64)) throw new TRPCError({ code: "BAD_REQUEST", message: "Le contenu du fichier est invalide." });
      const parsed = parseReferenceDataFile({ fileName: input.fileName, buffer: Buffer.from(input.contentBase64, "base64") });
      return { rowCount: parsed.rowCount, columns: parsed.columns, mapping: parsed.mapping, options: parsed.options.slice(0, 8) };
    }),
    import: protectedProcedure.input(z.object({ tenantId: z.string().min(1), referenceDataSetId: z.string().min(1).optional(), type: z.string().regex(/^[a-z][a-z0-9_-]*$/).max(96), name: z.string().min(3).max(160), fileName: z.string().min(3).max(255), mimeType: z.string().max(160).optional(), contentBase64: z.string().min(4).max(7_000_000) })).mutation(async ({ ctx, input }) => {
      await requireTenant(ctx, input.tenantId, ["Administrateur"]);
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(input.contentBase64)) throw new TRPCError({ code: "BAD_REQUEST", message: "Le contenu du fichier est invalide." });
      const buffer = Buffer.from(input.contentBase64, "base64");
      const parsed = parseReferenceDataFile({ fileName: input.fileName, buffer });
      const source = await storagePut(`reference-data/${input.tenantId}/${input.type}/${safeSourceFileName(input.fileName)}`, buffer, input.mimeType || "application/octet-stream");
      if (input.referenceDataSetId) {
        const updated = await updateTenantReferenceDataSet({ tenantId: input.tenantId, referenceDataSetId: input.referenceDataSetId, type: input.type, name: input.name, options: parsed.options, updatedBy: ctx.user!.id, sourceFileName: input.fileName, sourceFileKey: source.key, sourceFileMime: input.mimeType });
        if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Référentiel introuvable dans cet espace." });
        return updated;
      }
      return createTenantReferenceDataSet({ tenantId: input.tenantId, type: input.type, name: input.name, options: parsed.options, createdBy: ctx.user!.id, sourceFileName: input.fileName, sourceFileKey: source.key, sourceFileMime: input.mimeType });
    }),
  }),
  selectionTypes: router({
    list: protectedProcedure.input(tenantIdSchema).query(async ({ ctx, input }) => { await requireTenant(ctx, input.tenantId, ["Administrateur", "Superviseur"]); return listTenantSelectionTypes(input.tenantId); }),
    get: protectedProcedure.input(z.object({ tenantId: z.string().min(1), selectionTypeId: z.string().min(1) })).query(async ({ ctx, input }) => { await requireTenant(ctx, input.tenantId, ["Administrateur", "Superviseur"]); return getTenantSelectionType(input.tenantId, input.selectionTypeId); }),
    create: protectedProcedure.input(z.object({ tenantId: z.string().min(1), key: z.string().regex(/^[a-z][a-z0-9_-]*$/).max(96), name: z.string().min(3).max(160), levels: z.array(selectionTypeLevelSchema).min(2).max(16), nodes: z.array(selectionTypeNodeSchema).min(1).max(20_000) })).mutation(async ({ ctx, input }) => { await requireTenant(ctx, input.tenantId, ["Administrateur"]); if (!isValidSelectionType(input.levels, input.nodes)) throw new TRPCError({ code: "BAD_REQUEST", message: "La structure hiérarchique est invalide." }); return createTenantSelectionType({ ...input, createdBy: ctx.user!.id }); }),
    update: protectedProcedure.input(z.object({ tenantId: z.string().min(1), selectionTypeId: z.string().min(1), key: z.string().regex(/^[a-z][a-z0-9_-]*$/).max(96), name: z.string().min(3).max(160), levels: z.array(selectionTypeLevelSchema).min(2).max(16), nodes: z.array(selectionTypeNodeSchema).min(1).max(20_000) })).mutation(async ({ ctx, input }) => { await requireTenant(ctx, input.tenantId, ["Administrateur"]); if (!isValidSelectionType(input.levels, input.nodes)) throw new TRPCError({ code: "BAD_REQUEST", message: "La structure hiérarchique est invalide." }); const updated = await updateTenantSelectionType({ ...input, createdBy: ctx.user!.id }); if (!updated) throw new TRPCError({ code: "NOT_FOUND" }); return updated; }),
    delete: protectedProcedure.input(z.object({ tenantId: z.string().min(1), selectionTypeId: z.string().min(1) })).mutation(async ({ ctx, input }) => { await requireTenant(ctx, input.tenantId, ["Administrateur"]); if (!await deleteTenantSelectionType(input.tenantId, input.selectionTypeId)) throw new TRPCError({ code: "NOT_FOUND" }); return { success: true }; }),
  }),
  campaigns: router({
    list: protectedProcedure.input(z.object({ tenantId: z.string().min(1), projectId: z.string().min(1).optional() })).query(async ({ ctx, input }) => { await requireTenant(ctx, input.tenantId, ["Administrateur", "Superviseur"]); return listTenantCampaigns(input.tenantId, input.projectId); }),
    staff: protectedProcedure.input(tenantIdSchema).query(async ({ ctx, input }) => { await requireTenant(ctx, input.tenantId, ["Administrateur", "Superviseur"]); return listTenantInvestigators(input.tenantId); }),
    create: protectedProcedure.input(z.object({ tenantId: z.string().min(1), projectId: z.string().min(1), name: z.string().min(3).max(160), description: z.string().max(2_000).optional(), startDate: z.string().min(10).max(40), endDate: z.string().min(10).max(40).optional(), status: z.enum(CAMPAIGN_STATUSES).default("PLANNED") })).mutation(async ({ ctx, input }) => {
      await requireTenant(ctx, input.tenantId, ["Administrateur", "Superviseur"]);
      const campaign = await createTenantCampaign({ ...input, startDate: new Date(input.startDate), endDate: input.endDate ? new Date(input.endDate) : undefined, createdBy: ctx.user!.id });
      if (!campaign) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return campaign;
    }),
    updateStatus: protectedProcedure.input(z.object({ tenantId: z.string().min(1), campaignId: z.string().min(1), status: z.enum(CAMPAIGN_STATUSES), endDate: z.string().min(10).max(40).nullable().optional() })).mutation(async ({ ctx, input }) => {
      await requireTenant(ctx, input.tenantId, ["Administrateur", "Superviseur"]);
      const campaign = await updateTenantCampaignStatus({ ...input, endDate: input.endDate === undefined ? undefined : input.endDate ? new Date(input.endDate) : null });
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campagne introuvable dans cet espace." });
      return campaign;
    }),
  }),
  teams: router({
    list: protectedProcedure.input(z.object({ tenantId: z.string().min(1), campaignId: z.string().min(1) })).query(async ({ ctx, input }) => { await requireTenant(ctx, input.tenantId, ["Administrateur", "Superviseur"]); return listTenantTeams(input.tenantId, input.campaignId); }),
    create: protectedProcedure.input(z.object({ tenantId: z.string().min(1), campaignId: z.string().min(1), name: z.string().min(2).max(160), members: z.array(z.object({ userId: z.number().int().positive(), role: z.enum(TEAM_MEMBER_ROLES) })).min(2).max(3) })).mutation(async ({ ctx, input }) => {
      await requireTenant(ctx, input.tenantId, ["Administrateur", "Superviseur"]);
      return createTenantTeam(input);
    }),
  }),
  syncSessions: router({
    list: protectedProcedure.input(z.object({ tenantId: z.string().min(1), campaignId: z.string().min(1).optional() })).query(async ({ ctx, input }) => { await requireTenant(ctx, input.tenantId, ["Administrateur", "Superviseur"]); return listTenantSyncSessions(input.tenantId, input.campaignId); }),
  }),
  forms: router({
    list: protectedProcedure.input(projectIdSchema).query(async ({ ctx, input }) => { await requireTenant(ctx, input.tenantId, ["Administrateur", "Superviseur"]); return listTenantForms(input.tenantId, input.projectId); }),
    create: protectedProcedure.input(z.object({ tenantId: z.string().min(1), projectId: z.string().min(1), name: z.string().min(3).max(160), fields: z.array(formFieldSchema).min(1).max(100), steps: z.array(formStepSchema).min(1).max(24).optional(), isPublished: z.boolean() })).mutation(async ({ ctx, input }) => {
      await requireTenant(ctx, input.tenantId, ["Administrateur"]);
      const fields = await materializeFormFields(input.tenantId, input.fields);
      if (input.steps?.length && validateFormSteps(fields, input.steps).length) throw new TRPCError({ code: "BAD_REQUEST", message: "La structure des étapes du formulaire est invalide." });
      return createTenantForm({ ...input, fields });
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
