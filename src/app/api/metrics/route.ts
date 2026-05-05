import { NextResponse } from "next/server";
import { getMetricsRegistry, queueDepthGauge } from "@/lib/metrics/registry";
import { getQueueHealth } from "@/lib/queue/bullmq";

export async function GET() {
  try {
    const queues = await getQueueHealth();

    queues.forEach((queue) => {
      Object.entries(queue.counts).forEach(([state, value]) => {
        queueDepthGauge.set({ queue: queue.name, state }, value);
      });
    });
  } catch {
    // Metrics should stay available even if Redis is temporarily unreachable.
  }

  const registry = getMetricsRegistry();

  return new NextResponse(await registry.metrics(), {
    headers: {
      "content-type": registry.contentType,
    },
  });
}
