import { openDatabaseSync } from "expo-sqlite";
import { Platform } from "react-native";
import type { Defect, Element, FieldEvent, Measurement, Scan, ScanMethod } from "./types";

// Local, offline-first store. Everything stays on the phone until sync is built.
const db = openDatabaseSync("asset-ledger.db");

db.execSync(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS elements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  material TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS scans (
  id TEXT PRIMARY KEY,
  element_id TEXT NOT NULL REFERENCES elements(id),
  method TEXT NOT NULL CHECK (method IN ('lidar-surface', 'lidar-room', 'photo-set')),
  file_uri TEXT NOT NULL,
  photo_count INTEGER,
  vertex_count INTEGER,
  face_count INTEGER,
  ref_tape_mm REAL,
  ref_scan_mm REAL,
  notes TEXT NOT NULL DEFAULT '',
  captured_at TEXT NOT NULL,
  device TEXT NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0,
  files_uploaded INTEGER NOT NULL DEFAULT 0,
  uploaded_names TEXT
);
CREATE TABLE IF NOT EXISTS measurements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scan_id TEXT NOT NULL REFERENCES scans(id),
  label TEXT NOT NULL,
  mm REAL NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS defects (
  id TEXT PRIMARY KEY,
  element_id TEXT NOT NULL REFERENCES elements(id),
  scan_id TEXT REFERENCES scans(id),
  type TEXT NOT NULL,
  severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 5),
  location TEXT NOT NULL DEFAULT '',
  size_mm REAL,
  notes TEXT NOT NULL DEFAULT '',
  photo_uri TEXT,
  proposed_repair TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0,
  photo_uploaded INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  element_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('Evidence', 'Comment')),
  text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS scans_element_idx ON scans (element_id, captured_at);
