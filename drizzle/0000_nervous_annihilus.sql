CREATE TABLE `borrowing_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`requestor_name` text NOT NULL,
	`company_name` text,
	`department_name` text,
	`purpose_title` text NOT NULL,
	`purpose_date` text,
	`pickup_date` numeric,
	`expected_return_date` numeric,
	`date_requested` numeric DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_code` text NOT NULL,
	`old_item_code` text,
	`item_name` text NOT NULL,
	`item_type` text,
	`category` text,
	`serial_number` text,
	`location_stored` text,
	`availability_status` text DEFAULT 'Available',
	`deviceStatus` text DEFAULT 'Working',
	`remarks` text,
	`maintenance_records` text,
	`gdrive_link` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `items_item_code_unique` ON `items` (`item_code`);--> statement-breakpoint
CREATE TABLE `borrower_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer,
	`item_id` integer,
	`date_returned` numeric,
	`request_status` text DEFAULT 'Preparing',
	FOREIGN KEY (`session_id`) REFERENCES `borrowing_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action
);
