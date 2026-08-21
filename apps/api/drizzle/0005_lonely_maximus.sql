CREATE TABLE `referenceDataSets` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`type` varchar(96) NOT NULL,
	`name` varchar(160) NOT NULL,
	`options` json NOT NULL,
	`sourceFileName` varchar(255),
	`sourceFileKey` varchar(1024),
	`sourceFileMime` varchar(160),
	`sourceRowCount` int NOT NULL DEFAULT 0,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referenceDataSets_id` PRIMARY KEY(`id`),
	CONSTRAINT `reference_data_sets_tenant_type_unique` UNIQUE(`tenantId`,`type`)
);
--> statement-breakpoint
CREATE INDEX `reference_data_sets_tenant_idx` ON `referenceDataSets` (`tenantId`);