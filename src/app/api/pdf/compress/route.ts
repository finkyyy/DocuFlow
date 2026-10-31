import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { validatePdf } from "@/lib/validate";
import { logAction } from "@/lib/db";
import { getViewer } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 30;

// CATATAN: pdf-lib tidak mengompres gambar. Di sini kita hanya menyimpan ulang
// dengan object streams dan membuang metadata, yang efektif untuk PDF yang
// strukturnya boros. Untuk kompresi gambar sungguhan, pertimbangkan Ghostscript
// atau qpdf di worker terpisah.
export async function POST(req: Request) {
  const viewer = await getViewer(req);
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const v = validatePdf(file);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: v.status });

    const doc = await PDFDocument.load(await file!.arrayBuffer(), { updateMetadata: false });
    doc.setTitle("");
    doc.setAuthor("");
    doc.setSubject("");
    doc.setKeywords([]);
    doc.setProducer("DocuFlow");
    doc.setCreator("DocuFlow");
    const bytes = await doc.save({ useObjectStreams: true });

    await logAction("COMPRESS", "SUCCESS", { userId: viewer.userId });
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="compressed.pdf"',
        "X-Original-Size": String(file!.size),
        "X-Result-Size": String(bytes.byteLength),
      },
    });
  } catch (err) {
    console.error(err);
    await logAction("COMPRESS", "FAILED", { userId: viewer.userId });
    return NextResponse.json({ error: "Gagal mengompres PDF." }, { status: 500 });
  }
}
