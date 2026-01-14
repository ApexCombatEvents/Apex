"use client";
import { useState } from "react";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("Signing in...");

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });

    const data = await res.json();
    if (res.ok) {
      window.location.href = "/";
    } else {
      setMsg(data.error || "Login failed");
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-2xl font-bold text-purple-600 mb-4">Sign in</h2>
      
      <form onSubmit={submit} className="space-y-4">
        <input
          type="text"
          className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="Email or Username"
          value={identifier}
          onChange={e => setIdentifier(e.target.value)}
          required
        />
        <input
          type="password"
          className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button className="btn btn-primary w-full">Sign in</button>
      </form>

      <p className="text-sm mt-3 text-red-600">{msg}</p>
    </div>
  );
}

