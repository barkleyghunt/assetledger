import { Directory, File, UploadType } from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import {
  isScanSynced,
  listMeasurements,
  markDefectPhotoUploaded,
  markDefectSynced,
  markScanFilesUploaded,
  markScanSynced,
  unsyncedDefects,
  unsyncedScans,
} from "./db";

// Sends scans and defects to the Asset Ledger web app. Files go straight to
// Cloudflare R2 using signed URLs from the server. Safe to run repeatedly: each
// step is marked done on the phone, and the server ignores repeats.

const SERVER_KEY = "assetledger.serverUrl";
const TOKEN_KEY = "assetledger.deviceToken";

export type Settings = { serverUrl: string; token: string };

export async function loadSettings(): Promise<Settings | null> {
  const [serverUrl, token] = await Promise.all([SecureStore.getItemAsync(SERVER_KEY), SecureStore.getItemAsync(TOKEN_KEY)]);
  return serverUrl && token ? { serverUrl, token } : null;
}

export async function saveSettings(s: Settings) {
  await SecureStore.setItemAsync(SERVER_KEY, s.serverUrl.trim().replace(/\/+$/, ""));
  await SecureStore.setItemAsync(TOKEN_KEY, s.token.trim());
}

async function api<T>(s: Settings, path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`${s.serverUrl}${path}`, {
    method: init?.method ?? "GET",
    headers: { Authorization: `Bearer ${s.token}`, "Content-Type": "application/json" },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`);
  return data as T;
}

export async function testConnection(s: Settings): Promise<{ role: string; device: string }> {
  return api(s, "/api/device/whoami");
}

async function uploadFile(s: Settings, file: File, request: Record<string, unknown>, contentType: string) {
  const { url } = await api<{ url: string }>(s, "/api/device/uploads", { method: "POST", body: request });
  const result = await file.upload(url, {
    httpMethod: "PUT",
    uploadType: UploadType.BINARY_CONTENT,
    headers: { "Content-Type": contentType },
  });
  if (result.status < 200 || result.status >= 300) throw new Error(`File upload failed (${result.status}).`);
}

const contentTypes: Record<string, string> = { obj: "model/obj", usdz: "model/vnd.usdz+zip", jpg: "image/jpeg" };

export type SyncReport = { scans: number; defects: number; errors: string[] };

export async function syncAll(onProgress?: (message: string) => void): Promise<SyncReport> {
  const s = await loadSettings();
  if (!s) throw new Error("Add the server address and device token in Settings first.");
  const report: SyncReport = { scans: 0, defects: 0, errors: [] };

  for (const scan of unsyncedScans()) {
    try {
      let names = scan.uploadedNames;
      if (!scan.filesUploaded) {
        const files: File[] =
          scan.method === "photo-set"
            ? new Directory(scan.fileUri).list().filter((f): f is File => f instanceof File)
            : [new File(scan.fileUri)];
        files.sort((a, b) => a.name.localeCompare(b.name));
        for (const [i, f] of files.entries()) {
          onProgress?.(`Uploading ${scan.elementId} scan, file ${i + 1} of ${files.length}`);
          const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
          await uploadFile(s, f, { elementId: scan.elementId, kind: "scan", scanId: scan.id, fileName: f.name }, contentTypes[ext] ?? "application/octet-stream");
        }
        names = files.map((f) => f.name);
        markScanFilesUploaded(scan.id, names);
      }
      onProgress?.(`Recording ${scan.elementId} scan`);
      await api(s, "/api/device/scans", {
        method: "POST",
        body: {
          id: scan.id,
          elementId: scan.elementId,
          method: scan.method,
          fileNames: names,
          photoCount: scan.photoCount,
          vertexCount: scan.vertexCount,
          faceCount: scan.faceCount,
          refTapeMm: scan.refTapeMm,
          refScanMm: scan.refScanMm,
          measurements: listMeasurements(scan.id).map((m) => ({ label: m.label, mm: m.mm })),
          notes: scan.notes,
          capturedAt: scan.capturedAt,
          device: scan.device,
        },
      });
      markScanSynced(scan.id);
      report.scans++;
    } catch (e) {
      report.errors.push(`${scan.elementId} scan: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  for (const d of unsyncedDefects()) {
    if (d.scanId && !isScanSynced(d.scanId)) {
      report.errors.push(`${d.elementId} ${d.type}: waiting for its scan to sync.`);
      continue;
    }
    try {
      if (d.photoUri && !d.photoUploaded) {
        onProgress?.(`Uploading ${d.elementId} defect photo`);
        await uploadFile(s, new File(d.photoUri), { elementId: d.elementId, kind: "defect", defectId: d.id }, "image/jpeg");
        markDefectPhotoUploaded(d.id);
      }
      onProgress?.(`Recording ${d.elementId} defect`);
      await api(s, "/api/device/defects", {
        method: "POST",
        body: {
          id: d.id,
          elementId: d.elementId,
          scanId: d.scanId,
          type: d.type,
          severity: d.severity,
          location: d.location,
          sizeMm: d.sizeMm,
          notes: d.notes,
          proposedRepair: d.proposedRepair,
          hasPhoto: d.photoUri != null,
          recordedAt: d.createdAt,
        },
      });
      markDefectSynced(d.id);
      report.defects++;
    } catch (e) {
      report.errors.push(`${d.elementId} ${d.type}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return report;
}
