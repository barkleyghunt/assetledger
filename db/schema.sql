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

-- Maps a signed-in account to its role. Only the owner adds rows, by hand.
-- user_id is the Neon Auth user id; an account with no row has no role and cannot write events.
CREATE TABLE IF NOT EXISTS user_roles (
  user_id     TEXT PRIMARY KEY,
  role        TEXT NOT NULL CHECK (role IN ('Contractor', 'Consultant')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
