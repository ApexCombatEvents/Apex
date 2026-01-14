// lib/ratelimit.ts
// Simple in-memory rate limiting for development/testing
// For production, consider using Upstash Redis for distributed rate limiting

interface RateLimitEntry {
  requests: number[];
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Simple rate limiter for API routes
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param maxRequests - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns true if within rate limit, false if exceeded
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  let entry = rateLimitStore.get(identifier);

  // Clean up old entries periodically
  if (Math.random() < 0.01) {
    // 1% chance to clean up (to avoid doing it on every request)
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  }

  // If entry doesn't exist or window has expired, create new entry
  if (!entry || entry.resetAt < now) {
    entry = {
      requests: [now],
      resetAt: now + windowMs,
    };
    rateLimitStore.set(identifier, entry);
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: entry.resetAt,
    };
  }

  // Remove requests outside the window
  entry.requests = entry.requests.filter((timestamp) => now - timestamp < windowMs);

  // Check if limit exceeded
  if (entry.requests.length >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // Add current request
  entry.requests.push(now);
  rateLimitStore.set(identifier, entry);

  return {
    allowed: true,
    remaining: maxRequests - entry.requests.length,
    resetAt: entry.resetAt,
  };
}

/**
 * Get client IP address from request
 */
export function getClientIP(req: Request | { headers: { get: (name: string) => string | null } }): string {
  // Try to get IP from headers (set by proxy/Vercel)
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIP = req.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Fallback (won't work in serverless, but good for local dev)
  return "unknown";
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Authentication endpoints - strict limits
  login: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 requests per 15 minutes
  signup: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 requests per hour
  
  // Payment endpoints - moderate limits
  payment: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 requests per minute
  
  // General API endpoints - lenient limits
  general: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 requests per minute
} as const;
