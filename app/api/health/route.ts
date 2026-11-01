import { getSql } from "@/lib/db";

// Checks that the app can reach the database. Returns no connection details.
export async function GET() {
  try {
    const sql = getSql();
    await sql`SELECT 1`;
    return Response.json({ database: "ok" });
  } catch {
    return Response.json({ database: "unavailable" }, { status: 503 });
  }
}
