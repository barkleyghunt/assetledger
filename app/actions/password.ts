"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";

export type PasswordState = { error?: string; message?: string; success?: boolean } | null;

export async function requestPassword(_previous: PasswordState, form: FormData): Promise<PasswordState> {
  const email = String(form.get("email") ?? "").trim();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  // Next.js checks the action Origin against Host. Never accept a redirect URL from the form.
  const origin = (await headers()).get("origin");
  if (!origin || !/^https?:\/\//.test(origin)) return { error: "Open this form in your browser and try again." };
  try {
    const { error } = await auth.requestPasswordReset({ email, redirectTo: new URL("/auth/reset-password", origin).href });
    if (error) return { error: "Could not request a password email. Please try again later." };
    return { success: true, message: "If this address has an account, a password link has been requested. Check your inbox and Spam folder." };
  } catch {
    return { error: "Could not reach the sign-in service. Please try again later." };
  }
}

export async function resetPassword(_previous: PasswordState, form: FormData): Promise<PasswordState> {
  const token = String(form.get("token") ?? "");
  const newPassword = String(form.get("password") ?? "");
  if (!token || token.length > 4096) return { error: "This link is invalid. Request a new password link." };
  if (newPassword.length < 8 || newPassword.length > 128) return { error: "Use a password between 8 and 128 characters." };
  if (newPassword !== String(form.get("confirm") ?? "")) return { error: "The passwords do not match." };
  try {
    const { error } = await auth.resetPassword({ token, newPassword });
    if (error) return { error: "Could not set the password. The link may have expired or already been used. Request a new link." };
    return { success: true, message: "Your password is set. You can now sign in." };
  } catch {
    return { error: "Could not reach the sign-in service. Please try again later." };
  }
}
