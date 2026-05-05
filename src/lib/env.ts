export function getSupabasePublicEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
    publishableKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "",
  };
}

export function hasSupabasePublicEnv() {
  const env = getSupabasePublicEnv();

  return env.url.length > 0 && env.publishableKey.length > 0;
}

export function getMissingSupabaseEnvNames() {
  const env = getSupabasePublicEnv();
  const missing: string[] = [];

  if (!env.url) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!env.publishableKey) {
    missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  return missing;
}
