// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // refresh session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Password-recovery lockdown: if the user arrived via a reset link (flagged by
  // the reset page), confine them to /reset-password until they set a new
  // password. This prevents using the recovery session to browse the app.
  const isRecovering = req.cookies.get("apex-recovery")?.value === "1";
  if (isRecovering && user && req.nextUrl.pathname !== "/reset-password") {
    const url = req.nextUrl.clone();
    url.pathname = "/reset-password";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
