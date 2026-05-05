import { LockKeyhole, Mail, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { getMissingSupabaseEnvNames, hasSupabasePublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  signInWithGoogle,
  signInWithMagicLink,
  signInWithPassword,
  signUpWithPassword,
} from "./actions";

interface LoginPageProps {
  searchParams: Promise<{
    error?: string;
    message?: string;
    next?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") ? params.next : "/app";

  if (hasSupabasePublicEnv()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect("/app");
    }
  }

  const missingEnv = getMissingSupabaseEnvNames();

  return (
    <main className="min-h-screen bg-[#f7f4ed] text-[#152023]">
      <div className="mx-auto grid min-h-screen max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[1fr_440px] lg:items-center">
        <section className="max-w-2xl">
          <div className="mb-8 inline-flex items-center gap-3 rounded-lg bg-[#153f4a] px-3 py-2 text-white">
            <Sparkles className="size-4 text-[#f4c95d]" />
            <span className="text-sm font-medium">CareerForge AI</span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Resume and application workspace
          </h1>
          <p className="mt-5 text-lg leading-8 text-[#526163]">
            Sign in to sync master profiles, templates, provider keys,
            applications, and generated documents across web and desktop.
          </p>
        </section>

        <section className="rounded-lg border border-[#d9d4c8] bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold">Sign in</h2>
            <p className="mt-1 text-sm text-[#627174]">
              Use magic link, password, or Google OAuth.
            </p>
          </div>

          {missingEnv.length > 0 ? (
            <div className="mb-4 rounded-lg border border-[#d97043] bg-[#fff7ed] p-3 text-sm text-[#8a421f]">
              Missing env vars: {missingEnv.join(", ")}.
            </div>
          ) : null}

          {params.error ? (
            <div className="mb-4 rounded-lg border border-[#d97043] bg-[#fff7ed] p-3 text-sm text-[#8a421f]">
              {params.error}
            </div>
          ) : null}

          {params.message ? (
            <div className="mb-4 rounded-lg border border-[#8bb8aa] bg-[#e6f2ef] p-3 text-sm text-[#17604f]">
              {params.message}
            </div>
          ) : null}

          <div className="space-y-5">
            <form action={signInWithMagicLink} className="space-y-3">
              <input type="hidden" name="next" value={next} />
              <label className="block text-sm font-medium" htmlFor="magic-email">
                Email magic link
              </label>
              <div className="flex gap-2">
                <Input
                  id="magic-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="h-10 rounded-lg border-[#cfc7ba]"
                  required
                />
                <Button className="h-10 rounded-lg bg-[#153f4a] px-4 text-white hover:bg-[#1f5664]">
                  <Mail className="size-4" />
                  Send
                </Button>
              </div>
            </form>

            <div className="h-px bg-[#ebe5d9]" />

            <form action={signInWithPassword} className="space-y-3">
              <input type="hidden" name="next" value={next} />
              <label className="block text-sm font-medium" htmlFor="email">
                Email and password
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="h-10 rounded-lg border-[#cfc7ba]"
                required
              />
              <Input
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="At least 8 characters"
                className="h-10 rounded-lg border-[#cfc7ba]"
                required
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <Button className="h-10 rounded-lg bg-[#d97043] text-white hover:bg-[#bd5d35]">
                  <LockKeyhole className="size-4" />
                  Sign in
                </Button>
                <Button
                  type="submit"
                  formAction={signUpWithPassword}
                  variant="outline"
                  className="h-10 rounded-lg border-[#cfc7ba]"
                >
                  Create account
                </Button>
              </div>
            </form>

            <div className="h-px bg-[#ebe5d9]" />

            <form action={signInWithGoogle}>
              <input type="hidden" name="next" value={next} />
              <Button
                variant="outline"
                className="h-10 w-full rounded-lg border-[#cfc7ba]"
              >
                Continue with Google
              </Button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
