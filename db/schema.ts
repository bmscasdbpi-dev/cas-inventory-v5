import { sqliteTable, text, integer, numeric } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * 1. CAMERAS & ACCESSORIES
 */
export const cameras = sqliteTable("cameras", {
  id: integer("id").primaryKey({ autoIncrement: true }),
itemCode: text("item_code").notNull(),
  itemName: text("item_name").notNull(),
  itemType: text("item_type"),
  category: text("category"),
  serialNumber: text("serial_number"),
  locationStored: text("location_stored"),
  inclusions: text("inclusions"),
  deviceStatus: text("device_status").default("Working"), 
  availabilityStatus: text("availability_status").default("Available"),
  remarks: text("remarks"),
  oldItemCode: text("old_item_code"),
  maintenanceRecords: text("maintenance_records"),
  gdriveLink: text("gdrive_link"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

/**
 * 2. LIGHTS & ACCESSORIES
 */
export const lights = sqliteTable("lights", {
  id: integer("id").primaryKey({ autoIncrement: true }),
itemCode: text("item_code").notNull(),
  itemName: text("item_name").notNull(),          
  itemType: text("item_type"),                    
  category: text("category"),
  serialNumber: text("serial_number"),            
  locationStored: text("location_stored"),        
  inclusions: text("inclusions"),
  deviceStatus: text("device_status").default("Working"), 
  availabilityStatus: text("availability_status").default("Available"), 
  remarks: text("remarks"),                        
  oldItemCode: text("old_item_code"),             
  maintenanceRecords: text("maintenance_records"),
  gdriveLink: text("gdrive_link"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

/**
 * 3. SOUND & ACCESSORIES
 */
export const sound = sqliteTable("sound", {
  id: integer("id").primaryKey({ autoIncrement: true }),
itemCode: text("item_code").notNull(),
  itemName: text("item_name").notNull(),
  itemType: text("item_type"),
  category: text("category"),
  serialNumber: text("serial_number"),
  locationStored: text("location_stored"),
  inclusions: text("inclusions"),
  deviceStatus: text("device_status").default("Working"),
  availabilityStatus: text("availability_status").default("Available"),
  remarks: text("remarks"),
  oldItemCode: text("old_item_code"),
  maintenanceRecords: text("maintenance_records"),
  gdriveLink: text("gdrive_link"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

/**
 * 4. COMPUTER & PERIPHERALS
 */
export const computers = sqliteTable("computers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
itemCode: text("item_code").notNull(),
  itemName: text("item_name").notNull(),
  itemType: text("item_type"),
  category: text("category"),
  serialNumber: text("serial_number"),
  locationStored: text("location_stored"),
  inclusions: text("inclusions"),
  deviceStatus: text("device_status").default("Working"),
  availabilityStatus: text("availability_status").default("Available"),
  remarks: text("remarks"),
  oldItemCode: text("old_item_code"),
  maintenanceRecords: text("maintenance_records"),
  gdriveLink: text("gdrive_link"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

/**
 * 5. OFFICE APPLIANCE
 */
export const office = sqliteTable("office", {
  id: integer("id").primaryKey({ autoIncrement: true }),
itemCode: text("item_code").notNull(),
  itemName: text("item_name").notNull(),
  itemType: text("item_type"),
  category: text("category"),
  serialNumber: text("serial_number"),
  locationStored: text("location_stored"),
  inclusions: text("inclusions"),
  deviceStatus: text("device_status").default("Working"),
  availabilityStatus: text("availability_status").default("Available"),
  remarks: text("remarks"),
  oldItemCode: text("old_item_code"),
  maintenanceRecords: text("maintenance_records"),
  gdriveLink: text("gdrive_link"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

/**
 * 6. OTHERS
 */
export const others = sqliteTable("others", {
  id: integer("id").primaryKey({ autoIncrement: true }),
itemCode: text("item_code").notNull(),
  itemName: text("item_name").notNull(),
  itemType: text("item_type"),
  category: text("category"),
  serialNumber: text("serial_number"),
  locationStored: text("location_stored"),
  inclusions: text("inclusions"),
  deviceStatus: text("device_status").default("Working"),
  availabilityStatus: text("availability_status").default("Available"),
  remarks: text("remarks"),
  oldItemCode: text("old_item_code"),
  maintenanceRecords: text("maintenance_records"),
  gdriveLink: text("gdrive_link"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

/**
 * BORROWING SESSIONS
 */
export const borrowingSessions = sqliteTable("borrowing_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requestorName: text("requestor_name").notNull(),
  companyName: text("company_name"),
  departmentName: text("department_name"),
  purposeTitle: text("purpose_title").notNull(),
  purposeDate: text("purpose_date"),
  pickupDate: numeric("pickup_date"),
  expectedReturnDate: numeric("expected_return_date"),
  dateRequested: numeric("date_requested").default(sql`CURRENT_TIMESTAMP`),
});

/**
 * USAGE LOGS / BORROWER RECORDS
 */
export const usageLogs = sqliteTable("borrower_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id").references(() => borrowingSessions.id), 
  itemId: integer("item_id"), 
  itemCategory: text("item_category"), 
  dateReturned: numeric("date_returned"),
  requestStatus: text("request_status").default("Preparing"),
});

/**
 * MAINTENANCE LOGS (NEW)
 */
export const maintenanceLogs = sqliteTable("maintenance_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id").notNull(),
  itemCategory: text("item_category").notNull(),
  date: text("date"),
  activity: text("activity"),
  status: text("status").default("Ongoing"),
  center: text("center"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});