import { randomUUID } from "node:crypto";
import { Worker, type Job } from "bullmq";
import { z } from "zod";
import {
  masterProfileSchema,
  type MasterProfile,
  type PlaceholderConstraint,
} from "@/lib/ats/schemas";
import { generateAtsPackage } from "@/lib/ats/engine";
import { renderDocxTemplate } from "@/lib/docx/render-template";
import { getMissingWorkerEnvNames } from "@/lib/env.server";
import { createProviderClient } from "@/lib/llm/providers";
import {
  generationJobDurationSeconds,
  generationJobsTotal,
} from "@/lib/metrics/registry";
import { createRedisConnection, queueNames, type GenerationJobPayload } from "@/lib/queue/bullmq";
import { applyProviderRateLimit } from "@/lib/queue/rate-limit";
import { decryptSecret } from "@/lib/security/key-vault";
import { createAdminClient } from "@/lib/supabase/admin";

const workerId = `generation-worker-${randomUUID()}`;
const jobRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  application_id: z.string().uuid(),
  preset_id: z.string().uuid().nullable(),
  master_profile_id: z.string().uuid().nullable(),
  docx_template_id: z.string().uuid().nullable(),
  provider_key_id: z.string().uuid(),
  provider: z.string(),
  model: z.string(),
  job_description: z.string(),
  source_url: z.string().nullable(),
  status: z.string(),
});

function fallbackMasterProfile(content: Record<string, unknown>): MasterProfile {
  const sourceText =
    typeof content.sourceText === "string" ? content.sourceText : JSON.stringify(content);

  return {
    fullName: "Candidate",
    headline: "Job candidate",
    contact: {
      links: [],
    },
    summary: sourceText.slice(0, 1200),
    skills: [],
    experience: [
      {
        company: "Imported profile",
        role: "Candidate",
        startDate: "Current",
        endDate: "Current",
        bullets: sourceText
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean)
          .slice(0, 10),
        metrics: [],
      },
    ],
    education: [],
    projects: [],
  };
}

function parseMasterProfile(content: unknown): MasterProfile {
  const parsed = masterProfileSchema.safeParse(content);

  if (parsed.success) {
    return parsed.data;
  }

  return fallbackMasterProfile(
    content && typeof content === "object" ? (content as Record<string, unknown>) : {},
  );
}

function blocksToTemplateData(result: Awaited<ReturnType<typeof generateAtsPackage>>) {
  return Object.fromEntries(
    [...result.generatedContent.resumeBlocks, ...result.generatedContent.coverLetterBlocks].map(
      (block) => [block.placeholder, block.value],
    ),
  );
}

async function updateProgress(
  supabase: ReturnType<typeof createAdminClient>,
  id: string,
  progress: number,
  progressLabel: string,
) {
  await supabase
    .from("generation_jobs")
    .update({ status: "running", progress, progress_label: progressLabel })
    .eq("id", id);
}

async function ensureNotCancelled(
  supabase: ReturnType<typeof createAdminClient>,
  id: string,
) {
  const { data, error } = await supabase
    .from("generation_jobs")
    .select("status")
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  if (data.status === "cancelled") {
    throw new Error("Generation job was cancelled.");
  }
}

