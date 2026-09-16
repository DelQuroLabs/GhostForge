-- Ghostforge SQLite schema (self-hosted: no Supabase, no Cloudflare).
-- Executed at boot by server/db.ts. Idempotent: safe to run on every start.
-- Tables mirror the former Postgres schema 1:1 (same names/columns/types),
-- so rows exported from Supabase import unchanged.

CREATE TABLE IF NOT EXISTS pen_names (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  bio TEXT DEFAULT '',
  genres TEXT DEFAULT '',
  created_at TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS series (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pen_name_id INTEGER REFERENCES pen_names(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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

-- List views (views hold no data: always DROP + CREATE so they never go stale).
DROP VIEW IF EXISTS v_books_list;
CREATE VIEW v_books_list AS
SELECT b.*, p.name AS pen_name, s.title AS series_title,
  CAST(COALESCE(x.chapters, 0) AS INTEGER) AS chapters, CAST(COALESCE(x.words, 0) AS INTEGER) AS words
FROM books b LEFT JOIN pen_names p ON p.id = b.pen_name_id
LEFT JOIN series s ON s.id = b.series_id
LEFT JOIN (SELECT book_id, COUNT(*) AS chapters, COALESCE(SUM(words), 0) AS words
  FROM chapters GROUP BY book_id) x ON x.book_id = b.id;

DROP VIEW IF EXISTS v_pen_names_list;
CREATE VIEW v_pen_names_list AS
SELECT p.*, CAST(COALESCE(x.books, 0) AS INTEGER) AS books, CAST(COALESCE(y.series, 0) AS INTEGER) AS series
FROM pen_names p
LEFT JOIN (SELECT pen_name_id, COUNT(*) AS books FROM books GROUP BY pen_name_id) x ON x.pen_name_id = p.id
LEFT JOIN (SELECT pen_name_id, COUNT(*) AS series FROM series GROUP BY pen_name_id) y ON y.pen_name_id = p.id;

DROP VIEW IF EXISTS v_series_list;
CREATE VIEW v_series_list AS
SELECT s.*, p.name AS pen_name, CAST(COALESCE(x.books, 0) AS INTEGER) AS books, CAST(COALESCE(x.latest, 0) AS INTEGER) AS latest
FROM series s LEFT JOIN pen_names p ON p.id = s.pen_name_id
LEFT JOIN (SELECT series_id, COUNT(*) AS books, MAX(series_number) AS latest FROM books GROUP BY series_id) x ON x.series_id = s.id;
