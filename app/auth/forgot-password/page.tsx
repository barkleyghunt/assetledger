import PasswordForm from "../password-form";

export default function ForgotPasswordPage() {
  return <main style={{ maxWidth: 400, margin: "4rem auto", padding: "1rem" }}>
    <h1>Set or reset your password</h1>
    <p>Enter the email used for your Asset Ledger account.</p>
    <PasswordForm mode="request" />
  </main>;
}
