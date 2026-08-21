import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { biometricAttachments, biometricConfigs, formSchemas, projects, referenceDataSets, referenceDataSetVersions, selectionTypeNodes, selectionTypes, submissions, tenantMemberships, tenants, users } from "../drizzle/schema";
import type { BiometricAttachmentInput, FormField, FormStep, SelectionOption, SelectionTypeLevel, SelectionTypeNode, TenantRole, UserRole } from "../shared/biocollect";
import { getDb } from "./db";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("La base de données BioCollect est indisponible.");
  return db;
}

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80) || "espace";
}

export async function listUserTenants(userId: number, userRole: UserRole) {
  const db = await requireDb();
  if (userRole === "Superadmin") {
    return db.select({ tenant: tenants, membership: tenantMemberships }).from(tenants).leftJoin(tenantMemberships, and(eq(tenantMemberships.tenantId, tenants.id), eq(tenantMemberships.userId, userId))).orderBy(desc(tenants.createdAt));
  }
  return db.select({ tenant: tenants, membership: tenantMemberships }).from(tenantMemberships).innerJoin(tenants, eq(tenantMemberships.tenantId, tenants.id)).where(eq(tenantMemberships.userId, userId)).orderBy(desc(tenants.createdAt));
}

export async function listAllTenants() {
  const db = await requireDb();
  return db.select().from(tenants).orderBy(desc(tenants.createdAt));
}

export async function createTenant(input: { name: string; userId: number; requestedSlug?: string }) {
  const db = await requireDb();
  const id = nanoid(20);
  const baseSlug = slugify(input.requestedSlug || input.name);
  let slug = baseSlug;
  let sequence = 2;
  while ((await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, slug)).limit(1))[0]) slug = `${baseSlug}-${sequence++}`;
  await db.transaction(async tx => {
    await tx.insert(tenants).values({ id, name: input.name, slug, createdBy: input.userId });
    await tx.insert(tenantMemberships).values({ id: nanoid(20), tenantId: id, userId: input.userId, role: "Administrateur" });
  });
  return { id, name: input.name, slug };
}

export async function selectActiveTenant(input: { tenantId: string; userId: number; userRole: UserRole }) {
  const access = await requireTenantRole({ tenantId: input.tenantId, userId: input.userId, userRole: input.userRole, allowed: ["Administrateur", "Superviseur", "Enquêteur"] });
  if (!access) return null;
  const db = await requireDb();
  await db.update(users).set({ activeTenantId: input.tenantId }).where(eq(users.id, input.userId));
  return access.tenant;
}

export async function updateTenantBySuperadmin(input: { tenantId: string; name: string; isActive: boolean }) {
  const db = await requireDb();
  await db.update(tenants).set({ name: input.name, isActive: input.isActive }).where(eq(tenants.id, input.tenantId));
  return (await db.select().from(tenants).where(eq(tenants.id, input.tenantId)).limit(1))[0] ?? null;
}

export async function requireTenantRole(input: { tenantId: string; userId: number; userRole: UserRole; allowed: TenantRole[] }) {
  const db = await requireDb();
  const tenant = await db.select().from(tenants).where(and(eq(tenants.id, input.tenantId), eq(tenants.isActive, true))).limit(1);
  if (!tenant[0]) return null;
  if (input.userRole === "Superadmin") return { tenant: tenant[0], role: "Administrateur" as TenantRole };
  const membership = await db.select().from(tenantMemberships).where(and(eq(tenantMemberships.tenantId, input.tenantId), eq(tenantMemberships.userId, input.userId))).limit(1);
  if (!membership[0] || !input.allowed.includes(membership[0].role)) return null;
  return { tenant: tenant[0], role: membership[0].role };
}

export async function listTenantProjects(tenantId: string) {
  const db = await requireDb();
  return db.select().from(projects).where(eq(projects.tenantId, tenantId)).orderBy(desc(projects.createdAt));
}

export async function listTenantReferenceDataSets(tenantId: string) {
  const db = await requireDb();
  return db.select().from(referenceDataSets).where(eq(referenceDataSets.tenantId, tenantId)).orderBy(desc(referenceDataSets.updatedAt));
}

export async function getTenantReferenceDataSet(tenantId: string, referenceDataSetId: string) {
  const db = await requireDb();
  return (await db.select().from(referenceDataSets).where(and(eq(referenceDataSets.id, referenceDataSetId), eq(referenceDataSets.tenantId, tenantId))).limit(1))[0] ?? null;
}

