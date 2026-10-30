import { Pool } from "pg";

const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForPg.pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") globalForPg.pgPool = pool;

export type ActionType = "COMPRESS" | "MERGE" | "CONVERT" | "SHARE";

export async function logAction(
  action: ActionType,
  status: "SUCCESS" | "FAILED",
  opts: { documentId?: string | null; userId?: string | null } = {}
) {
  try {
    await pool.query(
      `INSERT INTO processing_logs (document_id, user_id, action_type, status)
       VALUES ($1, $2, $3, $4)`,
      [opts.documentId ?? null, opts.userId ?? null, action, status]
    );
  } catch (err) {
    console.error("logAction failed", err);
  }
}
