import { AwsClient } from "aws4fetch";

// Server-only. Cloudflare R2 (S3-compatible) for scan and photo files.
// Files go straight from the phone to R2 with short-lived signed URLs, so large
// scans never pass through the web server.

function env(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set. Add the R2 settings to .env.local (see .env.example).`);
  return value;
}

function client() {
  return new AwsClient({
    accessKeyId: env("R2_ACCESS_KEY_ID"),
    secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    service: "s3",
    region: "auto",
  });
}

function objectUrl(key: string, expiresSec: number): URL {
  const url = new URL(`https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com/${env("R2_BUCKET")}/${key.split("/").map(encodeURIComponent).join("/")}`);
  url.searchParams.set("X-Amz-Expires", String(expiresSec));
  return url;
}

// Signed PUT the phone uses to upload one file. Valid for 1 hour.
export async function signedUploadUrl(key: string): Promise<string> {
  const signed = await client().sign(new Request(objectUrl(key, 3600), { method: "PUT" }), { aws: { signQuery: true } });
  return signed.url;
}

// Signed GET for viewing a file in the web app. Valid for 15 minutes.
export async function signedDownloadUrl(key: string): Promise<string> {
  const signed = await client().sign(new Request(objectUrl(key, 900), { method: "GET" }), { aws: { signQuery: true } });
  return signed.url;
}

// Object keys are built on the server only, from validated IDs.
const safe = /^[A-Za-z0-9_-]{1,80}$/;
export function scanFileKey(elementId: string, scanId: string, fileName: string): string | null {
  const element = elementId.replace(/[^A-Za-z0-9_-]/g, "_");
  if (!safe.test(scanId) || !/^[A-Za-z0-9_-]{1,80}\.(obj|usdz|jpg|jpeg)$/i.test(fileName)) return null;
  return `elements/${element}/scans/${scanId}/${fileName}`;
}

export function defectPhotoKey(elementId: string, defectId: string): string | null {
  const element = elementId.replace(/[^A-Za-z0-9_-]/g, "_");
  if (!safe.test(defectId)) return null;
  return `elements/${element}/defects/${defectId}.jpg`;
}
