import { Queue, type JobsOptions } from "bullmq";
import IORedis from "ioredis";
import { getRedisUrl } from "@/lib/env.server";

export const queueNames = {
  generation: "generation",
  documents: "documents",
  scheduler: "scheduler",
} as const;

export interface GenerationJobPayload {
  generationJobId: string;
}

let connection: IORedis | null = null;
let generationQueue: Queue<GenerationJobPayload> | null = null;
let documentsQueue: Queue | null = null;
let schedulerQueue: Queue | null = null;

export function createRedisConnection() {
  const redisUrl = getRedisUrl();

  if (!redisUrl) {
    throw new Error("REDIS_URL is required for background jobs.");
  }

  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

function sharedConnection() {
  connection ??= createRedisConnection();
  return connection;
}

const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 30000,
  },
  removeOnComplete: {
    age: 60 * 60 * 24 * 7,
    count: 1000,
  },
  removeOnFail: {
    age: 60 * 60 * 24 * 30,
  },
};

export function getGenerationQueue() {
  generationQueue ??= new Queue<GenerationJobPayload>(queueNames.generation, {
    connection: sharedConnection(),
    defaultJobOptions,
  });

  return generationQueue;
}

export function getDocumentsQueue() {
  documentsQueue ??= new Queue(queueNames.documents, {
    connection: sharedConnection(),
    defaultJobOptions,
  });

  return documentsQueue;
}

export function getSchedulerQueue() {
  schedulerQueue ??= new Queue(queueNames.scheduler, {
    connection: sharedConnection(),
    defaultJobOptions,
  });

  return schedulerQueue;
}

export async function getQueueHealth() {
  const queues = [getGenerationQueue(), getDocumentsQueue(), getSchedulerQueue()];

  return Promise.all(
    queues.map(async (queue) => {
      const counts = await queue.getJobCounts(
        "waiting",
        "active",
        "delayed",
        "completed",
        "failed",
        "paused",
      );

      return {
        name: queue.name,
        counts,
      };
    }),
  );
}

export async function closeQueues() {
  await Promise.all([
    generationQueue?.close(),
    documentsQueue?.close(),
    schedulerQueue?.close(),
    connection?.quit(),
  ]);
  generationQueue = null;
  documentsQueue = null;
  schedulerQueue = null;
  connection = null;
}
