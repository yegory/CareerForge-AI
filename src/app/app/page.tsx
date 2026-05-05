import {
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  Download,
  FileText,
  Gauge,
  KeyRound,
  Layers3,
  LogOut,
  MessageSquareText,
  Search,
  Send,
  Sparkles,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ApplicationsChart } from "@/components/dashboard/applications-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { hasSupabasePublicEnv } from "@/lib/env";
import { getGenerationJob } from "@/lib/generation/jobs";
import { listKeyVaultEntries } from "@/lib/key-vault/data";
import {
  listImportedTemplates,
  listMasterProfiles,
} from "@/lib/templates/data";
import { createClient } from "@/lib/supabase/server";
import { loadWorkspaceData } from "@/lib/workspace/data";
import { signOut } from "../login/actions";
import { queueGenerationFromForm } from "./actions";

export const dynamic = "force-dynamic";

interface AppPageProps {
  searchParams: Promise<{
    q?: string;
    error?: string;
    message?: string;
    generationJobId?: string;
  }>;
}

function SetupStep({
  ready,
  icon: Icon,
  label,
  href,
}: {
  ready: boolean;
  icon: typeof UserRound;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-14 items-center justify-between rounded-lg border border-[#d9d4c8] bg-white px-3 py-2 text-sm"
    >
      <span className="flex items-center gap-2 font-medium">
        <Icon className="size-4 text-[#17604f]" />
        {label}
      </span>
      <Badge
        className={
          ready
            ? "rounded-md bg-[#e6f2ef] text-[#17604f] hover:bg-[#e6f2ef]"
            : "rounded-md bg-[#fff7ed] text-[#8a421f] hover:bg-[#fff7ed]"
        }
      >
        {ready ? "Ready" : "Needed"}
      </Badge>
    </Link>
  );
}

export default async function AppPage({ searchParams }: AppPageProps) {
  const params = await searchParams;
  const search = params.q ?? "";

  if (!hasSupabasePublicEnv()) {
    redirect("/login?error=Supabase%20environment%20variables%20are%20not%20configured.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/app");
  }

  const [workspace, keyEntries, masterProfiles, templates] = await Promise.all([
    loadWorkspaceData(supabase, user, search),
    listKeyVaultEntries(supabase, user.id).catch(() => []),
    listMasterProfiles(supabase, user.id).catch(() => []),
    listImportedTemplates(supabase, user.id).catch(() => []),
  ]);
  const activeJob =
    params.generationJobId
      ? await getGenerationJob({
          supabase,
          userId: user.id,
          id: params.generationJobId,
        }).catch(() => null)
      : null;
  const setupReady =
    keyEntries.length > 0 && masterProfiles.length > 0 && templates.length > 0;
  const stats = [
    ["Sent", String(workspace.stats.sent), "applications"],
    ["Replies", String(workspace.stats.replies), "interviews"],
    ["Avg. ATS", `${workspace.stats.avgScore}%`, "latest runs"],
    ["Ready docs", String(workspace.stats.documents), "exports"],
  ];

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-[#152023]">
      <header className="sticky top-0 z-10 border-b border-[#d9d4c8] bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between gap-3">
            <Link href="/app" className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-[#153f4a] text-white">
                <Sparkles className="size-5 text-[#f4c95d]" />
              </span>
              <span>
                <span className="block text-sm font-medium text-[#627174]">
                  CareerForge AI
                </span>
                <span className="block text-lg font-semibold">
                  Job search cockpit
                </span>
              </span>
            </Link>
            <form action={signOut} className="md:hidden">
              <Button variant="outline" className="size-10 rounded-lg border-[#cfc7ba] p-0">
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <form action="/app" className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#627174]" />
              <Input
                name="q"
                defaultValue={search}
                className="h-10 w-full rounded-lg border-[#cfc7ba] bg-[#fbfaf6] pl-9 sm:w-72"
                placeholder="Search pipeline"
              />
            </form>
            <nav className="flex gap-2 overflow-x-auto text-sm">
              <Link
                href="/templates"
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#cfc7ba] bg-white px-3 font-medium"
              >
                <FileText className="size-4" />
                Templates
              </Link>
              <Link
                href="/settings"
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#cfc7ba] bg-white px-3 font-medium"
              >
                <KeyRound className="size-4" />
                Keys
              </Link>
              <form action={signOut} className="hidden md:block">
                <Button variant="outline" className="h-10 rounded-lg border-[#cfc7ba]">
                  <LogOut className="size-4" />
                  Sign out
                </Button>
              </form>
            </nav>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 xl:grid-cols-[1fr_380px]">
        <section className="space-y-5">
          {params.error ? (
            <div className="rounded-lg border border-[#d97043] bg-[#fff7ed] p-3 text-sm text-[#8a421f]">
              {params.error}
            </div>
          ) : null}

          {params.message ? (
            <div className="rounded-lg border border-[#8bb8aa] bg-[#e6f2ef] p-3 text-sm text-[#17604f]">
              {params.message}
            </div>
          ) : null}

          {workspace.error ? (
            <div className="rounded-lg border border-[#d97043] bg-[#fff7ed] p-3 text-sm text-[#8a421f]">
              {workspace.error}
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            <div className="rounded-lg border border-[#d9d4c8] bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-[#627174]">
                    {workspace.profileName}
                  </p>
                  <h1 className="text-2xl font-semibold">
                    Quick Generate
                  </h1>
                </div>
                <Badge className="w-fit rounded-md bg-[#f4c95d] text-[#153f4a] hover:bg-[#f4c95d]">
                  {setupReady ? "Hand-off ready" : "Setup needed"}
                </Badge>
              </div>

              <form action={queueGenerationFromForm} className="grid gap-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <Input
                    name="company"
                    className="h-10 rounded-lg border-[#cfc7ba]"
                    placeholder="Company"
                  />
                  <Input
                    name="roleTitle"
                    className="h-10 rounded-lg border-[#cfc7ba]"
                    placeholder="Role title"
                  />
                  <Input
                    name="sourceUrl"
                    className="h-10 rounded-lg border-[#cfc7ba]"
                    placeholder="Job URL"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <select
                    name="providerKeyId"
                    className="h-10 w-full rounded-lg border border-[#cfc7ba] bg-white px-2.5 text-sm outline-none focus-visible:border-[#153f4a] focus-visible:ring-3 focus-visible:ring-[#153f4a]/20"
                    defaultValue={keyEntries[0]?.id ?? ""}
                    required
                  >
                    <option value="">Provider key</option>
                    {keyEntries.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.label} · {entry.provider}
                      </option>
                    ))}
                  </select>
                  <select
                    name="masterProfileId"
                    className="h-10 w-full rounded-lg border border-[#cfc7ba] bg-white px-2.5 text-sm outline-none focus-visible:border-[#153f4a] focus-visible:ring-3 focus-visible:ring-[#153f4a]/20"
                    defaultValue={masterProfiles[0]?.id ?? ""}
                    required
                  >
                    <option value="">Master profile</option>
                    {masterProfiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                      </option>
                    ))}
                  </select>
                  <select
                    name="templateId"
                    className="h-10 w-full rounded-lg border border-[#cfc7ba] bg-white px-2.5 text-sm outline-none focus-visible:border-[#153f4a] focus-visible:ring-3 focus-visible:ring-[#153f4a]/20"
                    defaultValue={templates[0]?.id ?? ""}
                    required
                  >
                    <option value="">DOCX template</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>

                <Textarea
                  name="jobDescription"
                  className="min-h-44 rounded-lg border-[#cfc7ba] text-base"
                  placeholder="Paste the job description"
                  required
                />

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-[#627174]">
                    Queue-backed generation keeps the web app responsive while workers create documents.
                  </p>
                  <Button
                    className="h-11 rounded-lg bg-[#d97043] px-5 text-white hover:bg-[#bd5d35]"
                    disabled={!setupReady}
                  >
                    <Sparkles className="size-4" />
                    Generate
                  </Button>
                </div>
              </form>
            </div>

            <div className="grid gap-3">
              <SetupStep
                ready={masterProfiles.length > 0}
                icon={UserRound}
                label="Profile Vault"
                href="/templates"
              />
              <SetupStep
                ready={templates.length > 0}
                icon={Layers3}
                label="Template Studio"
                href="/templates"
              />
              <SetupStep
                ready={keyEntries.length > 0}
                icon={KeyRound}
                label="LLM Keys"
                href="/settings"
              />

              {activeJob ? (
                <div className="rounded-lg border border-[#d9d4c8] bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="font-semibold">Active job</h2>
                    <Badge variant="outline" className="rounded-md border-[#cfc7ba]">
                      {activeJob.status}
                    </Badge>
                  </div>
                  <Progress value={activeJob.progress} className="h-2 rounded-lg" />
                  <p className="mt-2 text-sm text-[#627174]">
                    {activeJob.progressLabel}
                  </p>
                  {activeJob.safeErrorMessage ? (
                    <p className="mt-2 text-sm text-[#8a421f]">
                      {activeJob.safeErrorMessage}
                    </p>
                  ) : null}
                  {activeJob.resultDocumentIds.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {activeJob.resultDocumentIds.map((documentId, index) => (
                        <a
                          key={documentId}
                          href={`/api/documents/${documentId}/download`}
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#cfc7ba] px-3 text-sm font-medium"
                        >
                          <Download className="size-4" />
                          Resume {index + 1}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {stats.map(([label, value, delta]) => (
              <div key={label} className="rounded-lg border border-[#d9d4c8] bg-white p-4">
                <p className="text-sm font-medium text-[#627174]">{label}</p>
                <div className="mt-3 flex items-end justify-between gap-2">
                  <span className="text-3xl font-semibold">{value}</span>
                  <span className="text-sm text-[#627174]">{delta}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <ApplicationsChart data={workspace.chartData} />

            <div className="grid gap-4">
              <div className="rounded-lg border border-[#d9d4c8] bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Gauge className="size-4 text-[#17604f]" />
                  <h2 className="font-semibold">Match Brief</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {workspace.latestKeywords.hit.slice(0, 8).map((keyword) => (
                    <Badge
                      key={keyword}
                      className="rounded-md bg-[#e6f2ef] text-[#17604f] hover:bg-[#e6f2ef]"
                    >
                      {keyword}
                    </Badge>
                  ))}
                  {workspace.latestKeywords.missed.slice(0, 8).map((keyword) => (
                    <Badge
                      key={keyword}
                      variant="outline"
                      className="rounded-md border-[#d97043] text-[#a44825]"
                    >
                      {keyword}
                    </Badge>
                  ))}
                  {workspace.latestKeywords.hit.length === 0 &&
                  workspace.latestKeywords.missed.length === 0 ? (
                    <p className="text-sm text-[#627174]">
                      Generate once to see fit, missing keywords, and ATS guardrails.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-lg border border-[#d9d4c8] bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <MessageSquareText className="size-4 text-[#d97043]" />
                  <h2 className="font-semibold">Outreach Pack</h2>
                </div>
                <div className="grid gap-2 text-sm text-[#627174]">
                  <div className="flex items-center gap-2">
                    <Send className="size-4" />
                    Recruiter note drafts
                  </div>
                  <div className="flex items-center gap-2">
                    <Bell className="size-4" />
                    Follow-up reminders
                  </div>
                  <div className="flex items-center gap-2">
                    <Download className="size-4" />
                    DOCX/PDF exports
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[#d9d4c8] bg-white">
            <div className="flex items-center justify-between border-b border-[#ebe5d9] px-4 py-3">
              <div className="flex items-center gap-2">
                <BriefcaseBusiness className="size-4 text-[#17604f]" />
                <h2 className="text-lg font-semibold">Application Pipeline</h2>
              </div>
            </div>
            <div className="divide-y divide-[#ebe5d9]">
              {workspace.applications.length === 0 ? (
                <div className="px-4 py-8 text-sm text-[#627174]">
                  Generate your first tailored set to start the pipeline.
                </div>
              ) : null}

              {workspace.applications.map((application) => (
                <div
                  key={application.id}
                  className="grid gap-4 px-4 py-4 md:grid-cols-[1fr_120px_96px]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{application.role}</h3>
                      <Badge variant="outline" className="rounded-md border-[#cfc7ba]">
                        {application.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-[#627174]">
                      {application.company} · {application.date}
                    </p>
                    <p className="mt-2 text-sm text-[#8a5c33]">
                      {application.missed.length > 0
                        ? `Missing: ${application.missed.join(", ")}`
                        : "No missing keywords recorded"}
                    </p>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span>ATS</span>
                      <span className="font-semibold">
                        {application.score === null ? "n/a" : `${application.score}%`}
                      </span>
                    </div>
                    <Progress value={application.score ?? 0} className="h-2 rounded-lg" />
                  </div>
                  <div className="flex items-center gap-2 md:justify-end">
                    <CheckCircle2
                      className={`size-5 ${
                        application.onePageSafe ? "text-[#17604f]" : "text-[#d97043]"
                      }`}
                    />
                    <span className="text-sm text-[#627174]">
                      {application.onePageSafe ? "Fits" : "Review"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-lg border border-[#d9d4c8] bg-white p-4">
            <h2 className="text-lg font-semibold">Hand-off mode</h2>
            <p className="mt-2 text-sm leading-6 text-[#627174]">
              Once your profile, template, and key are ready, mobile generation is a
              paste-and-go workflow.
            </p>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Profiles</span>
                <Badge variant="outline" className="rounded-md border-[#cfc7ba]">
                  {workspace.stats.masterProfiles}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Templates</span>
                <Badge variant="outline" className="rounded-md border-[#cfc7ba]">
                  {workspace.stats.templates}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Provider keys</span>
                <Badge variant="outline" className="rounded-md border-[#cfc7ba]">
                  {keyEntries.length}
                </Badge>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[#d9d4c8] bg-white p-4">
            <h2 className="text-lg font-semibold">Production queues</h2>
            <p className="mt-2 text-sm leading-6 text-[#627174]">
              Generation, document export, and scheduling workers can scale
              horizontally behind Redis.
            </p>
            <Link
              href="/admin/queues"
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-[#cfc7ba] px-3 text-sm font-medium"
            >
              <Gauge className="size-4" />
              Queue dashboard
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
