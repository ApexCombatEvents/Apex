"use client";
import { useMemo, useState } from "react";
import WaiverCheckbox from "@/components/ui/WaiverCheckbox";
import {
  GUARDIAN_RELATIONSHIPS,
  GUARDIAN_RELATIONSHIP_LABELS,
  MINIMUM_SIGNUP_AGE,
  MINOR_AGE_THRESHOLD,
  validateDateOfBirth,
  validateGuardianDetails,
  type GuardianRelationship,
} from "@/lib/input-validation";

type Role = "fighter" | "coach" | "gym" | "promotion" | "";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [username, setUsername] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState<GuardianRelationship | "">("");
  const [role, setRole] = useState<Role>("");
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [msg, setMsg] = useState("");

  // Latest date that still satisfies the minimum age, so the picker itself
  // rules out under-age dates before the form is submitted.
  const maxDateOfBirth = useMemo(() => {
    const cutoff = new Date();
    cutoff.setUTCFullYear(cutoff.getUTCFullYear() - MINIMUM_SIGNUP_AGE);
    return cutoff.toISOString().slice(0, 10);
  }, []);

  // Reuses the shared validator so the age shown here can never disagree with
  // the age the server calculates.
  const applicantAge = useMemo(() => {
    const check = validateDateOfBirth(dateOfBirth);
    return check.valid ? check.age ?? null : null;
  }, [dateOfBirth]);

  const requiresGuardian = applicantAge !== null && applicantAge < MINOR_AGE_THRESHOLD;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    if (!role) {
      setMsg("Please select a profile type");
      return;
    }

    if (!firstName.trim() || !surname.trim()) {
      setMsg("First name and surname are required");
      return;
    }

    const dobValidation = validateDateOfBirth(dateOfBirth);
    if (!dobValidation.valid) {
      setMsg(dobValidation.error ?? "Please enter a valid date of birth");
      return;
    }

    const guardianValidation = requiresGuardian
      ? validateGuardianDetails(guardianName, guardianEmail, guardianRelationship, email)
      : null;

    if (guardianValidation && !guardianValidation.valid) {
      setMsg(guardianValidation.error ?? "Please complete your parent or guardian's details");
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

    if (!waiverAccepted) {
      setMsg("You must read and accept the Platform Participation Agreement to continue.");
      return;
    }

    setMsg("Creating account...");

    const fullName = `${firstName.trim()} ${surname.trim()}`.trim();

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
        username,
        role,
        date_of_birth: dobValidation.value,
        guardian_name: guardianValidation?.value?.name,
        guardian_email: guardianValidation?.value?.email,
        guardian_relationship: guardianValidation?.value?.relationship,
        waiver_accepted: true,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      window.location.href = data.requiresGuardianConsent
        ? "/signup/awaiting-consent"
        : "/login";
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
        <label className="block">
          <span className="text-sm text-slate-600 mb-1 block">Date of birth</span>
          <input
            type="date"
            className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            value={dateOfBirth}
            onChange={e => setDateOfBirth(e.target.value)}
            max={maxDateOfBirth}
            aria-describedby="dob-help"
            required
          />
          <span id="dob-help" className="text-xs text-slate-500 mt-1 block">
            Used to apply the right safety settings to your account. Never shown on your profile.
          </span>
        </label>

        {requiresGuardian && (
          <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-purple-900">
                Parent or guardian permission
              </p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                You&apos;re under 18, so we need a parent or guardian to approve your account.
                We&apos;ll email them to confirm. Your profile stays private until they do.
              </p>
            </div>

            <label className="block">
              <span className="sr-only">Parent or guardian full name</span>
              <input
                type="text"
                className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Parent or guardian full name"
                value={guardianName}
                onChange={e => setGuardianName(e.target.value)}
                required
              />
            </label>

            <label className="block">
              <span className="sr-only">Parent or guardian email</span>
              <input
                type="email"
                className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Parent or guardian email"
                value={guardianEmail}
                onChange={e => setGuardianEmail(e.target.value)}
                required
              />
            </label>

            <label className="block">
              <span className="text-xs text-slate-600 mb-1 block">
                Their relationship to you
              </span>
              <select
                className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                value={guardianRelationship}
                onChange={e => setGuardianRelationship(e.target.value as GuardianRelationship)}
                required
              >
                <option value="">Select...</option>
                {GUARDIAN_RELATIONSHIPS.map(relationship => (
                  <option key={relationship} value={relationship}>
                    {GUARDIAN_RELATIONSHIP_LABELS[relationship]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
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

        {/* Waiver acknowledgement — must be checked before account can be created */}
        <WaiverCheckbox
          type="signup"
          checked={waiverAccepted}
          onChange={setWaiverAccepted}
          minor={requiresGuardian}
        />

        <button
          type="submit"
          disabled={!waiverAccepted}
          className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
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
