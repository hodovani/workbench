CREATE TABLE metrics (
  id TEXT PRIMARY KEY,
  at INTEGER NOT NULL,
  kind TEXT NOT NULL,
  outcome TEXT NOT NULL,
  ms INTEGER,
  duration INTEGER
);
CREATE INDEX metrics_at ON metrics(at);

CREATE TABLE metrics_start (id INTEGER PRIMARY KEY CHECK (id = 1), at INTEGER NOT NULL);
CREATE TRIGGER metrics_record_start AFTER INSERT ON metrics
BEGIN
  INSERT OR IGNORE INTO metrics_start VALUES (1, NEW.at);
END;
