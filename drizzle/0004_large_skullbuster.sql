CREATE TABLE `maintenance_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL,
	`item_category` text NOT NULL,
	`date` text,
	`activity` text,
	`status` text DEFAULT 'Ongoing',
	`center` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
