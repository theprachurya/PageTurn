-- =====================================================
-- Phase 2 Migration: Performance Indexes & Cleanup
-- =====================================================

-- Add composite indexes for tables that are frequently queried
-- by (user_id, book_id) but don't already have them.

-- reading_sessions: already has idx_sessions_user_date but not (user_id, book_id)
CREATE INDEX IF NOT EXISTS idx_sessions_user_book ON reading_sessions(user_id, book_id);

-- highlights and bookmarks already have indexes from phase1.sql:
--   idx_highlights_user_book ON highlights(user_id, book_id)
--   idx_bookmarks_user_book ON bookmarks(user_id, book_id)
-- No changes needed for those.

-- user_books: add an index on (user_id, book_id) for faster lookups
-- (the UNIQUE constraint already creates a unique index, but let's ensure it's explicit)
CREATE INDEX IF NOT EXISTS idx_user_books_user_book ON user_books(user_id, book_id);
