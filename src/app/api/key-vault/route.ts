import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { listKeyVaultEntries } from "@/lib/key-vault/data";
import { providerNameSchema, validateProviderKey } from "@/lib/llm/providers";
import { encryptSecret, fingerprintSecret } from "@/lib/security/key-vault";
import { createClient } from "@/lib/supabase/server";

const saveKeyRequestSchema = z.object({
  provider: providerNameSchema,
  label: z.string().min(1).max(80),
  apiKey: z.string().min(8),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const entries = await listKeyVaultEntries(supabase, user.id);
    return NextResponse.json({ entries });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load key vault" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = saveKeyRequestSchema.safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    await validateProviderKey(body.data);
    const encrypted = encryptSecret(body.data.apiKey);
    const { error } = await supabase.from("llm_key_vault_entries").upsert(
      {
        user_id: user.id,
        provider: body.data.provider,
        label: body.data.label,
        key_fingerprint: fingerprintSecret(body.data.apiKey),
        encrypted_key: encrypted.encryptedKey,
        encryption_nonce: encrypted.encryptionNonce,
      },
      { onConflict: "user_id,provider,label" },
    );

    if (error) {
      throw error;
    }

    const entries = await listKeyVaultEntries(supabase, user.id);
    return NextResponse.json({ entries });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save provider key" },
      { status: 400 },
    );
  }
}
