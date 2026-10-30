// Cron cleanup: hapus file expired dari storage lalu tandai is_deleted = true.
// Jalankan tiap jam. Bisa dipakai sebagai AWS Lambda handler atau lewat `npm run cleanup`.
// Jika memakai Cloudflare Worker, ganti `pg` dengan Hyperdrive/driver HTTP dan
// ganti S3 client dengan binding R2.
import { Pool } from "pg";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const s3 = new S3Client({
  region: process.env.S3_REGION ?? "auto",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  },
});

export async function handler() {
  const { rows } = await pool.query(
    `SELECT id, storage_path FROM documents
     WHERE is_deleted = false AND expired_at <= now()
     LIMIT 500`
  );

  let deleted = 0;
  for (const doc of rows) {
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: doc.storage_path }));
      await pool.query(`UPDATE documents SET is_deleted = true WHERE id = $1`, [doc.id]);
      deleted++;
    } catch (err) {
      console.error(`Gagal menghapus ${doc.id}`, err); // dicoba lagi di jadwal berikutnya
    }
  }
  console.log(`Cleanup selesai: ${deleted}/${rows.length} dokumen dihapus.`);
  return { deleted, total: rows.length };
}

if (require.main === module) {
  handler().then(() => pool.end());
}
