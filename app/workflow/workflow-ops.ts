// Workflow operations: the saved form of every change to the workflow.
// The server stores each operation with who made it, when, and the workflow state
// that resulted. The current state is read from the latest saved row, so a later
// change to the rules or the starting data cannot make existing history unreadable.
// The role always comes from the signed-in account, never from the browser.
import { actionTypes, createModel, decideProposal, decideReview, proposePlan, revisePlan, transition } from "./workflow-model.ts";
import type { Gate, Model, Role, Rule } from "./workflow-model.ts";

export type Op =
  | { op: "transition"; type: (typeof actionTypes)[number]; id: string; text: string; location?: string; confirmed?: boolean }
  | { op: "decideReview"; id: number; accept: boolean; reason: string }
  | { op: "revisePlan"; plan: Gate[]; reason: string }
  | { op: "proposePlan"; plan: Gate[]; reason: string }
  | { op: "decideProposal"; id: number; approve: boolean; reason: string }
  | { op: "markRead"; ids: number[] };

export type Actor = { role: Role; by: string; at: string };
export type StoredOp = Actor & { op: Op };

const rules: Rule[] = ["Record only", "Team check", "Consultant review", "Hold point"];
const maxText = 2000;

function text(v: unknown, name: string, max = maxText): string {
  if (typeof v !== "string" || v.length > max) throw new Error(`${name} must be text (max ${max} characters).`);
  return v;
}
function int(v: unknown, name: string): number {
  if (!Number.isInteger(v)) throw new Error(`${name} must be a whole number.`);
  return v as number;
}
function bool(v: unknown, name: string): boolean {
  if (typeof v !== "boolean") throw new Error(`${name} must be true or false.`);
  return v;
}
function plan(v: unknown): Gate[] {
  if (!Array.isArray(v) || v.length > 20) throw new Error("plan must be a list of stage requirements.");
  return v.map((g) => {
    if (!g || typeof g !== "object") throw new Error("plan entries must be objects.");
    const { rule, hours } = g as Record<string, unknown>;
    if (!rules.includes(rule as Rule)) throw new Error("plan rule is not recognised.");
    if (typeof hours !== "number") throw new Error("plan hours must be a number.");
    return { rule: rule as Rule, hours, version: 0 };
  });
}

// Checks the shape of an operation sent by the browser and keeps only known fields.
export function parseOp(body: unknown): Op {
  if (!body || typeof body !== "object") throw new Error("Operation must be a JSON object.");
  const b = body as Record<string, unknown>;
  switch (b.op) {
    case "transition": {
      if (!(actionTypes as readonly unknown[]).includes(b.type)) throw new Error("Unknown action.");
      const op: Op = { op: "transition", type: b.type as (typeof actionTypes)[number], id: text(b.id, "id", 40), text: text(b.text ?? "", "text") };
      if (b.location !== undefined) op.location = text(b.location, "location", 200);
      if (b.confirmed !== undefined) op.confirmed = bool(b.confirmed, "confirmed");
      return op;
    }
    case "decideReview":
      return { op: "decideReview", id: int(b.id, "id"), accept: bool(b.accept, "accept"), reason: text(b.reason, "reason") };
    case "revisePlan":
    case "proposePlan":
      return { op: b.op, plan: plan(b.plan), reason: text(b.reason, "reason") };
    case "decideProposal":
      return { op: "decideProposal", id: int(b.id, "id"), approve: bool(b.approve, "approve"), reason: text(b.reason, "reason") };
    case "markRead":
      if (!Array.isArray(b.ids) || b.ids.length > 1000) throw new Error("ids must be a list.");
      return { op: "markRead", ids: b.ids.map((id) => int(id, "id")) };
    default:
      throw new Error("Unknown operation.");
  }
}

// Applies one operation as the given person. Throws with a readable message if the rules forbid it.
export function applyOp(model: Model, op: Op, { role, by, at }: Actor): Model {
  switch (op.op) {
    case "transition":
      return transition(model, { type: op.type, id: op.id, role, by, text: op.text, at, location: op.location, confirmed: op.confirmed });
    case "decideReview":
      return decideReview(model, op.id, op.accept, op.reason, role, at, by);
    case "revisePlan":
      return revisePlan(model, op.plan, op.reason, role, at, by);
    case "proposePlan":
      return proposePlan(model, op.plan, op.reason, role, at, by);
    case "decideProposal":
      return decideProposal(model, op.id, op.approve, op.reason, role, at, by);
    case "markRead": {
      // Each role can only mark its own notifications as read.
      const ids = new Set(op.ids);
      return { ...model, notices: model.notices.map((n) => (ids.has(n.id) && n.recipient === role ? { ...n, read: true } : n)) };
    }
  }
}

// Rebuilds the current state from the saved history, oldest first.
export function replay(history: StoredOp[]): Model {
  return history.reduce((model, { op, ...actor }) => applyOp(model, op, actor), createModel());
}

// Raised when saved changes that have no stored state can no longer be rebuilt under the current rules.
export class HistoryError extends Error {}

// Only for changes saved before each row kept its resulting state: rebuilds by replaying them.
export function replayLegacy(history: StoredOp[]): Model {
  try {
    return replay(history);
  } catch (error) {
    throw new HistoryError(`Saved workflow history could not be rebuilt: ${(error as Error).message}`);
  }
}
