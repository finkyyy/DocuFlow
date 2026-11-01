import { NextResponse } from "next/server";
import { convertDocument, CloudConvertError, isCloudConvertConfigured } from "@/lib/cloudconvert";
import { validatePdf, validateWord, hasMagicBytes } from "@/lib/validate";
import { logAction } from "@/lib/db";
import { getViewer } from "@/lib/auth";

export type ConvertDirection = "word-to-pdf" | "pdf-to-word";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type InputCheck =
  | { ok: true; format: "doc" | "docx" | "pdf" }
  | { ok: false; error: string; status: number };

async function validateInput(file: File, direction: ConvertDirection): Promise<InputCheck> {
  if (direction === "word-to-pdf") {
    const v = validateWord(file);
    if (!v.ok) return v;
    if (!(await hasMagicBytes(file, v.kind))) {
      return { ok: false, error: "File Word tidak valid atau rusak.", status: 415 };
    }
    return { ok: true, format: v.kind };
  }

  const v = validatePdf(file);
  if (!v.ok) return v;
  if (!(await hasMagicBytes(file, "pdf"))) {
    return { ok: false, error: "File PDF tidak valid atau rusak.", status: 415 };
  }
  return { ok: true, format: "pdf" };
}

function mapError(err: unknown): { message: string; status: number } {
  if (err instanceof CloudConvertError) {
    switch (err.kind) {
      case "quota":
        return {
          message: "Kuota konversi sedang habis. Silakan coba lagi nanti.",
          status: 503,
        };
      case "invalid_file":
        return {
          message:
            "File tidak dapat dikonversi. Pastikan file tidak rusak, tidak terkunci, dan tidak dilindungi kata sandi.",
          status: 422,
        };
      case "timeout":
        return {
          message: "Waktu konversi habis. Silakan coba lagi, mungkin dengan file yang lebih kecil.",
          status: 504,
        };
      case "config":
        return { message: "Fitur konversi belum dikonfigurasi.", status: 503 };
      default:
        return {
          message: "Layanan konversi sedang tidak tersedia. Silakan coba lagi nanti.",
          status: 502,
        };
    }
  }
  return { message: "Gagal mengonversi file.", status: 500 };
}

// Nama file dari client tidak dipercaya: buang path, karakter non-ASCII, dan
// karakter yang tidak aman untuk header Content-Disposition.
function sanitizeBaseName(name: string): string {
  const leaf = name.split(/[\\/]/).pop() ?? "dokumen";
  const withoutExtension = leaf.replace(/\.[^.]+$/, "");
  const cleaned = withoutExtension
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9._ -]/g, "-")
    .replace(/[\s.-]+/g, " ")
    .trim()
    .slice(0, 80)
    .trim();
  return cleaned || "dokumen";
}

function attachmentHeader(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function handleConvert(
  req: Request,
  direction: ConvertDirection
): Promise<NextResponse> {
  const viewer = await getViewer(req);

  if (!isCloudConvertConfigured()) {
    return NextResponse.json(
      { error: "Fitur konversi belum dikonfigurasi." },
      { status: 503 }
    );
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File belum dipilih." }, { status: 400 });
    }

    const input = await validateInput(file, direction);
    if (!input.ok) {
      await logAction("CONVERT", "FAILED", { userId: viewer.userId });
      return NextResponse.json({ error: input.error }, { status: input.status });
    }

    const outputFormat = direction === "word-to-pdf" ? "pdf" : "docx";
    const data = await convertDocument({
      file: Buffer.from(await file.arrayBuffer()),
      filename: file.name,
      inputFormat: input.format,
      outputFormat,
    });

    await logAction("CONVERT", "SUCCESS", { userId: viewer.userId });

    const filename = `${sanitizeBaseName(file.name)}.${outputFormat}`;
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": outputFormat === "pdf" ? "application/pdf" : DOCX_MIME,
        "Content-Disposition": attachmentHeader(filename),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const { message, status } = mapError(err);
    // Hanya jenis kegagalan yang dicatat; pesan mentah dari layanan luar tidak
    // pernah diteruskan ke client maupun ke log.
    console.error(
      "Konversi gagal:",
      status,
      err instanceof CloudConvertError ? err.kind : "unexpected"
    );
    await logAction("CONVERT", "FAILED", { userId: viewer.userId });
    return NextResponse.json({ error: message }, { status });
  }
}
