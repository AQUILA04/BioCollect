CREATE TABLE `tenantMemberships` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`role` enum('Administrateur','Superviseur','Enquêteur') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tenantMemberships_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenant_member_unique` UNIQUE(`tenantId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` varchar(36) NOT NULL,
	`name` varchar(160) NOT NULL,
	`slug` varchar(96) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenants_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('Superadmin','Administrateur','Superviseur','Enquêteur') NOT NULL DEFAULT 'Enquêteur';--> statement-breakpoint
ALTER TABLE `projects` ADD `tenantId` varchar(36) DEFAULT 'legacy-tenant' NOT NULL;--> statement-breakpoint
CREATE INDEX `tenant_memberships_user_idx` ON `tenantMemberships` (`userId`);--> statement-breakpoint
CREATE INDEX `projects_tenant_idx` ON `projects` (`tenantId`);