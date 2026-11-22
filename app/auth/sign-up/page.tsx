"use client";

import { useActionState } from "react";
import PasswordInput from "../password-input";
import { signUpWithEmail } from "@/app/actions/auth";

export default function SignUpPage() {
  const [state, action, pending] = useActionState(signUpWithEmail, null);
  return (
    <main style={{ maxWidth: 360, margin: "4rem auto", padding: "1rem", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Create account</h1>
      <form action={action} style={{ display: "grid", gap: "0.75rem" }}>
        <label>Name<input name="name" required style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: "0.4rem", padding: "0.75rem", minHeight: 44, border: "1px solid #64748b", borderRadius: 4, background: "white", color: "#172b3a", fontSize: 16 }} /></label>
        <label>Email<input name="email" type="email" required style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: "0.4rem", padding: "0.75rem", minHeight: 44, border: "1px solid #64748b", borderRadius: 4, background: "white", color: "#172b3a", fontSize: 16 }} /></label>
        <PasswordInput label="Password" name="password" autoComplete="new-password" minLength={8} required />
        {state?.error && <p role="alert" style={{ color: "#b91c1c" }}>{state.error}</p>}
        <button type="submit" disabled={pending} style={{ padding: "0.75rem", minHeight: 44, border: "1px solid #245b9a", borderRadius: 4, background: "#245b9a", color: "white", fontSize: 16, fontWeight: 600, cursor: pending ? "wait" : "pointer", opacity: pending ? 0.7 : 1 }}>
          {pending ? "Creating…" : "Create account"}
        </button>
      </form>
    </main>
  );
}
