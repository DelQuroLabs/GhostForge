-- Ghostforge migration 02: Book Engine ledger + chapter provenance + Editor-in-Chief.
-- Run this ONCE in your Supabase dashboard (SQL editor) on the existing project.
-- Fresh setups don't need it — SUPABASE_SETUP.sql already includes everything.

-- 1. Running Ledgers + Book Bible live on the book row (same pattern as engine_ctx).
ALTER TABLE books ADD COLUMN IF NOT EXISTS ledger TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS bible TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS editor_ledger TEXT;

-- 2. Provenance: which writer produced each chapter's body.
-- '' = unwritten/legacy-unknown · 'story-engine' = offline engine · 'import' = pasted/imported
-- 'ai' = AI-enhanced before provenance existed · otherwise the model id (e.g. gpt-5.6-luna).
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS written_by TEXT DEFAULT '';

-- Honest backfill for chapters written before provenance existed.
UPDATE chapters SET written_by = 'ai' WHERE body <> '' AND ai_enhanced = 1 AND (written_by IS NULL OR written_by = '');
UPDATE chapters SET written_by = 'story-engine' WHERE body <> '' AND ai_enhanced = 0 AND (written_by IS NULL OR written_by = '');

-- 3. Editor-in-Chief reports (pass outputs). chapter_id NULL = whole-book reports.
CREATE TABLE IF NOT EXISTS editor_reports (
  id SERIAL PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  chapter_id INTEGER REFERENCES chapters(id) ON DELETE CASCADE,
  pass TEXT NOT NULL DEFAULT '',
  title TEXT DEFAULT '',
  body TEXT DEFAULT '',
  model TEXT DEFAULT '',
  created_at TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_editor_reports_book ON editor_reports(book_id, id);

ALTER TABLE editor_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_all ON editor_reports;
CREATE POLICY anon_all ON editor_reports FOR ALL TO anon USING (true) WITH CHECK (true);
GRANT ALL ON editor_reports TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- 4. Restore must carry the new columns + editor reports (same shape the app backs up).
CREATE OR REPLACE FUNCTION rpc_restore(p_payload jsonb, p_ts text)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  p jsonb; sr jsonb; b jsonb;
  pen_id integer; ser_id integer; bid integer;
  n_ch integer := 0; n_rv integer := 0; n_ed integer := 0; n integer;
BEGIN
  FOR p IN SELECT * FROM jsonb_array_elements(p_payload->'pens') LOOP
    INSERT INTO pen_names (name, bio, genres, created_at)
    SELECT p->>'name', p->>'bio', p->>'genres', p_ts
    WHERE NOT EXISTS (SELECT 1 FROM pen_names WHERE name = p->>'name');
  END LOOP;
  FOR sr IN SELECT * FROM jsonb_array_elements(p_payload->'series') LOOP
    IF sr->>'pen_name' IS NOT NULL THEN
      SELECT id INTO pen_id FROM pen_names WHERE name = sr->>'pen_name';
      IF NOT FOUND THEN
        INSERT INTO pen_names (name, bio, genres, created_at)
        VALUES (sr->>'pen_name', '', '', p_ts) RETURNING id INTO pen_id;
      END IF;
    ELSE
      pen_id := NULL;
    END IF;
    INSERT INTO series (pen_name_id, title, description, created_at)
    SELECT pen_id, sr->>'title', sr->>'description', p_ts
    WHERE NOT EXISTS (SELECT 1 FROM series WHERE title = sr->>'title');
  END LOOP;
  FOR b IN SELECT * FROM jsonb_array_elements(p_payload->'books') LOOP
    IF b->>'pen_name' IS NOT NULL THEN
      SELECT id INTO pen_id FROM pen_names WHERE name = b->>'pen_name';
      IF NOT FOUND THEN
        INSERT INTO pen_names (name, bio, genres, created_at)
        VALUES (b->>'pen_name', '', '', p_ts) RETURNING id INTO pen_id;
      END IF;
    ELSE
      pen_id := NULL;
    END IF;
    IF b->>'series_title' IS NOT NULL THEN
      SELECT id INTO ser_id FROM series WHERE title = b->>'series_title';
      IF NOT FOUND THEN
        INSERT INTO series (pen_name_id, title, description, created_at)
        VALUES (pen_id, b->>'series_title', '', p_ts) RETURNING id INTO ser_id;
      END IF;
    ELSE
      ser_id := NULL;
    END IF;
    INSERT INTO books (title, subtitle, premise, mode, kind, genre, audience, tone, style, pov, tense, target_words, status,
      pen_name_id, series_id, series_number, logline, blurb, categories, keywords, cover_cfg, stage, stages_approved, engine_ctx, plan, ledger, bible, editor_ledger, updated_at, created_at)
    VALUES (
      b->>'title', b->>'subtitle', b->>'premise', b->>'mode', b->>'kind', b->>'genre',
      b->>'audience', b->>'tone', b->>'style', b->>'pov', b->>'tense',
      (b->>'target_words')::int, b->>'status', pen_id, ser_id, (b->>'series_number')::int,
      b->>'logline', b->>'blurb', (b->'categories')::text, (b->'keywords')::text, (b->'cover_cfg')::text,
      b->>'stage', (b->'stages_approved')::text, b->>'engine_ctx', b->>'plan',
      b->>'ledger', b->>'bible', b->>'editor_ledger', p_ts, p_ts
    ) RETURNING id INTO bid;
    INSERT INTO chapters (book_id, idx, title, summary, kind, step, body, words, ai_enhanced, written_by, created_at)
    SELECT bid, (c->>'idx')::int, c->>'title', c->>'summary', c->>'kind', c->>'step', c->>'body',
      (c->>'words')::int, (c->>'ai_enhanced')::int, COALESCE(c->>'written_by', ''), p_ts
    FROM jsonb_array_elements(b->'chapters') AS x(c);
    GET DIAGNOSTICS n = ROW_COUNT; n_ch := n_ch + n;
    INSERT INTO characters (book_id, name, role, description, arc)
    SELECT bid, c->>'name', c->>'role', c->>'description', c->>'arc'
    FROM jsonb_array_elements(b->'characters') AS x(c);
    INSERT INTO chapter_reviews (chapter_id, book_id, created_at, model, score, summary, findings)
    SELECT ch.id, bid, COALESCE(NULLIF(r->>'created_at', ''), p_ts), r->>'model',
      (r->>'score')::int, r->>'summary', (r->'findings')::text
    FROM jsonb_array_elements(b->'reviews') AS x(r)
    JOIN chapters ch ON ch.book_id = bid AND ch.idx = (r->>'chapter_idx')::int;
    GET DIAGNOSTICS n = ROW_COUNT; n_rv := n_rv + n;
    INSERT INTO editor_reports (book_id, chapter_id, pass, title, body, model, created_at)
    SELECT bid, ch.id, e->>'pass', COALESCE(e->>'title', ''), COALESCE(e->>'body', ''),
      COALESCE(e->>'model', ''), COALESCE(NULLIF(e->>'created_at', ''), p_ts)
    FROM jsonb_array_elements(COALESCE(b->'editor', '[]'::jsonb)) AS x(e)
    LEFT JOIN chapters ch ON ch.book_id = bid AND (e->>'chapter_idx') IS NOT NULL AND ch.idx = (e->>'chapter_idx')::int;
    GET DIAGNOSTICS n = ROW_COUNT; n_ed := n_ed + n;
  END LOOP;
  RETURN jsonb_build_object('chapters', n_ch, 'reviews', n_rv, 'editor', n_ed);
END $$;

-- 5. Forge/import RPCs stamp chapter provenance for new rows.
CREATE OR REPLACE FUNCTION rpc_forge_create(p_book jsonb, p_chapters jsonb, p_characters jsonb)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  bid integer;
BEGIN
  INSERT INTO books (title, subtitle, premise, mode, kind, genre, audience, tone, style, pov, tense, target_words, status,
    pen_name_id, series_id, series_number, logline, blurb, categories, keywords, cover_cfg, stage, stages_approved, engine_ctx, updated_at, created_at)
  VALUES (
    p_book->>'title', p_book->>'subtitle', p_book->>'premise', p_book->>'mode', p_book->>'kind', p_book->>'genre',
    p_book->>'audience', p_book->>'tone', p_book->>'style', p_book->>'pov', p_book->>'tense',
    (p_book->>'target_words')::int, p_book->>'status',
    (p_book->>'pen_name_id')::int, (p_book->>'series_id')::int, (p_book->>'series_number')::int,
    p_book->>'logline', p_book->>'blurb', p_book->>'categories', p_book->>'keywords', p_book->>'cover_cfg',
    p_book->>'stage', p_book->>'stages_approved', p_book->>'engine_ctx', p_book->>'updated_at', p_book->>'created_at'
  ) RETURNING id INTO bid;
  INSERT INTO chapters (book_id, idx, title, summary, kind, step, body, words, written_by, created_at)
  SELECT bid, ord - 1, c->>'title', c->>'summary', c->>'kind', c->>'step', c->>'body', (c->>'words')::int,
    CASE WHEN COALESCE(c->>'body', '') <> '' THEN 'story-engine' ELSE '' END, p_book->>'created_at'
  FROM jsonb_array_elements(p_chapters) WITH ORDINALITY AS x(c, ord);
  INSERT INTO characters (book_id, name, role, description, arc)
  SELECT bid, c->>'name', c->>'role', c->>'description', c->>'arc'
  FROM jsonb_array_elements(p_characters) AS x(c);
  RETURN bid;
END $$;

CREATE OR REPLACE FUNCTION rpc_import(p_book_id integer, p_mode text, p_docs jsonb, p_ts text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  ids integer[];
  n integer;
  start_idx integer;
  max_idx integer;
  d jsonb;
  i integer;
BEGIN
  IF p_mode = 'replace' THEN
    DELETE FROM chapters WHERE book_id = p_book_id;
    INSERT INTO chapters (book_id, idx, title, summary, body, words, ai_enhanced, written_by, created_at)
    SELECT p_book_id, ord - 1, c->>'title', '', c->>'body', (c->>'words')::int, 1, 'import', p_ts
    FROM jsonb_array_elements(p_docs) WITH ORDINALITY AS x(c, ord);
  ELSIF p_mode = 'append' THEN
    start_idx := COALESCE((SELECT MAX(idx) FROM chapters WHERE book_id = p_book_id), -1) + 1;
    INSERT INTO chapters (book_id, idx, title, summary, body, words, ai_enhanced, written_by, created_at)
    SELECT p_book_id, start_idx + ord - 1, c->>'title', '', c->>'body', (c->>'words')::int, 1, 'import', p_ts
    FROM jsonb_array_elements(p_docs) WITH ORDINALITY AS x(c, ord);
  ELSE
    SELECT array_agg(id ORDER BY idx) INTO ids FROM chapters WHERE book_id = p_book_id;
    n := COALESCE(array_length(ids, 1), 0);
    max_idx := COALESCE((SELECT MAX(idx) FROM chapters WHERE book_id = p_book_id), -1);
    FOR i IN 1..COALESCE(jsonb_array_length(p_docs), 0) LOOP
      d := p_docs->(i - 1);
      IF i <= n THEN
        UPDATE chapters SET body = d->>'body', words = (d->>'words')::int, ai_enhanced = 1, written_by = 'import' WHERE id = ids[i];
      ELSE
        INSERT INTO chapters (book_id, idx, title, summary, body, words, ai_enhanced, written_by, created_at)
        VALUES (p_book_id, max_idx + i - n, d->>'title', '', d->>'body', (d->>'words')::int, 1, 'import', p_ts);
      END IF;
    END LOOP;
  END IF;
  UPDATE books SET updated_at = p_ts WHERE id = p_book_id;
END $$;

-- v_books_list selects b.* so it picks up the new columns automatically.
NOTIFY pgrst, 'reload schema';