CREATE INDEX IF NOT EXISTS defects_element_idx ON defects (element_id, created_at);
CREATE INDEX IF NOT EXISTS events_element_idx ON events (element_id, created_at);
`);

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const now = () => new Date().toISOString();
export const deviceLabel = `${Platform.OS} ${Platform.Version}`;

// ---- Events (append-only: no update or delete functions exist) ----

export function logEvent(elementId: string, text: string, kind: FieldEvent["kind"] = "Evidence") {
  db.runSync("INSERT INTO events (element_id, kind, text, created_at) VALUES (?, ?, ?, ?)", elementId, kind, text, now());
}

export function listEvents(elementId: string): FieldEvent[] {
  return db
    .getAllSync<{ id: number; element_id: string; kind: FieldEvent["kind"]; text: string; created_at: string; synced: number }>(
      "SELECT * FROM events WHERE element_id = ? ORDER BY created_at DESC, id DESC",
      elementId,
    )
    .map((r) => ({ id: r.id, elementId: r.element_id, kind: r.kind, text: r.text, createdAt: r.created_at, synced: r.synced === 1 }));
}

// ---- Elements ----

type ElementRow = { id: string; name: string; location: string; material: string; created_at: string };
const toElement = (r: ElementRow): Element => ({ id: r.id, name: r.name, location: r.location, material: r.material, createdAt: r.created_at });

export function listElements(): (Element & { scans: number; defects: number })[] {
  return db
    .getAllSync<ElementRow & { scans: number; defects: number }>(
      `SELECT e.*,
        (SELECT COUNT(*) FROM scans s WHERE s.element_id = e.id) AS scans,
        (SELECT COUNT(*) FROM defects d WHERE d.element_id = e.id) AS defects
       FROM elements e ORDER BY e.id`,
    )
    .map((r) => ({ ...toElement(r), scans: r.scans, defects: r.defects }));
}

export function getElement(id: string): Element | null {
  const r = db.getFirstSync<ElementRow>("SELECT * FROM elements WHERE id = ?", id);
  return r ? toElement(r) : null;
}

export function addElement(input: { id: string; name: string; location: string; material: string }): string | null {
  const id = input.id.trim().toUpperCase();
  if (!id || id.length > 40) return "Element ID is required (max 40 characters).";
  if (!input.name.trim()) return "Name is required.";
  if (getElement(id)) return `${id} already exists on this phone.`;
  db.runSync(
    "INSERT INTO elements (id, name, location, material, created_at) VALUES (?, ?, ?, ?, ?)",
    id,
    input.name.trim(),
    input.location.trim(),
    input.material.trim(),
    now(),
  );
  logEvent(id, "Element added on phone.", "Comment");
  return null;
}

// ---- Scans ----

type ScanRow = {
  id: string; element_id: string; method: ScanMethod; file_uri: string; photo_count: number | null;
  vertex_count: number | null; face_count: number | null; ref_tape_mm: number | null; ref_scan_mm: number | null;
  notes: string; captured_at: string; device: string; synced: number;
};
const toScan = (r: ScanRow): Scan => ({
  id: r.id, elementId: r.element_id, method: r.method, fileUri: r.file_uri, photoCount: r.photo_count,
  vertexCount: r.vertex_count, faceCount: r.face_count, refTapeMm: r.ref_tape_mm, refScanMm: r.ref_scan_mm,
  notes: r.notes, capturedAt: r.captured_at, device: r.device, synced: r.synced === 1,
});

export function listScans(elementId: string): Scan[] {
  return db.getAllSync<ScanRow>("SELECT * FROM scans WHERE element_id = ? ORDER BY captured_at DESC", elementId).map(toScan);
}

export function getScan(id: string): Scan | null {
  const r = db.getFirstSync<ScanRow>("SELECT * FROM scans WHERE id = ?", id);
  return r ? toScan(r) : null;
}

export function addScan(input: {
  id: string; elementId: string; method: ScanMethod; fileUri: string;
  photoCount?: number | null; vertexCount?: number | null; faceCount?: number | null;
}) {
  db.runSync(
    `INSERT INTO scans (id, element_id, method, file_uri, photo_count, vertex_count, face_count, captured_at, device)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.id, input.elementId, input.method, input.fileUri,
    input.photoCount ?? null, input.vertexCount ?? null, input.faceCount ?? null, now(), deviceLabel,
  );
  const detail = input.method === "photo-set" ? `${input.photoCount ?? 0} photos` : `${input.vertexCount ?? 0} points`;
  logEvent(input.elementId, `Scan captured (${input.method}, ${detail}). Scan ${input.id}.`);
}

// The scan file itself is never edited. Only the scale check can be recorded, and it is logged.
export function recordScaleCheck(scan: Scan, tapeMm: number, scanMm: number) {
  db.runSync("UPDATE scans SET ref_tape_mm = ?, ref_scan_mm = ?, synced = 0 WHERE id = ?", tapeMm, scanMm, scan.id);
  const diff = scaleDeviation(tapeMm, scanMm);
  logEvent(scan.elementId, `Scale check on scan ${scan.id}: tape ${tapeMm} mm, scan ${scanMm} mm (${diff}).`);
}

