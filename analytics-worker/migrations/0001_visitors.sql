CREATE TABLE visitors (id TEXT PRIMARY KEY, first_day TEXT NOT NULL);
CREATE TABLE daily_visitors (
  day TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  PRIMARY KEY (day, visitor_id)
);
