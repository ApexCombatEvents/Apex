import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Privacy Policy</h1>
      
      <div className="prose prose-slate max-w-none space-y-6 text-slate-700">
        <p className="text-sm text-slate-500">Last updated: {new Date().toLocaleDateString()}</p>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Information We Collect</h2>
          <p>We collect information that you provide directly to us, including:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Account information (name, email, username)</li>
            <li>Profile information (bio, photos, social links)</li>
            <li>Payment information (processed securely through Stripe)</li>
            <li>Content you post (posts, comments, events)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Provide and maintain our services</li>
            <li>Process payments and transactions</li>
            <li>Send you notifications and updates</li>
            <li>Improve our platform and user experience</li>
            <li>Ensure platform security and prevent fraud</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Data Storage</h2>
          <p>
            Your data is stored securely using Supabase, which provides enterprise-grade security
            and compliance. We implement appropriate technical and organizational measures to protect
            your personal information.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Third-Party Services</h2>
          <p>
            We use third-party services that may collect information:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Stripe:</strong> Payment processing (see Stripe&apos;s privacy policy)</li>
            <li><strong>Supabase:</strong> Database and authentication (see Supabase&apos;s privacy policy)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Export your data</li>
            <li>Opt out of certain communications</li>
          </ul>
          <p className="mt-2">
            To exercise these rights, contact us at{" "}
            <a href="mailto:support@apexcombatevents.com" className="text-purple-600 hover:underline">
              support@apexcombatevents.com
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Cookies and Tracking</h2>
          <p>
            We use cookies and similar technologies to maintain your session and improve your
            experience. You can control cookies through your browser settings.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Data Retention</h2>
          <p>
            We retain your personal information for as long as your account is active or as needed
            to provide services. You may request deletion of your account and data at any time.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">8. Children&apos;s Privacy</h2>
          <p>
            Our service is not intended for users under the age of 18. We do not knowingly collect
            personal information from children.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">9. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify you of any changes
            by posting the new policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">10. Contact Us</h2>
          <p>
            If you have questions about this privacy policy, please contact us at{" "}
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

