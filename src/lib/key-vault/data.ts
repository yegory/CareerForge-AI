import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProviderName } from "@/lib/llm/registry";

export interface KeyVaultEntry {
  id: string;
  provider: ProviderName;
  label: string;
  key_fingerprint: string;
  created_at: string;
  updated_at: string;
}

export async function listKeyVaultEntries(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("llm_key_vault_entries")
    .select("id,provider,label,key_fingerprint,created_at,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as KeyVaultEntry[];
}
