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
