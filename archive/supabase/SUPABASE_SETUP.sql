-- ============================================================================
-- Ghostforge x Supabase - one-time setup (ZERO secrets version)
-- ----------------------------------------------------------------------------
-- HOW TO RUN (2 minutes, no technical knowledge needed):
--   1. Open your Supabase project in the browser.
--   2. Click "SQL Editor" in the left sidebar, then "+ New query".
--   3. Paste this ENTIRE file into the editor.
--   4. Press Run (or Cmd/Ctrl + Enter) and wait for "Success".
--   5. Tell your assistant it ran - they take it from there.
--
-- WHAT IT DOES:
--   - Creates the 8 tables Ghostforge needs.
--   - Opens access so the app's publishable key (low-power, unguessable,
--     public by design) can read/write ONLY those tables. Nothing else in
--     your project is touched or exposed.
--   - Creates the private "audiobooks" Storage bucket for chapter MP3s.
--   - Creates 3 helper views (list pages) and 5 small functions that keep
--     multi-step writes (planning, imports, restores, deletes) atomic.
--
-- RERUN-SAFE: running this a second time changes nothing.
-- You never need to share any secret key with anyone for any of this.
-- ============================================================================

-- ============================== tables =====================================
CREATE TABLE IF NOT EXISTS pen_names (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  bio TEXT DEFAULT '',
  genres TEXT DEFAULT '',
  created_at TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS series (
  id SERIAL PRIMARY KEY,
  pen_name_id INTEGER REFERENCES pen_names(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS books (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT DEFAULT '',
  premise TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'one-click',
  kind TEXT NOT NULL,
  genre TEXT NOT NULL,
  audience TEXT DEFAULT '',
  tone TEXT DEFAULT '',
  style TEXT DEFAULT '',
  pov TEXT DEFAULT '',
  tense TEXT DEFAULT 'Past',
  target_words INTEGER DEFAULT 30000,
  status TEXT DEFAULT 'complete',
  pen_name_id INTEGER REFERENCES pen_names(id) ON DELETE SET NULL,
  series_id INTEGER REFERENCES series(id) ON DELETE SET NULL,
  series_number INTEGER,
  logline TEXT DEFAULT '',
  blurb TEXT DEFAULT '',
  categories TEXT DEFAULT '[]',
  keywords TEXT DEFAULT '[]',
  cover_cfg TEXT DEFAULT '{}',
  stage TEXT DEFAULT 'done',
  stages_approved TEXT DEFAULT '[]',
  engine_ctx TEXT,
  plan TEXT DEFAULT NULL,
  ledger TEXT,
  bible TEXT,
  editor_ledger TEXT,
  created_at TEXT DEFAULT '',
  updated_at TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS chapters (
  id SERIAL PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  title TEXT NOT NULL,
  summary TEXT DEFAULT '',
  kind TEXT DEFAULT '',
  step TEXT DEFAULT '',
  body TEXT DEFAULT '',
  words INTEGER DEFAULT 0,
  ai_enhanced INTEGER DEFAULT 0,
  written_by TEXT DEFAULT '',
  created_at TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS characters (
  id SERIAL PRIMARY KEY,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT DEFAULT '',
  description TEXT DEFAULT '',
  arc TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS chapter_reviews (
  id SERIAL PRIMARY KEY,
  chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT '',
  model TEXT DEFAULT '',
  score INTEGER DEFAULT 0,
  summary TEXT DEFAULT '',
  findings TEXT DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS audio_tracks (
  chapter_id INTEGER PRIMARY KEY,
  book_id INTEGER NOT NULL,
  idx INTEGER NOT NULL,
  file TEXT NOT NULL,
  bytes INTEGER DEFAULT 0,
  voice TEXT DEFAULT '',
  model TEXT DEFAULT '',
  created_at TEXT DEFAULT ''
);
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
CREATE INDEX IF NOT EXISTS idx_chapters_book ON chapters(book_id, idx);
CREATE INDEX IF NOT EXISTS idx_reviews_chapter ON chapter_reviews(chapter_id, id);
CREATE INDEX IF NOT EXISTS idx_editor_reports_book ON editor_reports(book_id, id);

-- ============ access for the app's publishable (anon) key ==================
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;

ALTER TABLE pen_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE series ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE editor_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_all ON pen_names;
CREATE POLICY anon_all ON pen_names FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS anon_all ON series;
CREATE POLICY anon_all ON series FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS anon_all ON books;
CREATE POLICY anon_all ON books FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS anon_all ON chapters;
CREATE POLICY anon_all ON chapters FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS anon_all ON characters;
CREATE POLICY anon_all ON characters FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS anon_all ON settings;
CREATE POLICY anon_all ON settings FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS anon_all ON chapter_reviews;
CREATE POLICY anon_all ON chapter_reviews FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS anon_all ON audio_tracks;
CREATE POLICY anon_all ON audio_tracks FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS anon_all ON editor_reports;
CREATE POLICY anon_all ON editor_reports FOR ALL TO anon USING (true) WITH CHECK (true);

-- ======================= audio storage bucket ==============================
INSERT INTO storage.buckets (id, name, public)
VALUES ('audiobooks', 'audiobooks', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS anon_all_audio ON storage.objects;
CREATE POLICY anon_all_audio ON storage.objects FOR ALL TO anon
USING (bucket_id = 'audiobooks') WITH CHECK (bucket_id = 'audiobooks');

-- Lets the app verify the bucket exists at boot (bucket names are not sensitive).
DROP POLICY IF EXISTS anon_read_buckets ON storage.buckets;
CREATE POLICY anon_read_buckets ON storage.buckets FOR SELECT TO anon USING (true);

-- ============================ list views ===================================
CREATE OR REPLACE VIEW v_books_list AS
SELECT b.*, p.name AS pen_name, s.title AS series_title,
  COALESCE(x.chapters, 0)::int AS chapters, COALESCE(x.words, 0)::int AS words
FROM books b LEFT JOIN pen_names p ON p.id = b.pen_name_id
LEFT JOIN series s ON s.id = b.series_id
LEFT JOIN (SELECT book_id, COUNT(*) AS chapters, COALESCE(SUM(words), 0) AS words
  FROM chapters GROUP BY book_id) x ON x.book_id = b.id;

CREATE OR REPLACE VIEW v_pen_names_list AS
SELECT p.*, COALESCE(x.books, 0)::int AS books, COALESCE(y.series, 0)::int AS series
FROM pen_names p
LEFT JOIN (SELECT pen_name_id, COUNT(*) AS books FROM books GROUP BY pen_name_id) x ON x.pen_name_id = p.id
LEFT JOIN (SELECT pen_name_id, COUNT(*) AS series FROM series GROUP BY pen_name_id) y ON y.pen_name_id = p.id;

CREATE OR REPLACE VIEW v_series_list AS
SELECT s.*, p.name AS pen_name, COALESCE(x.books, 0)::int AS books, COALESCE(x.latest, 0)::int AS latest
FROM series s LEFT JOIN pen_names p ON p.id = s.pen_name_id
LEFT JOIN (SELECT series_id, COUNT(*) AS books, MAX(series_number) AS latest FROM books GROUP BY series_id) x ON x.series_id = s.id;

-- ================= atomic multi-step operations ============================
-- One-click / guided book creation: book + chapters + characters, all-or-nothing.
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

-- Chapter delete: reviews + track row + chapter + renumber siblings, all-or-nothing.
CREATE OR REPLACE FUNCTION rpc_chapter_delete(p_book_id integer, p_chapter_id integer, p_ts text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM chapter_reviews WHERE chapter_id = p_chapter_id;
  DELETE FROM audio_tracks WHERE chapter_id = p_chapter_id;
  DELETE FROM chapters WHERE id = p_chapter_id;
  UPDATE chapters c SET idx = s.rn
  FROM (SELECT id, row_number() OVER (ORDER BY idx) - 1 AS rn
        FROM chapters WHERE book_id = p_book_id) s
  WHERE c.id = s.id;
  UPDATE books SET updated_at = p_ts WHERE id = p_book_id;
END $$;

-- AI plan draft: replace chapters + characters, set logline/plan, all-or-nothing.
CREATE OR REPLACE FUNCTION rpc_plan_draft(p_book_id integer, p_logline text, p_plan text, p_chapters jsonb, p_characters jsonb, p_ts text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM chapters WHERE book_id = p_book_id;
  DELETE FROM characters WHERE book_id = p_book_id;
  INSERT INTO chapters (book_id, idx, title, summary, created_at)
  SELECT p_book_id, ord - 1, c->>'title', c->>'summary', p_ts
  FROM jsonb_array_elements(p_chapters) WITH ORDINALITY AS x(c, ord);
  INSERT INTO characters (book_id, name, role, description, arc)
  SELECT p_book_id, c->>'name', c->>'role', c->>'description', c->>'arc'
  FROM jsonb_array_elements(p_characters) AS x(c);
  UPDATE books SET logline = p_logline, plan = p_plan, updated_at = p_ts WHERE id = p_book_id;
END $$;

-- Manuscript import: replace / append / fill modes, all-or-nothing.
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

-- Backup restore: pens + series + books + chapters + characters + reviews, all-or-nothing.
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

-- ==================== refresh the API schema cache =========================
NOTIFY pgrst, 'reload schema';
