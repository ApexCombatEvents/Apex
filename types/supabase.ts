export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
export interface Database {
  public: { Tables: {
    profiles: { Row: {
      id: string; handle: string; display_name: string | null; role: 'FIGHTER' | 'COACH' | 'GYM' | 'PROMOTION' | 'ADMIN';
      gym_id: string | null; bio: string | null; banner_url: string | null; avatar_url: string | null;
      location_city: string | null; location_country: string | null; disciplines: string[] | null; socials: Json | null; created_at: string | null
    }, Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id?: string; handle: string; role: Database['public']['Tables']['profiles']['Row']['role'] },
       Update: Partial<Database['public']['Tables']['profiles']['Row']> },
    fighters: { Row: {
      id: string; profile_id: string; rank: string | null; country: string | null; record: string | null; pro_record: string | null;
      level: string | null; height_cm: number | null; fight_weight_kg: number | null; martial_arts: string[] | null; status_looking: boolean | null
    }, Insert: Partial<Database['public']['Tables']['fighters']['Row']>, Update: Partial<Database['public']['Tables']['fighters']['Row']> },
    coaches: { Row: { id: string; profile_id: string; gym_id: string | null; specialties: string[] | null; bio: string | null },
      Insert: Partial<Database['public']['Tables']['coaches']['Row']>, Update: Partial<Database['public']['Tables']['coaches']['Row']> },
    gyms: { Row: {
      id: string; profile_id: string; name: string; opened_on: string | null; location_city: string | null; location_country: string | null;
      martial_arts: string[] | null; head_coaches: string[] | null; fighters_count: number | null; coaches_count: number | null; bio: string | null
    }, Insert: Partial<Database['public']['Tables']['gyms']['Row']>, Update: Partial<Database['public']['Tables']['gyms']['Row']> },
    promotions: { Row: { id: string; profile_id: string; name: string; license_id: string | null; bio: string | null },
      Insert: Partial<Database['public']['Tables']['promotions']['Row']>, Update: Partial<Database['public']['Tables']['promotions']['Row']> },
    events: { Row: {
      id: string; owner_profile_id: string; name: string; date_start: string | null; date_end: string | null; city: string | null;
      country: string | null; venue: string | null; status: 'draft' | 'published' | 'completed' | 'cancelled'; martial_arts: string[] | null
    }, Insert: Partial<Database['public']['Tables']['events']['Row']>, Update: Partial<Database['public']['Tables']['events']['Row']> },
    bouts: { Row: {
      id: string; event_id: string; discipline: string; weight_class_kg: number; level: 'amateur' | 'pro'; purse_base: number | null; win_bonus: number | null;
      blue_corner_profile_id: string | null; red_corner_profile_id: string | null; notes: string | null; status: 'open' | 'matched' | 'closed'
    }, Insert: Partial<Database['public']['Tables']['bouts']['Row']>, Update: Partial<Database['public']['Tables']['bouts']['Row']> },
    offers: { Row: { id: string; bout_id: string; from_profile_id: string; fighter_profile_id: string; terms: Json | null; status: 'draft'|'sent'|'countered'|'accepted'|'declined'|'expired'; created_at: string | null },
      Insert: Partial<Database['public']['Tables']['offers']['Row']>, Update: Partial<Database['public']['Tables']['offers']['Row']> },
    applications: { Row: { id: string; bout_id: string; fighter_profile_id: string; coach_or_gym_profile_id: string | null; message: string | null; status: 'pending'|'shortlisted'|'rejected'|'withdrawn'; created_at: string | null },
      Insert: Partial<Database['public']['Tables']['applications']['Row']>, Update: Partial<Database['public']['Tables']['applications']['Row']> },
    posts: { Row: { id: string; author_profile_id: string; body: string | null; media_urls: string[] | null; created_at: string | null },
      Insert: Partial<Database['public']['Tables']['posts']['Row']>, Update: Partial<Database['public']['Tables']['posts']['Row']> },
    comments: { Row: { id: string; post_id: string; author_profile_id: string; body: string; created_at: string | null },
      Insert: Partial<Database['public']['Tables']['comments']['Row']>, Update: Partial<Database['public']['Tables']['comments']['Row']> },
    likes: { Row: { id: string; post_id: string; profile_id: string; created_at: string | null },
      Insert: Partial<Database['public']['Tables']['likes']['Row']>, Update: Partial<Database['public']['Tables']['likes']['Row']> },
    follows: { Row: { follower_id: string; following_id: string; created_at: string | null },
      Insert: Partial<Database['public']['Tables']['follows']['Row']>, Update: Partial<Database['public']['Tables']['follows']['Row']> },
    media: { Row: { id: string; owner_profile_id: string; url: string; type: 'image'|'video'; caption: string | null; created_at: string | null },
      Insert: Partial<Database['public']['Tables']['media']['Row']>, Update: Partial<Database['public']['Tables']['media']['Row']> },
    rankings: { Row: {
      id: string; org: string; discipline: string; weight_class: string; rank: number; fighter_name: string; profile_id: string | null; as_of: string | null
    }, Insert: Partial<Database['public']['Tables']['rankings']['Row']>, Update: Partial<Database['public']['Tables']['rankings']['Row']> },
    streams: { Row: { id: string; event_id: string | null; title: string; embed_url: string | null; starts_at: string | null; is_live: boolean | null },
      Insert: Partial<Database['public']['Tables']['streams']['Row']>, Update: Partial<Database['public']['Tables']['streams']['Row']> }
  }}
}
