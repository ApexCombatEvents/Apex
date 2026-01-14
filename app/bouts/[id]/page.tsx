import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabaseServer";

/**
 * Legacy route kept for backwards compatibility.
 * Redirect old `/bouts/:id` links to the canonical event page anchor: `/events/:eventId#bout-:boutId`.
 */
export default async function BoutRedirectPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseServer();

  // Prefer the current table
  const { data: bout } = await supabase
    .from("event_bouts")
    .select("id, event_id")
    .eq("id", params.id)
    .maybeSingle();

  if (bout?.event_id) {
    redirect(`/events/${bout.event_id}#bout-${bout.id}`);
  }

  // If it's an unknown/legacy id, fall back to events list.
  redirect("/events");
}
