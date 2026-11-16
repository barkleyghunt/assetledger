import { getSql } from "@/lib/db";
import { deviceUserRole, unauthorized } from "@/lib/auth/device";
import { elementId, fail, id, InputError, isoDate, num, readJson, stage, text } from "@/lib/device-input";
import { defectPhotoKey } from "@/lib/r2";

// POST /api/device/defects — records a defect from the phone. Evidence only:
// approving a proposed repair stays a consultant Decision in the web app.
// Safe to repeat: a defect already received is not changed.
export async function POST(request: Request) {
  try {
    const who = await deviceUserRole(request);
    if (!who) return unauthorized();
    const b = await readJson(request);

    const element = elementId(b.elementId);
    const defectId = id(b.id, "id");
    const scanId = b.scanId == null ? null : id(b.scanId, "scanId");
    const type = text(b.type, "type", 60, true);
    const severity = num(b.severity, "severity", { min: 1, max: 5, int: true });
    if (severity == null) throw new InputError("severity is required (1 to 5).");
    const location = text(b.location, "location", 200);
    const sizeMm = num(b.sizeMm, "sizeMm", { max: 1e6 });
    const notes = text(b.notes, "notes", 2000);
    const repair = text(b.proposedRepair, "proposedRepair", 1000);
    const photoKey = b.hasPhoto === true ? defectPhotoKey(element, defectId) : null;
    const recordedAt = isoDate(b.recordedAt, "recordedAt");
    const atStage = stage(b.stage);

    const sql = getSql();
    const rows = (await sql`
      INSERT INTO defects (id, element_id, scan_id, type, severity, location, size_mm, notes, photo_key,
                           proposed_repair, recorded_at, uploaded_by, role)
      VALUES (${defectId}, ${element}, ${scanId}, ${type}, ${severity}, ${location}, ${sizeMm}, ${notes}, ${photoKey},
              ${repair}, ${recordedAt}, ${who.userId}, ${who.role})
      ON CONFLICT (id) DO NOTHING
      RETURNING id`) as { id: string }[];

    if (rows.length) {
      const size = sizeMm != null ? `, ${sizeMm} mm` : "";
      const proposed = repair ? ` Proposed repair: ${repair}.` : "";
      await sql`
        INSERT INTO audit_events (element_id, stage, role, kind, text)
        VALUES (${element}, ${atStage}, ${who.role}, 'Evidence',
                ${`Defect ${defectId} recorded on phone: ${type}, severity ${severity}${size}, ${location || "location not given"}.${proposed}`.slice(0, 2000)})`;
    }
    return Response.json({ id: defectId, inserted: rows.length > 0 }, { status: rows.length ? 201 : 200 });
  } catch (e) {
    return fail(e);
  }
}
