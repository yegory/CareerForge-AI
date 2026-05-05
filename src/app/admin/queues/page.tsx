import { Activity, AlertTriangle, ArrowLeft, TimerReset } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminEmails } from "@/lib/env.server";
import { getQueueHealth } from "@/lib/queue/bullmq";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function QueueAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin/queues");
  }

  const adminEmails = getAdminEmails();

  if (!user.email || !adminEmails.includes(user.email.toLowerCase())) {
    redirect("/app?error=Admin%20access%20required");
  }

  let queues: Awaited<ReturnType<typeof getQueueHealth>> = [];
  let error: string | null = null;

  try {
    queues = await getQueueHealth();
  } catch (queueError) {
    error =
      queueError instanceof Error ? queueError.message : "Could not load queue health.";
  }

  return (
    <main className="min-h-screen bg-[#f7f4ed] px-4 py-5 text-[#152023] sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/app"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-[#17604f]"
        >
          <ArrowLeft className="size-4" />
          Workspace
        </Link>

        <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-[#627174]">Admin operations</p>
            <h1 className="text-3xl font-semibold">Queue health</h1>
          </div>
          <a
            href="/api/metrics"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#cfc7ba] bg-white px-3 text-sm font-medium"
          >
            <Activity className="size-4 text-[#17604f]" />
            Prometheus metrics
          </a>
        </header>

        {error ? (
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-[#d97043] bg-[#fff7ed] p-4 text-sm text-[#8a421f]">
            <AlertTriangle className="mt-0.5 size-4" />
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          {queues.map((queue) => (
            <div key={queue.name} className="rounded-lg border border-[#d9d4c8] bg-white p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold capitalize">{queue.name}</h2>
                <TimerReset className="size-4 text-[#d97043]" />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {Object.entries(queue.counts).map(([state, count]) => (
                  <div key={state} className="rounded-md bg-[#f7f4ed] p-3">
                    <p className="text-[#627174] capitalize">{state}</p>
                    <p className="mt-1 text-2xl font-semibold">{count}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
