"use client";
import { useState } from "react";

type Role = "fighter" | "coach" | "gym" | "promotion" | "";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<Role>("");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    // Validation
    if (!role) {
      setMsg("Please select a profile type");
      return;
    }

    if (!firstName.trim() || !surname.trim()) {
      setMsg("First name and surname are required");
      return;
    }

    if (!username.trim()) {
      setMsg("Username is required");
      return;
    }

    if (!email.trim()) {
      setMsg("Email is required");
      return;
    }

    if (!password) {
      setMsg("Password is required");
      return;
    }

    if (password !== confirmPassword) {
      setMsg("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setMsg("Password must be at least 6 characters");
      return;
    }

    setMsg("Creating account...");

    // Combine firstName and surname to form full_name
    const fullName = `${firstName.trim()} ${surname.trim()}`.trim();

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name: fullName, username, role }),
    });

    const data = await res.json();
    if (res.ok) {
      window.location.href = "/login";
    } else {
      setMsg(data.error || "Signup failed");
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-2xl font-bold text-purple-600 mb-4">Create your account</h2>

      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="text-sm text-slate-600 mb-1 block">Profile type</span>
          <select
            className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
            value={role}
            onChange={e => setRole(e.target.value as Role)}
            required
          >
            <option value="">Select profile type...</option>
            <option value="fighter">Fighter</option>
            <option value="coach">Coach</option>
            <option value="gym">Gym</option>
            <option value="promotion">Promotion</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="First name"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            required
          />
          <input
            type="text"
            className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Surname"
            value={surname}
            onChange={e => setSurname(e.target.value)}
            required
          />
        </div>
        <input
          type="text"
          className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />
        <input
          type="email"
          className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
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
        <input
          type="password"
          className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          required
        />
        <button 
          type="submit"
          className="btn btn-primary w-full"
        >
          Create Account
        </button>
      </form>

      {msg && (
        <p className={`text-sm mt-3 ${msg.includes("Creating") ? "text-slate-600" : "text-red-600"}`}>
          {msg}
        </p>
      )}
    </div>
  );
}

