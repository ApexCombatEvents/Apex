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

/**
 * Minimum age required to hold an account.
 */
export const MINIMUM_SIGNUP_AGE = 13;

/**
 * Age below which an account is treated as a minor and carries restrictions.
 */
export const MINOR_AGE_THRESHOLD = 18;

/**
 * Whole years between a date of birth and now, both read in UTC so the result
 * does not shift with the server's timezone.
 */
export function calculateAge(dateOfBirth: Date, now: Date = new Date()): number {
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();

  const monthDelta = now.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < dateOfBirth.getUTCDate())) {
    age -= 1;
  }

  return age;
}

/**
 * Validate a date of birth given as an ISO `YYYY-MM-DD` string.
 * Returns the normalized date and the age in whole years.
 */
export function validateDateOfBirth(
  dateOfBirth: unknown,
  minimumAge: number = MINIMUM_SIGNUP_AGE
): { valid: boolean; error?: string; value?: string; age?: number } {
  if (!dateOfBirth || typeof dateOfBirth !== 'string') {
    return { valid: false, error: "Date of birth is required" };
  }

  const trimmed = dateOfBirth.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { valid: false, error: "Date of birth must be in YYYY-MM-DD format" };
  }

  const parsed = new Date(`${trimmed}T00:00:00Z`);
  if (isNaN(parsed.getTime())) {
    return { valid: false, error: "Invalid date of birth" };
  }

  // Catches dates that rolled over, e.g. 2011-02-30 arriving as 2011-03-02.
  if (parsed.toISOString().slice(0, 10) !== trimmed) {
    return { valid: false, error: "Invalid date of birth" };
  }

  const age = calculateAge(parsed);

  if (age < 0) {
    return { valid: false, error: "Date of birth cannot be in the future" };
  }

  if (age > 120) {
    return { valid: false, error: "Please enter a valid date of birth" };
  }

  if (age < minimumAge) {
    return {
      valid: false,
      error: `You must be at least ${minimumAge} years old to create an account`,
    };
  }

  return { valid: true, value: trimmed, age };
}

/**
 * Relationships a consenting adult can declare.
 */
export const GUARDIAN_RELATIONSHIPS = [
  "parent",
  "legal-guardian",
  "carer",
] as const;

export type GuardianRelationship = typeof GUARDIAN_RELATIONSHIPS[number];

export const GUARDIAN_RELATIONSHIP_LABELS: Record<GuardianRelationship, string> = {
  "parent": "Parent",
  "legal-guardian": "Legal guardian",
  "carer": "Carer",
};

export type GuardianDetails = {
  name: string;
  email: string;
  relationship: GuardianRelationship;
};

/**
 * Validate the guardian details supplied when a under-18 registers.
 * `applicantEmail` is rejected as the guardian address — using your own
 * inbox for both sides is the most obvious way to self-approve.
 */
export function validateGuardianDetails(
  name: unknown,
  email: unknown,
  relationship: unknown,
  applicantEmail?: string
): { valid: boolean; error?: string; value?: GuardianDetails } {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return { valid: false, error: "Parent or guardian name is required" };
  }

  const trimmedName = name.trim();
  if (trimmedName.length < 2) {
    return { valid: false, error: "Parent or guardian name is too short" };
  }

  if (trimmedName.length > 100) {
    return { valid: false, error: "Parent or guardian name is too long" };
  }

  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return { valid: false, error: "A valid parent or guardian email is required" };
  }

  const trimmedEmail = (email as string).trim().toLowerCase();

  if (applicantEmail && trimmedEmail === applicantEmail.trim().toLowerCase()) {
    return {
      valid: false,
      error: "Your parent or guardian must use a different email address from your own",
    };
  }

  if (
    !relationship ||
    typeof relationship !== 'string' ||
    !GUARDIAN_RELATIONSHIPS.includes(relationship as GuardianRelationship)
  ) {
    return { valid: false, error: "Please select your relationship to the account holder" };
  }

  return {
    valid: true,
    value: {
      name: trimmedName,
      email: trimmedEmail,
      relationship: relationship as GuardianRelationship,
    },
  };
}
