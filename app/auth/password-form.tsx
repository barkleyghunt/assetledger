"use client";

import { useActionState } from "react";
import { requestPassword, resetPassword } from "@/app/actions/password";

const field = { display: "block", width: "100%", padding: "0.75rem", marginTop: "0.4rem", border: "1px solid #64748b", borderRadius: 4, background: "white", color: "#172b3a", fontSize: 16 };

export default function PasswordForm({ mode, token = "" }: { mode: "request" | "reset"; token?: string }) {
  const [state, action, pending] = useActionState(mode === "request" ? requestPassword : resetPassword, null);
  return <>
    {!state?.success && <form action={action} style={{ display: "grid", gap: "1rem" }}>
      {mode === "request" ? <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} style={field} /></label> : <>
        <input type="hidden" name="token" value={token} />
        <label>New password<input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} style={field} /></label>
        <label>Confirm password<input name="confirm" type="password" autoComplete="new-password" required minLength={8} maxLength={128} style={field} /></label>
      </>}
      {state?.error && <p role="alert" style={{ color: "#b91c1c" }}>{state.error}</p>}
      <button disabled={pending} type="submit" style={{ ...field, background: "#245b9a", color: "white", fontWeight: 600, cursor: "pointer" }}>{pending ? "Please wait…" : mode === "request" ? "Send password link" : "Set password"}</button>
    </form>}
    {state?.message && <p role="status">{state.message}</p>}
    <p style={{ marginTop: "1rem" }}><a href="/auth/sign-in">Back to sign in</a></p>
    {mode === "reset" && !state?.success && <p><a href="/auth/forgot-password">Request a new password link</a></p>}
  </>;
}
