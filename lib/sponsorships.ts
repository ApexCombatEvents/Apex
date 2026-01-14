// lib/sponsorships.ts
// Utility functions for loading sponsorships from the database

import { createSupabaseBrowser } from "@/lib/supabase-browser";

export type Sponsorship = {
  id: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  link_url?: string | null;
  button_text?: string | null;
  background_color?: string | null;
  text_color?: string | null;
  display_order?: number | null;
  placement: string;
  variant: string;
};

export async function getSponsorshipsForPlacement(
  placement: string
): Promise<Sponsorship[]> {
  const supabase = createSupabaseBrowser();

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("sponsorships")
    .select("*")
    .eq("placement", placement)
    .eq("is_active", true)
    .or(`start_date.is.null,start_date.lte.${now}`)
    .or(`end_date.is.null,end_date.gte.${now}`)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Error loading sponsorships:", error);
    return [];
  }

  return (data as Sponsorship[]) || [];
}

