CREATE TABLE `referenceDataSetVersions` (
	`id` varchar(36) NOT NULL,
	`referenceDataSetId` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`version` int NOT NULL,
	`type` varchar(96) NOT NULL,
	`name` varchar(160) NOT NULL,
	`options` json NOT NULL,
	`sourceFileName` varchar(255),
	`sourceFileKey` varchar(1024),
	`sourceFileMime` varchar(160),
	`sourceRowCount` int NOT NULL DEFAULT 0,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referenceDataSetVersions_id` PRIMARY KEY(`id`),
	CONSTRAINT `reference_data_versions_unique` UNIQUE(`referenceDataSetId`,`version`)
);
--> statement-breakpoint
ALTER TABLE `referenceDataSets` ADD `currentVersion` int DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX `reference_data_versions_tenant_reference_idx` ON `referenceDataSetVersions` (`tenantId`,`referenceDataSetId`);--> statement-breakpoint
INSERT IGNORE INTO `referenceDataSetVersions` (`id`, `referenceDataSetId`, `tenantId`, `version`, `type`, `name`, `options`, `sourceFileName`, `sourceFileKey`, `sourceFileMime`, `sourceRowCount`, `createdBy`)
SELECT REPLACE(UUID(), '-', ''), `id`, `tenantId`, `currentVersion`, `type`, `name`, `options`, `sourceFileName`, `sourceFileKey`, `sourceFileMime`, `sourceRowCount`, `createdBy`
FROM `referenceDataSets`;
