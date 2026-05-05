"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { providerNameSchema, validateProviderKey } from "@/lib/llm/providers";
import { encryptSecret, fingerprintSecret } from "@/lib/security/key-vault";
import { createClient } from "@/lib/supabase/server";

const saveProviderKeyFormSchema = z.object({
  provider: providerNameSchema,
  label: z.string().min(1).max(80),
  apiKey: z.string().min(8),
});

function settingsRedirect(type: "error" | "message", value: string): never {
  redirect(`/settings?${type}=${encodeURIComponent(value)}`);
}

export async function saveProviderKey(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings");
  }

  const parsed = saveProviderKeyFormSchema.safeParse({
    provider: formData.get("provider"),
    label: formData.get("label"),
    apiKey: formData.get("apiKey"),
  });

  if (!parsed.success) {
    settingsRedirect("error", "Provider, label, and API key are required.");
  }

  try {
    await validateProviderKey(parsed.data);
    const encrypted = encryptSecret(parsed.data.apiKey);
    const { error } = await supabase.from("llm_key_vault_entries").upsert(
      {
        user_id: user.id,
        provider: parsed.data.provider,
        label: parsed.data.label,
        key_fingerprint: fingerprintSecret(parsed.data.apiKey),
        encrypted_key: encrypted.encryptedKey,
        encryption_nonce: encrypted.encryptionNonce,
      },
      { onConflict: "user_id,provider,label" },
    );

    if (error) {
      throw error;
    }
  } catch (error) {
    settingsRedirect(
      "error",
      error instanceof Error ? error.message : "Could not save provider key.",
    );
  }

  revalidatePath("/settings");
  settingsRedirect("message", "Provider key saved.");
}

export async function deleteProviderKey(formData: FormData) {
  const id = formData.get("id");

  if (typeof id !== "string" || id.length === 0) {
    settingsRedirect("error", "Provider key id is required.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings");
  }

  const { error } = await supabase
    .from("llm_key_vault_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    settingsRedirect("error", error.message);
  }

  revalidatePath("/settings");
  settingsRedirect("message", "Provider key removed.");
}
