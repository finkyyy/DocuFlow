export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_MB ?? 4) * 1024 * 1024;

export type ValidationResult = { ok: true } | { ok: false; error: string; status: number };

export function validatePdf(file: File | null): ValidationResult {
  if (!file) return { ok: false, error: "File belum dipilih.", status: 400 };
  if (file.size === 0) return { ok: false, error: "File kosong.", status: 400 };
  if (file.size > MAX_UPLOAD_BYTES)
    return {
      ok: false,
      error: `Ukuran file melebihi batas ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`,
      status: 413,
    };
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return { ok: false, error: "Hanya file PDF yang didukung.", status: 415 };
  return { ok: true };
}

export type WordFileKind = "doc" | "docx";

const WORD_MIME_TYPES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream",
  "application/zip",
  "application/x-zip-compressed",
  "", // sebagian browser tidak mengisi MIME untuk .doc/.docx
]);

export type WordValidation =
  | { ok: true; kind: WordFileKind }
  | { ok: false; error: string; status: number };

export function validateWord(file: File | null): WordValidation {
  if (!file) return { ok: false, error: "File belum dipilih.", status: 400 };
  if (file.size === 0) return { ok: false, error: "File kosong.", status: 400 };
  if (file.size > MAX_UPLOAD_BYTES)
    return {
      ok: false,
      error: `Ukuran file melebihi batas ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`,
      status: 413,
    };

  const lower = file.name.toLowerCase();
  const kind: WordFileKind | null = lower.endsWith(".docx")
    ? "docx"
    : lower.endsWith(".doc")
      ? "doc"
      : null;
  if (!kind) {
    return {
      ok: false,
      error: "Hanya file Word (.doc atau .docx) yang didukung.",
      status: 415,
    };
  }
  if (!WORD_MIME_TYPES.has(file.type)) {
    return { ok: false, error: "Tipe file Word tidak dikenali.", status: 415 };
  }

  return { ok: true, kind };
}

const MAGIC_BYTES = {
  pdf: [0x25, 0x50, 0x44, 0x46], // "%PDF"
  docx: [0x50, 0x4b], // "PK" (ZIP/OOXML)
  doc: [0xd0, 0xcf, 0x11, 0xe0], // OLE2 (Word 97-2003)
} as const;

export async function hasMagicBytes(
  file: File,
  kind: keyof typeof MAGIC_BYTES
): Promise<boolean> {
  const expected = MAGIC_BYTES[kind];
  const head = new Uint8Array(await file.slice(0, expected.length).arrayBuffer());
  if (head.length < expected.length) return false;
  return expected.every((byte, index) => head[index] === byte);
}
