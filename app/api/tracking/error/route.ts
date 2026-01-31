import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: Request) {
  try {
    const errorData = await req.json();
    
    console.error("TRACKING ERROR:", errorData);

    if (supabaseUrl && serviceRoleKey) {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      
      // Save error to a dedicated table if it exists
      const { error } = await supabaseAdmin
        .from("error_logs")
        .insert({
          message: errorData.message,
          stack: errorData.stack,
          component_stack: errorData.info,
          url: errorData.url,
          user_agent: errorData.userAgent,
          severity: "error"
        });

      if (error) {
        // If table doesn't exist, we'll just log to console which we already did
        if (error.code !== "P0001") { // Ignore if table doesn't exist
           console.warn("Could not save error to database", error.message);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
