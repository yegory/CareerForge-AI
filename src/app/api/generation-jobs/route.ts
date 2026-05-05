import { NextResponse, type NextRequest } from "next/server";
import {
  createGenerationJob,
  createGenerationJobRequestSchema,
} from "@/lib/generation/jobs";
import { assertRateLimit, RateLimitError } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

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
      key: `rate:generation-create:${user.id}`,
      limit: 30,
      windowSeconds: 60,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    throw error;
  }

  const parsed = createGenerationJobRequestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid generation request" }, { status: 400 });
  }

  try {
    const job = await createGenerationJob({
      supabase,
      user,
      request: parsed.data,
    });

    return NextResponse.json({ jobId: job.id, status: job.status, job });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create generation job.",
      },
      { status: 400 },
    );
  }
}
