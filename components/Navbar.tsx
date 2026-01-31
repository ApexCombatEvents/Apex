"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import NotificationsBell from "@/components/NotificationsBell";
import ApexLogo from "@/components/logos/ApexLogo";
import { useTranslation, SUPPORTED_LANGUAGES, type Language } from "@/hooks/useTranslation";

type Role = "fighter" | "coach" | "gym" | "promotion" | "admin" | null;

export default function Navbar() {
  const { t, lang, setLang } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<Role>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const handleLanguageChange = async (newLang: Language) => {
    setLang(newLang);
    setLangMenuOpen(false);

    // If user is logged in, save preference to profile
    if (user) {
      const supabase = createSupabaseBrowser();
      await supabase
        .from("profiles")
        .update({ preferred_language: newLang })
        .eq("id", user.id);
    }
  };

  useEffect(() => {
    const supabase = createSupabaseBrowser();

    async function load() {
      // auth user
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData.user;
      setUser(authUser);

      // role
      if (authUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", authUser.id)
          .single();

        // Convert role to lowercase since database stores in uppercase (GYM, COACH, etc.)
        const roleLower = profile?.role?.toLowerCase() || null;
        setRole((roleLower === "fighter" || roleLower === "coach" || roleLower === "gym" || roleLower === "promotion" || roleLower === "admin") 
          ? roleLower as Role 
          : null);
      } else {
        setRole(null);
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

  return (
    <nav className="w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
        {/* Left side */}
        <div className="flex items-center gap-8">
          {/* Mobile burger */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="md:hidden inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
            aria-label="Open menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <Link href="/" className="flex items-center group notranslate" translate="no">
            <ApexLogo />
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <Link 
              href="/search" 
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-purple-700 hover:bg-purple-50/50 transition-colors"
            >
              {t('Navbar.search')}
            </Link>
            {/* Stream temporarily hidden until streaming feature is ready
            <Link 
              href="/stream" 
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-purple-700 hover:bg-purple-50/50 transition-colors"
            >
              Stream
            </Link>
            */}
            {/* Rankings temporarily hidden until legal/data import is sorted
            <Link 
              href="/rank" 
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-purple-700 hover:bg-purple-50/50 transition-colors"
            >
              Rankings
            </Link>
            */}

            {user && (
              <Link 
                href="/messages" 
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-purple-700 hover:bg-purple-50/50 transition-colors"
              >
                {t('Navbar.messages')}
              </Link>
            )}

            {(role === "gym" || role === "promotion") && (
              <Link 
                href="/events" 
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-purple-700 hover:bg-purple-50/50 transition-colors"
              >
                {t('Navbar.events')}
              </Link>
            )}


            {user && (
              <Link 
                href="/profile/me" 
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-purple-700 hover:bg-purple-50/50 transition-colors"
              >
                {t('Navbar.profile')}
              </Link>
            )}

            {user && role === "admin" && (
              <div className="relative">
                <button
                  onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-purple-700 hover:bg-purple-50/50 transition-colors flex items-center gap-1"
                >
                  {t('Navbar.admin')}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-4 w-4 transition-transform ${adminMenuOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {adminMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setAdminMenuOpen(false)}
                    />
                    <div className="absolute left-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white shadow-lg z-50 py-1">
                      <Link
                        href="/admin"
                        onClick={() => setAdminMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/admin/payouts"
                        onClick={() => setAdminMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                      >
                        Payouts
                      </Link>
                      <Link
                        href="/admin/sponsorships"
                        onClick={() => setAdminMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                      >
                        Sponsorships
                      </Link>
                      <Link
                        href="/admin/moderation"
                        onClick={() => setAdminMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                      >
                        Moderation
                      </Link>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Mobile: notifications in top bar */}
          {user && (
            <div className="md:hidden">
              <NotificationsBell />
            </div>
          )}

          {/* Desktop: keep current header actions */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                {/* Notifications bell – dropdown sits above everything because Navbar has z-50 */}
                <NotificationsBell />

                <Link
                  href="/settings"
                  className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-purple-700 hover:bg-purple-50/50 transition-colors"
                >
                  Settings
                </Link>

                <button
                  onClick={async () => {
                    const supabase = createSupabaseBrowser();
                    await supabase.auth.signOut();
                    window.location.href = "/";
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold shadow-[0_2px_4px_rgb(139_92_246_/_0.3)] hover:shadow-[0_4px_6px_rgb(139_92_246_/_0.4)] hover:-translate-y-0.5 transition-all duration-200"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-slate-700 hover:text-purple-700"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold shadow-[0_2px_4px_rgb(139_92_246_/_0.3)] hover:shadow-[0_4px_6px_rgb(139_92_246_/_0.4)] hover:-translate-y-0.5 transition-all duration-200"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[70]">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />

          <div className="absolute top-0 left-0 right-0 bg-white border-b border-slate-200 shadow-xl">
            <div className="max-w-6xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">
                  Menu
                </span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-slate-700 hover:bg-slate-50"
                  aria-label="Close menu"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="mt-4 grid gap-2 text-sm">
                {/* Events - only visible to gyms and promotions */}
                {(role === "gym" || role === "promotion") && (
                  <Link
                    href="/events"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 hover:bg-slate-50"
                  >
                    {t('Navbar.events')}
                  </Link>
                )}
                <Link
                  href="/settings"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 hover:bg-slate-50"
                >
                  Settings
                </Link>

                {role === "admin" && (
                  <>
                    <div className="pt-2 border-t border-slate-200 mt-2" />
                    <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Admin
                    </div>
                    <Link
                      href="/admin"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 hover:bg-slate-50"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/admin/payouts"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 hover:bg-slate-50"
                    >
                      Payouts
                    </Link>
                    <Link
                      href="/admin/sponsorships"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 hover:bg-slate-50"
                    >
                      Sponsorships
                    </Link>
                    <Link
                      href="/admin/moderation"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 hover:bg-slate-50"
                    >
                      Moderation
                    </Link>
                  </>
                )}

                <div className="pt-2 border-t border-slate-200 mt-2" />

                {user ? (
                  <button
                    type="button"
                    onClick={async () => {
                      const supabase = createSupabaseBrowser();
                      await supabase.auth.signOut();
                      setMobileOpen(false);
                      window.location.href = "/";
                    }}
                    className="rounded-xl bg-purple-600 px-4 py-3 text-white font-medium text-left"
                  >
                    Sign out
                  </button>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 hover:bg-slate-50"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-xl bg-purple-600 px-4 py-3 text-white font-medium"
                    >
                      Sign up
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}



