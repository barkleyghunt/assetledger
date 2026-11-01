"use client";

import { signOutAction } from "@/app/actions/auth";

export function SignOutButton() {
  return (
    <form action={signOutAction} style={{ position: "fixed", top: 8, right: 8, zIndex: 50 }}>
      <button type="submit" style={{ padding: "0.35rem 0.7rem", fontSize: "0.85rem" }}>Sign out</button>
    </form>
  );
}
