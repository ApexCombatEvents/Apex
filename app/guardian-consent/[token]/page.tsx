// app/guardian-consent/[token]/page.tsx
// The page a parent or guardian lands on from the consent email.
//
// Not behind auth — the guardian is not a platform user and the token is the
// credential. The token never reaches the database in raw form; it is hashed
// here and matched against the stored hash.

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import GuardianConsentActions from "@/components/guardian/GuardianConsentActions";
import {
  hashConsentToken,
  YOUNG_PARTICIPANT_RESTRICTIONS,
} from "@/lib/guardian-consent";

// The token makes every request unique, so there is nothing worth caching.
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type ConsentState =
  | { kind: "invalid" }
  | { kind: "expired" }
  | { kind: "answered"; status: string }
  | { kind: "pending"; guardianName: string; applicantName: string };

async function loadConsentRequest(token: string): Promise<ConsentState> {
  if (!supabaseUrl || !serviceRoleKey) {
    return { kind: "invalid" };
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const { data: request, error } = await supabaseAdmin
    .from("guardian_consent_requests")
    .select("user_id, guardian_name, status, expires_at")
    .eq("token_hash", hashConsentToken(token))
    .maybeSingle();

  if (error || !request) {
    return { kind: "invalid" };
  }

  if (request.status !== "pending") {
    return { kind: "answered", status: request.status };
  }

  if (new Date(request.expires_at) < new Date()) {
    return { kind: "expired" };
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, username")
    .eq("id", request.user_id)
    .maybeSingle();

  return {
    kind: "pending",
    guardianName: request.guardian_name,
    applicantName: profile?.full_name || profile?.username || "A young athlete",
  };
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="border-b border-slate-200 pb-6 mb-8">
        <p className="text-xs text-purple-700 font-medium uppercase tracking-wider mb-2">
          Parent or guardian permission
        </p>
        <h1 className="text-2xl font-bold text-slate-900">Apex Combat Events</h1>
      </div>
      {children}
    </div>
  );
}

export default async function GuardianConsentPage({
  params,
}: {
  params: { token: string };
}) {
  const state = await loadConsentRequest(params.token);

  if (state.kind === "invalid") {
    return (
      <Shell>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-900">This link isn&apos;t valid</p>
          <p className="text-sm text-slate-700 mt-1 leading-relaxed">
            It may have already been used, or the address may have been copied incompletely.
            Ask the account holder to send a new permission request.
          </p>
        </div>
      </Shell>
    );
  }

  if (state.kind === "expired") {
    return (
      <Shell>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-900">This link has expired</p>
          <p className="text-sm text-slate-700 mt-1 leading-relaxed">
            Permission links are valid for a limited time. Ask the account holder to send a
            new one from their account, and it will arrive at this address.
          </p>
        </div>
      </Shell>
    );
  }

  if (state.kind === "answered") {
    const approved = state.status === "confirmed";
    return (
      <Shell>
        <div
          className={`rounded-xl border p-5 ${
            approved ? "border-green-200 bg-green-50" : "border-slate-200 bg-slate-50"
          }`}
        >
          <p className={`text-sm font-semibold ${approved ? "text-green-900" : "text-slate-900"}`}>
            {approved ? "Permission already given" : "This request has already been answered"}
          </p>
          <p className="text-sm text-slate-700 mt-1 leading-relaxed">
            {approved
              ? "You've already approved this account. If you'd like to withdraw your permission, please contact us."
              : "No further action is needed. The account remains restricted."}
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <p className="text-sm text-slate-700 leading-relaxed">
            Hello {state.guardianName}. <strong>{state.applicantName}</strong> has signed up to
            Apex Combat Events and listed you as their parent or guardian.
          </p>
          <p className="text-sm text-slate-700 leading-relaxed mt-3">
            Apex is a platform for combat sports athletes, gyms, coaches and promotions.
            Fighters use it to build a profile, follow events and get noticed by promoters.
            Because {state.applicantName} is under 18, their account is restricted and hidden
            from other users until you give permission.
          </p>
        </div>

        <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-5">
          <p className="text-sm font-semibold text-purple-900 mb-3">
            Extra protections that stay on their account
          </p>
          <ul className="space-y-2">
            {YOUNG_PARTICIPANT_RESTRICTIONS.map((restriction) => (
              <li key={restriction} className="flex items-start gap-2 text-sm text-slate-700">
                <span aria-hidden="true" className="text-purple-600 font-bold mt-px">
                  ✓
                </span>
                <span className="leading-relaxed">{restriction}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-600 mt-4 leading-relaxed">
            These apply automatically until they turn 18. You can withdraw your permission at any
            time, and you can ask us for a copy of their data or for the account to be deleted.
          </p>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">
          Before deciding, please{" "}
          <Link
            href="/waiver/signup"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 hover:text-purple-800 underline"
          >
            read the full Platform Participation Agreement
          </Link>
          . By giving permission you accept it on {state.applicantName}&apos;s behalf and on your
          own.
        </p>

        <GuardianConsentActions token={params.token} applicantName={state.applicantName} />
      </div>
    </Shell>
  );
}
