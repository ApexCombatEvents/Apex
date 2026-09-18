import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Which side of the conversation, if either, is an under-18 account.
 *
 * Reported per side rather than as a single flag so the refusal can name the
 * restricted party. Otherwise a minor viewing an adult's profile is told
 * "under-18s cannot be messaged", which reads as though the adult is the minor.
 *
 * Uses the is_minor() database function, which is SECURITY DEFINER, so this
 * answers the question without exposing anyone's date of birth to the caller.
 */
async function minorParticipants(
  supabase: SupabaseClient,
  myId: string,
  otherId: string
): Promise<{ iAmMinor: boolean; theyAreMinor: boolean; errored: boolean }> {
  const [mine, theirs] = await Promise.all([
    supabase.rpc("is_minor", { profile_id: myId }),
    supabase.rpc("is_minor", { profile_id: otherId }),
  ]);

  if (mine.error || theirs.error) {
    console.error("is_minor check failed", mine.error ?? theirs.error);
    return { iAmMinor: false, theyAreMinor: false, errored: true };
  }

  return {
    iAmMinor: mine.data === true,
    theyAreMinor: theirs.data === true,
    errored: false,
  };
}

/**
 * Checks if a user can message another user based on security rules:
 * 0. Neither party is under 18 (overrides everything below)
 * 1. Mutual following (both follow each other)
 * 2. Shared gym relationship
 * 3. Offer/Application relationship (event owner vs offer sender)
 */
export async function canMessage(
  supabase: SupabaseClient,
  myId: string,
  otherId: string
): Promise<{ allowed: boolean; reason?: string }> {
  if (myId === otherId) return { allowed: false, reason: "Cannot message yourself" };

  // Under-18 accounts have messaging switched off entirely. Evaluated before
  // any allow path below so that no relationship can override it, and failing
  // closed: if eligibility cannot be established, messaging is refused.
  const minorCheck = await minorParticipants(supabase, myId, otherId);

  if (minorCheck.errored) {
    return {
      allowed: false,
      reason: "Could not verify account eligibility. Please try again.",
    };
  }

  if (minorCheck.iAmMinor) {
    return {
      allowed: false,
      reason: "Messaging is switched off on your account while you're under 18.",
    };
  }

  if (minorCheck.theyAreMinor) {
    return {
      allowed: false,
      reason: "This account belongs to someone under 18, so messaging is switched off.",
    };
  }

  // 1. Check Mutual Follow
  // Rule: If otherId does not follow myId, I cannot message them (unless exceptions)
  const { data: followsMe } = await supabase
    .from("profile_follows")
    .select("*")
    .eq("follower_id", otherId)
    .eq("following_id", myId)
    .maybeSingle();

  // Rule: If I do not follow otherId, I cannot message them
  const { data: IFollow } = await supabase
    .from("profile_follows")
    .select("*")
    .eq("follower_id", myId)
    .eq("following_id", otherId)
    .maybeSingle();

  if (followsMe && IFollow) return { allowed: true };

  // 2. Check Shared Gym
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, social_links")
    .in("id", [myId, otherId]);

  if (profiles && profiles.length === 2) {
    const me = profiles.find(p => p.id === myId);
    const other = profiles.find(p => p.id === otherId);

    if (me && other) {
      const myGym = me.social_links?.gym_username;
      const otherGym = other.social_links?.gym_username;
      const myHandle = me.username;
      const otherHandle = other.username;

      // Handle @ prefix consistency
      const myGymClean = myGym?.replace(/^@/, '');
      const otherGymClean = otherGym?.replace(/^@/, '');
      const myHandleClean = myHandle?.replace(/^@/, '');
      const otherHandleClean = otherHandle?.replace(/^@/, '');

      // Check if one is the other's gym
      if (myGymClean && (myGymClean === otherHandleClean)) return { allowed: true };
      if (otherGymClean && (otherGymClean === myHandleClean)) return { allowed: true };
      
      // Check if both are in the same gym
      if (myGymClean && otherGymClean && myGymClean === otherGymClean) return { allowed: true };
    }
  }

  // 3. Check Offer/Application Relationship
  // Event owners can message anyone who sent an offer/application to their event
  // Anyone who sent an offer/application can message the event owner
  
  // 3a. Am I an event owner messaging an offer sender?
  const { data: myEvents } = await supabase
    .from("events")
    .select("id")
    .or(`owner_profile_id.eq.${myId},profile_id.eq.${myId}`);

  if (myEvents && myEvents.length > 0) {
    const eventIds = myEvents.map(e => e.id);
    
    // Check if otherId sent an offer to any of my event's bouts
    const { data: offerFromOther } = await supabase
      .from("event_bout_offers")
      .select("id")
      .eq("from_profile_id", otherId)
      .filter("bout_id", "in", `(select id from event_bouts where event_id in (${eventIds.map(id => `'${id}'`).join(',')}))`)
      .limit(1)
      .maybeSingle();

    if (offerFromOther) return { allowed: true };

    // Check if otherId sent an application
    const { data: appFromOther } = await supabase
      .from("event_applications")
      .select("id")
      .eq("fighter_profile_id", otherId)
      .filter("bout_id", "in", `(select id from event_bouts where event_id in (${eventIds.map(id => `'${id}'`).join(',')}))`)
      .limit(1)
      .maybeSingle();

    if (appFromOther) return { allowed: true };
  }

  // 3b. Is otherId an event owner I sent an offer/application to?
  const { data: otherEvents } = await supabase
    .from("events")
    .select("id")
    .or(`owner_profile_id.eq.${otherId},profile_id.eq.${otherId}`);

  if (otherEvents && otherEvents.length > 0) {
    const eventIds = otherEvents.map(e => e.id);

    const { data: myOfferToOther } = await supabase
      .from("event_bout_offers")
      .select("id")
      .eq("from_profile_id", myId)
      .filter("bout_id", "in", `(select id from event_bouts where event_id in (${eventIds.map(id => `'${id}'`).join(',')}))`)
      .limit(1)
      .maybeSingle();

    if (myOfferToOther) return { allowed: true };

    const { data: myAppToOther } = await supabase
      .from("event_applications")
      .select("id")
      .eq("fighter_profile_id", myId)
      .filter("bout_id", "in", `(select id from event_bouts where event_id in (${eventIds.map(id => `'${id}'`).join(',')}))`)
      .limit(1)
      .maybeSingle();

    if (myAppToOther) return { allowed: true };
  }

  // 4. Check Promotion Roster
  // Rule: Promotions can message fighters on their roster
  const { data: rosterLink } = await supabase
    .from("promotion_fighters")
    .select("id")
    .or(`and(promotion_profile_id.eq.${myId},fighter_profile_id.eq.${otherId}),and(promotion_profile_id.eq.${otherId},fighter_profile_id.eq.${myId})`)
    .limit(1)
    .maybeSingle();

  if (rosterLink) return { allowed: true };

  return { 
    allowed: false, 
    reason: "Message restricted: You must follow each other, share a gym, or have an active offer to message." 
  };
}
