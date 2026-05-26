"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "cookie_consent_accepted";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem(STORAGE_KEY);
    if (!accepted) {
      setVisible(true);
    }
  }, []);

  function handleAccept() {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-16 md:bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-700 px-4 py-4 shadow-lg"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
        <p className="text-sm text-gray-300 flex-1">
          We use cookies to keep you signed in and improve your experience. By
          continuing to use this site, you agree to our use of cookies. See our{" "}
          <Link
            href="/privacy"
            className="text-purple-400 hover:text-purple-300 underline underline-offset-2"
          >
            Privacy Policy
          </Link>{" "}
          for details.
        </p>
        <button
          onClick={handleAccept}
          className="shrink-0 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
