"use client";

import { useId, useState, type InputHTMLAttributes } from "react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string };

export default function PasswordInput({ label, id, style, ...props }: PasswordInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={inputId}>{label}</label>
      <div style={{ display: "flex", alignItems: "stretch", gap: "0.5rem", marginTop: "0.4rem" }}>
        <input {...props} id={inputId} type={visible ? "text" : "password"} style={{ display: "block", width: "100%", minWidth: 0, padding: "0.75rem", border: "1px solid #64748b", borderRadius: 4, background: "white", color: "#172b3a", fontSize: 16, ...style }} />
        <button type="button" aria-controls={inputId} aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible((value) => !value)} style={{ minWidth: 64, minHeight: 44, padding: "0.5rem", border: "1px solid #64748b", borderRadius: 4, background: "white", color: "#172b3a", cursor: "pointer", fontSize: 16 }}>
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}
