import { KeyRound, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMissingServerEnvNames } from "@/lib/env.server";
import { hasSupabasePublicEnv } from "@/lib/env";
import { listKeyVaultEntries } from "@/lib/key-vault/data";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteProviderKey, saveProviderKey } from "./actions";

export const dynamic = "force-dynamic";

interface SettingsPageProps {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams;

  if (!hasSupabasePublicEnv()) {
    redirect("/login?error=Supabase%20environment%20variables%20are%20not%20configured.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/settings");
  }

  const missingServerEnv = getMissingServerEnvNames();
  const entries = await listKeyVaultEntries(supabase, user.id).catch(() => []);

  return (
    <main className="min-h-screen bg-[#f7f4ed] text-[#152023]">
      <div className="mx-auto max-w-5xl px-5 py-6">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/app"
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[#17604f]"
            >
              Back to workspace
            </Link>
            <h1 className="text-3xl font-semibold">Key vault</h1>
            <p className="mt-2 text-sm text-[#627174]">
              Store Gemini and DeepSeek API keys for generation runs.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-[#d9d4c8] bg-white px-3 py-2 text-sm">
            <ShieldCheck className="size-4 text-[#17604f]" />
            AES-GCM encrypted
          </div>
        </header>

        {missingServerEnv.length > 0 ? (
          <div className="mb-5 rounded-lg border border-[#d97043] bg-[#fff7ed] p-3 text-sm text-[#8a421f]">
            Missing env vars: {missingServerEnv.join(", ")}.
          </div>
        ) : null}

        {params.error ? (
          <div className="mb-5 rounded-lg border border-[#d97043] bg-[#fff7ed] p-3 text-sm text-[#8a421f]">
            {params.error}
          </div>
        ) : null}

        {params.message ? (
          <div className="mb-5 rounded-lg border border-[#8bb8aa] bg-[#e6f2ef] p-3 text-sm text-[#17604f]">
            {params.message}
          </div>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <div className="rounded-lg border border-[#d9d4c8] bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add provider key</h2>
              <Sparkles className="size-4 text-[#d97043]" />
            </div>
            <form action={saveProviderKey} className="space-y-3">
              <label className="block text-sm font-medium" htmlFor="provider">
                Provider
              </label>
              <select
                id="provider"
                name="provider"
                defaultValue="gemini"
                className="h-10 w-full rounded-lg border border-[#cfc7ba] bg-white px-2.5 text-sm outline-none focus-visible:border-[#153f4a] focus-visible:ring-3 focus-visible:ring-[#153f4a]/20"
              >
                <option value="gemini">Gemini</option>
                <option value="deepseek">DeepSeek</option>
              </select>

              <label className="block text-sm font-medium" htmlFor="label">
                Label
              </label>
              <Input
                id="label"
                name="label"
                defaultValue="default"
                className="h-10 rounded-lg border-[#cfc7ba]"
                required
              />

              <label className="block text-sm font-medium" htmlFor="apiKey">
                API key
              </label>
              <Input
                id="apiKey"
                name="apiKey"
                type="password"
                className="h-10 rounded-lg border-[#cfc7ba]"
                placeholder="Paste provider API key"
                required
              />

              <Button className="h-10 w-full rounded-lg bg-[#d97043] text-white hover:bg-[#bd5d35]">
                <KeyRound className="size-4" />
                Validate and save
              </Button>
            </form>
          </div>

          <div className="rounded-lg border border-[#d9d4c8] bg-white">
            <div className="border-b border-[#ebe5d9] px-4 py-3">
              <h2 className="text-lg font-semibold">Stored keys</h2>
            </div>
            <div className="divide-y divide-[#ebe5d9]">
              {entries.length === 0 ? (
                <div className="px-4 py-8 text-sm text-[#627174]">
                  No provider keys saved yet.
                </div>
              ) : null}
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_160px_96px]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{entry.label}</h3>
                      <Badge className="rounded-md bg-[#e6f2ef] text-[#17604f] hover:bg-[#e6f2ef]">
                        {entry.provider}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-[#627174]">
                      Fingerprint {entry.key_fingerprint}
                    </p>
                  </div>
                  <div className="text-sm text-[#627174]">
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }).format(new Date(entry.updated_at))}
                  </div>
                  <form action={deleteProviderKey}>
                    <input type="hidden" name="id" value={entry.id} />
                    <Button
                      variant="outline"
                      className="h-9 rounded-lg border-[#cfc7ba]"
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
