"use server"

import { db } from "../db/index"; 
import * as schema from "../db/schema"; 
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * HELPER: Select the correct table based on category
 */
const getTable = (category: string) => {
  const mapping: Record<string, any> = {
    "Cameras & Accessories": schema.cameras,
    "Lights & Accessories": schema.lights,
    "Sound & Accessories": schema.sound,
    "Computers & Peripherals": schema.computers,
    "Office Appliance": schema.office,
    "Others": schema.others,
  };
  return mapping[category] || schema.others;
};

/**
 * ADD ITEM
 */
export async function addItem(formData: any) {
  try {
    const targetTable = getTable(formData.category);

    return await db.transaction(async (tx) => {
      // 1. Insert the main item
      const [inserted] = await tx.insert(targetTable).values({
        itemCode: formData.itemCode,
        oldItemCode: formData.oldItemCode,
        itemName: formData.itemName,
        itemType: formData.itemType,
        category: formData.category,
        inclusions: formData.inclusions || "",
        serialNumber: formData.serialNumber,
        locationStored: formData.locationStored,
        availabilityStatus: formData.availabilityStatus || "Available",
        deviceStatus: formData.deviceStatus || "Working",
        gdriveLink: formData.gdriveLink || formData.gdrive_link || "", 
        remarks: formData.remarks,
        maintenanceRecords: formData.maintenanceRecords,
      }).returning({ id: targetTable.id });

      // 2. Insert maintenance logs into the dedicated table
      if (formData.maintenanceLogs && Array.isArray(formData.maintenanceLogs) && formData.maintenanceLogs.length > 0) {
        const logsToInsert = formData.maintenanceLogs.map((log: any) => ({
          itemId: inserted.id,
          itemCategory: formData.category,
          date: log.date,
          activity: log.activity,
          status: log.status,
          center: log.center
        }));
        await tx.insert(schema.maintenanceLogs).values(logsToInsert);
      }

      revalidatePath("/dashboard");
      return { success: true };
    });
  } catch (error) {
    console.error("Add Error:", error);
    return { success: false };
  }
}

/**
 * UPDATE ITEM
 */
export async function updateItem(id: number, formData: any) {
  try {
    if (!id || !formData) return { success: false, error: "Invalid Data" };

    const targetTable = getTable(formData.category);

    // Sanitize updates to prevent 'undefined' crashes in Drizzle
    const safeUpdates: any = {
      itemCode: formData.itemCode,
      oldItemCode: formData.oldItemCode,
      itemName: formData.itemName,
      itemType: formData.itemType,
      category: formData.category, 
      inclusions: formData.inclusions || "", 
      serialNumber: formData.serialNumber,
      locationStored: formData.locationStored,
      availabilityStatus: formData.availabilityStatus,
      deviceStatus: formData.deviceStatus, 
      gdriveLink: formData.gdriveLink || formData.gdrive_link || "", 
      remarks: formData.remarks,
      maintenanceRecords: formData.maintenanceRecords,
    };

    // Remove any purely undefined fields so Drizzle doesn't crash
    Object.keys(safeUpdates).forEach(key => {
      if (safeUpdates[key] === undefined) {
        delete safeUpdates[key];
      }
    });

    return await db.transaction(async (tx) => {
      // 1. Update the main item
      await tx.update(targetTable)
        .set(safeUpdates)
        .where(eq(targetTable.id, id));

      // 2. Sync Maintenance Logs Table
      if (formData.maintenanceLogs && Array.isArray(formData.maintenanceLogs)) {
        // Wipe existing logs for this item to prevent duplicates
        await tx.delete(schema.maintenanceLogs)
          .where(
            and(
              eq(schema.maintenanceLogs.itemId, id),
              eq(schema.maintenanceLogs.itemCategory, formData.category)
            )
          );
        
        // Re-insert logs
        if (formData.maintenanceLogs.length > 0) {
          const logsToInsert = formData.maintenanceLogs.map((log: any) => ({
            itemId: id,
            itemCategory: formData.category,
            date: log.date,
            activity: log.activity,
            status: log.status,
            center: log.center
          }));
          await tx.insert(schema.maintenanceLogs).values(logsToInsert);
        }
      }

      revalidatePath("/dashboard");
      return { success: true };
    });
  } catch (error) {
    console.error("Update Error:", error);
    return { success: false };
  }
}

/**
 * DELETE ITEM
 */
export async function deleteItem(id: number, category: string) {
  try {
    const targetTable = getTable(category);
    
    return await db.transaction(async (tx) => {
      // Delete item
      await tx.delete(targetTable).where(eq(targetTable.id, id));
      
      // Delete associated maintenance logs
      await tx.delete(schema.maintenanceLogs)
        .where(
          and(
            eq(schema.maintenanceLogs.itemId, id),
            eq(schema.maintenanceLogs.itemCategory, category)
          )
        );
        
      revalidatePath("/dashboard");
      return { success: true };
    });
  } catch (error) {
    console.error("Delete Error:", error);
    return { success: false };
  }
}

/**
 * SCANNER LOGIC: Search all tables for a code
 */
export async function getItemByCode(code: string) {
  try {
    const categories = [
      schema.cameras, schema.lights, schema.sound, 
      schema.computers, schema.office, schema.others
    ];

    for (const table of categories) {
      const result = await db.select().from(table).where(eq(table.itemCode, code.toUpperCase())).limit(1);
      if (result.length > 0) return result[0];
    }
    return null;
  } catch (error) {
    return null;
  }
}