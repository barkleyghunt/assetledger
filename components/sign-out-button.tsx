"use client";

import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/actions/auth";

export function SignOutButton() {
  // Nobody is signed in on the sign-in and sign-up pages, so there is nothing to sign out of.
  if (usePathname().startsWith("/auth/")) return null;
  return (
    <form action={signOutAction} style={{ position: "fixed", top: 8, right: 8, zIndex: 50 }}>
      <button type="submit" style={{ padding: "0.35rem 0.7rem", fontSize: "0.85rem" }}>Sign out</button>
    </form>
  );
}
