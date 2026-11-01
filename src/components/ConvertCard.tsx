"use client";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

type Direction = "word-to-pdf" | "pdf-to-word";

type DirectionConfig = {
  label: string;
  endpoint: string;
  accept: string;
  hint: string;
  resultExtension: "pdf" | "docx";
};

const DIRECTIONS: Record<Direction, DirectionConfig> = {
  "word-to-pdf": {
    label: "Word → PDF",
    endpoint: "/api/pdf/word-to-pdf",
    accept:
      ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    hint: "Pilih satu file Word (.doc atau .docx).",
    resultExtension: "pdf",
  },
  "pdf-to-word": {
    label: "PDF → Word",
    endpoint: "/api/pdf/pdf-to-word",
    accept: ".pdf,application/pdf",
    hint: "Pilih satu file PDF.",
    resultExtension: "docx",
  },
};

const DIRECTION_ORDER: Direction[] = ["word-to-pdf", "pdf-to-word"];

const PDF_TO_WORD_NOTE =
  "Hasil PDF ke Word mungkin tidak persis sama, terutama untuk tabel dan tata letak rumit.";

// Harus sama dengan default MAX_UPLOAD_MB di server.
const MAX_UPLOAD_MB = 4;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

type ConversionResult = { url: string; filename: string; size: number };

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseFilename(header: string | null): string | null {
  if (!header) return null;
  const encoded = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (encoded?.[1]) {
    try {
      return decodeURIComponent(encoded[1].trim());
    } catch {
      return null;
    }
  }
  const plain = header.match(/filename="?([^";]+)"?/i);
  return plain?.[1]?.trim() ?? null;
}

async function getErrorMessage(res: Response): Promise<string> {
  let message: string | null = null;
  try {
    const data: unknown = await res.json();
    if (data && typeof data === "object" && "error" in data) {
      const error = (data as { error?: unknown }).error;
      if (typeof error === "string") message = error;
    }
  } catch {
    // Platform hosting bisa mengembalikan 413 berupa HTML, bukan JSON.
  }
  if (message) return message;
  if (res.status === 413) {
    return `Ukuran file terlalu besar. Maksimal ${MAX_UPLOAD_MB} MB.`;
  }
  if (res.status === 503) return "Fitur konversi belum dikonfigurasi.";
  if (res.status === 504) {
    return "Waktu konversi habis. Silakan coba lagi, mungkin dengan file yang lebih kecil.";
  }
  return "Terjadi kesalahan. Silakan coba lagi.";
}

export default function ConvertCard() {
  const [direction, setDirection] = useState<Direction>("word-to-pdf");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<string | null>(null);

  const config = DIRECTIONS[direction];

  function clearResult() {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setResult(null);
  }

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  function selectDirection(next: Direction) {
    if (next === direction || busy) return;
    setDirection(next);
    setFile(null);
    setError(null);
    clearResult();
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null);
    setError(null);
    clearResult();
    // Reset agar file yang sama bisa dipilih lagi.
    e.target.value = "";
  }

  function removeFile() {
    setFile(null);
    setError(null);
    clearResult();
  }

  async function run() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    clearResult();
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(config.endpoint, { method: "POST", body });
      if (!res.ok) {
        setError(await getErrorMessage(res));
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setResult({
        url,
        filename:
          parseFilename(res.headers.get("Content-Disposition")) ??
          `hasil.${config.resultExtension}`,
        size: blob.size,
      });
    } catch {
      setError("Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  const sizeExceeded = (file?.size ?? 0) > MAX_UPLOAD_BYTES;
  const canRun = Boolean(file) && !sizeExceeded && !busy;

  return (
    <section>
      <h2>Konversi</h2>

      <div className="segmented" role="group" aria-label="Arah konversi">
        {DIRECTION_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            className="segmented-item"
            aria-pressed={direction === id}
            onClick={() => selectDirection(id)}
            disabled={busy}
          >
            {DIRECTIONS[id].label}
          </button>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={config.accept}
        onChange={handleFile}
        disabled={busy}
        aria-describedby="convert-hint"
      />

      <p id="convert-hint" className="hint">
        {config.hint} Maksimal {MAX_UPLOAD_MB} MB.
      </p>

      {file && (
        <ul className="file-list" aria-label="File terpilih">
          <li>
            <span className="file-meta">
              <span className="file-name">{file.name}</span>
              <span className="file-size">{formatSize(file.size)}</span>
            </span>
            <span className="file-actions">
              <button type="button" className="danger" onClick={removeFile} disabled={busy}>
                Hapus
              </button>
            </span>
          </li>
        </ul>
      )}

      {sizeExceeded && (
        <p className="hint hint-warning" role="alert">
          Ukuran file {formatSize(file?.size ?? 0)} melebihi batas {MAX_UPLOAD_MB} MB. Pilih file
          yang lebih kecil.
        </p>
      )}

      {direction === "pdf-to-word" && <p className="note">{PDF_TO_WORD_NOTE}</p>}

      <div style={{ marginTop: 12 }}>
        <button disabled={!canRun} onClick={run}>
          {busy ? "Mengonversi..." : `Konversi ${config.label}`}
        </button>
      </div>

      {result && (
        <div className="result-card">
          <span className="file-meta">
            <span className="result-title">Konversi selesai</span>
            <span className="file-name">{result.filename}</span>
            <span className="file-size">{formatSize(result.size)}</span>
          </span>
          <a className="button-link" href={result.url} download={result.filename}>
            Unduh
          </a>
        </div>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
