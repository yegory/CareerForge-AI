import { NextResponse } from "next/server";
import { assertRateLimit, RateLimitError } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await assertRateLimit({
      key: `rate:document-download:${user.id}`,
      limit: 120,
      windowSeconds: 60,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    throw error;
  }

  const { data: document, error } = await supabase
    .from("documents")
    .select("id,storage_path")
    .eq("id", id)
    .single();

  if (error || !document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: signedUrl, error: signedUrlError } = await supabase.storage
    .from("generated-documents")
    .createSignedUrl(document.storage_path, 60);

  if (signedUrlError) {
    return NextResponse.json({ error: signedUrlError.message }, { status: 400 });
  }

  return NextResponse.redirect(signedUrl.signedUrl);
}
