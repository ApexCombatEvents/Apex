// components/MobileNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useTranslation } from "@/hooks/useTranslation";

type Role = "fighter" | "coach" | "gym" | "promotion" | null;

export default function MobileNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<Role>(null);
  const [userHandle, setUserHandle] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowser();

    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData.user;
      setUser(authUser);

      if (authUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, username")
          .eq("id", authUser.id)
          .single();

        setRole((profile?.role as Role) ?? null);
        setUserHandle(profile?.username ?? null);
      } else {
        setRole(null);
        setUserHandle(null);
      }
    }

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((_ev, session) => {
      const authUser = session?.user ?? null;
      setUser(authUser);
      if (authUser) load();
    });

    return () => sub?.subscription?.unsubscribe();
  }, []);

  // Don't show on certain pages (login, signup, etc.)
  const hideOnPaths = ["/login", "/signup"];
  if (hideOnPaths.some((path) => pathname?.startsWith(path))) {
    return null;
  }

  const isActive = (path: string) => pathname === path || (path !== "/" && pathname?.startsWith(path));

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {/* Home */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors ${
            isActive("/") ? "text-purple-600" : "text-slate-600"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          <span className="text-[10px] font-medium">{t('Navbar.home')}</span>
        </Link>

        {/* Events */}
        <Link
          href="/events"
          className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors ${
            isActive("/events") ? "text-purple-600" : "text-slate-600"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-[10px] font-medium">Events</span>
        </Link>

        {/* Search */}
        <Link
          href="/search"
          className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors ${
            isActive("/search") ? "text-purple-600" : "text-slate-600"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <span className="text-[10px] font-medium">{t('Navbar.search')}</span>
        </Link>

        {/* Profile */}
        <Link
          href={user ? (userHandle ? `/profile/${userHandle}` : "/profile/me") : "/login"}
          className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors ${
            pathname?.startsWith("/profile") ? "text-purple-600" : "text-slate-600"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span className="text-[10px] font-medium">{t('Navbar.profile')}</span>
        </Link>
      </div>
    </nav>
  );
}

