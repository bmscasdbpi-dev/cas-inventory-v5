"use server"

import { db } from "../db/index"; 
import * as schema from "../db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { unstable_noStore as noStore } from "next/cache"; // Bypass Next.js static cache

/**
 * HELPER: Select the correct table based on category string
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
 * 1. Kunin ang lahat ng items mula sa LAHAT ng category
 * UPDATED: Fetches relational maintenance logs from Turso & unpacks legacy records
 */
export async function getAllItems() {
  noStore(); // Prevent caching
  try {
    const categories = [
      "Cameras & Accessories",
      "Lights & Accessories",
      "Sound & Accessories",
      "Computers & Peripherals",
      "Office Appliance",
      "Others"
    ];

    // 1. Fetch all items across all category tables
    const allData = await Promise.all(categories.map(async (cat) => {
      const targetTable = getTable(cat);
      const data = await db.select().from(targetTable).orderBy(desc(targetTable.id));
      
      // Inject category for later mapping
      return data.map((item: any) => ({
        ...item,
        category: cat,
        itemCategory: cat
      }));
    }));

    // Flatten the results into a single array
    const flattenedItems = allData.flat();

    // 2. Fetch all relational maintenance logs from the new table at once
    const allMaintenanceLogs = await db.select().from(schema.maintenanceLogs);

    // 3. Map logs and legacy data to their respective items
    const itemsWithLogs = flattenedItems.map(item => {
      let parsedLegacy = item.maintenanceRecords;
      
      // Handle legacy JSON parsing for old notes
      try {
        const parsed = JSON.parse(item.maintenanceRecords || "{}");
        if (parsed.legacy !== undefined) {
          parsedLegacy = parsed.legacy;
        }
      } catch(e) {
        // If it fails, it means it's old pure text legacy data, which is completely fine!
      }

      // Filter logs matching both ID and Category to prevent overlaps across tables
      const matchingLogs = allMaintenanceLogs.filter(
        log => log.itemId === item.id && log.itemCategory === item.category
      );

      return { 
        ...item, 
        maintenanceRecords: parsedLegacy,
        maintenanceLogs: matchingLogs // Attach the real TursoDB relational records here
      };
    });

    return { success: true, data: itemsWithLogs };
  } catch (error) {
    console.error("Fetch Items Error:", error);
    return { success: false, data: [] };
  }
}

/**
 * 2. Pag-log ng paggamit (Equipment Issuance)
 * UPDATED: Bulletproof payload handling
 */
export async function useEquipment(formData: {
  borrowedBy: string;
  companyName: string;
  departmentName: string;
  eventName: string;
  purposeDate: string;
  claimDate: string;
  returnExpectedDate: string;
  items?: { id: number; category: string }[]; // New structure
  itemIds?: number[]; // Fallback for old structure
  category?: string; // Fallback for old structure
}) {
  noStore();
  try {
    return await db.transaction(async (tx) => {
      // Create the main borrowing session
      const [session] = await tx.insert(schema.borrowingSessions).values({
        requestorName: formData.borrowedBy,
        companyName: formData.companyName,
        departmentName: formData.departmentName,
        purposeTitle: formData.eventName,
        purposeDate: formData.purposeDate,
        pickupDate: formData.claimDate,
        expectedReturnDate: formData.returnExpectedDate,
      }).returning({ id: schema.borrowingSessions.id });

      if (!session) throw new Error("Failed to create borrowing session.");

      // Safely handle both new and old payload formats so it NEVER crashes
      const itemsToProcess = formData.items 
        ? formData.items 
        : (formData.itemIds || []).map(id => ({ id, category: formData.category || "Others" }));

      for (const item of itemsToProcess) {
        const targetTable = getTable(item.category);

        // Insert log record with category identifier
        await tx.insert(schema.usageLogs).values({
          sessionId: session.id,
          itemId: item.id,
          itemCategory: item.category, 
          requestStatus: "Preparing",
        });

        // Update availability in the specific category table
        await tx.update(targetTable)
          .set({ availabilityStatus: "Unavailable" })
          .where(eq(targetTable.id, item.id));
      }

      revalidatePath("/dashboard");
      revalidatePath("/dashboard/logbook");
      return { success: true };
    });
  } catch (e) {
    console.error("Use Equipment Error:", e);
    return { success: false, error: "Hindi ma-save ang record." };
  }
}

/**
 * 3. Pag-return ng kagamitan (Batch)
 */
export async function returnEquipmentBatch(logIds: number[], itemIds: number[], category: string, manualReturnDate: string) {
  try {
    return await db.transaction(async (tx) => {
      if (logIds.length > 0) {
        await tx.update(schema.usageLogs)
          .set({ 
            dateReturned: manualReturnDate, 
            requestStatus: "Returned" 
          })
          .where(inArray(schema.usageLogs.id, logIds));
      }

      if (itemIds.length > 0) {
        const targetTable = getTable(category);
        await tx.update(targetTable)
          .set({ availabilityStatus: "Available" })
          .where(inArray(targetTable.id, itemIds));
      }

      revalidatePath("/dashboard/logbook");
      revalidatePath("/dashboard");
      return { success: true };
    });
  } catch (e) {
    console.error("Batch Return Error:", e);
    return { success: false };
  }
}


