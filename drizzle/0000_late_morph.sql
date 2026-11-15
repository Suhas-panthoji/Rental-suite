CREATE TABLE `agreement_tenants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`agreement_id` integer NOT NULL,
	`tenant_id` integer NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`agreement_id`) REFERENCES `agreements`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agreement_tenant_uq` ON `agreement_tenants` (`agreement_id`,`tenant_id`);--> statement-breakpoint
CREATE TABLE `agreements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`number` text NOT NULL,
	`type` text DEFAULT 'rent' NOT NULL,
	`unit_id` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`rent_paise` integer NOT NULL,
	`due_day` integer DEFAULT 5 NOT NULL,
	`notice_days` integer DEFAULT 30 NOT NULL,
	`escalation_pct` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`terminated_on` text,
	`terminated_reason` text DEFAULT '' NOT NULL,
	`terms` text DEFAULT '' NOT NULL,
	`superseded_by_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agreements_number_unique` ON `agreements` (`number`);--> statement-breakpoint
CREATE INDEX `agreements_unit_idx` ON `agreements` (`unit_id`);--> statement-breakpoint
CREATE INDEX `agreements_status_idx` ON `agreements` (`status`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity` text NOT NULL,
	`entity_id` integer NOT NULL,
	`action` text NOT NULL,
	`before_json` text DEFAULT '' NOT NULL,
	`after_json` text DEFAULT '' NOT NULL,
	`user_id` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `audit_logs` (`entity`,`entity_id`);--> statement-breakpoint
CREATE TABLE `deposit_txns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`agreement_id` integer NOT NULL,
	`type` text NOT NULL,
	`amount_paise` integer NOT NULL,
	`date` text NOT NULL,
	`mode` text DEFAULT 'cash' NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`agreement_id`) REFERENCES `agreements`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `deposit_agreement_idx` ON `deposit_txns` (`agreement_id`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_entity` text NOT NULL,
	`entity_id` integer NOT NULL,
	`label` text NOT NULL,
	`path` text NOT NULL,
	`mime` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dues` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`agreement_id` integer NOT NULL,
	`type` text NOT NULL,
	`period` text NOT NULL,
	`amount_paise` integer NOT NULL,
	`due_date` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`balance_paise` integer NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`source_ref` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`agreement_id`) REFERENCES `agreements`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `dues_agreement_idx` ON `dues` (`agreement_id`);--> statement-breakpoint
CREATE INDEX `dues_status_idx` ON `dues` (`status`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`category` text DEFAULT 'other' NOT NULL,
	`property_id` integer,
	`unit_id` integer,
	`amount_paise` integer NOT NULL,
	`mode` text DEFAULT 'cash' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`recoverable` integer DEFAULT false NOT NULL,
	`agreement_id` integer,
	`due_id` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `expenses_date_idx` ON `expenses` (`date`);--> statement-breakpoint
CREATE TABLE `meter_readings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`unit_id` integer NOT NULL,
	`service` text NOT NULL,
	`reading_date` text NOT NULL,
	`prev_reading` integer DEFAULT 0 NOT NULL,
	`curr_reading` integer NOT NULL,
	`units_consumed` integer NOT NULL,
	`rate_paise` integer DEFAULT 0 NOT NULL,
	`fixed_charge_paise` integer DEFAULT 0 NOT NULL,
	`bill_amount_paise` integer DEFAULT 0 NOT NULL,
	`billed_to` text DEFAULT 'tenant' NOT NULL,
	`agreement_id` integer,
	`due_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `readings_unit_idx` ON `meter_readings` (`unit_id`);--> statement-breakpoint
CREATE TABLE `payment_allocations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`payment_id` integer NOT NULL,
	`due_id` integer NOT NULL,
	`amount_paise` integer NOT NULL,
	FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`due_id`) REFERENCES `dues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `alloc_payment_idx` ON `payment_allocations` (`payment_id`);--> statement-breakpoint
CREATE INDEX `alloc_due_idx` ON `payment_allocations` (`due_id`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`agreement_id` integer NOT NULL,
	`date` text NOT NULL,
	`amount_paise` integer NOT NULL,
	`mode` text DEFAULT 'cash' NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`receipt_no` text NOT NULL,
	`remarks` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`agreement_id`) REFERENCES `agreements`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_receipt_no_unique` ON `payments` (`receipt_no`);--> statement-breakpoint
CREATE INDEX `payments_agreement_idx` ON `payments` (`agreement_id`);--> statement-breakpoint
CREATE TABLE `properties` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'house' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`owner_name` text DEFAULT '' NOT NULL,
	`owner_phone` text DEFAULT '' NOT NULL,
	`owner_email` text DEFAULT '' NOT NULL,
	`owner_address` text DEFAULT '' NOT NULL,
	`owner_pan` text DEFAULT '' NOT NULL,
	`default_due_day` integer DEFAULT 5 NOT NULL,
	`receipt_prefix` text DEFAULT 'RCP' NOT NULL,
	`elec_rate_paise` integer DEFAULT 800 NOT NULL,
	`elec_fixed_charge_paise` integer DEFAULT 9000 NOT NULL,
	`water_mode` text DEFAULT 'flat' NOT NULL,
	`water_flat_rate_paise` integer DEFAULT 20000 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settlements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`agreement_id` integer NOT NULL,
	`exit_date` text NOT NULL,
	`total_advance_paise` integer DEFAULT 0 NOT NULL,
	`outstanding_paise` integer DEFAULT 0 NOT NULL,
	`deductions_paise` integer DEFAULT 0 NOT NULL,
	`refundable_paise` integer DEFAULT 0 NOT NULL,
	`refund_date` text,
	`refund_mode` text DEFAULT '' NOT NULL,
	`refund_reference` text DEFAULT '' NOT NULL,
	`acknowledgment` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`agreement_id`) REFERENCES `agreements`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`alt_phone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`id_type` text DEFAULT 'aadhaar' NOT NULL,
	`id_number` text DEFAULT '' NOT NULL,
	`occupation` text DEFAULT '' NOT NULL,
	`emergency_contact` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `tenants_name_idx` ON `tenants` (`name`);--> statement-breakpoint
CREATE INDEX `tenants_phone_idx` ON `tenants` (`phone`);--> statement-breakpoint
CREATE TABLE `units` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`property_id` integer NOT NULL,
	`label` text NOT NULL,
	`type` text DEFAULT 'room' NOT NULL,
	`area_sqft` integer,
	`expected_rent_paise` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'vacant' NOT NULL,
	`elec_meter_no` text DEFAULT '' NOT NULL,
	`water_meter_no` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `units_property_idx` ON `units` (`property_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);