import { Directory, File, Paths } from "expo-file-system";

// All evidence files live under Documents/scans/ so the OS does not clear them.
// The native LiDAR module writes to the same folder.
export function scansDir(): Directory {
  const dir = new Directory(Paths.document, "scans");
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  return dir;
}

export function photoSetDir(scanId: string): Directory {
  const dir = new Directory(scansDir(), scanId);
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  return dir;
}

export function defectPhotosDir(): Directory {
  const dir = new Directory(Paths.document, "defect-photos");
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  return dir;
}

// Copies a camera photo (which lands in a temporary cache) into permanent storage.
export async function keepPhoto(sourceUri: string, dir: Directory, name: string): Promise<string> {
  const dest = new File(dir, name);
  await new File(sourceUri).copy(dest);
  return dest.uri;
}

export function removeDir(dir: Directory) {
  if (dir.exists) dir.delete();
}
