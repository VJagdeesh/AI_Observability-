import React from "react";

export function PasswordInput({ label, value, onChange }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <span>{label}</span>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="current-password"
      />
    </label>
  );
}
