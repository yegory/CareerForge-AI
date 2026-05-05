import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from "prom-client";

const registry = new Registry();
collectDefaultMetrics({ register: registry });

export const generationJobsTotal = new Counter({
  name: "careerforge_generation_jobs_total",
  help: "Generation jobs by final status.",
  labelNames: ["status", "provider"] as const,
  registers: [registry],
});

export const generationJobDurationSeconds = new Histogram({
  name: "careerforge_generation_job_duration_seconds",
  help: "Generation job duration in seconds.",
  labelNames: ["provider"] as const,
  buckets: [1, 5, 15, 30, 60, 120, 300],
  registers: [registry],
});

export const queueDepthGauge = new Gauge({
  name: "careerforge_queue_depth",
  help: "BullMQ queue depth by queue and state.",
  labelNames: ["queue", "state"] as const,
  registers: [registry],
});

export const providerValidationTotal = new Counter({
  name: "careerforge_provider_validation_total",
  help: "Provider key validation attempts.",
  labelNames: ["provider", "status"] as const,
  registers: [registry],
});

export function getMetricsRegistry() {
  return registry;
}
