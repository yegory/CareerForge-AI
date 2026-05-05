"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

function loginRedirect(
  type: "error" | "message",
  value: string,
  next?: FormDataEntryValue | null,
): never {
  const params = new URLSearchParams();
  params.set(type, value);

  if (typeof next === "string" && next.startsWith("/")) {
    params.set("next", next);
  }

  redirect(`/login?${params.toString()}`);
}

async function getOrigin() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");

  if (origin) {
    return origin;
  }

  const host = headerStore.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

function requireSupabaseEnv(next?: FormDataEntryValue | null) {
  if (!hasSupabasePublicEnv()) {
    loginRedirect(
      "error",
      "Supabase environment variables are not configured.",
      next,
    );
  }
}

function requireEmail(formData: FormData) {
  const email = formData.get("email");

  if (typeof email !== "string" || email.trim().length === 0) {
    loginRedirect("error", "Email is required.", formData.get("next"));
  }

  return email.trim();
}

function requirePassword(formData: FormData) {
  const password = formData.get("password");

  if (typeof password !== "string" || password.length < 8) {
    loginRedirect(
      "error",
      "Password must be at least 8 characters.",
      formData.get("next"),
    );
  }

  return password;
}

function safeNext(formData: FormData) {
  const next = formData.get("next");

  if (typeof next === "string" && next.startsWith("/")) {
    return next;
  }

  return "/app";
}

export async function signInWithMagicLink(formData: FormData) {
  requireSupabaseEnv(formData.get("next"));

  const email = requireEmail(formData);
  const next = safeNext(formData);
  const origin = await getOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    loginRedirect("error", error.message, formData.get("next"));
  }

  loginRedirect("message", "Check your email for a sign-in link.", next);
}

export async function signInWithPassword(formData: FormData) {
  requireSupabaseEnv(formData.get("next"));

  const email = requireEmail(formData);
  const password = requirePassword(formData);
  const next = safeNext(formData);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    loginRedirect("error", error.message, formData.get("next"));
  }

  redirect(next);
}

export async function signUpWithPassword(formData: FormData) {
  requireSupabaseEnv(formData.get("next"));

  const email = requireEmail(formData);
  const password = requirePassword(formData);
  const next = safeNext(formData);
  const origin = await getOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    loginRedirect("error", error.message, formData.get("next"));
  }

  loginRedirect("message", "Account created. Check your email if confirmation is enabled.", next);
}

export async function signInWithGoogle(formData: FormData) {
  requireSupabaseEnv(formData.get("next"));

  const next = safeNext(formData);
  const origin = await getOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    loginRedirect(
      "error",
      error?.message ?? "Could not start Google sign-in.",
      formData.get("next"),
    );
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
