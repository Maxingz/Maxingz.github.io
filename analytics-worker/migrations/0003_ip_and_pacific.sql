ALTER TABLE visitors ADD COLUMN ip_address TEXT;
ALTER TABLE visitors ADD COLUMN first_seen TEXT;
-- UTC date-only history cannot be accurately reassigned to Pacific calendar days.
CREATE TABLE daily_visitors_pt (
  day TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  PRIMARY KEY (day, visitor_id)
);
