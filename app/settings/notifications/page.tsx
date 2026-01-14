"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type Prefs = {
  profile_id: string;
  notify_follow: boolean;
  notify_post_like: boolean;
  notify_post_comment: boolean;
  notify_event_like: boolean;
  notify_event_comment: boolean;
  notify_event_follow: boolean;
  notify_event_bout_matched: boolean;
  notify_event_live: boolean;
  notify_bout_offer: boolean;
  notify_bout_assigned: boolean;
  notify_bout_result: boolean;
  notify_new_message: boolean;
  notify_payout_processed: boolean;
  notify_payout_rejected: boolean;
  notify_payout_failed: boolean;
  notify_product_updates: boolean;
};

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900">{label}</div>
        {description && (
          <div className="text-xs text-slate-600 mt-0.5">{description}</div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${
          checked
            ? "bg-purple-600 border-purple-600"
            : "bg-slate-200 border-slate-200"
        }`}
        aria-pressed={checked}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export default function NotificationsSettingsPage() {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      const user = data.user ?? null;
      if (!user) {
        if (!cancelled) {
          setUserId(null);
          setPrefs(null);
          setLoading(false);
        }
        return;
      }
      if (!cancelled) setUserId(user.id);

      const { data: existing, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("profile_id", user.id)
        .maybeSingle<Prefs>();

      if (error) {
        console.error("notification prefs load error", error);
        if (!cancelled) {
          setStatus("Preferences couldn't be loaded. Please try refreshing the page.");
        }
      }

      if (!cancelled) {
        if (existing) {
          // Fill in any missing fields with defaults
          const prefsWithDefaults: Prefs = {
            profile_id: user.id,
            notify_follow: existing.notify_follow ?? true,
            notify_post_like: existing.notify_post_like ?? true,
            notify_post_comment: existing.notify_post_comment ?? true,
            notify_event_like: existing.notify_event_like ?? true,
            notify_event_comment: existing.notify_event_comment ?? true,
            notify_event_follow: existing.notify_event_follow ?? true,
            notify_event_bout_matched: existing.notify_event_bout_matched ?? true,
            notify_event_live: existing.notify_event_live ?? true,
            notify_bout_offer: existing.notify_bout_offer ?? true,
            notify_bout_assigned: existing.notify_bout_assigned ?? true,
            notify_bout_result: existing.notify_bout_result ?? true,
            notify_new_message: existing.notify_new_message ?? true,
            notify_payout_processed: existing.notify_payout_processed ?? true,
            notify_payout_rejected: existing.notify_payout_rejected ?? true,
            notify_payout_failed: existing.notify_payout_failed ?? true,
            notify_product_updates: existing.notify_product_updates ?? false,
          };
          setPrefs(prefsWithDefaults);
        } else {
          // Create defaults
          const defaults: Prefs = {
            profile_id: user.id,
            notify_follow: true,
            notify_post_like: true,
            notify_post_comment: true,
            notify_event_like: true,
            notify_event_comment: true,
            notify_event_follow: true,
            notify_event_bout_matched: true,
            notify_event_live: true,
            notify_bout_offer: true,
            notify_bout_assigned: true,
            notify_bout_result: true,
            notify_new_message: true,
            notify_payout_processed: true,
            notify_payout_rejected: true,
            notify_payout_failed: true,
            notify_product_updates: false,
          };

          const { error: insertError } = await supabase
            .from("notification_preferences")
            .insert(defaults);

          if (insertError) {
            console.error("notification prefs insert error", insertError);
            setStatus("Failed to create preferences. Please try again.");
          } else {
            setPrefs(defaults);
          }
        }
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function save(next: Prefs) {
    setSaving(true);
    setStatus(null);
    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ ...next, updated_at: new Date().toISOString() });
    if (error) {
      console.error("notification prefs save error", error);
      setStatus("Couldn’t save changes. Please try again.");
    } else {
      setStatus("Saved.");
    }
    setSaving(false);
  }

  function setAndSave(patch: Partial<Prefs>) {
    if (!prefs) return;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    void save(next);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500">
            <Link href="/settings" className="hover:underline text-purple-700">
              Settings
            </Link>{" "}
            / Notifications
          </div>
          <h1 className="text-xl font-semibold mt-1">Notifications</h1>
          <p className="text-sm text-slate-600 mt-1">
            Choose what shows up in your in-app notifications.
          </p>
        </div>
        <Link 
          href="/settings" 
          className="px-4 py-2 rounded-xl border border-purple-600 bg-white text-purple-700 text-sm font-medium hover:bg-purple-50 transition-colors whitespace-nowrap"
        >
          Back to settings →
        </Link>
      </header>

      {status && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            status === "Saved."
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {status}
        </div>
      )}

      {loading ? (
        <div className="card">
          <p className="text-sm text-slate-600">Loading preferences…</p>
        </div>
      ) : !userId ? (
        <div className="card">
          <h2 className="text-sm font-semibold">You’re not signed in</h2>
          <p className="text-sm text-slate-600 mt-1">
            Sign in to manage notification preferences.
          </p>
          <div className="mt-3">
            <Link href="/login" className="btn btn-primary">
              Sign in
            </Link>
          </div>
        </div>
      ) : !prefs ? (
        <div className="card">
          <p className="text-sm text-slate-600">
            Preferences couldn’t be loaded.
          </p>
        </div>
      ) : (
        <>
          <section className="card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Social</h2>
              {saving && (
                <span className="text-[11px] text-slate-500">Saving…</span>
              )}
            </div>
            <div className="divide-y divide-slate-100 mt-1">
              <ToggleRow
                label="New followers"
                description="When someone follows your profile."
                checked={prefs.notify_follow}
                onChange={(v) => setAndSave({ notify_follow: v })}
              />
              <ToggleRow
                label="Post likes"
                description="When someone likes your post."
                checked={prefs.notify_post_like}
                onChange={(v) => setAndSave({ notify_post_like: v })}
              />
              <ToggleRow
                label="Post comments"
                description="When someone comments on your post."
                checked={prefs.notify_post_comment}
                onChange={(v) => setAndSave({ notify_post_comment: v })}
              />
            </div>
          </section>

          <section className="card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Events</h2>
              {saving && (
                <span className="text-[11px] text-slate-500">Saving…</span>
              )}
            </div>
            <div className="divide-y divide-slate-100 mt-1">
              <ToggleRow
                label="Event likes"
                description="When someone likes your event."
                checked={prefs.notify_event_like}
                onChange={(v) => setAndSave({ notify_event_like: v })}
              />
              <ToggleRow
                label="Event comments"
                description="When someone comments on your event."
                checked={prefs.notify_event_comment}
                onChange={(v) => setAndSave({ notify_event_comment: v })}
              />
              <ToggleRow
                label="Event follows"
                description="When someone follows your event (organizers)."
                checked={prefs.notify_event_follow}
                onChange={(v) => setAndSave({ notify_event_follow: v })}
              />
              <ToggleRow
                label="Event goes live"
                description="When an event you're following starts streaming."
                checked={prefs.notify_event_live}
                onChange={(v) => setAndSave({ notify_event_live: v })}
              />
            </div>
          </section>

          <section className="card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Bouts</h2>
              {saving && (
                <span className="text-[11px] text-slate-500">Saving…</span>
              )}
            </div>
            <div className="divide-y divide-slate-100 mt-1">
              <ToggleRow
                label="Bout offers"
                description="When you receive a bout offer for an event."
                checked={prefs.notify_bout_offer}
                onChange={(v) => setAndSave({ notify_bout_offer: v })}
              />
              <ToggleRow
                label="Bout assignments"
                description="When you're assigned to a bout."
                checked={prefs.notify_bout_assigned}
                onChange={(v) => setAndSave({ notify_bout_assigned: v })}
              />
              <ToggleRow
                label="Bout matched"
                description="When a bout is matched on a followed event."
                checked={prefs.notify_event_bout_matched}
                onChange={(v) => setAndSave({ notify_event_bout_matched: v })}
              />
              <ToggleRow
                label="Bout results"
                description="When bout results are posted for events you follow."
                checked={prefs.notify_bout_result}
                onChange={(v) => setAndSave({ notify_bout_result: v })}
              />
            </div>
          </section>

          <section className="card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Messages</h2>
              {saving && (
                <span className="text-[11px] text-slate-500">Saving…</span>
              )}
            </div>
            <div className="divide-y divide-slate-100 mt-1">
              <ToggleRow
                label="New messages"
                description="When someone sends you a message."
                checked={prefs.notify_new_message}
                onChange={(v) => setAndSave({ notify_new_message: v })}
              />
            </div>
          </section>

          <section className="card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Payouts</h2>
              {saving && (
                <span className="text-[11px] text-slate-500">Saving…</span>
              )}
            </div>
            <div className="divide-y divide-slate-100 mt-1">
              <ToggleRow
                label="Payout processed"
                description="When your payout request is approved and processed."
                checked={prefs.notify_payout_processed}
                onChange={(v) => setAndSave({ notify_payout_processed: v })}
              />
              <ToggleRow
                label="Payout rejected"
                description="When your payout request is rejected."
                checked={prefs.notify_payout_rejected}
                onChange={(v) => setAndSave({ notify_payout_rejected: v })}
              />
              <ToggleRow
                label="Payout failed"
                description="When a payout transfer fails (requires attention)."
                checked={prefs.notify_payout_failed}
                onChange={(v) => setAndSave({ notify_payout_failed: v })}
              />
            </div>
          </section>

          <section className="card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Product</h2>
              <span className="text-[10px] font-semibold rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-600">
                Optional
              </span>
            </div>
            <div className="divide-y divide-slate-100 mt-1">
              <ToggleRow
                label="Product updates"
                description="Tips, feature updates, and announcements."
                checked={prefs.notify_product_updates}
                onChange={(v) => setAndSave({ notify_product_updates: v })}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}


