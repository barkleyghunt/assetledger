// Creates a phone access token for an existing account with a role.
//   node --env-file=.env.local scripts/create-device-token.mjs <neon-auth-user-id> "Barkley iPhone 15 Pro"
// The token is printed once. Enter it in the phone app's Settings. Only its hash is stored.
// To block a phone: UPDATE device_tokens SET revoked_at = now() WHERE label = '...';
import { neon } from "@neondatabase/serverless";
import { createHash, randomBytes } from "node:crypto";

const [userId, label] = process.argv.slice(2);
if (!userId || !label) {
  console.error('Usage: node --env-file=.env.local scripts/create-device-token.mjs <user-id> "<phone label>"');
  process.exit(1);
}
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Check .env.local.");
  process.exit(1);
}
const sql = neon(url);
const roles = await sql`SELECT role FROM user_roles WHERE user_id = ${userId}`;
if (roles.length === 0) {
  console.error("That account has no row in user_roles. Add its role first.");
  process.exit(1);
}
const token = randomBytes(32).toString("base64url");
const hash = createHash("sha256").update(token).digest("hex");
await sql`INSERT INTO device_tokens (token_hash, user_id, label) VALUES (${hash}, ${userId}, ${label})`;
console.log(`Token for "${label}" (${roles[0].role}). Shown once:\n\n${token}\n`);
