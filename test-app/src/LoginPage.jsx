import React, { useState } from "react";
import { Button, Card, Input } from "@company/ui";
import { PasswordInput } from "./components/PasswordInput";

export function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    if (onLogin) {
      onLogin({ email, password });
    }
  };

  return (
    <Card title="Login">
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <Input label="Email" value={email} onChange={setEmail} />
        <PasswordInput
          label="Password"
          value={password}
          onChange={setPassword}
        />
        <Button variant="primary" onClick={handleLogin}>
          Log in
        </Button>
      </div>
    </Card>
  );
}

export default LoginPage;
