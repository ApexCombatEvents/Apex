import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Terms of Service</h1>
      
      <div className="prose prose-slate max-w-none space-y-6 text-slate-700">
        <p className="text-sm text-slate-500">Last updated: {new Date().toLocaleDateString()}</p>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing and using this platform, you accept and agree to be bound by the terms
            and provision of this agreement. If you do not agree to these terms, please do not use
            this service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">2. User Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials.
            You agree to notify us immediately of any unauthorized use of your account.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">3. User Conduct</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Post content that is illegal, harmful, or violates any laws</li>
            <li>Harass, abuse, or harm other users</li>
            <li>Impersonate any person or entity</li>
            <li>Upload malicious code or viruses</li>
            <li>Violate intellectual property rights</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Payments and Refunds</h2>
          <p>
            All payments for stream access and other services are processed through Stripe.
            Refund policies are determined on a case-by-case basis. Contact support for refund
            requests.
          </p>
          <p className="mt-3">
            <strong>Platform Fees:</strong> Apex Combat Events charges a 5% platform fee on stream revenue and bout offer fees (when offers are accepted). 
            Event organizers receive stream revenue minus the 5% platform fee and fighter allocations. Stripe processing fees 
            (approximately 2.9% + $0.30 per transaction) are deducted by Stripe directly from payments.
          </p>
          <p className="mt-2">
            <strong>Bout Offer Fees:</strong> When a bout offer is accepted, Apex charges a 5% platform fee on the offer fee amount. 
            If an offer is declined, the full offer fee is refunded (no platform fee charged).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Content Moderation</h2>
          <p>
            We reserve the right to remove any content that violates these terms or our community
            guidelines. Users may be suspended or banned for repeated violations.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Intellectual Property</h2>
          <p>
            All content on this platform, including text, graphics, logos, and software, is the
            property of the platform or its content suppliers and is protected by copyright laws.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Limitation of Liability</h2>
          <p>
            The platform is provided "as is" without warranties of any kind. We are not liable
            for any damages arising from your use of the platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">8. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Continued use of the platform
            after changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">9. Contact</h2>
          <p>
            If you have questions about these terms, please contact us at{" "}
            <a href="mailto:support@apexcombatevents.com" className="text-purple-600 hover:underline">
              support@apexcombatevents.com
            </a>
          </p>
        </section>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-200">
        <Link
          href="/"
          className="text-purple-600 hover:text-purple-700 font-medium"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}

