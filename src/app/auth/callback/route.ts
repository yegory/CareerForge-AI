import { NextResponse, type NextRequest } from "next/server";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/app";

  if (!hasSupabasePublicEnv()) {
    requestUrl.pathname = "/login";
    requestUrl.search = "?error=Supabase%20environment%20variables%20are%20not%20configured.";
    return NextResponse.redirect(requestUrl);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      requestUrl.pathname = "/login";
      requestUrl.search = `?error=${encodeURIComponent(error.message)}`;
      return NextResponse.redirect(requestUrl);
    }
  }

  requestUrl.pathname = next.startsWith("/") ? next : "/app";
  requestUrl.search = "";
  return NextResponse.redirect(requestUrl);
}
