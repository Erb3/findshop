-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `Shop` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`owner` text,
	`computerID` integer NOT NULL,
	`multiShop` integer,
	`softwareName` text,
	`softwareVersion` text,
	`lastSeen` numeric DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Location` (
	`id` text PRIMARY KEY NOT NULL,
	`main` numeric NOT NULL,
	`x` integer,
	`y` integer,
	`z` integer,
	`description` text,
	`dimension` integer,
	`shopID` text NOT NULL,
	FOREIGN KEY (`shopID`) REFERENCES `Shop`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Item` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`displayName` text NOT NULL,
	`nbtHash` text,
	`description` text,
	`dynamicPrice` numeric NOT NULL,
	`madeOnDemand` numeric NOT NULL,
	`stock` integer,
	`requiresInteraction` numeric NOT NULL,
	`shopBuysItem` numeric NOT NULL,
	`noLimit` numeric NOT NULL,
	`shopID` text NOT NULL,
	FOREIGN KEY (`shopID`) REFERENCES `Shop`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Price` (
	`id` text PRIMARY KEY NOT NULL,
	`value` real NOT NULL,
	`currency` text NOT NULL,
	`address` text,
	`requiredMeta` text,
	`itemID` text NOT NULL,
	FOREIGN KEY (`itemID`) REFERENCES `Item`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Shop_id_key` ON `Shop` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `Location_id_key` ON `Location` (`id`);
*/