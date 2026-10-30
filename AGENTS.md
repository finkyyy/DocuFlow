# AGENTS.md

DocuFlow: Next.js 14 App Router app for PDF merge/compress and temporary share links. UI copy is Indonesian; code identifiers are English.

## Commands

- `npm install`
- `npm run dev`
- `npm run build` — includes the TypeScript check; must pass after every change.
- `npx tsc --noEmit` — focused typecheck without a full build.
- `npm run db:migrate` — runs `psql "$DATABASE_URL" -f db/schema.sql`. Requires `DATABASE_URL` exported in the shell; it does **not** read `.env.local`.
- `npm run cleanup` — runs `workers/cleanup/handler.ts` with `tsx`, which also does **not** load `.env.local`. Use `node --env-file=.env.local --import tsx workers/cleanup/handler.ts` or export the vars first.
- `npm run lint` is **not usable yet**: ESLint is not installed and `next lint` opens an interactive setup prompt. Use `npm run build` as the gate.
- There is no test runner yet; do not assume `npm test` exists.

## Environment gotchas

- A stray `~/postcss.config.js` is discovered by Next's upward config search and breaks the build with `Your custom PostCSS configuration must export a plugins key`. The project-local `postcss.config.mjs` exists specifically to shadow it — do not delete it.
- Required env vars: `DATABASE_URL`, `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `APP_URL`, `MAX_UPLOAD_MB`, `SHARE_TTL_HOURS`. See `.env.example`. Never commit secrets.
- `MAX_UPLOAD_MB` and `SHARE_TTL_HOURS` are read at module load; restart the dev server after changing them.
- Every API route sets `export const runtime = "nodejs"`. Keep it: `pg`, `pdf-lib`, and the AWS SDK do not run on the Edge runtime.

## Architecture

- `src/app/api/pdf/{merge,compress}` process uploads in memory and return bytes directly; nothing is persisted.
- `src/app/api/share` uploads to S3/R2, then inserts into `documents`; `/api/share/[code]` looks up a non-expired row and 302-redirects to a 5-minute signed URL. Share links are public (the lookup does not check ownership).
- `src/lib/{db,storage,validate,auth}` are the shared seams. `src/lib/auth.ts` is a stub: `getViewer` always returns Guest. Every route calls it — implement real auth inside it rather than bypassing it.
- `db/schema.sql` is the only schema source: an idempotent psql script, no migration framework. `ActionType` in `src/lib/db.ts` must stay in sync with the DB `CHECK` constraints.
- `workers/cleanup/handler.ts` creates its own `pg`/S3 clients because it must not depend on Next's `src/lib`. Keep its storage config in sync with `src/lib/storage.ts`. It deletes the object first, then sets `is_deleted = true`; failures are retried on the next run, max 500 docs per run.
- `workers/cleanup/wrangler.toml` is aspirational: the current handler uses `pg`, the AWS SDK, and `require.main`, so it will not run as-is on Cloudflare Workers.

## Git

`docuflow/` is untracked inside the larger `/Users/macbookpro/project` git repo, which contains many unrelated projects and uncommitted work. Run git commands from `docuflow/` only; never commit or clean sibling directories.

## Working conventions

- Work one roadmap step at a time: state the plan (files touched), make the change, run `npm run build`, then wait for the user's confirmation before the next step.
- Do not add a dependency without stating why.
- TypeScript strict; avoid `any` unless genuinely necessary.

## Current gaps (verify before relying)

- Auth is a stub: no register/login, no password hashing, no session cookie.
- No `/api/pdf/convert` (image-to-PDF) route.
- Validation trusts MIME/extension only; no `%PDF` magic-byte check, rate limiting, or filename sanitization.
- `/api/share` can orphan an S3 object if the DB insert fails.
- No tests for `validate.ts`, routes, or cleanup.
