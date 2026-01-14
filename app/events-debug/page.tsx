// app/events-debug/page.tsx
import { createSupabaseServer } from "@/lib/supabaseServer";

export default async function EventsDebugPage() {
  const supabase = createSupabaseServer();

  const { data, error } = await supabase
    .from("events")
    .select(
      "id, profile_id, owner_profile_id, name, title, event_date, location, location_city, location_country, banner_url"
    )
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-lg font-semibold mb-4">Events debug</h1>

      {error && (
        <p className="text-sm text-red-600 mb-4">
          Error: {error.message}
        </p>
      )}

      {!data || data.length === 0 ? (
        <p className="text-sm text-slate-600">No events returned from Supabase.</p>
      ) : (
        <pre className="text-[11px] bg-slate-950 text-slate-100 rounded-xl p-3 overflow-x-auto">
{JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
