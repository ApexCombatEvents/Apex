// lib/input-validation.ts
// Server-side input validation utilities

/**
 * Validate email format
 */
export function validateEmail(email: unknown): { valid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: "Email is required" };
  }

  const trimmed = email.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Email cannot be empty" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: "Invalid email format" };
  }

  if (trimmed.length > 255) {
    return { valid: false, error: "Email is too long" };
  }

  return { valid: true };
}

/**
 * Validate password
 */
export function validatePassword(password: unknown, minLength: number = 6): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: "Password is required" };
  }

  if (password.length < minLength) {
    return { valid: false, error: `Password must be at least ${minLength} characters` };
  }

  if (password.length > 128) {
    return { valid: false, error: "Password is too long" };
  }

  return { valid: true };
}

/**
 * Validate username
 */
export function validateUsername(username: unknown): { valid: boolean; error?: string } {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: "Username is required" };
  }

  const trimmed = username.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Username cannot be empty" };
  }

  if (trimmed.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters" };
  }

  if (trimmed.length > 30) {
    return { valid: false, error: "Username must be at most 30 characters" };
  }

  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(trimmed)) {
    return { valid: false, error: "Username can only contain letters, numbers, and underscores" };
  }

  return { valid: true };
}

/**
 * Validate role
 */
export function validateRole(role: unknown): { valid: boolean; error?: string; value?: string } {
  const validRoles = ["fighter", "coach", "gym", "promotion"];
  
  if (!role || typeof role !== 'string') {
    return { valid: false, error: "Role is required" };
  }

  const normalized = role.toLowerCase().trim();
  if (!validRoles.includes(normalized)) {
    return { valid: false, error: `Invalid role. Must be one of: ${validRoles.join(", ")}` };
  }

  return { valid: true, value: normalized };
}

/**
 * Sanitize string input (trim and limit length)
 */
export function sanitizeString(input: unknown, maxLength: number = 1000): string | null {
  if (input === null || input === undefined) {
    return null;
  }

  if (typeof input !== 'string') {
    return String(input).trim().substring(0, maxLength);
  }

  return input.trim().substring(0, maxLength);
}

/**
 * Sanitize email (lowercase and trim)
 */
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Sanitize username (lowercase and trim)
 */
export function sanitizeUsername(username: string): string {
  return username.toLowerCase().trim();
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: unknown): { valid: boolean; error?: string } {
  if (!uuid || typeof uuid !== 'string') {
    return { valid: false, error: "UUID is required" };
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    return { valid: false, error: "Invalid UUID format" };
  }

  return { valid: true };
}

/**
 * Validate positive integer
 */
export function validatePositiveInteger(value: unknown): { valid: boolean; error?: string; value?: number } {
  if (value === null || value === undefined) {
    return { valid: false, error: "Value is required" };
  }

  const num = typeof value === 'string' ? parseInt(value, 10) : Number(value);
  
  if (isNaN(num)) {
    return { valid: false, error: "Value must be a number" };
  }

  if (!Number.isInteger(num)) {
    return { valid: false, error: "Value must be an integer" };
  }

  if (num <= 0) {
    return { valid: false, error: "Value must be positive" };
  }

  return { valid: true, value: num };
}
