import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "../config/env.js";
import * as schema from "./schema.js";

if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to initialize the database client");
}

const sql = neon(env.DATABASE_URL);

export const db = drizzle(sql, { schema });
