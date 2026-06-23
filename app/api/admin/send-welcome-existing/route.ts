// app/api/admin/send-welcome-existing/route.ts
// Admin-only backfill: send the welcome email to existing (non-admin) users.
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { sendWelcomeEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
// Allow time for sequential, rate-limited sends.
export const maxDuration = 300;

const DELAY_MS = 600; // ~1.6 emails/sec — stays under Resend's rate limit.
const MAX_SEND = 1000; // Safety cap per run.

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Recipient = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
};

export async function POST(req: Request) {
  try {
    // 1. Authenticate and authorise (admin only)
    const supabase = createSupabaseServer();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: me } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!me || me.role?.toLowerCase() !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // 2. Parse options
    let dryRun = true;
    let testEmail: string | undefined;
    try {
      const body = await req.json();
      dryRun = body?.dryRun !== false; // default true unless explicitly false
      testEmail =
        typeof body?.testEmail === "string" && body.testEmail.trim()
          ? body.testEmail.trim()
          : undefined;
    } catch {
      // No body → safe default (dry run)
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 3. Test mode: send a single sample to the given address and stop.
    if (testEmail) {
      // Use the requesting admin's name/role for a realistic sample.
      const { data: meProfile } = await supabaseAdmin
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      await sendWelcomeEmail({
        to: testEmail,
        fullName: meProfile?.full_name ?? null,
        role: (meProfile?.role as string) || "fighter",
      });

      return NextResponse.json({
        mode: "test",
        sentTo: testEmail,
        message: `Test welcome email sent to ${testEmail}.`,
      });
    }

    // 4. Build recipient list: all auth users with an email, excluding admins.
    const profileRoleMap = new Map<string, { role: string | null; full_name: string | null }>();
    const { data: profilesData } = await supabaseAdmin
      .from("profiles")
      .select("id, role, full_name");
    (profilesData || []).forEach((p: any) => {
      profileRoleMap.set(p.id, { role: p.role, full_name: p.full_name });
    });

    const recipients: Recipient[] = [];
    let page = 1;
    const perPage = 1000;
    // Paginate through all auth users.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data: usersPage, error: listError } =
        await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (listError) {
        return NextResponse.json(
          { error: `Failed to list users: ${listError.message}` },
          { status: 500 }
        );
      }
      const users = usersPage?.users || [];
      for (const u of users) {
        if (!u.email) continue;
        const profile = profileRoleMap.get(u.id);
        const role = (profile?.role as string) || (u.user_metadata?.role as string) || "fighter";
        if (role.toLowerCase() === "admin") continue; // exclude admins
        const fullName =
          profile?.full_name || (u.user_metadata?.full_name as string) || null;
        recipients.push({ id: u.id, email: u.email, fullName, role });
      }
      if (users.length < perPage) break;
      page += 1;
    }

    // 5. Dry run: report who would receive it, send nothing.
    if (dryRun) {
      return NextResponse.json({
        mode: "dryRun",
        count: recipients.length,
        sample: recipients.slice(0, 25).map((r) => ({ email: r.email, role: r.role })),
        message: `${recipients.length} non-admin user(s) would receive the welcome email.`,
      });
    }

    // 6. Real send (sequential, rate-limited).
    const toSend = recipients.slice(0, MAX_SEND);
    let sent = 0;
    const errors: { email: string; error: string }[] = [];

    for (const r of toSend) {
      try {
        await sendWelcomeEmail({ to: r.email, fullName: r.fullName, role: r.role });
        sent += 1;
      } catch (e: any) {
        errors.push({ email: r.email, error: e?.message || "send failed" });
      }
      await sleep(DELAY_MS);
    }

    return NextResponse.json({
      mode: "send",
      total: recipients.length,
      attempted: toSend.length,
      sent,
      failed: errors.length,
      errors: errors.slice(0, 20),
      capped: recipients.length > MAX_SEND,
      message: `Sent ${sent} welcome email(s).${
        recipients.length > MAX_SEND
          ? ` (Capped at ${MAX_SEND}; run again to send the rest.)`
          : ""
      }`,
    });
  } catch (err) {
    console.error("send-welcome-existing error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
