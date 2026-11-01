import { getSql } from "@/lib/db";
import { auth } from "@/lib/auth/server";

export type Role = "Contractor" | "Consultant";

// Returns the signed-in user's id and role, or null if there is no session or no role row.
export async function currentUserRole(): Promise<{ userId: string; role: Role } | null> {
  const { data } = await auth.getSession();
  const userId = data?.user?.id;
  if (!userId) return null;
  const rows = (await getSql()`SELECT role FROM user_roles WHERE user_id = ${userId}`) as { role: Role }[];
  if (rows.length === 0) return null;
  return { userId, role: rows[0].role };
}
