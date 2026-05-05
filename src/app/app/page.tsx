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
import { redirect } from "next/navigation";
import { ApplicationsChart } from "@/components/dashboard/applications-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";

export const dynamic = "force-dynamic";

const chartData = [
  { label: "Mon", sent: 3, replies: 1, score: 78 },
  { label: "Tue", sent: 4, replies: 1, score: 82 },
  { label: "Wed", sent: 2, replies: 0, score: 80 },
  { label: "Thu", sent: 6, replies: 2, score: 87 },
  { label: "Fri", sent: 5, replies: 2, score: 91 },
  { label: "Sat", sent: 1, replies: 0, score: 84 },
  { label: "Sun", sent: 2, replies: 1, score: 88 },
];

const applications = [
  {
    company: "Northstar Health",
    role: "Senior Full-Stack Engineer",
    status: "Interviewing",
    score: 91,
    date: "May 3",
    missed: ["FHIR"],
  },
  {
    company: "LatticeWorks",
    role: "Product Engineer, AI Tools",
    status: "Applied",
    score: 86,
    date: "May 2",
    missed: ["LangGraph", "SOC 2"],
  },
  {
    company: "Harbor Grid",
    role: "Frontend Platform Lead",
    status: "Draft",
    score: 74,
    date: "May 1",
    missed: ["Design systems"],
  },
];

const navItems = [
  { label: "Dashboard", icon: BriefcaseBusiness },
  { label: "Generator", icon: FileText },
  { label: "Key Vault", icon: KeyRound },
  { label: "ATS Guard", icon: ShieldCheck },
];

export default async function AppPage() {
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
            {navItems.map(({ label, icon: Icon }) => (
              <button
                key={label}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[#e9f4f2] hover:bg-white/10"
              >
                <Icon className="size-4" />
                {label}
              </button>
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
                {user.email ?? "Workspace"}
              </p>
              <h2 className="text-2xl font-semibold">Application command center</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#627174]" />
                <Input
                  className="h-10 w-full rounded-lg border-[#cfc7ba] bg-[#fbfaf6] pl-9 sm:w-72"
                  placeholder="Search applications"
                />
              </div>
              <Button className="h-10 rounded-lg bg-[#d97043] px-4 text-white hover:bg-[#bd5d35]">
                <Sparkles className="size-4" />
                New draft
              </Button>
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
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  ["Sent", "23", "+5"],
                  ["Replies", "7", "+2"],
                  ["Avg. ATS", "85%", "+4"],
                  ["1-page safe", "18", "ok"],
                ].map(([label, value, delta]) => (
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

              <ApplicationsChart data={chartData} />

              <div className="rounded-lg border border-[#d9d4c8] bg-white">
                <div className="flex items-center justify-between border-b border-[#ebe5d9] px-4 py-3">
                  <h2 className="text-lg font-semibold">Applications</h2>
                  <Button variant="ghost" className="h-8 rounded-lg text-[#17604f]">
                    View all
                    <ArrowUpRight className="size-4" />
                  </Button>
                </div>
                <div className="divide-y divide-[#ebe5d9]">
                  {applications.map((application) => (
                    <div
                      key={`${application.company}-${application.role}`}
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
                          Missed: {application.missed.join(", ")}
                        </p>
                      </div>
                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span>ATS</span>
                          <span className="font-semibold">{application.score}%</span>
                        </div>
                        <Progress value={application.score} className="h-2 rounded-lg" />
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
                  <h2 className="text-lg font-semibold">Active generation</h2>
                  <Badge className="rounded-md bg-[#f4c95d] text-[#153f4a] hover:bg-[#f4c95d]">
                    85%
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
                  {["React", "Node.js", "PostgreSQL", "Supabase", "Ownership"].map(
                    (keyword) => (
                      <Badge
                        key={keyword}
                        className="rounded-md bg-[#e6f2ef] text-[#17604f] hover:bg-[#e6f2ef]"
                      >
                        {keyword}
                      </Badge>
                    ),
                  )}
                  {["SOC 2", "FHIR"].map((keyword) => (
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
