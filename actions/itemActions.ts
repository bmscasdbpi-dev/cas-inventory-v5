"use server"

import { db } from "../db/index"; 
import { items, foundReports } from "../db/schema"; 
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * ADD ITEM
 */
export async function addItem(formData: any) {
  try {
    // 1. PRINT THE DATA TO YOUR VS CODE TERMINAL TO DEBUG
    console.log("RECEIVED FORM DATA:", formData);

    await db.insert(items).values({
      itemCode: formData.itemCode,
      oldItemCode: formData.oldItemCode,
      itemName: formData.itemName,
      itemType: formData.itemType,
      category: formData.category,
      serialNumber: formData.serialNumber,
      locationStored: formData.locationStored,
      availabilityStatus: formData.availabilityStatus || "Available",
      deviceStatus: formData.deviceStatus || "Working",
      
      // 2. DEFENSIVE CHECK: This will catch the link no matter what your input name is
      gdriveLink: formData.gdriveLink || formData.gdrive_link || formData.docsLink || "", 

      remarks: formData.remarks,
      maintenanceRecords: formData.maintenanceRecords,
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    // THIS ERROR APPEARS IN YOUR VS CODE TERMINAL, NOT THE BROWSER
    console.error("Add Item Error Details:", error);
    return { success: false };
  }
}

/**
 * UPDATE ITEM
 */
export async function updateItem(id: number, formData: any) {
  try {
    await db.update(items)
      .set({
        itemCode: formData.itemCode,
        oldItemCode: formData.oldItemCode,
        itemName: formData.itemName,
        itemType: formData.itemType,
        category: formData.category,
        serialNumber: formData.serialNumber,
        locationStored: formData.locationStored,
        availabilityStatus: formData.availabilityStatus,
        deviceStatus: formData.deviceStatus, 
        
        // Same defensive check here
        gdriveLink: formData.gdriveLink || formData.gdrive_link || formData.docsLink || "", 

        remarks: formData.remarks,
        maintenanceRecords: formData.maintenanceRecords,
      })
      .where(eq(items.id, id));

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Update Error Details:", error);
    return { success: false };
  }
}

/**
 * DELETE ITEM
 */
export async function deleteItem(id: number) {
  try {
    await db.delete(items).where(eq(items.id, id));
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Delete Error:", error);
    return { success: false };
  }
}

/**
 * GET ITEM BY CODE (For Scanner)
 */
export async function getItemByCode(code: string) {
  try {
    const result = await db
      .select()
      .from(items)
      .where(eq(items.itemCode, code.toUpperCase()))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Database Search Error:", error);
    return null;
  }
}

/**
 * SUBMIT FOUND ITEM REPORT
 * Stores report in the found_reports table in TursoDB
 */
export async function submitFoundReport(formData: FormData) {
  try {
    const referenceId = `REP-${Date.now()}`;

    await db.insert(foundReports).values({
      reportReferenceId: referenceId,
      reportDate: formData.get("date") as string,
      // Change 'itemCode' to 'itemCodes' to match your schema
      itemCodes: formData.get("itemCodes") as string, 
      // Change 'itemName' to 'itemNames' to match your schema
      itemNames: formData.get("itemNames") as string, 
      description: formData.get("description") as string,
      location: formData.get("location") as string,
      reporterName: formData.get("foundBy") as string,
      contactNumber: formData.get("contactNumber") as string,
      photoUrl: "Bulk report photo", // Or your actual URL logic
    });

    return { success: true, referenceId };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}