import {
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  Flame,
  KeyRound,
  Search,
  ShieldCheck,
  Sparkles,
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
import { createClient } from "@/lib/supabase/server";
import { loadWorkspaceData } from "@/lib/workspace/data";
import { signOut } from "../login/actions";
import { createApplication } from "./actions";

export const dynamic = "force-dynamic";

const navItems = [
  { label: "Dashboard", icon: BriefcaseBusiness, href: "/app" },
  { label: "Templates", icon: FileText, href: "/templates" },
  { label: "Key Vault", icon: KeyRound, href: "/settings" },
  { label: "ATS Guard", icon: ShieldCheck, href: "/app" },
];

interface AppPageProps {
  searchParams: Promise<{
    q?: string;
    error?: string;
    message?: string;
  }>;
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

  const workspace = await loadWorkspaceData(supabase, user, search);
  const stats = [
    ["Sent", String(workspace.stats.sent), `${workspace.stats.applications} total`],
    ["Replies", String(workspace.stats.replies), "interviews"],
    ["Avg. ATS", `${workspace.stats.avgScore}%`, "latest runs"],
    ["1-page safe", String(workspace.stats.onePageSafe), "verified"],
  ];

  return (
    <main className="min-h-screen bg-[#f7f4ed] text-[#152023]">
      <div className="grid min-h-screen lg:grid-cols-[252px_1fr]">
        <aside className="border-r border-[#d9d4c8] bg-[#153f4a] px-5 py-6 text-white">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-[#f4c95d] text-[#153f4a]">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="text-sm text-[#c8e0df]">CareerForge</p>
              <h1 className="text-xl font-semibold">AI</h1>
            </div>
          </div>

          <nav className="space-y-1 text-sm">
            {navItems.map(({ label, icon: Icon, href }) => (
              <Link
                key={label}
                href={href}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[#e9f4f2] hover:bg-white/10"
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="mt-10 rounded-lg border border-white/15 bg-white/10 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <Flame className="size-4 text-[#f4c95d]" />
              Streak
            </div>
            <p className="text-3xl font-semibold">9 days</p>
            <p className="mt-1 text-sm text-[#c8e0df]">23 applications this week</p>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="flex flex-col gap-4 border-b border-[#d9d4c8] bg-white px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-[#627174]">
                {workspace.profileName}
              </p>
              <h2 className="text-2xl font-semibold">Application command center</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <form action="/app" className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#627174]" />
                <Input
                  name="q"
                  defaultValue={search}
                  className="h-10 w-full rounded-lg border-[#cfc7ba] bg-[#fbfaf6] pl-9 sm:w-72"
                  placeholder="Search applications"
                />
              </form>
              <form action={signOut}>
                <Button
                  variant="outline"
                  className="h-10 rounded-lg border-[#cfc7ba]"
                >
                  Sign out
                </Button>
              </form>
            </div>
          </header>

          <section className="grid gap-5 p-5 xl:grid-cols-[1fr_360px]">
            <div className="space-y-5">
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

              <div className="grid gap-4 md:grid-cols-4">
                {stats.map(([label, value, delta]) => (
                  <div key={label} className="rounded-lg border border-[#d9d4c8] bg-white p-4">
                    <p className="text-sm font-medium text-[#627174]">{label}</p>
                    <div className="mt-3 flex items-end justify-between">
                      <span className="text-3xl font-semibold">{value}</span>
                      <Badge className="rounded-md bg-[#e6f2ef] text-[#17604f] hover:bg-[#e6f2ef]">
                        {delta}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              <ApplicationsChart data={workspace.chartData} />

              <div className="rounded-lg border border-[#d9d4c8] bg-white">
                <div className="flex items-center justify-between border-b border-[#ebe5d9] px-4 py-3">
                  <h2 className="text-lg font-semibold">Applications</h2>
                  <Button variant="ghost" className="h-8 rounded-lg text-[#17604f]">
                    View all
                    <ArrowUpRight className="size-4" />
                  </Button>
                </div>
                <div className="divide-y divide-[#ebe5d9]">
                  {workspace.applications.length === 0 ? (
                    <div className="px-4 py-8 text-sm text-[#627174]">
                      No applications yet. Add a draft from the panel on the right.
                    </div>
                  ) : null}

                  {workspace.applications.map((application) => (
                    <div
                      key={application.id}
                      className="grid gap-4 px-4 py-4 md:grid-cols-[1fr_110px_90px]"
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
                            ? `Missed: ${application.missed.join(", ")}`
                            : "No generation run yet"}
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
                      <Button variant="outline" className="h-9 rounded-lg border-[#cfc7ba]">
                        Open
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="space-y-5">
              <div className="rounded-lg border border-[#d9d4c8] bg-white p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">New application</h2>
                  <Sparkles className="size-4 text-[#d97043]" />
                </div>
                <form action={createApplication} className="space-y-3">
                  <Input
                    name="company"
                    className="h-10 rounded-lg border-[#cfc7ba]"
                    placeholder="Company"
                    required
                  />
                  <Input
                    name="roleTitle"
                    className="h-10 rounded-lg border-[#cfc7ba]"
                    placeholder="Role title"
                    required
                  />
                  <Input
                    name="sourceUrl"
                    className="h-10 rounded-lg border-[#cfc7ba]"
                    placeholder="Job URL"
                  />
                  <select
                    name="status"
                    defaultValue="draft"
                    className="h-10 w-full rounded-lg border border-[#cfc7ba] bg-white px-2.5 text-sm outline-none focus-visible:border-[#153f4a] focus-visible:ring-3 focus-visible:ring-[#153f4a]/20"
                  >
                    <option value="draft">Draft</option>
                    <option value="applied">Applied</option>
                    <option value="interviewing">Interviewing</option>
                    <option value="offer">Offer</option>
                    <option value="rejected">Rejected</option>
                    <option value="archived">Archived</option>
                  </select>
                  <Textarea
                    name="jobDescription"
                    className="min-h-28 rounded-lg border-[#cfc7ba]"
                    placeholder="Paste job description"
                    required
                  />
                  <Button className="h-10 w-full rounded-lg bg-[#d97043] text-white hover:bg-[#bd5d35]">
                    Create draft
                  </Button>
                </form>
              </div>

              <div className="rounded-lg border border-[#d9d4c8] bg-white p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Active generation</h2>
                  <Badge className="rounded-md bg-[#f4c95d] text-[#153f4a] hover:bg-[#f4c95d]">
                    {workspace.stats.avgScore}%
                  </Badge>
                </div>
                <div className="space-y-4">
                  {["JD analysis", "Content generation", "Match verification"].map(
                    (step, index) => (
                      <div key={step} className="flex gap-3">
                        <CheckCircle2
                          className={`mt-0.5 size-5 ${
                            index < 2 ? "text-[#17604f]" : "text-[#d97043]"
                          }`}
                        />
                        <div>
                          <p className="font-medium">{step}</p>
                          <p className="text-sm text-[#627174]">
                            {index < 2 ? "Complete" : "Spatial review pending"}
                          </p>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-[#d9d4c8] bg-white p-4">
                <h2 className="text-lg font-semibold">Keyword coverage</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {workspace.latestKeywords.hit.length === 0 &&
                  workspace.latestKeywords.missed.length === 0 ? (
                    <p className="text-sm text-[#627174]">
                      Run generation to see keyword coverage.
                    </p>
                  ) : null}
                  {workspace.latestKeywords.hit.map(
                    (keyword) => (
                      <Badge
                        key={keyword}
                        className="rounded-md bg-[#e6f2ef] text-[#17604f] hover:bg-[#e6f2ef]"
                      >
                        {keyword}
                      </Badge>
                    ),
                  )}
                  {workspace.latestKeywords.missed.map((keyword) => (
                    <Badge
                      key={keyword}
                      variant="outline"
                      className="rounded-md border-[#d97043] text-[#a44825]"
                    >
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            </aside>
          </section>
        </div>
      </div>
    </main>
  );
}
