import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../config/env.js";
import * as schema from "./schema.js";

if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to initialize the database client");
}

const sql = postgres(env.DATABASE_URL, {
  max: 10,
  ssl: "require",
});

export const db = drizzle(sql, { schema });

export const closeDatabase = () => sql.end({ timeout: 5 });
