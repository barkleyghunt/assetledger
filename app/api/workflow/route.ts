import { getSql } from "@/lib/db";
import { requireMember, type Member } from "@/lib/auth/roles";
import { applyOp, parseOp, replay, type Op, type StoredOp } from "@/app/workflow/workflow-ops";
import type { Model } from "@/app/workflow/workflow-model";

type Row = { seq: number; role: Member["role"]; user_name: string; op: Op; at: string };

async function loadHistory(): Promise<{ model: Model; seq: number }> {
  const rows = (await getSql()`SELECT seq, role, user_name, op, at FROM workflow_ops ORDER BY seq`) as Row[];
  const history: StoredOp[] = rows.map((r) => ({ role: r.role, by: r.user_name, at: r.at, op: r.op }));
  return { model: replay(history), seq: rows.length ? rows[rows.length - 1].seq : 0 };
}

const me = (who: Member) => ({ name: who.name, role: who.role });

// GET /api/workflow — the shared workflow state, plus who is signed in.
export async function GET() {
  const who = await requireMember();
  if (who instanceof Response) return who;
  try {
    return Response.json({ ...(await loadHistory()), me: me(who) });
  } catch {
    return Response.json({ error: "Database unavailable." }, { status: 503 });
  }
}

// POST /api/workflow — { seq, op }. Applies one change as the signed-in person and role.
// seq is the last change the browser has seen; if someone else saved first, the change is
// refused with 409 and the browser reloads, so nobody acts on out-of-date information.
export async function POST(request: Request) {
  const who = await requireMember();
  if (who instanceof Response) return who;
  let body: { seq?: unknown; op?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON." }, { status: 400 });
  }
  let op: Op;
  try {
    op = parseOp(body?.op);
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 });
  }
  let current: { model: Model; seq: number };
  try {
    current = await loadHistory();
  } catch {
    return Response.json({ error: "Database unavailable." }, { status: 503 });
  }
  if (body.seq !== current.seq) {
    return Response.json({ error: "Someone else updated the workflow. The latest version is now shown; please check it and try again.", ...current, me: me(who) }, { status: 409 });
  }
  const at = new Date().toISOString();
  let model: Model;
  try {
    model = applyOp(current.model, op, { role: who.role, by: who.name, at });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 422 });
  }
  const seq = current.seq + 1;
  try {
    await getSql()`
      INSERT INTO workflow_ops (seq, user_id, user_name, role, op, at)
      VALUES (${seq}, ${who.userId}, ${who.name}, ${who.role}, ${JSON.stringify(op)}::jsonb, ${at})`;
  } catch (error) {
    // 23505 = unique violation: another change took this seq a moment earlier.
    if ((error as { code?: string }).code === "23505") {
      const latest = await loadHistory().catch(() => null);
      return Response.json({ error: "Someone else updated the workflow at the same moment. Please try again.", ...latest, me: me(who) }, { status: 409 });
    }
    return Response.json({ error: "Database unavailable." }, { status: 503 });
  }
  return Response.json({ model, seq, me: me(who) });
}
