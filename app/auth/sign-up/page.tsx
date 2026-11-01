"use client";

import { useActionState } from "react";
import { signUpWithEmail } from "@/app/actions/auth";

export default function SignUpPage() {
  const [state, action, pending] = useActionState(signUpWithEmail, null);
  return (
    <main style={{ maxWidth: 360, margin: "4rem auto", padding: "1rem", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Create account</h1>
      <form action={action} style={{ display: "grid", gap: "0.75rem" }}>
        <label>Name<input name="name" required style={{ width: "100%", padding: "0.5rem" }} /></label>
        <label>Email<input name="email" type="email" required style={{ width: "100%", padding: "0.5rem" }} /></label>
        <label>Password<input name="password" type="password" minLength={8} required style={{ width: "100%", padding: "0.5rem" }} /></label>
        {state?.error && <p role="alert" style={{ color: "#b91c1c" }}>{state.error}</p>}
        <button type="submit" disabled={pending} style={{ padding: "0.6rem", fontWeight: 600 }}>
          {pending ? "Creating…" : "Create account"}
        </button>
      </form>
    </main>
  );
}
