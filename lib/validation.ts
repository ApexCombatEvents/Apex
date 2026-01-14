// lib/validation.ts
// Input validation helpers for common use cases

/**
 * Validates an email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates a username (alphanumeric, underscores, hyphens, 3-30 chars)
 */
export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
  return usernameRegex.test(username);
}

/**
 * Validates a password (min 6 characters)
 */
export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

/**
 * Validates a URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitizes user input by trimming and removing excessive whitespace
 */
export function sanitizeInput(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

/**
 * Validates a record string format (e.g., "10-2-1" for wins-losses-draws)
 */
export function isValidRecord(record: string): boolean {
  const recordRegex = /^\d{1,3}-\d{1,3}-\d{1,3}$/;
  return recordRegex.test(record);
}

/**
 * Validates a date string (YYYY-MM-DD format)
 */
export function isValidDate(dateString: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Validates file type for image uploads
 */
export function isValidImageType(file: File): boolean {
  const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
  return validTypes.includes(file.type);
}

/**
 * Validates file size (in bytes)
 */
export function isValidFileSize(file: File, maxSizeMB: number = 5): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * Validates a UUID
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

