import { getSql } from "@/lib/db";
import { deviceUserRole, unauthorized } from "@/lib/auth/device";
import { elementId, fail, id, InputError, isoDate, num, readJson, stage, text } from "@/lib/device-input";
import { scanFileKey } from "@/lib/r2";

const methods = ["lidar-surface", "lidar-room", "photo-set"];

// POST /api/device/scans — records a scan after its files are uploaded to R2.
// Safe to repeat: a re-sync updates the scale check, measurements and notes only.
// The scan files and capture details are fixed once recorded.
export async function POST(request: Request) {
  try {
    const who = await deviceUserRole(request);
    if (!who) return unauthorized();
    const b = await readJson(request);

    const element = elementId(b.elementId);
    const scanId = id(b.id, "id");
    if (typeof b.method !== "string" || !methods.includes(b.method)) throw new InputError(`method must be one of: ${methods.join(", ")}.`);
    if (!Array.isArray(b.fileNames) || b.fileNames.length === 0 || b.fileNames.length > 500) throw new InputError("fileNames must list 1 to 500 uploaded files.");
    const fileNames = b.fileNames.map((f) => {
      if (typeof f !== "string" || !scanFileKey(element, scanId, f)) throw new InputError(`Bad file name: ${String(f)}`);
      return f;
    });
    const measurements = Array.isArray(b.measurements) ? b.measurements.slice(0, 200).map((m, i) => {
      const r = (m ?? {}) as Record<string, unknown>;
      return { label: text(r.label, `measurements[${i}].label`, 20, true), mm: num(r.mm, `measurements[${i}].mm`, { max: 1e6 }) };
    }) : [];
    const tape = num(b.refTapeMm, "refTapeMm", { max: 1e6 });
    const scanMm = num(b.refScanMm, "refScanMm", { max: 1e6 });
    const notes = text(b.notes, "notes", 2000);
    const capturedAt = isoDate(b.capturedAt, "capturedAt");
    const device = text(b.device, "device", 80) || who.device;
    const atStage = stage(b.stage);
    const prefix = `elements/${element.replace(/[^A-Za-z0-9_-]/g, "_")}/scans/${scanId}/`;

    const sql = getSql();
    const [row] = (await sql`
      INSERT INTO scans (id, element_id, method, file_prefix, file_names, photo_count, vertex_count, face_count,
                         ref_tape_mm, ref_scan_mm, measurements, notes, captured_at, device, uploaded_by, role)
      VALUES (${scanId}, ${element}, ${b.method}, ${prefix}, ${fileNames},
              ${num(b.photoCount, "photoCount", { int: true })}, ${num(b.vertexCount, "vertexCount", { int: true })},
              ${num(b.faceCount, "faceCount", { int: true })}, ${tape}, ${scanMm}, ${JSON.stringify(measurements)},
              ${notes}, ${capturedAt}, ${device}, ${who.userId}, ${who.role})
      ON CONFLICT (id) DO UPDATE SET
        ref_tape_mm = EXCLUDED.ref_tape_mm,
        ref_scan_mm = EXCLUDED.ref_scan_mm,
        measurements = EXCLUDED.measurements,
        notes = EXCLUDED.notes
      WHERE scans.element_id = EXCLUDED.element_id
      RETURNING (xmax = 0) AS inserted`) as { inserted: boolean }[];
    if (!row) throw new InputError("A scan with this ID already exists on a different element.");

    const label = b.method === "photo-set" ? `photo set, ${fileNames.length} photos` : String(b.method).replace("lidar-", "LiDAR ");
    const scale = tape != null && scanMm != null ? ` Scale check: tape ${tape} mm, scan ${scanMm} mm.` : " No scale check.";
    const measured = measurements.length ? ` Measurements: ${measurements.map((m) => `${m.label} ${Math.round(m.mm ?? 0)} mm`).join(", ")}.` : "";
    const eventText = row.inserted
      ? `Scan ${scanId} uploaded from phone (${label}).${scale}${measured}`
      : `Scan ${scanId} details updated from phone.${scale}${measured}`;
    await sql`
      INSERT INTO audit_events (element_id, stage, role, kind, text)
      VALUES (${element}, ${atStage}, ${who.role}, 'Evidence', ${eventText.slice(0, 2000)})`;

    return Response.json({ id: scanId, inserted: row.inserted }, { status: row.inserted ? 201 : 200 });
  } catch (e) {
    return fail(e);
  }
}
