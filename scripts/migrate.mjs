// Creates or updates the tables in db/schema.sql and the append-only rules.
// Safe to run more than once:
//   node --env-file=.env.local scripts/migrate.mjs
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { splitStatements } from "./split-sql.mjs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Check .env.local.");
  process.exit(1);
}

const sql = neon(url);
const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
for (const statement of splitStatements(schema)) {
  await sql.query(statement);
}
console.log("Migration complete: audit_events, user_roles, workflow_ops, device_tokens, scans and defects are ready.");
