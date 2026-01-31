// lib/env-validation.ts
// Helper functions to validate required environment variables

export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getOptionalEnv(key: string, defaultValue: string = ""): string {
  return process.env[key] || defaultValue;
}
