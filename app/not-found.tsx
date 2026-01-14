import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-purple-600">404</h1>
          <h2 className="text-2xl font-semibold text-slate-900">Page Not Found</h2>
          <p className="text-slate-600">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-3 rounded-xl bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/events"
            className="px-6 py-3 rounded-xl border border-purple-300 bg-white text-purple-700 font-medium hover:bg-purple-50 transition-colors"
          >
            Browse Events
          </Link>
        </div>
      </div>
    </div>
  );
}

