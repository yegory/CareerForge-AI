import type { SupabaseClient, User } from "@supabase/supabase-js";

export type ApplicationStatus =
  | "draft"
  | "applied"
  | "interviewing"
  | "offer"
  | "rejected"
  | "archived";

interface ApplicationRow {
  id: string;
  company: string;
  role_title: string;
  status: ApplicationStatus;
  source_url: string | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
}

interface GenerationRunRow {
  application_id: string;
  match_result: {
    score?: number;
    keywordsMissed?: Array<{ term?: string }>;
  } | null;
  constraint_result: {
    ok?: boolean;
    violations?: unknown[];
  } | null;
  created_at: string;
}

export interface WorkspaceApplication {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  sourceUrl: string | null;
  date: string;
  score: number | null;
  missed: string[];
  onePageSafe: boolean | null;
}

export interface WorkspaceChartPoint {
  label: string;
  sent: number;
  replies: number;
  score: number;
}

export interface WorkspaceData {
  profileName: string;
  stats: {
    sent: number;
    replies: number;
    avgScore: number;
    onePageSafe: number;
    applications: number;
    masterProfiles: number;
    templates: number;
    presets: number;
    documents: number;
    events: number;
  };
  chartData: WorkspaceChartPoint[];
  applications: WorkspaceApplication[];
  latestKeywords: {
    hit: string[];
    missed: string[];
  };
  error?: string;
}

const sentStatuses: ApplicationStatus[] = [
  "applied",
  "interviewing",
  "offer",
  "rejected",
];

