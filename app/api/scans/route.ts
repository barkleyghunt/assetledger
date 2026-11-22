import { getSql } from "@/lib/db";
import { currentUserRole } from "@/lib/auth/roles";
import { signedDownloadUrl } from "@/lib/r2";

// GET /api/scans?elementId=GY-192 — scans and defects for one element, with
// 15-minute download links. For signed-in web users (Contractor or Consultant).
export async function GET(request: Request) {
  const who = await currentUserRole();
  if (!who) return Response.json({ error: "Sign in with an account that has a role." }, { status: 401 });
  const elementId = new URL(request.url).searchParams.get("elementId")?.trim();
  if (!elementId || elementId.length > 40) return Response.json({ error: "elementId is required." }, { status: 400 });
  try {
    const sql = getSql();
    const scans = (await sql`
      SELECT id, method, file_prefix AS "filePrefix", file_names AS "fileNames", photo_count AS "photoCount",
             vertex_count AS "vertexCount", face_count AS "faceCount", ref_tape_mm AS "refTapeMm",
             ref_scan_mm AS "refScanMm", measurements, notes, captured_at AS "capturedAt", device, role
      FROM scans WHERE element_id = ${elementId} ORDER BY captured_at DESC`) as Record<string, unknown>[];
    const defects = (await sql`
      SELECT id, scan_id AS "scanId", type, severity, location, size_mm AS "sizeMm", notes,
             photo_key AS "photoKey", proposed_repair AS "proposedRepair", recorded_at AS "recordedAt", role
      FROM defects WHERE element_id = ${elementId} ORDER BY severity DESC, recorded_at DESC`) as Record<string, unknown>[];

    for (const s of scans) {
      const names = s.fileNames as string[];
      // Photo sets can be large; link the first 50 here.
      s.files = await Promise.all(names.slice(0, 50).map(async (n) => ({ name: n, url: await signedDownloadUrl(`${s.filePrefix}${n}`) })));
      delete s.filePrefix;
    }
    for (const d of defects) {
      d.photoUrl = d.photoKey ? await signedDownloadUrl(d.photoKey as string) : null;
      delete d.photoKey;
    }
    return Response.json({ scans, defects });
  } catch {
    return Response.json({ error: "Database or file storage unavailable." }, { status: 503 });
  }
}