/**
 * 4. Kunin ang lahat ng logs
 * Multi-table join logic with Legacy Data Support & Error Logging
 */
export async function getAllLogs() {
  noStore(); // Prevent Next.js from caching empty databases
  try {
    const data = await db
      .select({
        id: schema.usageLogs.id,
        sessionId: schema.usageLogs.sessionId,
        itemId: schema.usageLogs.itemId,
        itemCategory: schema.usageLogs.itemCategory,
        requestorName: schema.borrowingSessions.requestorName,
        companyName: schema.borrowingSessions.companyName,
        departmentName: schema.borrowingSessions.departmentName,
        purposeTitle: schema.borrowingSessions.purposeTitle,
        dateRequested: schema.borrowingSessions.dateRequested,
        pickupDate: schema.borrowingSessions.pickupDate,
        expectedReturnDate: schema.borrowingSessions.expectedReturnDate,
        dateReturned: schema.usageLogs.dateReturned,
        requestStatus: schema.usageLogs.requestStatus,
      })
      .from(schema.usageLogs)
      .leftJoin(schema.borrowingSessions, eq(schema.usageLogs.sessionId, schema.borrowingSessions.id))
      .orderBy(desc(schema.usageLogs.id));

    const enrichedData = await Promise.all(data.map(async (log: any) => {
      // If old record has no category, skip the DB lookup to prevent crashing
      if (!log.itemCategory) {
        return {
          ...log,
          itemCode: "LEGACY",
          itemName: "Old Legacy Record",
          serialNumber: "N/A"
        };
      }

      if (!log.itemId) return log;
      
      try {
        const targetTable = getTable(log.itemCategory);
        const itemDetails = await db.select({
          itemCode: targetTable.itemCode,
          itemName: targetTable.itemName,
          serialNumber: targetTable.serialNumber
        })
        .from(targetTable)
        .where(eq(targetTable.id, log.itemId))
        .limit(1);

        return {
          ...log,
          itemCode: itemDetails[0]?.itemCode || "N/A",
          itemName: itemDetails[0]?.itemName || "Item Missing",
          serialNumber: itemDetails[0]?.serialNumber || "N/A"
        };
      } catch (itemErr) {
        // If a specific category query fails, return a fallback instead of crashing everything
        console.error(`Failed to fetch item details for log ${log.id}:`, itemErr);
        return { ...log, itemCode: "ERROR", itemName: "Query Error", serialNumber: "N/A" };
      }
    }));

    return { success: true, data: enrichedData };
  } catch (error: any) {
    // THIS WILL TELL US IF TURSO IS REJECTING THE QUERY
    console.error("!!! CRITICAL: Fetch Logs Error !!!", error);
    return { success: false, data: [], error: error.message };
  }
}

/**
 * 5. Update Session Details
 */
export async function updateSessionBatch(sessionId: number, updates: {
  requestorName?: string;
  companyName?: string;
  departmentName?: string;
  purposeTitle?: string;
}) {
  try {
    await db.update(schema.borrowingSessions)
      .set(updates)
      .where(eq(schema.borrowingSessions.id, sessionId));

    revalidatePath("/dashboard/logbook");
    return { success: true };
  } catch (error) {
    console.error("Update Session Error:", error);
    return { success: false };
  }
}

/**
 * 6. Update Status (Batch)
 */
export async function updateBatchStatus(logIds: number[], newStatus: string) {
  try {
    await db.update(schema.usageLogs)
      .set({ requestStatus: newStatus })
      .where(inArray(schema.usageLogs.id, logIds));

    revalidatePath("/dashboard/logbook");
    return { success: true };
  } catch (error) {
    console.error("Status Update Error:", error);
    return { success: false };
  }
}

/**
 * 7. Update Single Log Entry
 */
export async function updateSingleLogEntry(logId: number, itemId: number, category: string, updates: any) {
  try {
    return await db.transaction(async (tx) => {
      await tx.update(schema.usageLogs)
        .set(updates)
        .where(eq(schema.usageLogs.id, logId));

      if (updates.requestStatus) {
        const targetTable = getTable(category);
        const newAvailability = updates.requestStatus === "Returned" ? "Available" : "Unavailable";
        await tx.update(targetTable)
          .set({ availabilityStatus: newAvailability })
          .where(eq(targetTable.id, itemId));
      }

      revalidatePath("/dashboard/logbook");
      revalidatePath("/dashboard");
      return { success: true };
    });
  } catch (error) {
    console.error("Single Entry Update Error:", error);
    return { success: false };
  }
}

/**
 * 8. Update Item Details
 */
export async function updateItemDetails(itemId: number, category: string, updates: { itemName?: string, serialNumber?: string }) {
  try {
    const targetTable = getTable(category);
    await db.update(targetTable)
      .set(updates)
      .where(eq(targetTable.id, itemId));

    revalidatePath("/dashboard/logbook");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Item Detail Update Error:", error);
    return { success: false };
  }
}

/**
 * 9. Update Log Batch
 */
export async function updateLogBatch(logIds: number[], updates: any) {
  try {
    await db.update(schema.usageLogs)
      .set(updates)
      .where(inArray(schema.usageLogs.id, logIds));

    revalidatePath("/dashboard/logbook");
    return { success: true };
  } catch (error) {
    console.error("Log Batch Update Error:", error);
    return { success: false };
  }
}