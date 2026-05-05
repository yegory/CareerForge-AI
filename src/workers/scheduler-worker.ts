import { Worker } from "bullmq";
import { getMissingWorkerEnvNames } from "@/lib/env.server";
import { createRedisConnection, getSchedulerQueue, queueNames } from "@/lib/queue/bullmq";
import { createAdminClient } from "@/lib/supabase/admin";

async function repairStalledGenerationJobs() {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  await supabase
    .from("generation_jobs")
    .update({
      status: "failed",
      progress: 100,
      progress_label: "Timed out",
      safe_error_code: "JOB_TIMEOUT",
      safe_error_message: "Generation timed out and can be retried.",
      completed_at: new Date().toISOString(),
    })
    .eq("status", "running")
    .lt("updated_at", cutoff);
}

async function dispatchDueReminders() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("scheduled_reminders")
    .select("id,user_id,application_id,kind,message")
    .eq("status", "scheduled")
    .lte("run_at", new Date().toISOString())
    .limit(100);

  if (error) {
    throw error;
  }

  for (const reminder of data ?? []) {
    await supabase.from("application_events").insert({
      application_id: reminder.application_id,
      user_id: reminder.user_id,
      event_type: reminder.kind,
      body: reminder.message,
    });
    await supabase
      .from("scheduled_reminders")
      .update({ status: "sent", updated_at: new Date().toISOString() })
      .eq("id", reminder.id);
  }
}

async function main() {
  const missing = getMissingWorkerEnvNames();

  if (missing.length > 0) {
    throw new Error(`Missing worker env vars: ${missing.join(", ")}`);
  }

  await getSchedulerQueue().add(
    "maintenance",
    {},
    {
      jobId: "maintenance",
      repeat: {
        every: 5 * 60 * 1000,
      },
    },
  );

  const worker = new Worker(
    queueNames.scheduler,
    async () => {
      await repairStalledGenerationJobs();
      await dispatchDueReminders();
      return { ok: true };
    },
    {
      connection: createRedisConnection(),
      concurrency: 1,
    },
  );

  worker.on("error", (error) => {
    console.error(error);
  });
}

void main();
