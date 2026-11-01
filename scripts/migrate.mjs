// Creates the audit_events table. Run once per database:
//   node --env-file=.env.local scripts/migrate.mjs
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Check .env.local.");
  process.exit(1);
}

const sql = neon(url);
const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
// Remove comments first, so a semicolon inside a comment is not read as a statement break.
const withoutComments = schema.replace(/--.*$/gm, "");
// Each statement is run separately.
for (const statement of withoutComments.split(";").map((s) => s.trim()).filter(Boolean)) {
  await sql.query(statement);
}
console.log("Migration complete: audit_events is ready.");
