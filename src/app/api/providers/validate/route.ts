import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { providerNameSchema, validateProviderKey } from "@/lib/llm/providers";
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

  const body = validateProviderRequestSchema.safeParse(await request.json());

  if (!body.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const ok = await validateProviderKey(body.data);
    return NextResponse.json({ ok });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Provider validation failed",
      },
      { status: 400 },
    );
  }
}
