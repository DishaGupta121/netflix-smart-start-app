-- Add unique constraint on show_id so upserts with onConflict: 'show_id' work
-- First drop the existing non-unique index, then recreate as unique
DROP INDEX IF EXISTS idx_watch_progress_show_id;
CREATE UNIQUE INDEX idx_watch_progress_show_id ON watch_progress(show_id);