async function processGenerationJob(job: Job<GenerationJobPayload>) {
  const started = Date.now();
  const supabase = createAdminClient();
  const { generationJobId } = job.data;

  await supabase
    .from("generation_jobs")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
      progress: 10,
      progress_label: "Loading workspace",
      attempts: job.attemptsMade + 1,
      metrics: {
        workerId,
        queueJobId: job.id,
      },
    })
    .eq("id", generationJobId)
    .eq("status", "queued");

  const { data: rawJob, error: jobError } = await supabase
    .from("generation_jobs")
    .select("*")
    .eq("id", generationJobId)
    .single();

  if (jobError) {
    throw jobError;
  }

  const generationJob = jobRowSchema.parse(rawJob);

  if (generationJob.status === "cancelled") {
    return;
  }

  if (!generationJob.master_profile_id) {
    throw new Error("Master profile is required before generation.");
  }

  if (!generationJob.provider_key_id) {
    throw new Error("Provider key is required before generation.");
  }

  const [profileResult, templateResult, keyResult] = await Promise.all([
    supabase
      .from("master_profiles")
      .select("content")
      .eq("id", generationJob.master_profile_id)
      .eq("user_id", generationJob.user_id)
      .single(),
    generationJob.docx_template_id
      ? supabase
          .from("docx_templates")
          .select("storage_path,placeholders")
          .eq("id", generationJob.docx_template_id)
          .eq("user_id", generationJob.user_id)
          .single()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("llm_key_vault_entries")
      .select("id,provider,encrypted_key,encryption_nonce")
      .eq("id", generationJob.provider_key_id)
      .eq("user_id", generationJob.user_id)
      .single(),
  ]);

  if (profileResult.error) {
    throw profileResult.error;
  }

  if (templateResult.error) {
    throw templateResult.error;
  }

  if (keyResult.error) {
    throw keyResult.error;
  }

  await ensureNotCancelled(supabase, generationJobId);
  await updateProgress(supabase, generationJobId, 25, "Rate limiting provider");
  await applyProviderRateLimit({
    provider: generationJob.provider,
    userId: generationJob.user_id,
    keyId: generationJob.provider_key_id,
  });

  const apiKey = decryptSecret({
    encryptedKey: keyResult.data.encrypted_key,
    encryptionNonce: keyResult.data.encryption_nonce,
  });
  const client = createProviderClient({
    provider: keyResult.data.provider,
    apiKey,
    model: generationJob.model,
  });
  const masterProfile = parseMasterProfile(profileResult.data.content);
  const constraints = (templateResult.data?.placeholders ?? []) as PlaceholderConstraint[];

  await updateProgress(supabase, generationJobId, 40, "Generating tailored content");
  const result = await generateAtsPackage({
    client,
    jobDescription: generationJob.job_description,
    masterProfile,
    constraints,
  });

  await ensureNotCancelled(supabase, generationJobId);
  await updateProgress(supabase, generationJobId, 72, "Saving match brief");
  const { data: generationRun, error: generationRunError } = await supabase
    .from("generation_runs")
    .insert({
      application_id: generationJob.application_id,
      preset_id: generationJob.preset_id,
      provider: generationJob.provider,
      model: generationJob.model,
      prompt_fingerprint: result.promptFingerprint,
      jd_analysis: result.jdAnalysis,
      generated_content: result.generatedContent,
      match_result: result.matchResult,
      constraint_result: result.spatialEvaluation,
    })
    .select("id")
    .single();

  if (generationRunError) {
    throw generationRunError;
  }

  const documentIds: string[] = [];

  if (templateResult.data?.storage_path) {
    await updateProgress(supabase, generationJobId, 84, "Rendering DOCX");
    const { data: templateFile, error: templateDownloadError } = await supabase.storage
      .from("templates")
      .download(templateResult.data.storage_path);

    if (templateDownloadError) {
      throw templateDownloadError;
    }

    const templateBuffer = Buffer.from(await templateFile.arrayBuffer());
    const rendered = renderDocxTemplate({
      template: templateBuffer,
      data: blocksToTemplateData(result),
      constraints,
      allowConstraintViolations: false,
    });

    if (!rendered.ok) {
      throw new Error("Generated content does not fit the selected template.");
    }

    const storagePath = `${generationJob.user_id}/generated/${generationJob.application_id}/${generationRun.id}-resume.docx`;
    const { error: uploadError } = await supabase.storage
      .from("generated-documents")
      .upload(storagePath, rendered.buffer, {
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: documentRow, error: documentError } = await supabase
      .from("documents")
      .insert({
        application_id: generationJob.application_id,
        generation_run_id: generationRun.id,
        kind: "resume_docx",
        storage_path: storagePath,
      })
      .select("id")
      .single();

    if (documentError) {
      throw documentError;
    }

    documentIds.push(documentRow.id);
  }

  await supabase
    .from("applications")
    .update({
      role_title: result.jdAnalysis.roleTitle,
      company: result.jdAnalysis.company ?? undefined,
    })
    .eq("id", generationJob.application_id)
    .eq("user_id", generationJob.user_id);

  await supabase
    .from("generation_jobs")
    .update({
      status: "succeeded",
      progress: 100,
      progress_label: documentIds.length > 0 ? "Documents ready" : "Match brief ready",
      result_generation_run_id: generationRun.id,
      result_document_ids: documentIds,
      completed_at: new Date().toISOString(),
      metrics: {
        workerId,
        queueJobId: job.id,
        durationMs: Date.now() - started,
      },
    })
    .eq("id", generationJobId);

  const durationSeconds = (Date.now() - started) / 1000;
  generationJobsTotal.inc({ status: "succeeded", provider: generationJob.provider });
  generationJobDurationSeconds.observe({ provider: generationJob.provider }, durationSeconds);
}

async function markFailed(job: Job<GenerationJobPayload> | undefined, error: Error) {
  if (!job?.data.generationJobId) {
    return;
  }

  const supabase = createAdminClient();
  const safeMessage =
    error.message.includes("API key") || error.message.includes("secret")
      ? "Provider call failed. Check the selected provider key."
      : error.message;

  await supabase
    .from("generation_jobs")
    .update({
      status: "failed",
      progress: 100,
      progress_label: "Generation failed",
      safe_error_code: "GENERATION_FAILED",
      safe_error_message: safeMessage,
      completed_at: new Date().toISOString(),
    })
    .eq("id", job.data.generationJobId)
    .neq("status", "cancelled");

  const provider = typeof job.data.generationJobId === "string" ? "unknown" : "unknown";
  generationJobsTotal.inc({ status: "failed", provider });
}

async function main() {
  const missing = getMissingWorkerEnvNames();

  if (missing.length > 0) {
    throw new Error(`Missing worker env vars: ${missing.join(", ")}`);
  }

  const worker = new Worker<GenerationJobPayload>(
    queueNames.generation,
    processGenerationJob,
    {
      connection: createRedisConnection(),
      concurrency: Number(process.env.GENERATION_WORKER_CONCURRENCY ?? 4),
      limiter: {
        max: Number(process.env.GENERATION_QUEUE_MAX_PER_MINUTE ?? 60),
        duration: 60_000,
      },
    },
  );

  worker.on("failed", (job, error) => {
    void markFailed(job, error);
  });

  worker.on("error", (error) => {
    console.error(error);
  });
}

void main();
