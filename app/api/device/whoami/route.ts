import { deviceUserRole, unauthorized } from "@/lib/auth/device";

// GET /api/device/whoami — lets the phone test its server URL and token.
export async function GET(request: Request) {
  try {
    const who = await deviceUserRole(request);
    if (!who) return unauthorized();
    return Response.json({ role: who.role, device: who.device });
  } catch {
    return Response.json({ error: "Server unavailable." }, { status: 503 });
  }
}
