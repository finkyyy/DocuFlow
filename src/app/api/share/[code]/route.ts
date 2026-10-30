import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { signedDownloadUrl } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const { rows } = await pool.query(
    `SELECT file_name, storage_path FROM documents
     WHERE share_code = $1 AND is_deleted = false AND expired_at > now()`,
    [params.code]
  );
  if (rows.length === 0)
    return NextResponse.json({ error: "Link tidak ditemukan atau sudah kedaluwarsa." }, { status: 404 });

  const url = await signedDownloadUrl(rows[0].storage_path, rows[0].file_name);
  return NextResponse.redirect(url, 302);
}
