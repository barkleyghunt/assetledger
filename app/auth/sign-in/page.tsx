"use client";

import { useActionState } from "react";
import { signInWithEmail } from "@/app/actions/auth";

export default function SignInPage() {
  const [state, action, pending] = useActionState(signInWithEmail, null);
  return (
    <main style={{ maxWidth: 360, margin: "4rem auto", padding: "1rem", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Sign in</h1>
      <form action={action} style={{ display: "grid", gap: "0.75rem" }}>
        <label>Email<input name="email" type="email" required style={{ width: "100%", padding: "0.5rem" }} /></label>
        <label>Password<input name="password" type="password" required style={{ width: "100%", padding: "0.5rem" }} /></label>
        {state?.error && <p role="alert" style={{ color: "#b91c1c" }}>{state.error}</p>}
        <button type="submit" disabled={pending} style={{ padding: "0.6rem", fontWeight: 600 }}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p style={{ marginTop: "1rem" }}>New here? <a href="/auth/sign-up">Create an account</a> (invited emails only).</p>
    </main>
  );
}
