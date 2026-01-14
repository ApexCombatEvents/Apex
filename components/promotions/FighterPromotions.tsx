"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type FighterPromotion = {
  id: string;
  promotion_profile_id: string;
  rank: string | null;
  weight_class: string | null;
  belt_title: string | null;
  promotions: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

type FighterPromotionsProps = {
  fighterId: string;
};

export default function FighterPromotions({ fighterId }: FighterPromotionsProps) {
  const supabase = createSupabaseBrowser();
  const [promotions, setPromotions] = useState<FighterPromotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPromotions();
  }, [fighterId]);

  async function loadPromotions() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("promotion_fighters")
        .select(`
          id,
          promotion_profile_id,
          rank,
          weight_class,
          belt_title,
          promotions:promotion_profile_id (
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq("fighter_profile_id", fighterId)
        .eq("status", "active");

      if (error) {
        console.error("Error loading promotions:", error);
      } else {
        setPromotions((data as FighterPromotion[]) || []);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return null; // Don't show loading state, just return nothing
  }

  if (promotions.length === 0) {
    return null; // Don't show section if no promotions
  }

  return (
    <section className="card">
      <div className="section-header mb-4">
        <h2 className="section-title text-lg">Promotions</h2>
      </div>
      <div className="space-y-3">
        {promotions.map((fp) => {
          const promotion = fp.promotions;
          if (!promotion) return null;

          const promotionName = promotion.full_name || promotion.username || "Promotion";
          const promotionHandle = promotion.username;

          return (
            <Link
              key={fp.id}
              href={promotionHandle ? `/profile/${promotionHandle}` : "#"}
              className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:border-purple-300 transition-colors"
            >
              {promotion.avatar_url ? (
                <Image
                  src={promotion.avatar_url}
                  alt={promotionName}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                  <span className="text-slate-600 font-semibold text-xs">
                    {promotionName[0]?.toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 truncate">{promotionName}</div>
                {fp.belt_title ? (
                  <div className="text-xs text-amber-700 font-medium truncate">
                    {fp.belt_title}
                  </div>
                ) : fp.rank ? (
                  <div className="text-xs text-slate-600">Rank: #{fp.rank}</div>
                ) : null}
                {fp.weight_class && (
                  <div className="text-xs text-slate-500">{fp.weight_class}</div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}


