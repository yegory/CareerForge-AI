export function getKeyEncryptionSecret() {
  const secret = process.env.KEY_ENCRYPTION_SECRET?.trim();

  if (!secret) {
    throw new Error("KEY_ENCRYPTION_SECRET is required.");
  }

  if (secret.length < 32) {
    throw new Error("KEY_ENCRYPTION_SECRET must be at least 32 characters.");
  }

  return secret;
}

export function getSupabaseServiceEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "",
  };
}

export function getRedisUrl() {
  return process.env.REDIS_URL?.trim() ?? "";
}

export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function getPublicAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "http://localhost:3000";
}

export function getMissingServerEnvNames() {
  const missing: string[] = [];

  if (!process.env.KEY_ENCRYPTION_SECRET?.trim()) {
    missing.push("KEY_ENCRYPTION_SECRET");
  }

  if (!process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY?.trim()) {
    missing.push("NEXT_SERVER_ACTIONS_ENCRYPTION_KEY");
  }

  return missing;
}

export function getMissingWorkerEnvNames() {
  const missing = getMissingServerEnvNames();
  const supabase = getSupabaseServiceEnv();

  if (!supabase.url) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!supabase.serviceRoleKey) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  if (!getRedisUrl()) {
    missing.push("REDIS_URL");
  }

  return missing;
}
