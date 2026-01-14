"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Error:", error);
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-red-600">500</h1>
          <h2 className="text-2xl font-semibold text-slate-900">Something went wrong</h2>
          <p className="text-slate-600">
            We encountered an unexpected error. Please try again or contact support if the problem persists.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 rounded-xl bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-6 py-3 rounded-xl border border-purple-300 bg-white text-purple-700 font-medium hover:bg-purple-50 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

