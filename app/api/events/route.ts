import { getSql } from "@/lib/db";
import { currentUserRole, type Role } from "@/lib/auth/roles";

// Event kinds a contractor may record. Consultant decisions are recorded separately, by a consultant.
const contractorKinds = ["Comment", "Question", "Progress", "Evidence"];
const consultantKinds = [...contractorKinds, "Decision"];

const stages = 8;

type EventInput = { elementId: string; stage: number; kind: string; text: string };

function parseEvent(body: unknown, role: Role): EventInput | string {
  if (!body || typeof body !== "object") return "Body must be a JSON object.";
  const b = body as Record<string, unknown>;
  if (typeof b.elementId !== "string" || !b.elementId.trim() || b.elementId.length > 40) return "elementId is required (max 40 characters).";
  if (!Number.isInteger(b.stage) || (b.stage as number) < 0 || (b.stage as number) >= stages) return `stage must be a whole number from 0 to ${stages - 1}.`;
  const allowed = role === "Consultant" ? consultantKinds : contractorKinds;
  if (typeof b.kind !== "string" || !allowed.includes(b.kind)) return `kind must be one of: ${allowed.join(", ")}.`;
  if (typeof b.text !== "string" || !b.text.trim() || b.text.length > 2000) return "text is required (max 2000 characters).";
  return { elementId: b.elementId.trim(), stage: b.stage as number, kind: b.kind, text: b.text.trim() };
}

// GET /api/events?elementId=GY-192 — audit history for one element, oldest first.
export async function GET(request: Request) {
  const who = await currentUserRole();
  if (!who) return Response.json({ error: "Sign in with an account that has a role." }, { status: 401 });
  const elementId = new URL(request.url).searchParams.get("elementId")?.trim();
  if (!elementId || elementId.length > 40) return Response.json({ error: "elementId is required." }, { status: 400 });
  try {
    const rows = await getSql()`
      SELECT id, element_id AS "elementId", stage, role, kind, text, created_at AS "createdAt"
      FROM audit_events WHERE element_id = ${elementId} ORDER BY created_at, id`;
    return Response.json({ events: rows });
  } catch {
    return Response.json({ error: "Database unavailable." }, { status: 503 });
  }
}

// POST /api/events — appends one event as the signed-in user's role. Events are never edited or deleted.
export async function POST(request: Request) {
  const who = await currentUserRole();
  if (!who) return Response.json({ error: "Sign in with an account that has a role." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON." }, { status: 400 });
  }
  const parsed = parseEvent(body, who.role);
  if (typeof parsed === "string") return Response.json({ error: parsed }, { status: 400 });
  try {
    const [row] = await getSql()`
      INSERT INTO audit_events (element_id, stage, role, kind, text)
      VALUES (${parsed.elementId}, ${parsed.stage}, ${who.role}, ${parsed.kind}, ${parsed.text})
      RETURNING id, created_at AS "createdAt"`;
    return Response.json(row, { status: 201 });
  } catch {
    return Response.json({ error: "Database unavailable." }, { status: 503 });
  }
}
