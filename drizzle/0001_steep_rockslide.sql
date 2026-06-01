ALTER TABLE `items` RENAME TO `cameras`;--> statement-breakpoint
CREATE TABLE `computers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_code` text NOT NULL,
	`item_name` text NOT NULL,
	`item_type` text,
	`serial_number` text,
	`location_stored` text,
	`device_status` text DEFAULT 'Working',
	`availability_status` text DEFAULT 'Available',
	`remarks` text,
	`old_item_code` text,
	`maintenance_records` text,
	`gdrive_link` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `computers_item_code_unique` ON `computers` (`item_code`);--> statement-breakpoint
CREATE TABLE `lights` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_code` text NOT NULL,
	`item_name` text NOT NULL,
	`item_type` text,
	`serial_number` text,
	`location_stored` text,
	`device_status` text DEFAULT 'Working',
	`availability_status` text DEFAULT 'Available',
	`remarks` text,
	`old_item_code` text,
	`maintenance_records` text,
	`gdrive_link` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lights_item_code_unique` ON `lights` (`item_code`);--> statement-breakpoint
CREATE TABLE `office` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_code` text NOT NULL,
	`item_name` text NOT NULL,
	`item_type` text,
	`serial_number` text,
	`location_stored` text,
	`device_status` text DEFAULT 'Working',
	`availability_status` text DEFAULT 'Available',
	`remarks` text,
	`old_item_code` text,
	`maintenance_records` text,
	`gdrive_link` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `office_item_code_unique` ON `office` (`item_code`);--> statement-breakpoint
CREATE TABLE `others` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_code` text NOT NULL,
	`item_name` text NOT NULL,
	`item_type` text,
	`serial_number` text,
	`location_stored` text,
	`device_status` text DEFAULT 'Working',
	`availability_status` text DEFAULT 'Available',
	`remarks` text,
	`old_item_code` text,
	`maintenance_records` text,
	`gdrive_link` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `others_item_code_unique` ON `others` (`item_code`);--> statement-breakpoint
CREATE TABLE `sound` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_code` text NOT NULL,
	`item_name` text NOT NULL,
	`item_type` text,
	`serial_number` text,
	`location_stored` text,
	`device_status` text DEFAULT 'Working',
	`availability_status` text DEFAULT 'Available',
	`remarks` text,
	`old_item_code` text,
	`maintenance_records` text,
	`gdrive_link` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sound_item_code_unique` ON `sound` (`item_code`);--> statement-breakpoint
DROP INDEX `items_item_code_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `cameras_item_code_unique` ON `cameras` (`item_code`);--> statement-breakpoint
ALTER TABLE `cameras` DROP COLUMN `category`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_borrower_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer,
	`item_id` integer,
	`item_category` text,
	`date_returned` numeric,
	`request_status` text DEFAULT 'Preparing',
	FOREIGN KEY (`session_id`) REFERENCES `borrowing_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_borrower_records`("id", "session_id", "item_id", "item_category", "date_returned", "request_status") SELECT "id", "session_id", "item_id", "item_category", "date_returned", "request_status" FROM `borrower_records`;--> statement-breakpoint
DROP TABLE `borrower_records`;--> statement-breakpoint
ALTER TABLE `__new_borrower_records` RENAME TO `borrower_records`;--> statement-breakpoint
PRAGMA foreign_keys=ON;