-- Ghostforge migration 03: refresh v_books_list for the Book Engine columns.
-- Run AFTER migration 02, in the Supabase SQL editor (paste + Run).
--
-- Why: Postgres freezes a view's column list when the view is created, so the
-- ledger / bible / editor_ledger columns added by migration 02 never appeared
-- in v_books_list. Backups (and the book list) therefore saw NULLs for them.
-- NOTE: this must be DROP + CREATE, not CREATE OR REPLACE — Postgres refuses
-- to reorder existing view columns (error 42P16), and the three new books
-- columns land ahead of pen_name/series_title. Nothing else depends on this
-- view. Safe to re-run; the GRANT restores what DROP removes.

DROP VIEW IF EXISTS v_books_list;

CREATE OR REPLACE VIEW v_books_list AS
SELECT b.*, p.name AS pen_name, s.title AS series_title,
  COALESCE(x.chapters, 0)::int AS chapters, COALESCE(x.words, 0)::int AS words
FROM books b LEFT JOIN pen_names p ON p.id = b.pen_name_id
LEFT JOIN series s ON s.id = b.series_id
LEFT JOIN (SELECT book_id, COUNT(*) AS chapters, COALESCE(SUM(words), 0) AS words
  FROM chapters GROUP BY book_id) x ON x.book_id = b.id;

GRANT ALL ON v_books_list TO anon;

NOTIFY pgrst, 'reload schema';
