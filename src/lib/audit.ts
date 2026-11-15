import { getDb } from "@/db";
import { auditLogs } from "@/db/schema";

export async function logAudit(entry: {
  entity: string;
  entityId: number;
  action: "create" | "update" | "delete";
  before?: unknown;
  after?: unknown;
  userId?: number | null;
}): Promise<void> {
  await getDb().insert(auditLogs).values({
    entity: entry.entity,
    entityId: entry.entityId,
    action: entry.action,
    beforeJson: entry.before ? JSON.stringify(entry.before) : "",
    afterJson: entry.after ? JSON.stringify(entry.after) : "",
    userId: entry.userId ?? null,
  });
}
