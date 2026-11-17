// Field records kept on the phone. They are evidence only: approvals and hold releases
// happen in the Asset Ledger web app under the Consultant role, never on the phone.

export type ScanMethod = "lidar-surface" | "lidar-room" | "photo-set";

export type Element = {
  id: string; // Same element ID as the web catalogue, e.g. GY-192 (max 40 characters)
  name: string;
  location: string;
  material: string;
  createdAt: string;
};

export type Scan = {
  id: string;
  elementId: string;
  method: ScanMethod;
  fileUri: string; // Model file (LiDAR) or folder of photos (photo set)
  photoCount: number | null;
  vertexCount: number | null;
  faceCount: number | null;
  refTapeMm: number | null; // Tape-measured reference distance
  refScanMm: number | null; // Same distance measured on the scan
  notes: string;
  capturedAt: string;
  device: string;
  synced: boolean;
};

export type Measurement = { id: number; scanId: string; label: string; mm: number; createdAt: string };

export type Defect = {
  id: string;
  elementId: string;
  scanId: string | null;
  type: string;
  severity: number; // 1 (minor) to 5 (urgent)
  location: string;
  sizeMm: number | null;
  notes: string;
  photoUri: string | null;
  proposedRepair: string;
  createdAt: string;
  synced: boolean;
};

// Matches the web app's audit_events kinds. Append-only.
export type FieldEvent = { id: number; elementId: string; kind: "Evidence" | "Comment"; text: string; createdAt: string; synced: boolean };

export const defectTypes = [
  "Crack",
  "Spalling",
  "Open joint",
  "Displacement",
  "Erosion / loss",
  "Staining",
  "Biological growth",
  "Corroded fixing",
  "Failed previous repair",
  "Other",
];

export const severityLabels: Record<number, string> = {
  1: "1 · Minor",
  2: "2 · Monitor",
  3: "3 · Repair",
  4: "4 · Repair soon",
  5: "5 · Urgent",
};

export const methodLabels: Record<ScanMethod, string> = {
  "lidar-surface": "LiDAR surface scan",
  "lidar-room": "LiDAR room layout",
  "photo-set": "Photo set",
};
