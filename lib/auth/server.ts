import { createNeonAuth } from "@neon/auth/next/server";

// Server-only. Reads NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET from the environment.
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
});
