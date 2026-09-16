# Ghostforge × Supabase — runbook (zero-secrets version)

The app used to persist to a SQLite file (`data/app.db`) plus MP3s under
`.arena/data/audio/`. Both lived inside the workspace, so a machine backup/
restore cycle could wipe them. It now persists to **Supabase Postgres**
(all tables) and **Supabase Storage** (chapter MP3s, private `audiobooks`
bucket). Nothing of value lives on the machine's disk anymore.

**No secrets anywhere:** the server holds only the project URL and the
publishable key (public by design). There is no service key, no database
password, nothing to leak. The project owner runs `SUPABASE_SETUP.sql` once
in the Supabase SQL editor; that script creates the tables, opens them to
the publishable key, and adds the views + RPC functions that keep
multi-step writes atomic.

## What changed (code)

- `server/db.ts` — Supabase client over the publishable key: `sb` (raw
  client), `q()` (response unwrapper), `now()`, settings helpers, `ready()`.
- `server/storage.ts` — MP3 bytes via Supabase Storage, same key.
- `server/routes.ts` — all data access via PostgREST; the 5 transactions
  (forge-create, chapter-delete, plan-draft, import, restore) run as atomic
  Postgres RPC functions.
- `server/ai.ts` — unchanged (settings helpers kept their signatures).
- `server/audio.ts` / `server/audioRoutes.ts` — track upserts/reads via
  PostgREST; chapter/book deletes also delete MP3s.
- `server/index.ts` — loads `.env`, checks DB + bucket at boot with
  actionable log messages.
- `src/pages/Settings.tsx` — key-safety copy updated.
- `SUPABASE_SETUP.sql` — the one-time setup script (tables, access, bucket,
  views, RPC). Rerun-safe.
- `.e2e.sh` + `.stub-ai.py` — 44-assertion E2E suite + stub OpenAI server.
  Runs against the real Supabase project (needs the setup SQL run first).

## Flip checklist

1. In Supabase: SQL Editor → New query → paste `SUPABASE_SETUP.sql` → Run.
   Wait for "Success". (Rerun-safe; running twice changes nothing.)
2. Restart the server process. No code or env changes needed.
3. Watch boot logs: expect `Supabase connected` + `audio bucket OK`.
4. In Settings: paste the OpenAI key (settings live in the new DB now).
5. Rebuild Emberfall content (old SQLite rows are NOT migrated), then
   download a fresh backup from the app.

## Verify after flip

- `GET /api/health` → `{"status":"ok"}`.
- Create a book + chapter, restart the process, confirm they persist.
- Forge one chapter MP3 in Audio Studio (explicit click only — TTS costs
  money), restart, confirm the track is still downloadable.

## Rollback

The old SQLite code is one `git stash` / checkout away, but note the old
`data/app.db` only has whatever survived the last wipe. Prefer restoring
from an app backup file instead.

## Re-running the test suite

```bash
B=http://127.0.0.1:3000/api bash .e2e.sh   # needs setup SQL run; uses unique names per run
```

Covers: books/chapters/characters CRUD, chapter-delete renumber, pens/series
+ counts, manual plan + approve + clear, guided forge + advance to done,
NO_KEY/NO_BODY, AI + TTS settings, audio status/file/full/zip paths,
stub-AI plan-draft + HAS_DRAFT + review save (AI + offline findings),
import, md export, agent-pack, backup → wipe → restore round-trip.
The only paths NOT covered E2E are real-provider TTS bytes and real-provider
chat (both need paid keys); their DB/Storage writes use the same helpers
the suite exercises.
