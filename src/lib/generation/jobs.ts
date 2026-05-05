import { createHash } from "node:crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { z } from "zod";
import { getGenerationQueue, queueNames } from "@/lib/queue/bullmq";
import {
  providerNameSchema,
  requireProviderDefinition,
  type ProviderName,
} from "@/lib/llm/registry";

export const generationJobStatusSchema = z.enum([
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
]);

export const createGenerationJobRequestSchema = z.object({
  applicationId: z.string().uuid().optional(),
  company: z.string().trim().min(1).max(160).optional(),
  roleTitle: z.string().trim().min(1).max(160).optional(),
  jobDescription: z.string().trim().min(20).max(40000),
  sourceUrl: z.string().trim().url().optional().or(z.literal("")),
  presetId: z.string().uuid().optional(),
  masterProfileId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  providerKeyId: z.string().uuid().optional(),
  provider: providerNameSchema.optional(),
  model: z.string().trim().min(1).max(160).optional(),
  idempotencyKey: z.string().trim().min(8).max(160).optional(),
});

export type CreateGenerationJobRequest = z.infer<
  typeof createGenerationJobRequestSchema
>;

export interface GenerationJobDTO {
  id: string;
  status: z.infer<typeof generationJobStatusSchema>;
  progress: number;
  progressLabel: string;
  applicationId: string | null;
  provider: ProviderName;
  model: string;
  queueJobId: string | null;
  safeErrorCode: string | null;
  safeErrorMessage: string | null;
  resultGenerationRunId: string | null;
  resultDocumentIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface GenerationJobRow {
  id: string;
  status: string;
  progress: number;
  progress_label: string;
  application_id: string | null;
  provider: string;
  model: string;
  queue_job_id: string | null;
  safe_error_code: string | null;
  safe_error_message: string | null;
  result_generation_run_id: string | null;
  result_document_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

interface KeyVaultRow {
  id: string;
  provider: ProviderName;
}

function fingerprint(values: Array<string | null | undefined>) {
  return createHash("sha256")
    .update(values.filter(Boolean).join("\n"))
    .digest("hex")
    .slice(0, 48);
}

function toDTO(row: GenerationJobRow): GenerationJobDTO {
  return {
    id: row.id,
    status: generationJobStatusSchema.parse(row.status),
    progress: row.progress,
    progressLabel: row.progress_label,
    applicationId: row.application_id,
    provider: providerNameSchema.parse(row.provider),
    model: row.model,
    queueJobId: row.queue_job_id,
    safeErrorCode: row.safe_error_code,
    safeErrorMessage: row.safe_error_message,
    resultGenerationRunId: row.result_generation_run_id,
    resultDocumentIds: row.result_document_ids ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function selectFirstOwnedId(
  supabase: SupabaseClient,
  table: "master_profiles" | "docx_templates",
  userId: string,
  requestedId?: string,
) {
  let query = supabase
    .from(table)
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (requestedId) {
    query = query.eq("id", requestedId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id as string | undefined;
}

async function selectProviderKey(
  supabase: SupabaseClient,
  userId: string,
  input: CreateGenerationJobRequest,
) {
  let query = supabase
    .from("llm_key_vault_entries")
    .select("id,provider")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (input.providerKeyId) {
    query = query.eq("id", input.providerKeyId);
  }

  if (input.provider) {
    query = query.eq("provider", input.provider);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  return data as KeyVaultRow | null;
}

async function ensureApplication(
  supabase: SupabaseClient,
  userId: string,
  input: CreateGenerationJobRequest,
) {
  if (input.applicationId) {
    const { data, error } = await supabase
      .from("applications")
      .select("id")
      .eq("id", input.applicationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error("Application was not found.");
    }

    return data.id as string;
  }

  const { data, error } = await supabase
    .from("applications")
    .insert({
      user_id: userId,
      company: input.company ?? "Unknown company",
      role_title: input.roleTitle ?? "Target role",
      job_description: input.jobDescription,
      source_url: input.sourceUrl || null,
      status: "draft",
      applied_at: null,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

export async function enqueueGenerationJob(
  supabase: SupabaseClient,
  generationJobId: string,
) {
  try {
    const queue = getGenerationQueue();
    const job = await queue.add(
      "generate",
      { generationJobId },
      {
        jobId: generationJobId,
      },
    );

    await supabase
      .from("generation_jobs")
      .update({
        queue_name: queueNames.generation,
        queue_job_id: job.id,
        progress_label: "Queued for generation",
      })
      .eq("id", generationJobId);

    return job.id ?? generationJobId;
  } catch (error) {
    await supabase
      .from("generation_jobs")
      .update({
        status: "failed",
        progress: 100,
        progress_label: "Queue unavailable",
        safe_error_code: "QUEUE_UNAVAILABLE",
        safe_error_message:
          error instanceof Error ? error.message : "Background queue is unavailable.",
        completed_at: new Date().toISOString(),
      })
      .eq("id", generationJobId);

    throw error;
  }
}

export async function createGenerationJob(input: {
  supabase: SupabaseClient;
  user: User;
  request: CreateGenerationJobRequest;
}) {
  const parsed = createGenerationJobRequestSchema.parse(input.request);
  const userId = input.user.id;
  const providerKey = await selectProviderKey(input.supabase, userId, parsed);

  if (!providerKey) {
    throw new Error("Add a provider key before generating documents.");
  }

  const definition = requireProviderDefinition(providerKey.provider);
  const applicationId = await ensureApplication(input.supabase, userId, parsed);
  const masterProfileId = await selectFirstOwnedId(
    input.supabase,
    "master_profiles",
    userId,
    parsed.masterProfileId,
  );
  const templateId = await selectFirstOwnedId(
    input.supabase,
    "docx_templates",
    userId,
    parsed.templateId,
  );
  const idempotencyKey =
    parsed.idempotencyKey ??
    fingerprint([
      userId,
      applicationId,
      parsed.jobDescription,
      providerKey.id,
      masterProfileId,
      templateId,
      parsed.model,
    ]);

  const insertPayload = {
    user_id: userId,
    application_id: applicationId,
    preset_id: parsed.presetId ?? null,
    master_profile_id: masterProfileId ?? null,
    docx_template_id: templateId ?? null,
    provider_key_id: providerKey.id,
    provider: providerKey.provider,
    model: parsed.model ?? definition.defaultModel,
    job_description: parsed.jobDescription,
    source_url: parsed.sourceUrl || null,
    idempotency_key: idempotencyKey,
    queue_name: queueNames.generation,
    status: "queued",
    progress: 5,
    progress_label: "Preparing generation",
  };

  const { data, error } = await input.supabase
    .from("generation_jobs")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: existing, error: existingError } = await input.supabase
        .from("generation_jobs")
        .select("*")
        .eq("user_id", userId)
        .eq("idempotency_key", idempotencyKey)
        .single();

      if (existingError) {
        throw existingError;
      }

      return toDTO(existing);
    }

    throw error;
  }

  await enqueueGenerationJob(input.supabase, data.id);
  const { data: refreshed } = await input.supabase
    .from("generation_jobs")
    .select("*")
    .eq("id", data.id)
    .single();

  return toDTO(refreshed ?? data);
}

export async function getGenerationJob(input: {
  supabase: SupabaseClient;
  userId: string;
  id: string;
}) {
  const { data, error } = await input.supabase
    .from("generation_jobs")
    .select("*")
    .eq("id", input.id)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toDTO(data) : null;
}

export async function cancelGenerationJob(input: {
  supabase: SupabaseClient;
  userId: string;
  id: string;
}) {
  const job = await getGenerationJob(input);

  if (!job) {
    return null;
  }

  if (job.status === "succeeded" || job.status === "failed") {
    return job;
  }

  if (job.queueJobId) {
    try {
      const queueJob = await getGenerationQueue().getJob(job.queueJobId);

      if (queueJob && !(await queueJob.isActive())) {
        await queueJob.remove();
      }
    } catch {
      // The DB cancellation flag is the source of truth if Redis is unavailable.
    }
  }

  const { data, error } = await input.supabase
    .from("generation_jobs")
    .update({
      status: "cancelled",
      progress: 100,
      progress_label: "Cancelled",
      cancelled_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("user_id", input.userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toDTO(data);
}
