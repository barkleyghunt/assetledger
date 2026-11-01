-- Audit trail for Asset Ledger. Events are append-only: the app inserts rows and
-- never updates or deletes them.
CREATE TABLE IF NOT EXISTS audit_events (
  id          BIGSERIAL PRIMARY KEY,
  element_id  TEXT        NOT NULL,
  stage       INTEGER     NOT NULL CHECK (stage >= 0),
  role        TEXT        NOT NULL CHECK (role IN ('Contractor', 'Consultant')),
  kind        TEXT        NOT NULL CHECK (kind IN ('Comment', 'Question', 'Decision', 'Progress', 'Evidence')),
  text        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_events_element_idx ON audit_events (element_id, created_at);
