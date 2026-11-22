import { getSql } from "@/lib/db";
import { requireMember, type Member } from "@/lib/auth/roles";
import { applyOp, HistoryError, parseOp, replayLegacy, type Op, type StoredOp } from "@/app/workflow/workflow-ops";
import { createModel, type Model } from "@/app/workflow/workflow-model";

type Row = { seq: number; role: Member["role"]; user_name: string; op: Op; at: string };

// The current state is the one saved with the latest change. It is not recomputed, so
// changing the rules or the starting data later cannot break what is already recorded.
async function loadHistory(): Promise<{ model: Model; seq: number }> {
  const sql = getSql();
  const latest = (await sql`SELECT seq, state FROM workflow_ops ORDER BY seq DESC LIMIT 1`) as { seq: number; state: Model | null }[];
  if (latest.length === 0) return { model: createModel(), seq: 0 };
  if (latest[0].state) return { model: latest[0].state, seq: latest[0].seq };
  // Rows saved before the state column existed: rebuild once by replaying them.
  const rows = (await sql`SELECT seq, role, user_name, op, at FROM workflow_ops ORDER BY seq`) as Row[];
  const history: StoredOp[] = rows.map((r) => ({ role: r.role, by: r.user_name, at: r.at, op: r.op }));
  return { model: replayLegacy(history), seq: latest[0].seq };
}

// A database outage and unreadable history are different problems; say which one it is.
function loadFailed(error: unknown): Response {
  if (error instanceof HistoryError) return Response.json({ error: `${error.message} Nothing was lost; the saved history is intact. Contact the project owner.` }, { status: 500 });
  return Response.json({ error: "Database unavailable." }, { status: 503 });
}

const me = (who: Member) => ({ name: who.name, role: who.role });

// GET /api/workflow — the shared workflow state, plus who is signed in.
export async function GET() {
  const who = await requireMember();
  if (who instanceof Response) return who;
  try {
    return Response.json({ ...(await loadHistory()), me: me(who) });
  } catch (error) {
    return loadFailed(error);
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
  } catch (error) {
    return loadFailed(error);
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
      INSERT INTO workflow_ops (seq, user_id, user_name, role, op, at, state)
      VALUES (${seq}, ${who.userId}, ${who.name}, ${who.role}, ${JSON.stringify(op)}::jsonb, ${at}, ${JSON.stringify(model)}::jsonb)`;
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
