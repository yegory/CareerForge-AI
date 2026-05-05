import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { providerNameSchema, validateProviderKey } from "@/lib/llm/providers";
import { providerValidationTotal } from "@/lib/metrics/registry";
import { assertRateLimit, RateLimitError } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

const validateProviderRequestSchema = z.object({
  provider: providerNameSchema,
  apiKey: z.string().min(8),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await assertRateLimit({
      key: `rate:provider-validate:${user.id}`,
      limit: 20,
      windowSeconds: 60,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    throw error;
  }

  const body = validateProviderRequestSchema.safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const ok = await validateProviderKey(body.data);
    providerValidationTotal.inc({
      provider: body.data.provider,
      status: ok ? "ok" : "failed",
    });
    return NextResponse.json({ ok });
  } catch (error) {
    providerValidationTotal.inc({
      provider: body.data.provider,
      status: "failed",
    });
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Provider validation failed",
      },
      { status: 400 },
    );
  }
}
