// Helper functions for creating notifications
// These can be called from API routes or server actions

import { SupabaseClient } from "@supabase/supabase-js";

export async function createGymMembershipNotification(
  supabase: SupabaseClient,
  fighterProfileId: string,
  gymProfileId: string,
  gymName: string
) {
  try {
    await supabase.from("notifications").insert({
      profile_id: fighterProfileId,
      type: "gym_added",
      actor_profile_id: gymProfileId,
      data: {
        gym_id: gymProfileId,
        gym_name: gymName,
      },
    });
  } catch (error) {
    console.error("Gym membership notification error", error);
    // Don't throw - the membership was successfully created
  }
}

