// app/signup/awaiting-consent/page.tsx
// Where an under-18 lands straight after signing up. They are not signed in
// at this point, so this page is purely informational — the resend control
// lives behind login, where we can identify whose request to reissue.

import Link from "next/link";

export const metadata = {
  title: "Waiting for permission | Apex Combat Events",
};

export default function AwaitingConsentPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-purple-600 mb-2">Almost there</h1>
          <p className="text-sm text-slate-700 leading-relaxed">
            Your account has been created, but it stays private until your parent or guardian
            gives permission.
          </p>
        </div>

        <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4">
          <p className="text-sm font-semibold text-purple-900 mb-2">What happens next</p>
          <ol className="space-y-2 text-sm text-slate-700 list-decimal list-inside">
            <li>We&apos;ve emailed the address you gave us.</li>
            <li>They read what the platform is and what protections apply to your account.</li>
            <li>Once they approve, sign in and your profile goes live.</li>
          </ol>
        </div>

        <div className="text-sm text-slate-600 leading-relaxed space-y-2">
          <p>
            Ask them to check their junk folder if it hasn&apos;t arrived. The link is valid for
            seven days.
          </p>
          <p>
            Entered the wrong address? Sign in and you can send it again to a different one.
          </p>
        </div>

        <div className="pt-2 border-t border-slate-200">
          <Link href="/login" className="btn btn-primary w-full inline-block text-center">
            Go to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
