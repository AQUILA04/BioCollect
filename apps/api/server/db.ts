import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { nanoid } from "nanoid";
import {
  biometricAttachments,
  biometricConfigs,
  conflictResolutions,
  formSchemas,
  InsertUser,
  projects,
  submissions,
  users,
} from "../drizzle/schema";
import type { BiometricAttachmentInput, ConflictAction, FormField, SubmissionStatus } from "../shared/biocollect";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("La base de données BioCollect est indisponible.");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "Administrateur" : "Enquêteur");
  updateSet.role = values.role;
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  const user = result[0];
  if (user && user.openId === ENV.ownerOpenId && user.role !== "Superadmin") {
    await db.update(users).set({ role: "Superadmin" }).where(eq(users.id, user.id));
    return { ...user, role: "Superadmin" as const };
  }
  return user;
}

export async function listProjects() {
  const db = await requireDb();
  return db.select().from(projects).orderBy(desc(projects.createdAt));
}

export async function createProject(input: {
  name: string;
  description?: string;
  createdBy: number;
  requiredFingers: string[];
  nfiqThreshold: number;
  matchingThreshold: number;
}) {
  const db = await requireDb();
  const projectId = nanoid(20);
  const configId = nanoid(20);
  await db.transaction(async tx => {
    await tx.insert(projects).values({
      id: projectId,
      name: input.name,
      description: input.description ?? null,
      createdBy: input.createdBy,
    });
    await tx.insert(biometricConfigs).values({
      id: configId,
      projectId,
      requiredFingers: input.requiredFingers,
      nfiqThreshold: input.nfiqThreshold,
      matchingThreshold: input.matchingThreshold,
    });
  });
  return { id: projectId, configId };
}

export async function getProjectConfiguration(projectId: string) {
  const db = await requireDb();
  const result = await db
    .select({ project: projects, config: biometricConfigs })
    .from(projects)
    .leftJoin(biometricConfigs, eq(projects.id, biometricConfigs.projectId))
    .where(eq(projects.id, projectId))
    .limit(1);
  return result[0];
}

export async function updateProjectBiometricConfiguration(input: {
  projectId: string;
  requiredFingers: string[];
  nfiqThreshold: number;
  matchingThreshold: number;
}) {
  const db = await requireDb();
  await db
    .update(biometricConfigs)
    .set({
      requiredFingers: input.requiredFingers,
      nfiqThreshold: input.nfiqThreshold,
      matchingThreshold: input.matchingThreshold,
    })
    .where(eq(biometricConfigs.projectId, input.projectId));
  return getProjectConfiguration(input.projectId);
}

export async function createFormSchema(input: {
  projectId: string;
  name: string;
  fields: FormField[];
  isPublished: boolean;
}) {
  const db = await requireDb();
  const previous = await db
    .select({ version: formSchemas.version })
    .from(formSchemas)
    .where(eq(formSchemas.projectId, input.projectId))
    .orderBy(desc(formSchemas.version))
    .limit(1);
  const id = nanoid(20);
  const version = (previous[0]?.version ?? 0) + 1;
  await db.insert(formSchemas).values({ id, version, ...input });
  return { id, version };
}

export async function listFormSchemas(projectId: string) {
  const db = await requireDb();
  return db.select().from(formSchemas).where(eq(formSchemas.projectId, projectId)).orderBy(desc(formSchemas.version));
}

export async function getPublishedSyncBundle(projectId: string) {
  const db = await requireDb();
  const project = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.isActive, true))).limit(1);
  if (!project[0]) return null;
  const config = await db.select().from(biometricConfigs).where(eq(biometricConfigs.projectId, projectId)).limit(1);
  const form = await db
    .select()
    .from(formSchemas)
    .where(and(eq(formSchemas.projectId, projectId), eq(formSchemas.isPublished, true)))
    .orderBy(desc(formSchemas.version))
    .limit(1);
  return { project: project[0], biometricConfig: config[0] ?? null, formSchema: form[0] ?? null };
}

