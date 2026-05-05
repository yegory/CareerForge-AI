import type { SupabaseClient } from "@supabase/supabase-js";

export interface ImportedTemplate {
  id: string;
  name: string;
  storage_path: string;
  placeholders: Array<{ placeholder?: string }>;
  created_at: string;
}

export interface ImportedMasterProfile {
  id: string;
  name: string;
  created_at: string;
}

export async function listImportedTemplates(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("docx_templates")
    .select("id,name,storage_path,placeholders,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as ImportedTemplate[];
}

export async function listMasterProfiles(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("master_profiles")
    .select("id,name,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as ImportedMasterProfile[];
}
