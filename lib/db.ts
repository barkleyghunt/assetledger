import { neon } from "@neondatabase/serverless";

// Server-only: reads DATABASE_URL from the environment (set in .env.local locally
// and as a secret in deployment). Never import this from a client component.
export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Pull it with `npx neon@latest env pull` or add it to .env.local.");
  }
  return neon(url);
}
