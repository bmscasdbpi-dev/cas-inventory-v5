import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// 1. Point this exactly to .env.local since that's where your keys are
dotenv.config({ path: ".env.local" }); 

export default defineConfig({
  // 2. Ensure your schema.ts file is actually inside a "db" folder at your project root
  schema: "./db/schema.ts", 
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
});