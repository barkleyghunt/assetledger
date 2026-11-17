import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";

const protect = auth.middleware({
  loginUrl: "/auth/sign-in",
  publicRoutes: ["/auth/sign-in", "/auth/sign-up"],
});

// Sign-up is only allowed through our invite-checked server action, never by calling the auth API directly.
export default function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (request.method === "POST" && path.startsWith("/api/auth/sign-up")) {
    return NextResponse.json({ error: "Sign-up is by invitation only." }, { status: 403 });
  }
  // Phone app routes use a per-device bearer token checked inside each route, not the web session.
  if (path.startsWith("/api/device/")) return NextResponse.next();
  return protect(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
