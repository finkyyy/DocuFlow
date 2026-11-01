// Klien minimal CloudConvert API v2 (https://cloudconvert.com/api/v2).
//
// SDK resmi sengaja tidak dipakai: alur yang dibutuhkan hanya buat job, unggah,
// polling status, lalu unduh hasil. Empat panggilan fetch sudah cukup dan tidak
// menambah dependency baru.
//
// Aturan keamanan:
// - Kunci hanya dibaca di server dari process.env.CLOUDCONVERT_API_KEY.
// - Kunci tidak pernah dicatat ke log maupun dikirim ke client.
// - Header Authorization hanya dikirim ke api.cloudconvert.com. URL unggah dan
//   URL unduh hasil sudah bertanda tangan, jadi tidak perlu (dan tidak boleh)
//   dikirimi kunci API.

const API_BASE = "https://api.cloudconvert.com/v2";

// Semua request berbagi satu tenggat agar total waktu sejalan dengan
// maxDuration route (60 detik).
const TOTAL_TIMEOUT_MS = 50_000;
const CREATE_TIMEOUT_MS = 15_000;
const UPLOAD_TIMEOUT_MS = 20_000;
const POLL_REQUEST_TIMEOUT_MS = 10_000;
const DOWNLOAD_TIMEOUT_MS = 20_000;
const POLL_INTERVAL_MS = 1_000;

export type CloudConvertFailure =
  | "config"
  | "quota"
  | "invalid_file"
  | "timeout"
  | "unavailable";

export class CloudConvertError extends Error {
  readonly kind: CloudConvertFailure;

  constructor(kind: CloudConvertFailure, message: string) {
    super(message);
    this.name = "CloudConvertError";
    this.kind = kind;
  }
}

export type CloudConvertInputFormat = "doc" | "docx" | "pdf";
export type CloudConvertOutputFormat = "pdf" | "docx";

type CloudConvertTask = {
  name: string;
  status: string;
  result?: {
    form?: { url?: string; parameters?: Record<string, string> };
    files?: Array<{ url?: string; filename?: string }>;
    message?: string;
    code?: string;
  };
};

type CloudConvertJob = {
  id: string;
  status: string;
  tasks?: CloudConvertTask[];
};

export function isCloudConvertConfigured(): boolean {
  return Boolean(process.env.CLOUDCONVERT_API_KEY?.trim());
}

function readApiKey(): string {
  const key = process.env.CLOUDCONVERT_API_KEY?.trim();
  if (!key) throw new CloudConvertError("config", "CLOUDCONVERT_API_KEY belum diset");
  return key;
}

function httpFailure(status: number): CloudConvertError {
  if (status === 401 || status === 403) {
    return new CloudConvertError("config", `CloudConvert menolak kredensial (HTTP ${status})`);
  }
  if (status === 402 || status === 429) {
    return new CloudConvertError("quota", `Kuota atau limit CloudConvert tercapai (HTTP ${status})`);
  }
  if (status === 400 || status === 404 || status === 422) {
    return new CloudConvertError("invalid_file", `CloudConvert menolak permintaan (HTTP ${status})`);
  }
  return new CloudConvertError("unavailable", `CloudConvert gagal merespons (HTTP ${status})`);
}

function taskFailure(task: CloudConvertTask | undefined): CloudConvertError {
  const code = (task?.result?.code ?? "").toLowerCase();
  if (code.includes("quota") || code.includes("credit") || code.includes("payment")) {
    return new CloudConvertError("quota", "Kuota CloudConvert habis");
  }
  if (code.includes("timeout")) {
    return new CloudConvertError("timeout", "Konversi CloudConvert melewati batas waktu");
  }
  return new CloudConvertError("invalid_file", `Task CloudConvert gagal (${code || "tanpa kode"})`);
}

function clampTimeout(deadline: number, fallbackMs: number): number {
  const left = deadline - Date.now();
  if (left <= 0) throw new CloudConvertError("timeout", "Konversi melewati batas waktu");
  return Math.max(1, Math.min(left, fallbackMs));
}

async function request(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
      throw new CloudConvertError("timeout", "Permintaan ke CloudConvert melewati batas waktu");
    }
    throw new CloudConvertError("unavailable", "Tidak dapat menghubungi CloudConvert");
  }
  if (!res.ok) throw httpFailure(res.status);
  return res;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForJob(
  jobId: string,
  apiKey: string,
  deadline: number
): Promise<CloudConvertJob> {
  while (Date.now() < deadline) {
    const res = await request(
      `${API_BASE}/jobs/${encodeURIComponent(jobId)}?include=tasks`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
      clampTimeout(deadline, POLL_REQUEST_TIMEOUT_MS)
    );
    const job = ((await res.json()) as { data?: CloudConvertJob }).data;
    if (!job) {
      throw new CloudConvertError("unavailable", "Respons status CloudConvert tidak valid");
    }

    if (job.status === "finished") return job;
    if (job.status === "error") {
      throw taskFailure(job.tasks?.find((task) => task.status === "error"));
    }

    const failedTask = job.tasks?.find((task) => task.status === "error");
    if (failedTask) throw taskFailure(failedTask);

    await sleep(POLL_INTERVAL_MS);
  }
  throw new CloudConvertError("timeout", "Konversi melewati batas waktu");
}

export async function convertDocument(options: {
  file: Buffer;
  filename: string;
  inputFormat: CloudConvertInputFormat;
  outputFormat: CloudConvertOutputFormat;
}): Promise<Buffer> {
  const apiKey = readApiKey();
  const deadline = Date.now() + TOTAL_TIMEOUT_MS;

  const created = await request(
    `${API_BASE}/jobs`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tasks: {
          "import-file": { operation: "import/upload" },
          "convert-file": {
            operation: "convert",
            input: "import-file",
            input_format: options.inputFormat,
            output_format: options.outputFormat,
          },
          "export-file": {
            operation: "export/url",
            input: "convert-file",
            inline: false,
            archive_multiple_files: false,
          },
        },
      }),
    },
    clampTimeout(deadline, CREATE_TIMEOUT_MS)
  );

  const job = ((await created.json()) as { data?: CloudConvertJob }).data;
  const upload = job?.tasks?.find((task) => task.name === "import-file")?.result?.form;
  if (!job?.id || !upload?.url) {
    throw new CloudConvertError("unavailable", "CloudConvert tidak mengembalikan target unggahan");
  }

  const form = new FormData();
  for (const [name, value] of Object.entries(upload.parameters ?? {})) {
    form.append(name, value);
  }
  form.append("file", new Blob([new Uint8Array(options.file)]), options.filename);

  // Tanpa header Authorization: URL unggah sudah bertanda tangan dan berada di
  // host berbeda, sehingga kunci API tidak boleh ikut terkirim.
  await request(upload.url, { method: "POST", body: form }, clampTimeout(deadline, UPLOAD_TIMEOUT_MS));

  const finished = await waitForJob(job.id, apiKey, deadline);
  const exportTask = finished.tasks?.find((task) => task.name === "export-file");
  const resultUrl = exportTask?.result?.files?.[0]?.url;
  if (!resultUrl) {
    throw new CloudConvertError("unavailable", "CloudConvert tidak mengembalikan URL hasil");
  }

  const download = await request(
    resultUrl,
    { method: "GET" },
    clampTimeout(deadline, DOWNLOAD_TIMEOUT_MS)
  );
  const data = Buffer.from(await download.arrayBuffer());
  if (data.length === 0) {
    throw new CloudConvertError("unavailable", "Hasil konversi kosong");
  }
  return data;
}
