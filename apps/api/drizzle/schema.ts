import {
  boolean,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { CONFLICT_ACTIONS, SUBMISSION_STATUSES, USER_ROLES } from "../shared/biocollect";

/** Core user table backing the Manus OAuth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", USER_ROLES).default("Enquêteur").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const projects = mysqlTable("projects", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("projects_created_by_idx").on(table.createdBy)]);

export const formSchemas = mysqlTable("formSchemas", {
  id: varchar("id", { length: 36 }).primaryKey(),
  projectId: varchar("projectId", { length: 36 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  version: int("version").default(1).notNull(),
  fields: json("fields").notNull(),
  isPublished: boolean("isPublished").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("form_schemas_project_idx").on(table.projectId),
  uniqueIndex("form_schema_version_unique").on(table.projectId, table.version),
]);

export const biometricConfigs = mysqlTable("biometricConfigs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  projectId: varchar("projectId", { length: 36 }).notNull(),
  requiredFingers: json("requiredFingers").notNull(),
  nfiqThreshold: int("nfiqThreshold").default(3).notNull(),
  matchingThreshold: int("matchingThreshold").default(85).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("biometric_config_project_unique").on(table.projectId)]);

export const submissions = mysqlTable("submissions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  projectId: varchar("projectId", { length: 36 }).notNull(),
  formSchemaId: varchar("formSchemaId", { length: 36 }),
  investigatorId: int("investigatorId").notNull(),
  data: json("data").notNull(),
  status: mysqlEnum("status", SUBMISSION_STATUSES).default("DRAFT").notNull(),
  matchedSubmissionId: varchar("matchedSubmissionId", { length: 36 }),
  similarityScore: int("similarityScore"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("submissions_project_idx").on(table.projectId),
  index("submissions_status_idx").on(table.status),
  index("submissions_investigator_idx").on(table.investigatorId),
]);

export const biometricAttachments = mysqlTable("biometricAttachments", {
  id: varchar("id", { length: 36 }).primaryKey(),
  submissionId: varchar("submissionId", { length: 36 }).notNull(),
  fingerType: varchar("fingerType", { length: 64 }).notNull(),
  minioPath: varchar("minioPath", { length: 1024 }).notNull(),
  nfiqScore: int("nfiqScore").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("biometric_attachments_submission_idx").on(table.submissionId)]);

export const conflictResolutions = mysqlTable("conflictResolutions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  suspectedSubmissionId: varchar("suspectedSubmissionId", { length: 36 }).notNull(),
  targetSubmissionId: varchar("targetSubmissionId", { length: 36 }).notNull(),
  action: mysqlEnum("action", CONFLICT_ACTIONS).notNull(),
  reason: text("reason"),
  resolvedBy: int("resolvedBy").notNull(),
  resolvedAt: timestamp("resolvedAt").defaultNow().notNull(),
}, table => [index("conflict_resolution_suspected_idx").on(table.suspectedSubmissionId)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type FormSchema = typeof formSchemas.$inferSelect;
export type BiometricConfig = typeof biometricConfigs.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type BiometricAttachment = typeof biometricAttachments.$inferSelect;
export type ConflictResolution = typeof conflictResolutions.$inferSelect;
