import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-purple-100 bg-white mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-slate-600 notranslate" translate="no">
            © {new Date().getFullYear()} Apex Combat Events. All rights reserved.
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link
              href="/terms"
              className="text-slate-600 hover:text-purple-600 transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              className="text-slate-600 hover:text-purple-600 transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
        <div className="mt-4 text-center text-sm text-slate-500">
          Need help or found a problem? Email us at{" "}
          <a
            href="mailto:support@apexcombatevents.com"
            className="text-purple-600 hover:text-purple-700 underline"
          >
            support@apexcombatevents.com
          </a>
        </div>
      </div>
    </footer>
  );
}

