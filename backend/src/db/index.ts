import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL is not set. Copy .env.example → .env and fill in your Neon connection string.");
  process.exit(1);
}

const sql = neon(connectionString);
export const db = drizzle(sql, { schema });

export type DB = typeof db;
