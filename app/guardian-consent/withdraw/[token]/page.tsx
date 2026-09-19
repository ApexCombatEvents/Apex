// app/guardian-consent/withdraw/[token]/page.tsx
// The standing withdrawal page from the confirmation email.
//
// The token never reaches the database in raw form. It does not expire: a
// guardian's right to withdraw does not lapse.

import { createClient } from "@supabase/supabase-js";
import GuardianWithdrawActions from "@/components/guardian/GuardianWithdrawActions";
import { hashConsentToken } from "@/lib/guardian-consent";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type WithdrawState =
  | { kind: "invalid" }
  | { kind: "withdrawn"; applicantName: string }
  | { kind: "confirmed"; applicantName: string };

async function loadWithdrawal(token: string): Promise<WithdrawState> {
  if (!supabaseUrl || !serviceRoleKey) {
    return { kind: "invalid" };
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const { data: request, error } = await supabaseAdmin
    .from("guardian_consent_requests")
    .select("user_id, status")
    .eq("withdrawal_token_hash", hashConsentToken(token))
    .maybeSingle();

  if (error || !request) {
    return { kind: "invalid" };
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, username")
    .eq("id", request.user_id)
    .maybeSingle();

  const applicantName = profile?.full_name || profile?.username || "A young athlete";

  if (request.status === "withdrawn") {
    return { kind: "withdrawn", applicantName };
  }

  if (request.status !== "confirmed") {
    return { kind: "invalid" };
  }

  return { kind: "confirmed", applicantName };
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="border-b border-slate-200 pb-6 mb-8">
        <p className="text-xs text-purple-700 font-medium uppercase tracking-wider mb-2">
          Parent or guardian permission
        </p>
        <h1 className="text-2xl font-bold text-slate-900">Withdraw permission</h1>
      </div>
      {children}
    </div>
  );
}

export default async function GuardianWithdrawPage({
  params,
}: {
  params: { token: string };
}) {
  const state = await loadWithdrawal(params.token);

  if (state.kind === "invalid") {
    return (
      <Shell>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-900">This link isn&apos;t valid</p>
          <p className="text-sm text-slate-700 mt-1 leading-relaxed">
            It may have been copied incompletely, or a newer permission request may
            have replaced it. Email{" "}
            <a
              href="mailto:support@apexcombatevents.com"
              className="text-purple-600 hover:text-purple-800 underline"
            >
              support@apexcombatevents.com
            </a>{" "}
            if you still want the account restricted.
          </p>
        </div>
      </Shell>
    );
  }

  if (state.kind === "withdrawn") {
    return (
      <Shell>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-900">Permission already withdrawn</p>
          <p className="text-sm text-slate-700 mt-1 leading-relaxed">
            {state.applicantName}&apos;s account is already restricted and their profile
            is hidden. No further action is needed.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-6">
        <p className="text-sm text-slate-700 leading-relaxed">
          You previously gave permission for <strong>{state.applicantName}</strong> to
          use Apex Combat Events. Withdrawing takes effect immediately: their profile
          is hidden again and messaging stays switched off.
        </p>
        <p className="text-sm text-slate-700 leading-relaxed">
          They can send you a new request later if they still want an account. If you
          want the account deleted entirely, email{" "}
          <a
            href="mailto:support@apexcombatevents.com"
            className="text-purple-600 hover:text-purple-800 underline"
          >
            support@apexcombatevents.com
          </a>
          .
        </p>
        <GuardianWithdrawActions token={params.token} applicantName={state.applicantName} />
      </div>
    </Shell>
  );
}