export async function createTenantReferenceDataSet(input: { tenantId: string; type: string; name: string; options: SelectionOption[]; createdBy: number; sourceFileName?: string; sourceFileKey?: string; sourceFileMime?: string }) {
  const db = await requireDb();
  const id = nanoid(20);
  await db.transaction(async tx => { const snapshot = { tenantId: input.tenantId, type: input.type, name: input.name, options: input.options, createdBy: input.createdBy, sourceFileName: input.sourceFileName ?? null, sourceFileKey: input.sourceFileKey ?? null, sourceFileMime: input.sourceFileMime ?? null, sourceRowCount: input.options.length }; await tx.insert(referenceDataSets).values({ id, ...snapshot, currentVersion: 1 }); await tx.insert(referenceDataSetVersions).values({ id: nanoid(20), referenceDataSetId: id, version: 1, ...snapshot }); });
  return getTenantReferenceDataSet(input.tenantId, id);
}

export async function updateTenantReferenceDataSet(input: { tenantId: string; referenceDataSetId: string; type: string; name: string; options: SelectionOption[]; updatedBy: number; sourceFileName?: string | null; sourceFileKey?: string | null; sourceFileMime?: string | null }) {
  const db = await requireDb();
  const existing = await getTenantReferenceDataSet(input.tenantId, input.referenceDataSetId);
  if (!existing) return null;
  const version = existing.currentVersion + 1; const snapshot = { tenantId: input.tenantId, type: input.type, name: input.name, options: input.options, createdBy: input.updatedBy, sourceFileName: input.sourceFileName ?? existing.sourceFileName, sourceFileKey: input.sourceFileKey ?? existing.sourceFileKey, sourceFileMime: input.sourceFileMime ?? existing.sourceFileMime, sourceRowCount: input.options.length }; await db.transaction(async tx => { await tx.update(referenceDataSets).set({ ...snapshot, currentVersion: version }).where(eq(referenceDataSets.id, input.referenceDataSetId)); await tx.insert(referenceDataSetVersions).values({ id: nanoid(20), referenceDataSetId: input.referenceDataSetId, version, ...snapshot }); });
  return getTenantReferenceDataSet(input.tenantId, input.referenceDataSetId);
}

export async function listTenantReferenceDataSetVersions(tenantId: string, referenceDataSetId: string) { const db = await requireDb(); return db.select().from(referenceDataSetVersions).where(and(eq(referenceDataSetVersions.tenantId, tenantId), eq(referenceDataSetVersions.referenceDataSetId, referenceDataSetId))).orderBy(desc(referenceDataSetVersions.version)); }
export async function listTenantReferenceDataSetUsage(tenantId: string, referenceDataSetId: string) { const db = await requireDb(); const forms = await db.select({ formId: formSchemas.id, formName: formSchemas.name, formVersion: formSchemas.version, fields: formSchemas.fields, projectId: projects.id, projectName: projects.name, createdAt: formSchemas.createdAt }).from(formSchemas).innerJoin(projects, eq(formSchemas.projectId, projects.id)).where(eq(projects.tenantId, tenantId)).orderBy(desc(formSchemas.createdAt)); return forms.flatMap(form => (form.fields as FormField[]).filter(field => field.referenceDataSetId === referenceDataSetId).map(field => ({ formId: form.formId, formName: form.formName, formVersion: form.formVersion, projectId: form.projectId, projectName: form.projectName, fieldId: field.id, fieldLabel: field.label, referenceDataSetVersion: field.referenceDataSetVersion ?? null, createdAt: form.createdAt }))); }

export async function deleteTenantReferenceDataSet(tenantId: string, referenceDataSetId: string) {
  const db = await requireDb();
  const existing = await getTenantReferenceDataSet(tenantId, referenceDataSetId);
  if (!existing) return false;
  await db.delete(referenceDataSets).where(eq(referenceDataSets.id, referenceDataSetId));
  return true;
}

