import { createNeonAuth } from "@neon/auth/next/server";

// Server-only. Fails with a clear message if the auth settings are missing or weak.
function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) throw new Error(`${name} is not set. Add it to .env.local (see .env.example).`);
  return value;
}

const cookieSecret = requiredEnv("NEON_AUTH_COOKIE_SECRET");
if (cookieSecret.length < 32) {
  throw new Error("NEON_AUTH_COOKIE_SECRET must be at least 32 characters. Generate one with: openssl rand -base64 32");
}

export const auth = createNeonAuth({
  baseUrl: requiredEnv("NEON_AUTH_BASE_URL").trim(),
  cookies: {
    secret: cookieSecret,
  },
});
