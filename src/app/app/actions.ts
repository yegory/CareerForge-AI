"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createGenerationJob,
  createGenerationJobRequestSchema,
} from "@/lib/generation/jobs";
import { assertRateLimit, RateLimitError } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

function requireText(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }

  return value.trim();
}

export async function createApplication(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/app");
  }

  try {
    await assertRateLimit({
      key: `rate:generation-create:${user.id}`,
      limit: 30,
      windowSeconds: 60,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      redirect(`/app?error=${encodeURIComponent(error.message)}`);
    }

    throw error;
  }

  const company = requireText(formData, "company");
  const roleTitle = requireText(formData, "roleTitle");
  const jobDescription = requireText(formData, "jobDescription");
  const sourceUrl = formData.get("sourceUrl");
  const statusValue = formData.get("status");
  const status =
    typeof statusValue === "string" && statusValue.length > 0
      ? statusValue
      : "draft";

  const { error } = await supabase.from("applications").insert({
    user_id: user.id,
    company,
    role_title: roleTitle,
    job_description: jobDescription,
    source_url:
      typeof sourceUrl === "string" && sourceUrl.trim().length > 0
        ? sourceUrl.trim()
        : null,
    status,
    applied_at: status === "draft" ? null : new Date().toISOString(),
  });

  if (error) {
    redirect(`/app?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/app");
  redirect("/app?message=Application%20created");
}

export async function queueGenerationFromForm(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/app");
  }

  const optionalString = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  };
  const parsed = createGenerationJobRequestSchema.safeParse({
    company: optionalString("company"),
    roleTitle: optionalString("roleTitle"),
    sourceUrl: optionalString("sourceUrl") ?? "",
    jobDescription: formData.get("jobDescription"),
    providerKeyId: optionalString("providerKeyId"),
    masterProfileId: optionalString("masterProfileId"),
    templateId: optionalString("templateId"),
  });

  if (!parsed.success) {
    redirect(
      `/app?error=${encodeURIComponent("Add a job description and select your saved setup.")}`,
    );
  }

  let jobId = "";

  try {
    const job = await createGenerationJob({
      supabase,
      user,
      request: parsed.data,
    });
    jobId = job.id;
  } catch (error) {
    redirect(
      `/app?error=${encodeURIComponent(
        error instanceof Error ? error.message : "Could not queue generation.",
      )}`,
    );
  }

  revalidatePath("/app");
  redirect(`/app?generationJobId=${jobId}&message=Generation%20queued`);
}