export function scaleDeviation(tapeMm: number, scanMm: number): string {
  const d = scanMm - tapeMm;
  const pct = tapeMm > 0 ? (d / tapeMm) * 100 : 0;
  return `${d >= 0 ? "+" : ""}${d.toFixed(0)} mm, ${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

// ---- Measurements ----

export function addMeasurements(scan: Scan, items: { label: string; mm: number }[]) {
  for (const m of items) {
    db.runSync("INSERT INTO measurements (scan_id, label, mm, created_at) VALUES (?, ?, ?, ?)", scan.id, m.label, m.mm, now());
  }
  if (items.length) {
    db.runSync("UPDATE scans SET synced = 0 WHERE id = ?", scan.id);
    const list = items.map((m) => `${m.label} ${Math.round(m.mm)} mm`).join(", ");
    logEvent(scan.elementId, `Measured on scan ${scan.id}: ${list}.`);
  }
}

export function listMeasurements(scanId: string): Measurement[] {
  return db
    .getAllSync<{ id: number; scan_id: string; label: string; mm: number; created_at: string }>(
      "SELECT * FROM measurements WHERE scan_id = ? ORDER BY id",
      scanId,
    )
    .map((r) => ({ id: r.id, scanId: r.scan_id, label: r.label, mm: r.mm, createdAt: r.created_at }));
}

// ---- Defects ----

type DefectRow = {
  id: string; element_id: string; scan_id: string | null; type: string; severity: number; location: string;
  size_mm: number | null; notes: string; photo_uri: string | null; proposed_repair: string; created_at: string; synced: number;
};
const toDefect = (r: DefectRow): Defect => ({
  id: r.id, elementId: r.element_id, scanId: r.scan_id, type: r.type, severity: r.severity, location: r.location,
  sizeMm: r.size_mm, notes: r.notes, photoUri: r.photo_uri, proposedRepair: r.proposed_repair, createdAt: r.created_at,
  synced: r.synced === 1,
});

export function listDefects(elementId: string): Defect[] {
  return db.getAllSync<DefectRow>("SELECT * FROM defects WHERE element_id = ? ORDER BY severity DESC, created_at DESC", elementId).map(toDefect);
}

export function addDefect(input: Omit<Defect, "id" | "createdAt" | "synced">): string {
  const id = newId("DEF");
  db.runSync(
    `INSERT INTO defects (id, element_id, scan_id, type, severity, location, size_mm, notes, photo_uri, proposed_repair, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, input.elementId, input.scanId, input.type, input.severity, input.location, input.sizeMm,
    input.notes, input.photoUri, input.proposedRepair, now(),
  );
  const size = input.sizeMm != null ? `, ${input.sizeMm} mm` : "";
  const repair = input.proposedRepair ? ` Proposed repair: ${input.proposedRepair}.` : "";
  logEvent(input.elementId, `Defect recorded: ${input.type}, severity ${input.severity}${size}, ${input.location || "location not given"}.${repair}`);
  return id;
}

// ---- Sync state ----

export function unsyncedScans(): (Scan & { filesUploaded: boolean; uploadedNames: string[] })[] {
  return db
    .getAllSync<ScanRow & { files_uploaded: number; uploaded_names: string | null }>("SELECT * FROM scans WHERE synced = 0 ORDER BY captured_at")
    .map((r) => ({ ...toScan(r), filesUploaded: r.files_uploaded === 1, uploadedNames: r.uploaded_names ? (JSON.parse(r.uploaded_names) as string[]) : [] }));
}

export function markScanFilesUploaded(id: string, names: string[]) {
  db.runSync("UPDATE scans SET files_uploaded = 1, uploaded_names = ? WHERE id = ?", JSON.stringify(names), id);
}

export function markScanSynced(id: string) {
  db.runSync("UPDATE scans SET synced = 1 WHERE id = ?", id);
}

export function isScanSynced(id: string): boolean {
  return db.getFirstSync<{ synced: number }>("SELECT synced FROM scans WHERE id = ?", id)?.synced === 1;
}

export function unsyncedDefects(): (Defect & { photoUploaded: boolean })[] {
  return db
    .getAllSync<DefectRow & { photo_uploaded: number }>("SELECT * FROM defects WHERE synced = 0 ORDER BY created_at")
    .map((r) => ({ ...toDefect(r), photoUploaded: r.photo_uploaded === 1 }));
}

export function markDefectPhotoUploaded(id: string) {
  db.runSync("UPDATE defects SET photo_uploaded = 1 WHERE id = ?", id);
}

export function markDefectSynced(id: string) {
  db.runSync("UPDATE defects SET synced = 1 WHERE id = ?", id);
}

export function pendingCount(): number {
  const r = db.getFirstSync<{ n: number }>("SELECT (SELECT COUNT(*) FROM scans WHERE synced = 0) + (SELECT COUNT(*) FROM defects WHERE synced = 0) AS n");
  return r?.n ?? 0;
}
