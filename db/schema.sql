CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL = Guest
  file_name       VARCHAR(255) NOT NULL,
  storage_path    TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  share_code      VARCHAR(32) NOT NULL UNIQUE,
  expired_at      TIMESTAMPTZ NOT NULL,
  is_deleted      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_documents_cleanup
  ON documents (expired_at) WHERE is_deleted = false;

CREATE TABLE IF NOT EXISTS processing_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('COMPRESS','MERGE','CONVERT','SHARE')),
  status      VARCHAR(20) NOT NULL CHECK (status IN ('SUCCESS','FAILED')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
