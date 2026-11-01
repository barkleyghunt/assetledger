import { getSql } from "@/lib/db";

const roles = ["Contractor", "Consultant"];
const kinds = ["Comment", "Question", "Progress", "Evidence"];
// Consultant authority and approval decisions need real sign-in and role checks.
// Until those exist, the API refuses both, so nothing can be recorded as a consultant decision.
const consultantActionsEnabled = false;

type EventInput = { elementId: string; stage: number; role: string; kind: string; text: string };

function parseEvent(body: unknown): EventInput | string {
  if (!body || typeof body !== "object") return "Body must be a JSON object.";
  const b = body as Record<string, unknown>;
  if (typeof b.elementId !== "string" || !b.elementId.trim() || b.elementId.length > 40) return "elementId is required (max 40 characters).";
  if (!Number.isInteger(b.stage) || (b.stage as number) < 0) return "stage must be a non-negative integer.";
  if (typeof b.role !== "string" || !roles.includes(b.role)) return "role must be Contractor or Consultant.";
  if (b.role === "Consultant" && !consultantActionsEnabled) return "Consultant actions are not available until sign-in is added.";
  if (typeof b.kind !== "string" || !kinds.includes(b.kind)) return "kind is not recognised.";
  if (typeof b.text !== "string" || !b.text.trim() || b.text.length > 2000) return "text is required (max 2000 characters).";
  return { elementId: b.elementId.trim(), stage: b.stage as number, role: b.role, kind: b.kind, text: b.text.trim() };
}

// GET /api/events?elementId=GY-192 — audit history for one element, oldest first.
export async function GET(request: Request) {
  const elementId = new URL(request.url).searchParams.get("elementId")?.trim();
  if (!elementId || elementId.length > 40) return Response.json({ error: "elementId is required." }, { status: 400 });
  try {
    const sql = getSql();
    const rows = await sql`
      SELECT id, element_id AS "elementId", stage, role, kind, text, created_at AS "createdAt"
      FROM audit_events WHERE element_id = ${elementId} ORDER BY created_at, id`;
    return Response.json({ events: rows });
  } catch {
    return Response.json({ error: "Database unavailable." }, { status: 503 });
  }
}

// POST /api/events — appends one event. Events are never edited or deleted.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON." }, { status: 400 });
  }
  const parsed = parseEvent(body);
  if (typeof parsed === "string") return Response.json({ error: parsed }, { status: 400 });
  try {
    const sql = getSql();
    const [row] = await sql`
      INSERT INTO audit_events (element_id, stage, role, kind, text)
      VALUES (${parsed.elementId}, ${parsed.stage}, ${parsed.role}, ${parsed.kind}, ${parsed.text})
      RETURNING id, created_at AS "createdAt"`;
    return Response.json(row, { status: 201 });
  } catch {
    return Response.json({ error: "Database unavailable." }, { status: 503 });
  }
}