export async function createSyncedSubmission(input: {
  projectId: string;
  formSchemaId?: string;
  investigatorId: number;
  data: Record<string, unknown>;
  attachments: BiometricAttachmentInput[];
}) {
  const db = await requireDb();
  const id = nanoid(20);
  await db.transaction(async tx => {
    await tx.insert(submissions).values({
      id,
      projectId: input.projectId,
      formSchemaId: input.formSchemaId ?? null,
      investigatorId: input.investigatorId,
      data: input.data,
      status: "DRAFT",
    });
    await tx.update(submissions).set({ status: "SYNCED" }).where(eq(submissions.id, id));
    if (input.attachments.length > 0) {
      await tx.insert(biometricAttachments).values(
        input.attachments.map(attachment => ({
          id: nanoid(20),
          submissionId: id,
          fingerType: attachment.fingerType,
          minioPath: attachment.minioPath,
          nfiqScore: attachment.nfiqScore,
        })),
      );
    }
  });
  return getSubmissionWithAttachments(id);
}

export async function getSubmissionWithAttachments(id: string) {
  const db = await requireDb();
  const submission = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);
  if (!submission[0]) return null;
  const attachments = await db.select().from(biometricAttachments).where(eq(biometricAttachments.submissionId, id));
  return { ...submission[0], attachments };
}

export async function updateSubmissionStatus(id: string, status: SubmissionStatus, patch?: {
  matchedSubmissionId?: string | null;
  similarityScore?: number | null;
}) {
  const db = await requireDb();
  await db.update(submissions).set({ status, ...patch }).where(eq(submissions.id, id));
  return getSubmissionWithAttachments(id);
}

export async function findValidatedReference(projectId: string, excludedSubmissionId: string) {
  const db = await requireDb();
  const result = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.projectId, projectId), eq(submissions.status, "VALIDATED")))
    .orderBy(desc(submissions.createdAt))
    .limit(1);
  return result.find(candidate => candidate.id !== excludedSubmissionId) ?? null;
}

export async function getDashboardData() {
  const db = await requireDb();
  const allSubmissions = await db.select().from(submissions).orderBy(desc(submissions.createdAt));
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const summary = {
    totalEnrolled: allSubmissions.filter(item => item.status === "VALIDATED").length,
    pendingDuplicates: allSubmissions.filter(item => item.status === "SUSPECTED_DUPLICATE").length,
    todaySynchronizations: allSubmissions.filter(item => item.createdAt >= todayStart && item.status !== "DRAFT").length,
  };
  const evolution = Array.from({ length: 7 }, (_, offset) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - offset));
    const key = day.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
    const count = allSubmissions.filter(item => item.createdAt.toDateString() === day.toDateString() && item.status !== "DRAFT").length;
    return { day: key, submissions: count };
  });
  return { summary, evolution };
}

export async function listConflictCases() {
  const db = await requireDb();
  const suspected = await db
    .select()
    .from(submissions)
    .where(eq(submissions.status, "SUSPECTED_DUPLICATE"))
    .orderBy(desc(submissions.updatedAt));
  const cases = await Promise.all(suspected.map(async source => {
    const target = source.matchedSubmissionId ? await getSubmissionWithAttachments(source.matchedSubmissionId) : null;
    const sourceWithAttachments = await getSubmissionWithAttachments(source.id);
    return { source: sourceWithAttachments, target, similarityScore: source.similarityScore };
  }));
  return cases;
}

function asDataObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}

export async function resolveConflict(input: {
  suspectedSubmissionId: string;
  targetSubmissionId: string;
  action: ConflictAction;
  reason?: string;
  resolvedBy: number;
}) {
  const db = await requireDb();
  const suspected = await getSubmissionWithAttachments(input.suspectedSubmissionId);
  const target = await getSubmissionWithAttachments(input.targetSubmissionId);
  if (!suspected || !target) throw new Error("Dossier de conflit introuvable.");
  if (suspected.status !== "SUSPECTED_DUPLICATE") throw new Error("Ce conflit a déjà été résolu.");

  await db.transaction(async tx => {
    if (input.action === "Fusionner") {
      await tx
        .update(submissions)
        .set({ data: { ...asDataObject(target.data), ...asDataObject(suspected.data) } })
        .where(eq(submissions.id, input.targetSubmissionId));
    }
    await tx.update(submissions).set({ status: input.action === "Forcer Faux Positif" ? "VALIDATED" : "REJECTED" }).where(eq(submissions.id, input.suspectedSubmissionId));
    await tx.insert(conflictResolutions).values({
      id: nanoid(20),
      suspectedSubmissionId: input.suspectedSubmissionId,
      targetSubmissionId: input.targetSubmissionId,
      action: input.action,
      reason: input.reason ?? null,
      resolvedBy: input.resolvedBy,
    });
  });
  return getSubmissionWithAttachments(input.suspectedSubmissionId);
}
