// Shared validation for phone uploads. Returns a message string on bad input.
export const stageCount = 8;

export function text(v: unknown, field: string, max: number, required = false): string {
  if (v == null || v === "") {
    if (required) throw new InputError(`${field} is required.`);
    return "";
  }
  if (typeof v !== "string" || v.length > max) throw new InputError(`${field} must be text up to ${max} characters.`);
  if (required && !v.trim()) throw new InputError(`${field} is required.`);
  return v.trim();
}

export function num(v: unknown, field: string, { min = 0, max = 1e9, int = false } = {}): number | null {
  if (v == null || v === "") return null;
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max || (int && !Number.isInteger(v))) {
    throw new InputError(`${field} must be a number from ${min} to ${max}.`);
  }
  return v;
}

export function id(v: unknown, field: string): string {
  if (typeof v !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(v)) throw new InputError(`${field} is not a valid ID.`);
  return v;
}

export function elementId(v: unknown): string {
  const s = text(v, "elementId", 40, true);
  return s;
}

export function isoDate(v: unknown, field: string): string {
  if (typeof v !== "string" || Number.isNaN(Date.parse(v))) throw new InputError(`${field} must be an ISO date.`);
  return new Date(v).toISOString();
}

export function stage(v: unknown): number {
  if (v == null) return 0;
  if (!Number.isInteger(v) || (v as number) < 0 || (v as number) >= stageCount) throw new InputError(`stage must be 0 to ${stageCount - 1}.`);
  return v as number;
}

export class InputError extends Error {}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new InputError("Body must be a JSON object.");
    return body as Record<string, unknown>;
  } catch (e) {
    if (e instanceof InputError) throw e;
    throw new InputError("Body must be JSON.");
  }
}

export function fail(e: unknown) {
  if (e instanceof InputError) return Response.json({ error: e.message }, { status: 400 });
  return Response.json({ error: "Server unavailable. Try sync again later." }, { status: 503 });
}