type SelectionTypeInput = { tenantId: string; key: string; name: string; levels: SelectionTypeLevel[]; nodes: SelectionTypeNode[]; createdBy: number };
function formatSelectionType(type: typeof selectionTypes.$inferSelect, nodes: Array<typeof selectionTypeNodes.$inferSelect>) { return { ...type, levels: type.levels as SelectionTypeLevel[], nodes: nodes.map(node => ({ id: node.id, levelId: node.levelId, value: node.value, label: node.label, parentNodeId: node.parentNodeId })) }; }
export async function getTenantSelectionType(tenantId: string, selectionTypeId: string) { const db = await requireDb(); const type = (await db.select().from(selectionTypes).where(and(eq(selectionTypes.id, selectionTypeId), eq(selectionTypes.tenantId, tenantId))).limit(1))[0]; if (!type) return null; const nodes = await db.select().from(selectionTypeNodes).where(eq(selectionTypeNodes.selectionTypeId, selectionTypeId)).orderBy(selectionTypeNodes.levelId, selectionTypeNodes.label); return formatSelectionType(type, nodes); }
export async function listTenantSelectionTypes(tenantId: string) { const db = await requireDb(); const types = await db.select().from(selectionTypes).where(eq(selectionTypes.tenantId, tenantId)).orderBy(desc(selectionTypes.updatedAt)); return Promise.all(types.map(type => getTenantSelectionType(tenantId, type.id))); }
export async function createTenantSelectionType(input: SelectionTypeInput) { const db = await requireDb(); const id = nanoid(20); await db.transaction(async tx => { await tx.insert(selectionTypes).values({ id, tenantId: input.tenantId, key: input.key, name: input.name, levels: input.levels, createdBy: input.createdBy }); if (input.nodes.length) await tx.insert(selectionTypeNodes).values(input.nodes.map(node => ({ id: node.id || nanoid(20), selectionTypeId: id, levelId: node.levelId, value: node.value, label: node.label, parentNodeId: node.parentNodeId ?? null }))); }); return getTenantSelectionType(input.tenantId, id); }
export async function updateTenantSelectionType(input: SelectionTypeInput & { selectionTypeId: string }) { const existing = await getTenantSelectionType(input.tenantId, input.selectionTypeId); if (!existing) return null; const db = await requireDb(); await db.transaction(async tx => { await tx.update(selectionTypes).set({ key: input.key, name: input.name, levels: input.levels }).where(eq(selectionTypes.id, input.selectionTypeId)); await tx.delete(selectionTypeNodes).where(eq(selectionTypeNodes.selectionTypeId, input.selectionTypeId)); if (input.nodes.length) await tx.insert(selectionTypeNodes).values(input.nodes.map(node => ({ id: node.id || nanoid(20), selectionTypeId: input.selectionTypeId, levelId: node.levelId, value: node.value, label: node.label, parentNodeId: node.parentNodeId ?? null }))); }); return getTenantSelectionType(input.tenantId, input.selectionTypeId); }
export async function deleteTenantSelectionType(tenantId: string, selectionTypeId: string) { const existing = await getTenantSelectionType(tenantId, selectionTypeId); if (!existing) return false; const db = await requireDb(); await db.transaction(async tx => { await tx.delete(selectionTypeNodes).where(eq(selectionTypeNodes.selectionTypeId, selectionTypeId)); await tx.delete(selectionTypes).where(eq(selectionTypes.id, selectionTypeId)); }); return true; }

export async function createTenantProject(input: { tenantId: string; name: string; description?: string; createdBy: number; requiredFingers: string[]; nfiqThreshold: number; matchingThreshold: number }) {
  const db = await requireDb();
  const projectId = nanoid(20);
  await db.transaction(async tx => {
    await tx.insert(projects).values({ id: projectId, tenantId: input.tenantId, name: input.name, description: input.description ?? null, createdBy: input.createdBy });
    await tx.insert(biometricConfigs).values({ id: nanoid(20), projectId, requiredFingers: input.requiredFingers, nfiqThreshold: input.nfiqThreshold, matchingThreshold: input.matchingThreshold });
  });
  return { id: projectId };
}

export async function getTenantProjectConfiguration(tenantId: string, projectId: string) {
  const db = await requireDb();
  const result = await db.select({ project: projects, config: biometricConfigs }).from(projects).leftJoin(biometricConfigs, eq(projects.id, biometricConfigs.projectId)).where(and(eq(projects.id, projectId), eq(projects.tenantId, tenantId))).limit(1);
  return result[0] ?? null;
}

export async function updateTenantProjectConfiguration(input: { tenantId: string; projectId: string; requiredFingers: string[]; nfiqThreshold: number; matchingThreshold: number }) {
  const db = await requireDb();
  const project = await getTenantProjectConfiguration(input.tenantId, input.projectId);
  if (!project) return null;
  await db.update(biometricConfigs).set({ requiredFingers: input.requiredFingers, nfiqThreshold: input.nfiqThreshold, matchingThreshold: input.matchingThreshold }).where(eq(biometricConfigs.projectId, input.projectId));
  return getTenantProjectConfiguration(input.tenantId, input.projectId);
}

