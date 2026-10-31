import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { validatePdf, MAX_UPLOAD_BYTES } from "@/lib/validate";
import { logAction } from "@/lib/db";
import { getViewer } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const viewer = await getViewer(req);
  try {
    const form = await req.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (files.length < 2)
      return NextResponse.json({ error: "Pilih minimal 2 file PDF." }, { status: 400 });

    for (const f of files) {
      const v = validatePdf(f);
      if (!v.ok) return NextResponse.json({ error: v.error }, { status: v.status });
    }

    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
    if (totalBytes > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `Total ukuran semua file melebihi batas ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.` },
        { status: 413 }
      );
    }

    const merged = await PDFDocument.create();
    for (const f of files) {
      const src = await PDFDocument.load(await f.arrayBuffer());
      const pages = await merged.copyPages(src, src.getPageIndices());
      pages.forEach((p) => merged.addPage(p));
    }
    const bytes = await merged.save();

    await logAction("MERGE", "SUCCESS", { userId: viewer.userId });
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="merged.pdf"',
      },
    });
  } catch (err) {
    console.error(err);
    await logAction("MERGE", "FAILED", { userId: viewer.userId });
    return NextResponse.json({ error: "Gagal menggabungkan PDF." }, { status: 500 });
  }
}
