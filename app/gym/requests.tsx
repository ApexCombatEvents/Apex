// components/GymRequests.tsx
"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export default function GymRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createSupabaseBrowser();
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return;
      // fetch requests where gym owner is me
      const { data } = await supabase.rpc("get_gym_membership_requests_for_owner", {});
      // if you haven't created this rpc, we can do ad-hoc query:
      // const { data } = await supabase.from('gym_membership_requests').select('*, profiles!inner(*)'). // etc
      setRequests(data || []);
      setLoading(false);
    })();
  }, []);

  async function process(id: string, action: "ACCEPT"|"REJECT") {
    const supabase = createSupabaseBrowser();
    const { data, error } = await supabase.rpc("gym_process_request", { p_request_id: id, p_action: action });
    if (error) return alert(error.message);
    setRequests(r => r.filter((x:any) => x.id !== id));
    alert("Done");
  }

  if (loading) return <div>Loading…</div>;
  if (!requests.length) return <div>No pending requests</div>;

  return (
    <div className="space-y-3">
      {requests.map(r => (
        <div key={r.id} className="bg-white p-3 rounded shadow flex items-center justify-between">
          <div>
            <div className="font-semibold">{r.fighter_profile_id}</div>
            <div className="text-sm text-gray-500">Requested at {r.created_at}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => process(r.id, "ACCEPT")} className="px-3 py-1 rounded bg-green-600 text-white">Accept</button>
            <button onClick={() => process(r.id, "REJECT")} className="px-3 py-1 rounded bg-red-500 text-white">Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}
