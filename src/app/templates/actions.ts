"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  analyzeTemplateBuffer,
  placeholdersToConstraints,
} from "@/lib/templates/analyzer";
import { createClient } from "@/lib/supabase/server";

function safeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function templatesRedirect(type: "error" | "message", value: string): never {
  redirect(`/templates?${type}=${encodeURIComponent(value)}`);
}

export async function importTemplateFile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/templates");
  }

  const file = formData.get("file");
  const importKind = formData.get("importKind");
  const displayName = formData.get("name");

  if (!(file instanceof File) || file.size === 0) {
    templatesRedirect("error", "Choose a DOCX, PDF, or TXT file.");
  }

  const name =
    typeof displayName === "string" && displayName.trim().length > 0
      ? displayName.trim()
      : file.name;
  const buffer = Buffer.from(await file.arrayBuffer());
  const analysis = await analyzeTemplateBuffer({
    buffer,
    filename: file.name,
    mimeType: file.type,
  });
  const storagePath = `${user.id}/imports/${randomUUID()}-${safeFilename(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from("templates")
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    templatesRedirect("error", uploadError.message);
  }

  if (importKind === "master-profile") {
    const { error } = await supabase.from("master_profiles").insert({
      user_id: user.id,
      name,
      content: {
        sourceText: analysis.text,
        sourceFileName: file.name,
        storagePath,
        importedAt: new Date().toISOString(),
      },
    });

    if (error) {
      templatesRedirect("error", error.message);
    }

    revalidatePath("/templates");
    templatesRedirect("message", "Master profile source imported.");
  }

  const { error } = await supabase.from("docx_templates").insert({
    user_id: user.id,
    name,
    storage_path: storagePath,
    placeholders: placeholdersToConstraints(analysis.placeholders),
  });

  if (error) {
    templatesRedirect("error", error.message);
  }

  revalidatePath("/templates");
  templatesRedirect(
    "message",
    analysis.needsConversion
      ? "Template imported. It needs app template conversion before export."
      : "Template imported with placeholders.",
  );
}
