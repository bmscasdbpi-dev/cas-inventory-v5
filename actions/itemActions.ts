"use server"

import { db } from "../db/index"; 
import { items } from "../db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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