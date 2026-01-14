"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-6xl font-bold text-red-600">500</h1>
              <h2 className="text-2xl font-semibold text-slate-900">Critical Error</h2>
              <p className="text-slate-600">
                A critical error occurred. Please refresh the page or contact support.
              </p>
            </div>
            
            <button
              onClick={reset}
              className="px-6 py-3 rounded-xl bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

