"use client";

import { useActionState } from "react";
import PasswordInput from "../password-input";
import { signInWithEmail } from "@/app/actions/auth";

export default function SignInPage() {
  const [state, action, pending] = useActionState(signInWithEmail, null);
  return (
    <main style={{ maxWidth: 360, margin: "4rem auto", padding: "1rem", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Sign in</h1>
      <form action={action} style={{ display: "grid", gap: "0.75rem" }}>
        <label>Email<input name="email" type="email" required style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: "0.4rem", padding: "0.75rem", minHeight: 44, border: "1px solid #64748b", borderRadius: 4, background: "white", color: "#172b3a", fontSize: 16 }} /></label>
        <PasswordInput label="Password" name="password" autoComplete="current-password" required />
        {state?.error && <p role="alert" style={{ color: "#b91c1c" }}>{state.error}</p>}
        <button type="submit" disabled={pending} style={{ padding: "0.75rem", minHeight: 44, border: "1px solid #245b9a", borderRadius: 4, background: "#245b9a", color: "white", fontSize: 16, fontWeight: 600, cursor: pending ? "wait" : "pointer", opacity: pending ? 0.7 : 1 }}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p><a href="/auth/forgot-password">Forgot password or need to set one?</a></p>
      <p style={{ marginTop: "1rem" }}>New here? <a href="/auth/sign-up">Create an account</a> (invited emails only).</p>
    </main>
  );
}
