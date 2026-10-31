import { Pool } from "pg";

const globalForPg = globalThis as unknown as { pgPool?: Pool };

function isSupabaseHost(connectionString: string | undefined) {
  if (!connectionString) return false;
  try {
    const host = new URL(connectionString).hostname;
    return host.endsWith(".supabase.co") || host.endsWith(".supabase.com");
  } catch {
    return false;
  }
}

const connectionString = process.env.DATABASE_URL;

export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString,
    max: 3,
    ...(isSupabaseHost(connectionString)
      ? { ssl: { rejectUnauthorized: false } }
      : {}),
  });

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
