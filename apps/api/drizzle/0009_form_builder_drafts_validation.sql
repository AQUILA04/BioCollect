CREATE TABLE `formBuilderSettings` (
	`tenantId` varchar(36) NOT NULL,
	`phoneValidation` json NOT NULL,
	`updatedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `formBuilderSettings_tenantId` PRIMARY KEY(`tenantId`)
);
--> statement-breakpoint
CREATE TABLE `formDrafts` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`projectId` varchar(36) NOT NULL,
	`name` varchar(160) NOT NULL,
	`fields` json NOT NULL,
	`steps` json,
	`createdBy` int NOT NULL,
	`updatedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `formDrafts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `form_drafts_tenant_project_idx` ON `formDrafts` (`tenantId`,`projectId`);
--> statement-breakpoint
CREATE INDEX `form_drafts_project_updated_idx` ON `formDrafts` (`projectId`,`updatedAt`);
