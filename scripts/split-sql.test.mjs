import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { splitStatements } from './split-sql.mjs';

test('comments, quoted text and $$ bodies do not split statements', () => {
  const sql = "-- note; not a break\nSELECT 'a;b';\nCREATE FUNCTION f() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'x; y'; END; $$;\nSELECT 'it''s; fine'";
  assert.deepEqual(splitStatements(sql), [
    "SELECT 'a;b'",
    "CREATE FUNCTION f() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'x; y'; END; $$",
    "SELECT 'it''s; fine'",
  ]);
});

test('the real schema splits into complete statements', () => {
  const statements = splitStatements(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  assert.ok(statements.some(s => s.startsWith('CREATE OR REPLACE FUNCTION') && s.endsWith('$$')));
  assert.equal(statements.filter(s => s.startsWith('CREATE OR REPLACE TRIGGER')).length, 4);
  for (const s of statements) assert.doesNotMatch(s, /--/);
});
