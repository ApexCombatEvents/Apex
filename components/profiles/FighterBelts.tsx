"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type FighterBelt = {
  id: string;
  belt_title: string | null;
  belt_image_url: string | null;
  weight_class: string | null;
  rank: string | null;
  promotions: {
    id: string | null;
    full_name: string | null;
    username: string | null;
  } | null;
};

type FighterBeltsProps = {
  fighterId: string;
};

export default function FighterBelts({ fighterId }: FighterBeltsProps) {
  const supabase = createSupabaseBrowser();
  const [belts, setBelts] = useState<FighterBelt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBelts();
  }, [fighterId]);

  async function loadBelts() {
    setLoading(true);
    try {
      // Load belts from promotions (automatic)
      const { data: promotionBelts, error: promotionError } = await supabase
        .from("promotion_fighters")
        .select(`
          id,
          belt_title,
          belt_image_url,
          weight_class,
          rank,
          promotions:promotion_profile_id (
            id,
            full_name,
            username
          )
        `)
        .eq("fighter_profile_id", fighterId)
        .eq("status", "active")
        .not("belt_title", "is", null);

      // Load belts from fighter_belts table (fighter-managed)
      const { data: fighterBelts, error: fighterError } = await supabase
        .from("fighter_belts")
        .select("*")
        .eq("fighter_profile_id", fighterId);

      if (promotionError) {
        console.error("Error loading promotion belts:", promotionError);
      }
      if (fighterError) {
        console.error("Error loading fighter belts:", fighterError);
      }

      // Combine both types of belts
      const allBelts: FighterBelt[] = [];

      // Add promotion belts (filter to only those with belt_title)
      if (promotionBelts) {
        const championBelts = promotionBelts
          .filter((belt: any) => belt.belt_title && belt.belt_title.trim() !== "")
          .map((belt: any) => ({
            id: belt.id,
            belt_title: belt.belt_title,
            belt_image_url: belt.belt_image_url,
            weight_class: belt.weight_class,
            rank: belt.rank,
            promotions: belt.promotions,
          }));
        allBelts.push(...championBelts);
      }

      // Add fighter-managed belts
      if (fighterBelts) {
        const fighterManagedBelts = fighterBelts.map((belt: any) => ({
          id: belt.id,
          belt_title: belt.belt_title,
          belt_image_url: belt.belt_image_url,
          weight_class: belt.weight_class,
          rank: null,
          promotions: belt.promotion_name ? {
            id: null,
            full_name: belt.promotion_name,
            username: null,
          } : null,
        }));
        allBelts.push(...fighterManagedBelts);
      }

      setBelts(allBelts);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return null; // Don't show loading state
  }

  if (belts.length === 0) {
    return null; // Don't show section if no belts
  }

  return (
    <section className="card">
      <div className="section-header mb-3">
        <h2 className="section-title text-base">Championship Belts</h2>
      </div>
      <div className="flex flex-wrap gap-2">
        {belts.map((belt) => (
          <div
            key={belt.id}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-purple-200 bg-gradient-to-r from-purple-50 to-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-yellow-600 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm text-slate-900 truncate">
                {belt.belt_title}
              </span>
              {belt.weight_class && (
                <span className="text-xs text-slate-600">{belt.weight_class}</span>
              )}
            </div>
            {belt.promotions && (
              <span className="text-xs text-purple-700 font-medium ml-1 flex-shrink-0">
                ({belt.promotions.full_name || belt.promotions.username || "Promotion"})
              </span>
            )}
            {!belt.promotions && belt.weight_class && (
              <span className="text-xs text-slate-600 ml-1 flex-shrink-0">
                ({belt.weight_class})
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
