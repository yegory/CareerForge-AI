import { Worker } from "bullmq";
import { getMissingWorkerEnvNames } from "@/lib/env.server";
import { createRedisConnection, queueNames } from "@/lib/queue/bullmq";

async function main() {
  const missing = getMissingWorkerEnvNames();

  if (missing.length > 0) {
    throw new Error(`Missing worker env vars: ${missing.join(", ")}`);
  }

  const worker = new Worker(
    queueNames.documents,
    async () => ({
      ok: true,
      message:
        "Document jobs are currently rendered inline by generation workers. This queue is reserved for PDF conversion and heavy exports.",
    }),
    {
      connection: createRedisConnection(),
      concurrency: Number(process.env.DOCUMENT_WORKER_CONCURRENCY ?? 2),
    },
  );

  worker.on("error", (error) => {
    console.error(error);
  });
}

void main();