function formatShortDate(value: string | null) {
  if (!value) {
    return "Draft";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function lastSevenDayLabels() {
  const days: Date[] = [];
  const today = new Date();

  for (let index = 6; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    date.setHours(0, 0, 0, 0);
    days.push(date);
  }

  return days.map((date) => ({
    date,
    key: date.toISOString().slice(0, 10),
    label: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date),
  }));
}

function numericScore(run?: GenerationRunRow) {
  const score = run?.match_result?.score;
  return typeof score === "number" ? score : null;
}

function missedKeywords(run?: GenerationRunRow) {
  return (
    run?.match_result?.keywordsMissed
      ?.map((keyword) => keyword.term)
      .filter((term): term is string => Boolean(term)) ?? []
  );
}

function onePageSafe(run?: GenerationRunRow) {
  if (!run?.constraint_result) {
    return null;
  }

  return run.constraint_result.ok === true;
}

async function countRows(
  supabase: SupabaseClient,
  table: string,
  userId: string,
) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function loadWorkspaceData(
  supabase: SupabaseClient,
  user: User,
  search: string,
): Promise<WorkspaceData> {
  try {
    const [
      profileResult,
      masterProfiles,
      templates,
      presets,
      events,
    ] = await Promise.all([
      supabase.from("profiles").select("full_name,email").eq("id", user.id).maybeSingle(),
      countRows(supabase, "master_profiles", user.id),
      countRows(supabase, "docx_templates", user.id),
      countRows(supabase, "presets", user.id),
      countRows(supabase, "application_events", user.id),
    ]);

    if (profileResult.error) {
      throw profileResult.error;
    }

    let applicationQuery = supabase
      .from("applications")
      .select("id,company,role_title,status,source_url,applied_at,created_at,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50);

    if (search.trim()) {
      const term = search.trim().replaceAll(",", " ");
      applicationQuery = applicationQuery.or(
        `company.ilike.%${term}%,role_title.ilike.%${term}%`,
      );
    }

    const { data: applicationRows, error: applicationError } =
      await applicationQuery;

    if (applicationError) {
      throw applicationError;
    }

    const applications = (applicationRows ?? []) as ApplicationRow[];
    const applicationIds = applications.map((application) => application.id);
    const runsByApplication = new Map<string, GenerationRunRow>();
    let documents = 0;

    if (applicationIds.length > 0) {
      const [runResult, documentResult] = await Promise.all([
        supabase
          .from("generation_runs")
          .select("application_id,match_result,constraint_result,created_at")
          .in("application_id", applicationIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("documents")
          .select("*", { count: "exact", head: true })
          .in("application_id", applicationIds),
      ]);

      const { data: runRows, error: runError } = runResult;

      if (runError) {
        throw runError;
      }

      if (documentResult.error) {
        throw documentResult.error;
      }

      documents = documentResult.count ?? 0;

      for (const run of (runRows ?? []) as GenerationRunRow[]) {
        if (!runsByApplication.has(run.application_id)) {
          runsByApplication.set(run.application_id, run);
        }
      }
    }

    const workspaceApplications = applications.map((application) => {
      const run = runsByApplication.get(application.id);

      return {
        id: application.id,
        company: application.company,
        role: application.role_title,
        status: application.status,
        sourceUrl: application.source_url,
        date: formatShortDate(application.applied_at ?? application.created_at),
        score: numericScore(run),
        missed: missedKeywords(run),
        onePageSafe: onePageSafe(run),
      };
    });

    const scoredRuns = [...runsByApplication.values()]
      .map((run) => numericScore(run))
      .filter((score): score is number => typeof score === "number");
    const avgScore =
      scoredRuns.length > 0
        ? Math.round(scoredRuns.reduce((sum, score) => sum + score, 0) / scoredRuns.length)
        : 0;
    const safeCount = [...runsByApplication.values()].filter(
      (run) => onePageSafe(run) === true,
    ).length;
    const sent = applications.filter((application) =>
      sentStatuses.includes(application.status),
    ).length;
    const replies = applications.filter((application) =>
      ["interviewing", "offer"].includes(application.status),
    ).length;
    const dayLabels = lastSevenDayLabels();
    const chartData = dayLabels.map((day) => {
      const dayApplications = applications.filter((application) => {
        const date = new Date(application.applied_at ?? application.created_at);
        return date.toISOString().slice(0, 10) === day.key;
      });
      const dayScores = dayApplications
        .map((application) => numericScore(runsByApplication.get(application.id)))
        .filter((score): score is number => typeof score === "number");

      return {
        label: day.label,
        sent: dayApplications.length,
        replies: dayApplications.filter((application) =>
          ["interviewing", "offer"].includes(application.status),
        ).length,
        score:
          dayScores.length > 0
            ? Math.round(dayScores.reduce((sum, score) => sum + score, 0) / dayScores.length)
            : 0,
      };
    });
    const latestRun = [...runsByApplication.values()][0];

    return {
      profileName:
        profileResult.data?.full_name ??
        profileResult.data?.email ??
        user.email ??
        "Workspace",
      stats: {
        sent,
        replies,
        avgScore,
        onePageSafe: safeCount,
        applications: applications.length,
        masterProfiles,
        templates,
        presets,
        documents,
        events,
      },
      chartData,
      applications: workspaceApplications,
      latestKeywords: {
        hit:
          latestRun?.match_result && "keywordsHit" in latestRun.match_result
            ? ((latestRun.match_result.keywordsHit as Array<{ term?: string }> | undefined)
                ?.map((keyword) => keyword.term)
                .filter((term): term is string => Boolean(term)) ?? [])
            : [],
        missed: missedKeywords(latestRun),
      },
    };
  } catch (error) {
    return {
      profileName: user.email ?? "Workspace",
      stats: {
        sent: 0,
        replies: 0,
        avgScore: 0,
        onePageSafe: 0,
        applications: 0,
        masterProfiles: 0,
        templates: 0,
        presets: 0,
        documents: 0,
        events: 0,
      },
      chartData: lastSevenDayLabels().map((day) => ({
        label: day.label,
        sent: 0,
        replies: 0,
        score: 0,
      })),
      applications: [],
      latestKeywords: {
        hit: [],
        missed: [],
      },
      error: error instanceof Error ? error.message : "Could not load workspace data.",
    };
  }
}
