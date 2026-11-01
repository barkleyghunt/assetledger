"use server";

import { auth } from "@/lib/auth/server";
import { redirect } from "next/navigation";

// Only emails listed in ALLOWED_SIGNUP_EMAILS (comma-separated) may create an account.
function isAllowedEmail(email: string) {
  const allowed = (process.env.ALLOWED_SIGNUP_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

export async function signUpWithEmail(_prev: { error: string } | null, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!name || !email || !password) return { error: "Name, email and password are required." };
  if (!isAllowedEmail(email)) return { error: "This email is not invited to Asset Ledger." };
  const { error } = await auth.signUp.email({ email, name, password });
  if (error) return { error: error.message || "Could not create the account." };
  redirect("/");
}

export async function signInWithEmail(_prev: { error: string } | null, formData: FormData) {
  const { error } = await auth.signIn.email({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: error.message || "Sign-in failed. Check your email and password." };
  redirect("/");
}

export async function signOutAction() {
  await auth.signOut();
  redirect("/auth/sign-in");
}
