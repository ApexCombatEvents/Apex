"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import Link from "next/link";
import Image from "next/image";
import StreamPaymentForm from "./StreamPaymentForm";
import { countryToFlagUrl } from "@/lib/countries";

type Fighter = {
  id: string;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
};

type Bout = {
  id: string;
  card_type: "main" | "undercard";
  order_index: number;
  red_name?: string | null;
  blue_name?: string | null;
  weight?: string | null;
  red_fighter_id?: string | null;
  blue_fighter_id?: string | null;
  is_live?: boolean | null;
};

type FighterProfile = {
  id: string;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  country?: string | null;
  social_links?: {
    gym_username?: string;
    [key: string]: any;
  } | null;
};

type StreamContentProps = {
  eventId: string;
  eventTitle: string;
  streamPrice: number | null;
  fighterPercentage: number;
  isLive: boolean;
  fighters: Fighter[];
};

export default function StreamContent({
  eventId,
  eventTitle,
  streamPrice,
  fighterPercentage,
  isLive,
  fighters,
}: StreamContentProps) {
  const supabase = createSupabaseBrowser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [bouts, setBouts] = useState<Bout[]>([]);
  const [fightersById, setFightersById] = useState<Record<string, FighterProfile>>({});
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // Handle payment verification
      const paymentSuccess = searchParams.get("payment_success");
      const sessionId = searchParams.get("session_id");
      const paymentCancelled = searchParams.get("payment_cancelled");

      if (paymentSuccess === "true" && sessionId) {
        try {
          const response = await fetch("/api/stripe/verify-stream-payment", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ sessionId }),
          });

          const data = await response.json();

          if (response.ok && data.success) {
            setHasAccess(true);
            setPaymentMessage("✓ Payment successful! Enjoy the stream.");
          } else {
            setPaymentMessage("⚠ Payment verification failed. Please contact support.");
          }
        } catch (err) {
          console.error("Payment verification error:", err);
          setPaymentMessage("Payment verification failed. Please contact support.");
        }

        // Remove query params
        const url = new URL(window.location.href);
        url.searchParams.delete("payment_success");
        url.searchParams.delete("session_id");
        router.replace(url.pathname + url.search, { scroll: false });
      }

      if (paymentCancelled === "true") {
        setPaymentMessage("Payment was cancelled.");
        const url = new URL(window.location.href);
        url.searchParams.delete("payment_cancelled");
        router.replace(url.pathname + url.search, { scroll: false });
      }

      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      
      // If stream is free, user has access
      if (!streamPrice || streamPrice === 0) {
        setHasAccess(true);
      } else if (!paymentSuccess) {
        if (!userData.user) {
          setHasAccess(false);
          setLoading(false);
          return;
        }

        // Check if user is the event creator/owner (they get free access)
        const { data: eventData } = await supabase
          .from("events")
          .select("owner_profile_id, profile_id")
          .eq("id", eventId)
          .maybeSingle();

        const ownerId = eventData?.owner_profile_id || eventData?.profile_id;
        if (ownerId === userData.user.id) {
          // Event creator gets free access
          setHasAccess(true);
        } else {
          // Check if user has paid
          const { data: payment } = await supabase
            .from("stream_payments")
            .select("id")
            .eq("event_id", eventId)
            .eq("user_id", userData.user.id)
            .maybeSingle();

          setHasAccess(!!payment);
        }
      }

      // Load bouts
      const { data: boutsData } = await supabase
        .from("event_bouts")
        .select("*")
        .eq("event_id", eventId)
        .order("card_type", { ascending: false })
        .order("order_index", { ascending: true });

      if (boutsData) {
        setBouts(boutsData as Bout[]);

        // Load fighter profiles
        const fighterIds = Array.from(
          new Set(
            (boutsData as Bout[])
              .flatMap((b) => [b.red_fighter_id, b.blue_fighter_id])
              .filter((id): id is string => !!id)
          )
        );

        if (fighterIds.length > 0) {
          const { data: fightersData } = await supabase
            .from("profiles")
            .select("id, full_name, username, avatar_url, country, social_links")
            .in("id", fighterIds);

          if (fightersData) {
            const fightersMap: Record<string, FighterProfile> = {};
            (fightersData as FighterProfile[]).forEach((f) => {
              fightersMap[f.id] = f;
            });
            setFightersById(fightersMap);
          }
        }
      }

      setLoading(false);
    })();
  }, [eventId, streamPrice, supabase, searchParams, router]);

  const handlePaymentComplete = () => {
    setHasAccess(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Show payment form if payment is required and user hasn't paid
  if (!hasAccess && streamPrice && streamPrice > 0) {
    return (
      <div className="min-h-screen bg-slate-900 py-12">
        <StreamPaymentForm
          eventId={eventId}
          streamPrice={streamPrice}
          fighterPercentage={fighterPercentage}
          fighters={fighters}
          onPaymentComplete={handlePaymentComplete}
        />
      </div>
    );
  }

  // Show stream content
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Payment success message */}
      {paymentMessage && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="rounded-xl bg-green-50 border border-green-200 p-4">
            <p className="text-sm font-medium text-green-800">{paymentMessage}</p>
          </div>
        </div>
      )}
      {/* Video Player Area */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-[1fr,400px] gap-6">
          {/* Main Content Area */}
          <div className="space-y-6">
            {/* Video Container - Bigger */}
            <div className="relative bg-slate-950 rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
              {/* Placeholder for video player */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-600/20 border-2 border-red-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-10 w-10 text-red-500"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-white mb-1">
                      Stream will appear here
                    </p>
                    <p className="text-sm text-slate-400">
                      {isLive ? "Stream is live" : "Stream has not started yet"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Live Badge */}
              {isLive && (
                <div className="absolute top-4 left-4">
                  <span className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                    </span>
                    LIVE
                  </span>
                </div>
              )}
            </div>

            {/* Support Fighters as Links */}
            {isLive && fighters.length > 0 && (
              <div className="bg-slate-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3 text-slate-300">Support Fighters</h3>
                <div className="flex flex-wrap gap-2">
                  {fighters.map((fighter) => (
                    <Link
                      key={fighter.id}
                      href={`/profile/${fighter.username || fighter.id}`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm text-slate-200 hover:text-white transition-colors"
                    >
                      {fighter.avatar_url && (
                        <Image
                          src={fighter.avatar_url}
                          alt={fighter.full_name || fighter.username || "Fighter"}
                          width={20}
                          height={20}
                          className="rounded-full"
                        />
                      )}
                      <span>{fighter.full_name || fighter.username || "Unknown Fighter"}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Fight Card - Below Stream */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
              <h2 className="text-xl font-semibold text-white mb-4">Fight Card</h2>
              
              {(() => {
                const currentLiveBout = bouts.find((b) => b.is_live);
                const sortBoutsForDisplay = (boutList: Bout[]) => {
                  return [...boutList].sort((a, b) => {
                    if (a.is_live && !b.is_live) return -1;
                    if (!a.is_live && b.is_live) return 1;
                    return a.order_index - b.order_index;
                  });
                };
                const undercardBoutsSeq = [...bouts.filter((b) => b.card_type === "undercard")]
                  .sort((a, b) => a.order_index - b.order_index);
                const mainBoutsSeq = [...bouts.filter((b) => b.card_type === "main")]
                  .sort((a, b) => a.order_index - b.order_index);
                const fightSequenceBouts = [...undercardBoutsSeq, ...mainBoutsSeq];
                
                const getNextBout = () => {
                  if (!currentLiveBout) return null;
                  const currentIndex = fightSequenceBouts.findIndex((b) => b.id === currentLiveBout.id);
                  if (currentIndex >= 0 && currentIndex < fightSequenceBouts.length - 1) {
                    return fightSequenceBouts[currentIndex + 1];
                  }
                  return null;
                };
                const nextBout = getNextBout();
                
                return (
                  <div className="space-y-4">
                    {/* Current Live Fight */}
                    {currentLiveBout && (() => {
                      const redFighter = currentLiveBout.red_fighter_id ? fightersById[currentLiveBout.red_fighter_id] : undefined;
                      const blueFighter = currentLiveBout.blue_fighter_id ? fightersById[currentLiveBout.blue_fighter_id] : undefined;
                      const redName = redFighter ? (redFighter.full_name || redFighter.username || "Fighter") : (currentLiveBout.red_name || "TBC");
                      const blueName = blueFighter ? (blueFighter.full_name || blueFighter.username || "Fighter") : (currentLiveBout.blue_name || "TBC");
                      const redFlagUrl = countryToFlagUrl(redFighter?.country);
                      const blueFlagUrl = countryToFlagUrl(blueFighter?.country);
                      const redGymHandle = redFighter?.social_links?.gym_username || "";
                      const blueGymHandle = blueFighter?.social_links?.gym_username || "";
                      
                      return (
                        <div className="rounded-lg border-2 border-red-500 bg-red-900/30 p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-2 w-2 rounded-full bg-red-600 animate-pulse"></div>
                            <span className="text-xs font-semibold text-red-400 uppercase">Currently Live</span>
                          </div>
                          <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-center">
                            {/* Red Corner */}
                            {(redFighter || currentLiveBout.red_name) ? (
                              <div className="flex items-center gap-3">
                                <div className="flex flex-col items-start">
                                  <span className="font-semibold text-[13px] leading-tight text-white">
                                    {redName}
                                  </span>
                                  {redGymHandle && (
                                    <Link href={`/profile/${redGymHandle}`} className="text-[11px] text-slate-400 hover:text-slate-300 hover:underline">
                                      @{redGymHandle}
                                    </Link>
                                  )}
                                </div>
                                <div className="flex flex-col items-center gap-0.5">
                                  <div className="flex items-center gap-1.5">
                                    {redFlagUrl && (
                                      <Image src={redFlagUrl} alt={redFighter?.country || ""} width={20} height={16} className="w-5 h-4 object-cover rounded" style={{ imageRendering: "crisp-edges" }} />
                                    )}
                                    <div className="h-10 w-10 rounded-xl bg-slate-200 overflow-hidden">
                                      {redFighter?.avatar_url && (
                                        <Image src={redFighter.avatar_url} alt={redName} width={40} height={40} className="h-full w-full object-cover" />
                                      )}
                                    </div>
                                  </div>
                                  {redFighter?.country && (
                                    <span className="text-[10px] text-slate-400">{redFighter.country}</span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-slate-500">TBC</div>
                            )}
                            
                            {/* Middle */}
                            <div className="text-center text-xs text-slate-400 font-semibold">VS</div>
                            
                            {/* Blue Corner */}
                            {(blueFighter || currentLiveBout.blue_name) ? (
                              <div className="flex items-center gap-3">
                                <div className="flex flex-col items-center gap-0.5">
                                  <div className="flex items-center gap-1.5">
                                    {blueFlagUrl && (
                                      <Image src={blueFlagUrl} alt={blueFighter?.country || ""} width={20} height={16} className="w-5 h-4 object-cover rounded" style={{ imageRendering: "crisp-edges" }} />
                                    )}
                                    <div className="h-10 w-10 rounded-xl bg-slate-200 overflow-hidden">
                                      {blueFighter?.avatar_url && (
                                        <Image src={blueFighter.avatar_url} alt={blueName} width={40} height={40} className="h-full w-full object-cover" />
                                      )}
                                    </div>
                                  </div>
                                  {blueFighter?.country && (
                                    <span className="text-[10px] text-slate-400">{blueFighter.country}</span>
                                  )}
                                </div>
                                <div className="flex flex-col items-start">
                                  <span className="font-semibold text-[13px] leading-tight text-white">
                                    {blueName}
                                  </span>
                                  {blueGymHandle && (
                                    <Link href={`/profile/${blueGymHandle}`} className="text-[11px] text-slate-400 hover:text-slate-300 hover:underline">
                                      @{blueGymHandle}
                                    </Link>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-slate-500">TBC</div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* Next Fight */}
                    {nextBout && !nextBout.is_live && (() => {
                      const redFighter = nextBout.red_fighter_id ? fightersById[nextBout.red_fighter_id] : undefined;
                      const blueFighter = nextBout.blue_fighter_id ? fightersById[nextBout.blue_fighter_id] : undefined;
                      const redName = redFighter ? (redFighter.full_name || redFighter.username || "Fighter") : (nextBout.red_name || "TBC");
                      const blueName = blueFighter ? (blueFighter.full_name || blueFighter.username || "Fighter") : (nextBout.blue_name || "TBC");
                      const redFlagUrl = countryToFlagUrl(redFighter?.country);
                      const blueFlagUrl = countryToFlagUrl(blueFighter?.country);
                      const redGymHandle = redFighter?.social_links?.gym_username || "";
                      const blueGymHandle = blueFighter?.social_links?.gym_username || "";
                      
                      return (
                        <div className="rounded-lg border-2 border-blue-500 bg-blue-900/20 p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-2 w-2 rounded-full bg-blue-500"></div>
                            <span className="text-xs font-semibold text-blue-400 uppercase">Next Fight</span>
                          </div>
                          <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-center">
                            {/* Red Corner */}
                            {(redFighter || nextBout.red_name) ? (
                              <div className="flex items-center gap-2">
                                <div className="flex flex-col items-end flex-1">
                                  <span className="font-semibold text-[13px] leading-tight text-white">
                                    {redName}
                                  </span>
                                  {redGymHandle && (
                                    <Link href={`/profile/${redGymHandle}`} className="text-[11px] text-slate-400 hover:text-slate-300 hover:underline">
                                      @{redGymHandle}
                                    </Link>
                                  )}
                                </div>
                                <div className="flex flex-col items-center gap-0.5">
                                  <div className="flex items-center gap-1.5">
                                    {redFlagUrl && (
                                      <Image src={redFlagUrl} alt={redFighter?.country || ""} width={20} height={15} className="rounded" />
                                    )}
                                    {redFighter?.avatar_url && (
                                      <Image src={redFighter.avatar_url} alt={redName} width={32} height={32} className="rounded-full" />
                                    )}
                                  </div>
                                  {redFighter?.country && (
                                    <span className="text-[10px] text-slate-400">{redFighter.country}</span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-slate-500">TBC</div>
                            )}
                            
                            {/* Middle */}
                            <div className="text-center text-xs text-slate-400 font-semibold">VS</div>
                            
                            {/* Blue Corner */}
                            {(blueFighter || nextBout.blue_name) ? (
                              <div className="flex items-center gap-2">
                                <div className="flex flex-col items-center gap-0.5">
                                  <div className="flex items-center gap-1.5">
                                    {blueFlagUrl && (
                                      <Image src={blueFlagUrl} alt={blueFighter?.country || ""} width={20} height={15} className="rounded" />
                                    )}
                                    {blueFighter?.avatar_url && (
                                      <Image src={blueFighter.avatar_url} alt={blueName} width={32} height={32} className="rounded-full" />
                                    )}
                                  </div>
                                  {blueFighter?.country && (
                                    <span className="text-[10px] text-slate-400">{blueFighter.country}</span>
                                  )}
                                </div>
                                <div className="flex flex-col items-start flex-1">
                                  <span className="font-semibold text-[13px] leading-tight text-white">
                                    {blueName}
                                  </span>
                                  {blueGymHandle && (
                                    <Link href={`/profile/${blueGymHandle}`} className="text-[11px] text-slate-400 hover:text-slate-300 hover:underline">
                                      @{blueGymHandle}
                                    </Link>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-slate-500">TBC</div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* View Full Fight Card Link */}
                    <Link
                      href={`/events/${eventId}?from=stream`}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-purple-700"
                    >
                      View Full Fight Card
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    </Link>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Right Sidebar - Live Chat */}
          <div className="space-y-6">
            {/* Live Chat Placeholder */}
            <div className="bg-slate-800 rounded-xl p-6 h-[calc(100vh-8rem)] flex flex-col sticky top-20">
              <h2 className="text-xl font-semibold text-slate-50 mb-4">Live Chat</h2>
              <div className="flex-1 bg-slate-700 rounded-lg flex items-center justify-center text-slate-400 text-sm overflow-y-auto">
                Chat messages will appear here
              </div>
              <input
                type="text"
                placeholder="Say something..."
                className="w-full mt-4 p-2 rounded-lg bg-slate-700 border border-slate-600 text-slate-100 placeholder-slate-400 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

