"use server";

import { db } from "@/db"; 
import { foundReports } from "@/db/schema"; 
import { desc } from "drizzle-orm";

export async function getReportedItems() {
  try {
    const data = await db
      .select()
      .from(foundReports)
      .orderBy(desc(foundReports.reportDate)); // Fixed: Using reportDate instead of createdAt

    return { 
      success: true, 
      data: data, 
    };
  } catch (error) {
    console.error("Fetch Error:", error);
    return { success: false, data: [] };
  }
}