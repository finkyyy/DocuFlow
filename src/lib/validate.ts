export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_MB ?? 20) * 1024 * 1024;

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
