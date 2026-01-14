import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const test = async () => {
  const { data, error } = await supabase.auth.admin.listUsers();
  console.log("Data:", data ? "✅ got users" : "❌ no data");
  console.log("Error:", error);
};

test();
