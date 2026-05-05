import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceEnv } from "@/lib/env.server";

export function createAdminClient() {
  const env = getSupabaseServiceEnv();

  if (!env.url || !env.serviceRoleKey) {
    throw new Error("Supabase service role environment variables are required.");
  }

  return createClient(env.url, env.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