export async function listTenantForms(tenantId: string, projectId: string) {
  if (!await getTenantProjectConfiguration(tenantId, projectId)) return [];
  const db = await requireDb();
  return db.select().from(formSchemas).where(eq(formSchemas.projectId, projectId)).orderBy(desc(formSchemas.version));
}

export async function createTenantForm(input: { tenantId: string; projectId: string; name: string; fields: FormField[]; steps?: FormStep[]; isPublished: boolean }) {
  if (!await getTenantProjectConfiguration(input.tenantId, input.projectId)) throw new Error("Projet introuvable dans cet espace.");
  const db = await requireDb();
  const prior = await db.select({ version: formSchemas.version }).from(formSchemas).where(eq(formSchemas.projectId, input.projectId)).orderBy(desc(formSchemas.version)).limit(1);
  const id = nanoid(20);
  const version = (prior[0]?.version ?? 0) + 1;
  await db.insert(formSchemas).values({ id, projectId: input.projectId, name: input.name, fields: input.fields, steps: input.steps ?? null, isPublished: input.isPublished, version });
  return { id, version };
}

export async function getTenantSyncBundle(tenantId: string, projectId: string) {
  const project = await getTenantProjectConfiguration(tenantId, projectId);
  if (!project?.project.isActive) return null;
  const db = await requireDb();
  const form = await db.select().from(formSchemas).where(and(eq(formSchemas.projectId, projectId), eq(formSchemas.isPublished, true))).orderBy(desc(formSchemas.version)).limit(1);
  return { project: project.project, biometricConfig: project.config, formSchema: form[0] ?? null };
}

export async function getTenantDashboard(tenantId: string) {
  const db = await requireDb();
  const tenantProjects = await listTenantProjects(tenantId);
  const ids = new Set(tenantProjects.map(project => project.id));
  const all = (await db.select().from(submissions).orderBy(desc(submissions.createdAt))).filter(item => ids.has(item.projectId));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return {
    summary: {
      totalEnrolled: all.filter(item => item.status === "VALIDATED").length,
      pendingDuplicates: all.filter(item => item.status === "SUSPECTED_DUPLICATE").length,
      todaySynchronizations: all.filter(item => item.createdAt >= today && item.status !== "DRAFT").length,
    },
    evolution: Array.from({ length: 7 }, (_, index) => {
      const day = new Date(); day.setDate(day.getDate() - (6 - index));
      return { day: day.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }), submissions: all.filter(item => item.createdAt.toDateString() === day.toDateString() && item.status !== "DRAFT").length };
    }),
  };
}

export async function listTenantConflictCases(tenantId: string) {
  const db = await requireDb();
  const tenantProjects = await listTenantProjects(tenantId);
  const ids = new Set(tenantProjects.map(project => project.id));
  const suspected = (await db.select().from(submissions).where(eq(submissions.status, "SUSPECTED_DUPLICATE")).orderBy(desc(submissions.updatedAt))).filter(item => ids.has(item.projectId));
  return Promise.all(suspected.map(async source => {
    const sourceAttachments = await db.select().from(biometricAttachments).where(eq(biometricAttachments.submissionId, source.id));
    const target = source.matchedSubmissionId ? (await db.select().from(submissions).where(eq(submissions.id, source.matchedSubmissionId)).limit(1))[0] : null;
    if (target && !ids.has(target.projectId)) return { source: { ...source, attachments: sourceAttachments }, target: null, similarityScore: source.similarityScore };
    const targetAttachments = target ? await db.select().from(biometricAttachments).where(eq(biometricAttachments.submissionId, target.id)) : [];
    return { source: { ...source, attachments: sourceAttachments }, target: target ? { ...target, attachments: targetAttachments } : null, similarityScore: source.similarityScore };
  }));
}

export async function assertTenantProject(tenantId: string, projectId: string) {
  return Boolean(await getTenantProjectConfiguration(tenantId, projectId));
}

export async function tenantOwnsSubmission(tenantId: string, submissionId: string) {
  const db = await requireDb();
  const submission = await db.select().from(submissions).where(eq(submissions.id, submissionId)).limit(1);
  return submission[0] ? assertTenantProject(tenantId, submission[0].projectId) : false;
}
