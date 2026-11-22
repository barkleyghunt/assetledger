import { Suspense } from "react";
import PasswordForm from "../password-form";

async function ResetContent({ searchParams }: { searchParams: Promise<{ token?: string | string[]; error?: string | string[] }> }) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  if (!token || params.error) return <><p role="alert">This password link is invalid or has expired.</p><a href="/auth/forgot-password">Request a new password link</a></>;
  return <PasswordForm mode="reset" token={token} />;
}

export default function ResetPasswordPage(props: { searchParams: Promise<{ token?: string | string[]; error?: string | string[] }> }) {
  return <main style={{ maxWidth: 400, margin: "4rem auto", padding: "1rem" }}>
    <h1>Set your password</h1>
    <Suspense fallback={<p>Loading password form…</p>}><ResetContent {...props} /></Suspense>
  </main>;
}
