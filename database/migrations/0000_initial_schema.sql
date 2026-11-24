CREATE TABLE `auth_credentials` (
	`id` integer PRIMARY KEY NOT NULL,
	`password_hash` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dashboard_widgets` (
	`id` text PRIMARY KEY NOT NULL,
	`widget_type` text NOT NULL,
	`tracker_id` text,
	`position` integer DEFAULT 0 NOT NULL,
	`size` text DEFAULT 'md' NOT NULL,
	`config` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`tracker_id`) REFERENCES `trackers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`tracker_id` text NOT NULL,
	`occurred_at` text NOT NULL,
	`ends_at` text,
	`local_date` text NOT NULL,
	`tz_offset_min` integer NOT NULL,
	`value` real,
	`data` text DEFAULT '{}' NOT NULL,
	`data_version` integer DEFAULT 1 NOT NULL,
	`note` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`source_ref` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`tracker_id`) REFERENCES `trackers`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `entries_tracker_date_idx` ON `entries` (`tracker_id`,`local_date`);--> statement-breakpoint
CREATE INDEX `entries_date_idx` ON `entries` (`local_date`);--> statement-breakpoint
CREATE INDEX `entries_tracker_occurred_idx` ON `entries` (`tracker_id`,`occurred_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `entries_source_ref_uq` ON `entries` (`source`,`source_ref`) WHERE "entries"."source_ref" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`tracker_id` text NOT NULL,
	`metric` text NOT NULL,
	`period` text NOT NULL,
	`comparator` text NOT NULL,
	`target` real NOT NULL,
	`target_max` real,
	`valid_from` text NOT NULL,
	`valid_to` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`tracker_id`) REFERENCES `trackers`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `goals_tracker_valid_idx` ON `goals` (`tracker_id`,`valid_from`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`last_seen_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`expires_at` text NOT NULL,
	`device_label` text
);
--> statement-breakpoint
CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trackers` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`module` text NOT NULL,
	`name` text NOT NULL,
	`icon` text,
	`color` text,
	`config` text DEFAULT '{}' NOT NULL,
	`config_version` integer DEFAULT 1 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`archived_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trackers_key_uq` ON `trackers` (`key`);--> statement-breakpoint
CREATE INDEX `trackers_module_idx` ON `trackers` (`module`);