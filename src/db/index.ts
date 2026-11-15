import { drizzle } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "./schema";

/**
 * Returns a Drizzle client bound to the D1 database.
 * Must be called from request/action scope (not module top-level).
 */
export function getDb() {
  const { env } = getCloudflareContext();
  return drizzle((env as { DB: D1Database }).DB, { schema });
}

export type Db = ReturnType<typeof getDb>;
export { schema };
