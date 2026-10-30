# DocuFlow

Tools PDF (merge, compress) dan berbagi file sementara lewat link.

## Struktur
- `src/app/api/pdf/*`   pemrosesan PDF in-memory (pdf-lib), hasil langsung dikembalikan
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

## Belum dikerjakan
Autentikasi (register/login), fitur Convert, rate limiting untuk Guest, dashboard analitik.
