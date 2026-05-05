import { FileText, Upload } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { hasSupabasePublicEnv } from "@/lib/env";
import {
  listImportedTemplates,
  listMasterProfiles,
} from "@/lib/templates/data";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { importTemplateFile } from "./actions";

export const dynamic = "force-dynamic";

interface TemplatesPageProps {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
}

export default async function TemplatesPage({ searchParams }: TemplatesPageProps) {
  const params = await searchParams;

  if (!hasSupabasePublicEnv()) {
    redirect("/login?error=Supabase%20environment%20variables%20are%20not%20configured.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/templates");
  }

  const [templates, masterProfiles] = await Promise.all([
    listImportedTemplates(supabase, user.id).catch(() => []),
    listMasterProfiles(supabase, user.id).catch(() => []),
  ]);

  return (
    <main className="min-h-screen bg-[#f7f4ed] text-[#152023]">
      <div className="mx-auto max-w-6xl px-5 py-6">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/app"
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[#17604f]"
            >
              Back to workspace
            </Link>
            <h1 className="text-3xl font-semibold">Templates and sources</h1>
            <p className="mt-2 text-sm text-[#627174]">
              Import resume sources and DOCX templates without committing personal files.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-[#d9d4c8] bg-white px-3 py-2 text-sm">
            <FileText className="size-4 text-[#17604f]" />
            Storage backed
          </div>
        </header>

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
              <h2 className="text-lg font-semibold">Import file</h2>
              <Upload className="size-4 text-[#d97043]" />
            </div>
            <form action={importTemplateFile} className="space-y-3">
              <label className="block text-sm font-medium" htmlFor="importKind">
                Import as
              </label>
              <select
                id="importKind"
                name="importKind"
                defaultValue="template"
                className="h-10 w-full rounded-lg border border-[#cfc7ba] bg-white px-2.5 text-sm outline-none focus-visible:border-[#153f4a] focus-visible:ring-3 focus-visible:ring-[#153f4a]/20"
              >
                <option value="template">DOCX template</option>
                <option value="master-profile">Master profile source</option>
              </select>

              <label className="block text-sm font-medium" htmlFor="name">
                Display name
              </label>
              <Input
                id="name"
                name="name"
                className="h-10 rounded-lg border-[#cfc7ba]"
                placeholder="Gumloop resume template"
              />

              <label className="block text-sm font-medium" htmlFor="file">
                File
              </label>
              <Input
                id="file"
                name="file"
                type="file"
                accept=".docx,.pdf,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,text/plain"
                className="h-10 rounded-lg border-[#cfc7ba]"
                required
              />

              <Button className="h-10 w-full rounded-lg bg-[#d97043] text-white hover:bg-[#bd5d35]">
                Import
              </Button>
            </form>
          </div>

          <div className="grid gap-5">
            <div className="rounded-lg border border-[#d9d4c8] bg-white">
              <div className="border-b border-[#ebe5d9] px-4 py-3">
                <h2 className="text-lg font-semibold">DOCX templates</h2>
              </div>
              <div className="divide-y divide-[#ebe5d9]">
                {templates.length === 0 ? (
                  <div className="px-4 py-8 text-sm text-[#627174]">
                    No templates imported yet.
                  </div>
                ) : null}
                {templates.map((template) => {
                  const placeholderCount = template.placeholders.length;

                  return (
                    <div key={template.id} className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_180px]">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{template.name}</h3>
                          <Badge
                            className={
                              placeholderCount > 0
                                ? "rounded-md bg-[#e6f2ef] text-[#17604f] hover:bg-[#e6f2ef]"
                                : "rounded-md bg-[#fff7ed] text-[#8a421f] hover:bg-[#fff7ed]"
                            }
                          >
                            {placeholderCount > 0
                              ? `${placeholderCount} placeholders`
                              : "needs conversion"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-[#627174]">
                          {template.storage_path}
                        </p>
                      </div>
                      <div className="text-sm text-[#627174]">
                        {new Intl.DateTimeFormat("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }).format(new Date(template.created_at))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border border-[#d9d4c8] bg-white">
              <div className="border-b border-[#ebe5d9] px-4 py-3">
                <h2 className="text-lg font-semibold">Master profile sources</h2>
              </div>
              <div className="divide-y divide-[#ebe5d9]">
                {masterProfiles.length === 0 ? (
                  <div className="px-4 py-8 text-sm text-[#627174]">
                    No master profile sources imported yet.
                  </div>
                ) : null}
                {masterProfiles.map((profile) => (
                  <div key={profile.id} className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_180px]">
                    <h3 className="font-semibold">{profile.name}</h3>
                    <div className="text-sm text-[#627174]">
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }).format(new Date(profile.created_at))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
