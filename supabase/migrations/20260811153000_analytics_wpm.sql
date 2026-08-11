-- Add words_read column to reading_sessions for WPM calculation
ALTER TABLE reading_sessions ADD COLUMN words_read INT DEFAULT 0;
