// lib/supabase-browser.ts
import { createBrowserClient } from "@supabase/ssr";

export const createSupabaseBrowser = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};
