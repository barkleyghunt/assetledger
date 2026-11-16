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

-- Every change made on the workflow screen, in order. The app rebuilds the current
-- workflow state by replaying these rows. Two people saving at the same moment
-- cannot both take the same seq, so neither silently overwrites the other.
CREATE TABLE IF NOT EXISTS workflow_ops (
  seq         INTEGER     PRIMARY KEY CHECK (seq > 0),
  user_id     TEXT        NOT NULL,
  user_name   TEXT        NOT NULL,
  role        TEXT        NOT NULL CHECK (role IN ('Contractor', 'Consultant')),
  op          JSONB       NOT NULL,
  at          TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
