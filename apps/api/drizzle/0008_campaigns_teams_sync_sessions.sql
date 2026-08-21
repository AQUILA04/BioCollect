CREATE TABLE `campaigns` (
	`id` varchar(36) NOT NULL,
	`projectId` varchar(36) NOT NULL,
	`name` varchar(160) NOT NULL,
	`description` text,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`status` enum('PLANNED','ACTIVE','COMPLETED') NOT NULL DEFAULT 'PLANNED',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` varchar(36) NOT NULL,
	`campaignId` varchar(36) NOT NULL,
	`name` varchar(160) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teams_id` PRIMARY KEY(`id`),
	CONSTRAINT `teams_campaign_name_unique` UNIQUE(`campaignId`,`name`)
);
--> statement-breakpoint
CREATE TABLE `teamMembers` (
	`id` varchar(36) NOT NULL,
	`teamId` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`role` enum('OPERATOR','SUPPORT') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `teamMembers_id` PRIMARY KEY(`id`),
	CONSTRAINT `team_members_team_user_unique` UNIQUE(`teamId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `syncSessions` (
	`id` varchar(36) NOT NULL,
	`campaignId` varchar(36) NOT NULL,
	`teamId` varchar(36) NOT NULL,
	`operatorId` int NOT NULL,
	`totalOffline` int NOT NULL,
	`selectedForSync` int NOT NULL,
	`receivedCount` int NOT NULL DEFAULT 0,
	`failedCount` int NOT NULL DEFAULT 0,
	`deduplicationSuccessCount` int NOT NULL DEFAULT 0,
	`status` enum('IN_PROGRESS','COMPLETED','FAILED') NOT NULL DEFAULT 'IN_PROGRESS',
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `syncSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `campaigns_project_idx` ON `campaigns` (`projectId`);--> statement-breakpoint
CREATE INDEX `campaigns_status_idx` ON `campaigns` (`status`);--> statement-breakpoint
CREATE INDEX `teams_campaign_idx` ON `teams` (`campaignId`);--> statement-breakpoint
CREATE INDEX `team_members_user_idx` ON `teamMembers` (`userId`);--> statement-breakpoint
CREATE INDEX `team_members_team_role_idx` ON `teamMembers` (`teamId`,`role`);--> statement-breakpoint
CREATE INDEX `sync_sessions_campaign_idx` ON `syncSessions` (`campaignId`);--> statement-breakpoint
CREATE INDEX `sync_sessions_team_idx` ON `syncSessions` (`teamId`);--> statement-breakpoint
CREATE INDEX `sync_sessions_operator_idx` ON `syncSessions` (`operatorId`);--> statement-breakpoint
CREATE INDEX `sync_sessions_started_idx` ON `syncSessions` (`startedAt`);
