"use client";
import { useRef, useState, type ChangeEvent } from "react";

type Props = {
  title: string;
  endpoint: string;
  multiple?: boolean;
  fieldName: string;
  button: string;
  mode: "download" | "link";
};

type SelectedFile = { id: string; file: File };

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ToolCard({ title, endpoint, multiple, fieldName, button, mode }: Props) {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []).map((file) => ({
      id: createId(),
      file,
    }));

    // Kartu multiple menambah file baru; kartu single tetap mengganti pilihan.
    setFiles((prev) => (multiple ? [...prev, ...picked] : picked));
    // Reset agar file yang sama bisa dipilih lagi.
    e.target.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function moveFile(index: number, direction: -1 | 1) {
    setFiles((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function run() {
    setBusy(true); setError(null); setLink(null);
    try {
      const body = new FormData();
      files.forEach(({ file }) => body.append(fieldName, file));
      const res = await fetch(endpoint, { method: "POST", body });
      if (!res.ok) throw new Error((await res.json()).error ?? "Terjadi kesalahan.");

      if (mode === "link") {
        setLink((await res.json()).url);
      } else {
        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? "result.pdf";
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      setBusy(false);
    }
  }

  const canRun = multiple ? files.length >= 2 : files.length > 0;
  const hint =
    files.length === 0
      ? "Belum ada file dipilih. Pilih minimal 2 file PDF."
      : files.length === 1
        ? "Baru 1 file dipilih. Tambahkan minimal 1 file PDF lagi."
        : "Urutan file menentukan urutan halaman hasil gabungan.";

  return (
    <section>
      <h2>{title}</h2>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        multiple={multiple}
        onChange={handleFiles}
        aria-describedby={multiple ? `${fieldName}-hint` : undefined}
      />

      {multiple && files.length > 0 && (
        <ul className="file-list" aria-label="File PDF terpilih">
          {files.map(({ id, file }, index) => (
            <li key={id}>
              <span className="file-meta">
                <span className="file-name">{file.name}</span>
                <span className="file-size">{formatSize(file.size)}</span>
              </span>
              <span className="file-actions">
                <button
                  type="button"
                  onClick={() => moveFile(index, -1)}
                  disabled={index === 0}
                  aria-label={`Naikkan ${file.name}`}
                >
                  Naik
                </button>
                <button
                  type="button"
                  onClick={() => moveFile(index, 1)}
                  disabled={index === files.length - 1}
                  aria-label={`Turunkan ${file.name}`}
                >
                  Turun
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => removeFile(index)}
                  aria-label={`Hapus ${file.name}`}
                >
                  Hapus
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {multiple && (
        <p
          id={`${fieldName}-hint`}
          className={files.length < 2 ? "hint hint-warning" : "hint"}
          role={files.length < 2 ? "status" : undefined}
        >
          {hint}
        </p>
      )}

      <div style={{ marginTop: 12 }}>
        <button disabled={busy || !canRun} onClick={run}>
          {busy ? "Memproses..." : button}
        </button>
      </div>
      {link && <p>Link berbagi: <a href={link}>{link}</a></p>}
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  );
}
