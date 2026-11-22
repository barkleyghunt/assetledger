import { getSql } from "@/lib/db";
import { auth } from "@/lib/auth/server";

export type Role = "Contractor" | "Consultant";
export type Member = { userId: string; name: string; role: Role };

// Returns the signed-in user's id, display name and role, or null if there is no session or no role row.
export async function currentUserRole(): Promise<Member | null> {
  const { data } = await auth.getSession();
  const user = data?.user;
  if (!user?.id) return null;
  const rows = (await getSql()`SELECT role FROM user_roles WHERE user_id = ${user.id}`) as { role: Role }[];
  if (rows.length === 0) return null;
  return { userId: user.id, name: user.name?.trim() || user.email || user.id, role: rows[0].role };
}

// For API routes: the signed-in member, or a ready-made error response.
// A database outage gives a clear 503 instead of an unexplained crash.
export async function requireMember(): Promise<Member | Response> {
  let who: Member | null;
  try {
    who = await currentUserRole();
  } catch {
    return Response.json({ error: "Database unavailable." }, { status: 503 });
  }
  if (!who) return Response.json({ error: "Your account has no Asset Ledger role yet. Ask the project owner to add one." }, { status: 403 });
  return who;
}
