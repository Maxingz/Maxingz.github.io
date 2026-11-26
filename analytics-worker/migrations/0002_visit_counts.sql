-- Historical page-view totals were not collected; start counting from this update.
ALTER TABLE visitors ADD COLUMN visit_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE visitors ADD COLUMN last_seen TEXT;
