import React from "react";
import { LoginPage } from "./LoginPage";

export default function App() {
  const handleLogin = ({ email }) => {
    console.log("Logging in:", email);
  };

  return <LoginPage onLogin={handleLogin} />;
}
