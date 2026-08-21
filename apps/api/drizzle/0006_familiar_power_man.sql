CREATE TABLE `selectionTypeNodes` (
	`id` varchar(36) NOT NULL,
	`selectionTypeId` varchar(36) NOT NULL,
	`levelId` varchar(96) NOT NULL,
	`value` varchar(120) NOT NULL,
	`label` varchar(160) NOT NULL,
	`parentNodeId` varchar(36),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `selectionTypeNodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `selection_type_nodes_type_value_unique` UNIQUE(`selectionTypeId`,`value`)
);
--> statement-breakpoint
CREATE TABLE `selectionTypes` (
	`id` varchar(36) NOT NULL,
	`tenantId` varchar(36) NOT NULL,
	`key` varchar(96) NOT NULL,
	`name` varchar(160) NOT NULL,
	`levels` json NOT NULL,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `selectionTypes_id` PRIMARY KEY(`id`),
	CONSTRAINT `selection_types_tenant_key_unique` UNIQUE(`tenantId`,`key`)
);
--> statement-breakpoint
CREATE INDEX `selection_type_nodes_type_parent_idx` ON `selectionTypeNodes` (`selectionTypeId`,`parentNodeId`);--> statement-breakpoint
CREATE INDEX `selection_type_nodes_type_level_idx` ON `selectionTypeNodes` (`selectionTypeId`,`levelId`);--> statement-breakpoint
CREATE INDEX `selection_types_tenant_idx` ON `selectionTypes` (`tenantId`);