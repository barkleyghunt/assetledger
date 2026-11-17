-- Asset Ledger database schema. Safe to run more than once: node --env-file=.env.local scripts/migrate.mjs

-- Audit trail of comments and decisions per element. Append-only (see the triggers below).
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

-- Who wrote each event: the Neon Auth user id and the name shown at the time.
-- Rows written before these columns existed have no user recorded.
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS user_name TEXT;

-- Maps a signed-in account to its role. Only the owner adds rows, by hand.
-- user_id is the Neon Auth user id; an account with no row has no role and cannot write.
CREATE TABLE IF NOT EXISTS user_roles (
  user_id     TEXT PRIMARY KEY,
  role        TEXT NOT NULL CHECK (role IN ('Contractor', 'Consultant')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Phone app access. Each phone gets its own token, created by the owner with
-- scripts/create-device-token.mjs. Only a SHA-256 hash is stored. Set revoked_at to block a phone.
CREATE TABLE IF NOT EXISTS device_tokens (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT        NOT NULL REFERENCES user_roles(user_id),
  label       TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at  TIMESTAMPTZ
);

-- Scans uploaded from the phone. Files live in Cloudflare R2 under file_prefix.
CREATE TABLE IF NOT EXISTS scans (
  id            TEXT PRIMARY KEY,
  element_id    TEXT        NOT NULL,
  method        TEXT        NOT NULL CHECK (method IN ('lidar-surface', 'lidar-room', 'photo-set')),
  file_prefix   TEXT        NOT NULL,
  file_names    TEXT[]      NOT NULL DEFAULT '{}',
  photo_count   INTEGER,
  vertex_count  INTEGER,
  face_count    INTEGER,
  ref_tape_mm   REAL,
  ref_scan_mm   REAL,
  measurements  JSONB       NOT NULL DEFAULT '[]',
  notes         TEXT        NOT NULL DEFAULT '',
  captured_at   TIMESTAMPTZ NOT NULL,
  device        TEXT        NOT NULL,
  uploaded_by   TEXT        NOT NULL,
  role          TEXT        NOT NULL CHECK (role IN ('Contractor', 'Consultant')),
  received_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scans_element_idx ON scans (element_id, captured_at);

-- Defects recorded on the phone. Evidence only: approval is a consultant Decision event.
CREATE TABLE IF NOT EXISTS defects (
  id               TEXT PRIMARY KEY,
  element_id       TEXT        NOT NULL,
  scan_id          TEXT        REFERENCES scans(id),
  type             TEXT        NOT NULL,
  severity         INTEGER     NOT NULL CHECK (severity BETWEEN 1 AND 5),
  location         TEXT        NOT NULL DEFAULT '',
  size_mm          REAL,
  notes            TEXT        NOT NULL DEFAULT '',
  photo_key        TEXT,
  proposed_repair  TEXT        NOT NULL DEFAULT '',
  recorded_at      TIMESTAMPTZ NOT NULL,
  uploaded_by      TEXT        NOT NULL,
  role             TEXT        NOT NULL CHECK (role IN ('Contractor', 'Consultant')),
  received_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS defects_element_idx ON defects (element_id, recorded_at);

-- Every change made on the workflow screen, in order. Two people saving at the same
-- moment cannot both take the same seq, so neither silently overwrites the other.
CREATE TABLE IF NOT EXISTS workflow_ops (
  seq         INTEGER     PRIMARY KEY CHECK (seq > 0),
  user_id     TEXT        NOT NULL,
  user_name   TEXT        NOT NULL,
  role        TEXT        NOT NULL CHECK (role IN ('Contractor', 'Consultant')),
  op          JSONB       NOT NULL,
  at          TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The workflow state that resulted from each change. The app reads the current state
-- from the latest row, so later changes to the rules cannot make old history unreadable.
-- Rows written before this column existed have none and are replayed instead.
ALTER TABLE workflow_ops ADD COLUMN IF NOT EXISTS state JSONB;

-- History is append-only: refuse any UPDATE, DELETE or TRUNCATE on the history tables.
-- The database owner can still remove these triggers. For a stronger guarantee,
-- connect the app with a database role that is not the owner (see README).
CREATE OR REPLACE FUNCTION asset_ledger_forbid_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Asset Ledger history is append-only: % on % is not allowed', TG_OP, TG_TABLE_NAME;
END;
$$;

CREATE OR REPLACE TRIGGER audit_events_append_only
  BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION asset_ledger_forbid_change();
CREATE OR REPLACE TRIGGER audit_events_no_truncate
  BEFORE TRUNCATE ON audit_events FOR EACH STATEMENT EXECUTE FUNCTION asset_ledger_forbid_change();
CREATE OR REPLACE TRIGGER workflow_ops_append_only
  BEFORE UPDATE OR DELETE ON workflow_ops FOR EACH ROW EXECUTE FUNCTION asset_ledger_forbid_change();
CREATE OR REPLACE TRIGGER workflow_ops_no_truncate
  BEFORE TRUNCATE ON workflow_ops FOR EACH STATEMENT EXECUTE FUNCTION asset_ledger_forbid_change();
