CREATE TABLE `biometricAttachments` (
	`id` varchar(36) NOT NULL,
	`submissionId` varchar(36) NOT NULL,
	`fingerType` varchar(64) NOT NULL,
	`minioPath` varchar(1024) NOT NULL,
	`nfiqScore` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `biometricAttachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `biometricConfigs` (
	`id` varchar(36) NOT NULL,
	`projectId` varchar(36) NOT NULL,
	`requiredFingers` json NOT NULL,
	`nfiqThreshold` int NOT NULL DEFAULT 3,
	`matchingThreshold` int NOT NULL DEFAULT 85,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `biometricConfigs_id` PRIMARY KEY(`id`),
	CONSTRAINT `biometric_config_project_unique` UNIQUE(`projectId`)
);
--> statement-breakpoint
CREATE TABLE `conflictResolutions` (
	`id` varchar(36) NOT NULL,
	`suspectedSubmissionId` varchar(36) NOT NULL,
	`targetSubmissionId` varchar(36) NOT NULL,
	`action` enum('Rejeter','Fusionner','Forcer Faux Positif') NOT NULL,
	`reason` text,
	`resolvedBy` int NOT NULL,
	`resolvedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conflictResolutions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `formSchemas` (
	`id` varchar(36) NOT NULL,
	`projectId` varchar(36) NOT NULL,
	`name` varchar(160) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`fields` json NOT NULL,
	`isPublished` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `formSchemas_id` PRIMARY KEY(`id`),
	CONSTRAINT `form_schema_version_unique` UNIQUE(`projectId`,`version`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` varchar(36) NOT NULL,
	`name` varchar(160) NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` varchar(36) NOT NULL,
	`projectId` varchar(36) NOT NULL,
	`formSchemaId` varchar(36),
	`investigatorId` int NOT NULL,
	`data` json NOT NULL,
	`status` enum('DRAFT','SYNCED','PROCESSING','VALIDATED','SUSPECTED_DUPLICATE','REJECTED') NOT NULL DEFAULT 'DRAFT',
	`matchedSubmissionId` varchar(36),
	`similarityScore` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('Administrateur','Superviseur','Enquêteur') NOT NULL DEFAULT 'Enquêteur';--> statement-breakpoint
CREATE INDEX `biometric_attachments_submission_idx` ON `biometricAttachments` (`submissionId`);--> statement-breakpoint
CREATE INDEX `conflict_resolution_suspected_idx` ON `conflictResolutions` (`suspectedSubmissionId`);--> statement-breakpoint
CREATE INDEX `form_schemas_project_idx` ON `formSchemas` (`projectId`);--> statement-breakpoint
CREATE INDEX `projects_created_by_idx` ON `projects` (`createdBy`);--> statement-breakpoint
CREATE INDEX `submissions_project_idx` ON `submissions` (`projectId`);--> statement-breakpoint
CREATE INDEX `submissions_status_idx` ON `submissions` (`status`);--> statement-breakpoint
CREATE INDEX `submissions_investigator_idx` ON `submissions` (`investigatorId`);