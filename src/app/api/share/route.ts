import { NextResponse } from "next/server";
import { randomBytes, randomUUID } from "crypto";
import { pool, logAction } from "@/lib/db";
import { putObject } from "@/lib/storage";
import { validatePdf } from "@/lib/validate";
import { getViewer } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const viewer = await getViewer(req);
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const v = validatePdf(file);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: v.status });

    const ttlHours = Number(process.env.SHARE_TTL_HOURS ?? 24);
    const shareCode = randomBytes(12).toString("base64url"); // 16 karakter
    const storagePath = `uploads/${randomUUID()}.pdf`;
    const expiredAt = new Date(Date.now() + ttlHours * 3600 * 1000);

    await putObject(storagePath, Buffer.from(await file!.arrayBuffer()), "application/pdf");

    const { rows } = await pool.query(
      `INSERT INTO documents (user_id, file_name, storage_path, file_size_bytes, share_code, expired_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [viewer.userId, file!.name, storagePath, file!.size, shareCode, expiredAt]
    );

    await logAction("SHARE", "SUCCESS", { documentId: rows[0].id, userId: viewer.userId });
    return NextResponse.json({
      url: `${process.env.APP_URL}/api/share/${shareCode}`,
      expiredAt,
    });
  } catch (err) {
    console.error(err);
    await logAction("SHARE", "FAILED", { userId: viewer.userId });
    return NextResponse.json({ error: "Gagal membuat link berbagi." }, { status: 500 });
  }
}
