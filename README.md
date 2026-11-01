# DocuFlow

Tools PDF (merge, compress, konversi Word ⇄ PDF) dan berbagi file sementara lewat link.

## Struktur
- `src/app/api/pdf/*`   pemrosesan PDF in-memory (pdf-lib), hasil langsung dikembalikan
- `src/app/api/pdf/word-to-pdf` dan `pdf-to-word`  konversi lewat CloudConvert API v2
- `src/lib/cloudconvert.ts`  klien CloudConvert (fetch, tanpa SDK): job, unggah, polling, unduh
- `src/app/api/share`   unggah ke S3/R2, simpan metadata ke PostgreSQL, buat share link
- `src/lib`             db, storage, validasi, auth (stub)
- `db/schema.sql`       skema users, documents, processing_logs
- `workers/cleanup`     cron: hapus file expired + set `is_deleted = true`

## Mulai
```bash
cp .env.example .env.local      # isi kredensial
npm install
npm run db:migrate
npm run dev
```

## Konversi Word ⇄ PDF
- Endpoint: `POST /api/pdf/word-to-pdf` (`.doc`/`.docx`) dan `POST /api/pdf/pdf-to-word` (`.pdf`), field `file`.
- Butuh `CLOUDCONVERT_API_KEY`. Tanpa kunci tersebut, endpoint mengembalikan 503 dengan pesan "Fitur konversi belum dikonfigurasi."
- Batas ukuran mengikuti `MAX_UPLOAD_MB` (default 4 MB), sama seperti fitur PDF lain.
- Validasi: ekstensi, MIME, dan magic bytes (`%PDF`, `PK` untuk `.docx`, `D0 CF 11 E0` untuk `.doc` lama).
- Setiap percobaan dicatat ke `processing_logs` sebagai `CONVERT` (`SUCCESS`/`FAILED`).
- Catatan: hasil PDF ke Word mungkin tidak persis sama, terutama untuk tabel dan tata letak rumit.

## Belum dikerjakan
Autentikasi (register/login), rate limiting untuk Guest, dashboard analitik.
