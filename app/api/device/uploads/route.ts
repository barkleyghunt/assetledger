import { deviceUserRole, unauthorized } from "@/lib/auth/device";
import { elementId, fail, id, readJson, InputError } from "@/lib/device-input";
import { defectPhotoKey, scanFileKey, signedUploadUrl } from "@/lib/r2";

// POST /api/device/uploads — returns a 1-hour signed URL for one file.
// Body: { elementId, kind: "scan", scanId, fileName } or { elementId, kind: "defect", defectId }
export async function POST(request: Request) {
  try {
    const who = await deviceUserRole(request);
    if (!who) return unauthorized();
    const b = await readJson(request);
    const element = elementId(b.elementId);
    let key: string | null;
    if (b.kind === "scan") {
      if (typeof b.fileName !== "string") throw new InputError("fileName is required.");
      key = scanFileKey(element, id(b.scanId, "scanId"), b.fileName);
    } else if (b.kind === "defect") {
      key = defectPhotoKey(element, id(b.defectId, "defectId"));
    } else {
      throw new InputError('kind must be "scan" or "defect".');
    }
    if (!key) throw new InputError("File name must be .obj, .usdz or .jpg with letters, numbers, - or _.");
    return Response.json({ key, url: await signedUploadUrl(key) });
  } catch (e) {
    return fail(e);
  }
}
