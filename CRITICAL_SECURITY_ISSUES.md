# Critical Security Issues & Fixes

## 🚨 Priority 1: Critical (Must Fix Before Launch)

### 1. Middleware Using Service Role Key ⚠️ **CRITICAL SECURITY RISK**

**Issue:**
The middleware is currently using `SUPABASE_SERVICE_ROLE_KEY`, which bypasses all Row Level Security (RLS) policies. This is a **major security vulnerability** because:
- Service role key has admin-level access to the entire database
- It bypasses all RLS policies
- If exposed, an attacker could read/write/delete any data
- Should only be used in secure server-side contexts (API routes), not middleware

**Current Code (WRONG):**
```typescript
// middleware.ts
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // ❌ DANGEROUS
);
```

**Fix:**
Use the anonymous key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) for middleware instead. The middleware should only refresh sessions, not perform data operations.

**Corrected Code:**
```typescript
// middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Use ANON key, not service role key
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,  // ✅ CORRECT
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Only refresh session, don't perform data operations
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

**Where Service Role Key SHOULD Be Used:**
- API routes that need admin access (e.g., `/api/signup`, `/api/stripe/webhook`)
- Server-side operations that bypass RLS intentionally
- Background jobs/scripts

**Where Service Role Key Should NOT Be Used:**
- ❌ Middleware
- ❌ Client-side code
- ❌ Components
- ❌ Pages

---

### 2. Missing Rate Limiting 🔒 **HIGH PRIORITY**

**Issue:**
API routes (especially login, signup, payment endpoints) have no rate limiting, making them vulnerable to:
- Brute force attacks
- DDoS attacks
- Abuse/spam
- Cost escalation (if using paid services)

**Vulnerable Routes:**
- `/api/login`
- `/api/signup`
- `/api/stripe/webhook`
- `/api/stripe/verify-stream-payment`
- `/api/payouts/*`

**Fix Option 1: Vercel Edge Middleware with Upstash (Recommended for Vercel)**

1. Install dependencies:
```bash
npm install @upstash/ratelimit @upstash/redis
```

2. Create rate limiter utility:
```typescript
// lib/ratelimit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Rate limiter: 5 requests per 60 seconds per IP
export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  analytics: true,
});
```

3. Add to API routes:
```typescript
// app/api/login/route.ts
import { ratelimit } from "@/lib/ratelimit";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  // Get IP address
  const ip = req.ip ?? req.headers.get("x-forwarded-for") ?? "unknown";
  
  // Check rate limit
  const { success, limit, remaining } = await ratelimit.limit(ip);
  
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  // ... rest of login logic
}
```

**Fix Option 2: Simple In-Memory Rate Limiting (For Development/Testing)**

```typescript
// lib/simple-ratelimit.ts
const rateLimitMap = new Map<string, number[]>();

export function checkRateLimit(identifier: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const requests = rateLimitMap.get(identifier) || [];
  
  // Remove requests outside the window
  const validRequests = requests.filter(timestamp => now - timestamp < windowMs);
  
  if (validRequests.length >= maxRequests) {
    return false; // Rate limit exceeded
  }
  
  validRequests.push(now);
  rateLimitMap.set(identifier, validRequests);
  return true; // Within rate limit
}
```

**Recommended Limits:**
- Login/Signup: 5 requests per 15 minutes per IP
- Payment endpoints: 10 requests per minute per IP
- General API: 100 requests per minute per IP

---

### 3. Input Validation (Server-Side) ✅ **HIGH PRIORITY**

**Issue:**
Some validation is only client-side, which can be bypassed. All user inputs must be validated server-side.

**Fix: Add Server-Side Validation**

**Example for Login Route:**
```typescript
// app/api/login/route.ts
export async function POST(req: Request) {
  try {
    const { identifier, password } = await req.json();

    // Server-side validation
    if (!identifier || typeof identifier !== 'string' || identifier.trim().length === 0) {
      return NextResponse.json(
        { error: "Email/username is required" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Sanitize input (remove whitespace, trim)
    const sanitizedIdentifier = identifier.trim();
    const sanitizedPassword = password.trim();

    // ... rest of logic
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
```

**Example for Signup Route:**
```typescript
// app/api/signup/route.ts
export async function POST(req: Request) {
  try {
    const { email, password, full_name, username, role } = await req.json();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ["fighter", "coach", "gym", "promotion"];
    if (role && !validRoles.includes(role.toLowerCase())) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    // Validate username (alphanumeric + underscore, 3-30 chars)
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (username && !usernameRegex.test(username)) {
      return NextResponse.json(
        { error: "Username must be 3-30 characters, alphanumeric and underscores only" },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedEmail = email.toLowerCase().trim();
    const sanitizedUsername = username?.toLowerCase().trim();
    const sanitizedFullName = full_name?.trim().substring(0, 100); // Limit length

    // ... rest of logic
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
```

**Consider Using Zod for Validation:**
```typescript
// lib/validation.ts
import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().min(1, "Email/username is required").max(255),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  full_name: z.string().min(1).max(100),
  username: z.string().regex(/^[a-zA-Z0-9_]{3,30}$/, "Invalid username format"),
  role: z.enum(["fighter", "coach", "gym", "promotion"]),
});
```

---

### 4. Row Level Security (RLS) Policies ✅ **CRITICAL**

**Issue:**
If RLS is not properly enabled on all tables, users could access data they shouldn't have access to.

**Fix: Verify RLS is Enabled**

1. **Check RLS Status:**
```sql
-- Run in Supabase SQL Editor
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

All tables should show `rowsecurity = true`.

2. **Enable RLS on Tables (if not enabled):**
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_bouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;
-- ... etc for all tables
```

3. **Review RLS Policies:**
Verify that policies exist and are restrictive:
```sql
-- Check policies on a table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
```

**Key Policies to Verify:**
- Users can only read their own sensitive data
- Users can only update/delete their own records
- Public read access where appropriate (e.g., public profiles)
- Admin-only access for admin functions

---

### 5. Environment Variable Security ✅ **HIGH PRIORITY**

**Issue:**
Service role keys and secrets might be exposed in client-side code or not properly secured.

**Fix:**

1. **Never expose service role key in client-side code:**
   - ✅ Use `NEXT_PUBLIC_*` prefix only for variables needed in browser
   - ❌ Never use `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`
   - ✅ Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only

2. **Verify environment variables:**
```bash
# Check what's exposed to client (only NEXT_PUBLIC_* vars should be here)
grep -r "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY" .
grep -r "process.env.SUPABASE_SERVICE_ROLE_KEY" app/components
grep -r "process.env.SUPABASE_SERVICE_ROLE_KEY" app/*.tsx
```

3. **Create `.env.example` file:**
```env
# Public (safe to expose in browser)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Private (server-side only)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

4. **Verify production environment variables:**
   - In Vercel: Project Settings → Environment Variables
   - Ensure production uses live keys (not test keys)
   - Rotate keys periodically
   - Never commit `.env` files to git

---

### 6. SQL Injection Protection ✅ **MEDIUM PRIORITY**

**Issue:**
While Supabase uses parameterized queries, custom SQL could be vulnerable.

**Fix:**
- ✅ **Use Supabase Query Builder** (already doing this) - it's safe
- ✅ **Never use string concatenation** for SQL queries
- ❌ **Never do:** `supabase.from('users').select(`* FROM users WHERE id = '${userInput}'`)`
- ✅ **Always use:** `supabase.from('users').select('*').eq('id', userInput)`

**Example (WRONG):**
```typescript
// ❌ VULNERABLE
const query = `SELECT * FROM profiles WHERE username = '${username}'`;
```

**Example (CORRECT):**
```typescript
// ✅ SAFE
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('username', username);
```

---

### 7. CORS Configuration ✅ **MEDIUM PRIORITY**

**Issue:**
Improper CORS settings could allow unauthorized domains to access your API.

**Fix:**

1. **Verify CORS in Next.js (default is restrictive):**
   - Next.js API routes have CORS enabled by default
   - For custom CORS, use proper headers:

```typescript
// app/api/example/route.ts
export async function GET(req: Request) {
  const origin = req.headers.get('origin');
  const allowedOrigins = [
    'https://yourdomain.com',
    'https://www.yourdomain.com',
  ];

  // Allow only specific origins in production
  const headers = {
    'Content-Type': 'application/json',
    ...(origin && allowedOrigins.includes(origin) && {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }),
  };

  return NextResponse.json({ data: 'example' }, { headers });
}
```

2. **For Supabase:**
   - Configure allowed origins in Supabase Dashboard → Authentication → URL Configuration
   - Add your production domain to allowed redirect URLs

---

## 📋 Quick Fix Checklist

- [ ] Fix middleware to use ANON key instead of service role key
- [ ] Add rate limiting to login/signup/payment endpoints
- [ ] Add server-side validation to all API routes
- [ ] Verify RLS is enabled on all tables
- [ ] Review all RLS policies for correctness
- [ ] Verify environment variables are secure (no service role key in client)
- [ ] Create `.env.example` file
- [ ] Verify CORS settings
- [ ] Test all security fixes
- [ ] Review code for any SQL injection risks (should be none with Supabase)

---

## 🔍 Security Audit Steps

1. **Review all API routes:**
   ```bash
   find app/api -name "*.ts" -type f
   ```

2. **Check for service role key usage:**
   ```bash
   grep -r "SERVICE_ROLE_KEY" app/
   ```

3. **Review middleware:**
   ```bash
   cat middleware.ts
   ```

4. **Check RLS policies:**
   - Run SQL queries in Supabase Dashboard
   - Verify all tables have RLS enabled
   - Review policy logic

5. **Test authentication flows:**
   - Try accessing admin routes without admin role
   - Try accessing other users' data
   - Try brute force on login (should be rate limited)

---

## 🚀 Priority Order for Fixes

1. **Fix middleware** (critical - exposes all data)
2. **Add rate limiting** (high - prevents abuse)
3. **Verify RLS** (critical - data access control)
4. **Add server-side validation** (high - input security)
5. **Review environment variables** (high - key security)
6. **CORS configuration** (medium - API security)

---

**Note:** After fixing these issues, perform a security audit and test all fixes thoroughly before launching to production.
