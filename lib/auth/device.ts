import { createHash } from "node:crypto";
import { getSql } from "@/lib/db";
import type { Role } from "@/lib/auth/roles";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Phone requests carry "Authorization: Bearer <token>". Returns the phone owner's
// account and role, or null if the token is missing, unknown, revoked or has no role.
export async function deviceUserRole(request: Request): Promise<{ userId: string; role: Role; device: string } | null> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+([A-Za-z0-9_-]{32,128})$/.exec(header.trim());
  if (!match) return null;
  const rows = (await getSql()`
    SELECT t.user_id AS "userId", r.role, t.label AS device
    FROM device_tokens t JOIN user_roles r ON r.user_id = t.user_id
    WHERE t.token_hash = ${hashToken(match[1])} AND t.revoked_at IS NULL`) as { userId: string; role: Role; device: string }[];
  return rows[0] ?? null;
}

export function unauthorized() {
  return Response.json({ error: "This phone is not authorised. Check the device token in Settings." }, { status: 401 });
}
