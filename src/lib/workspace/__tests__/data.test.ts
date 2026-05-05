import { describe, expect, it } from "vitest";
import { loadWorkspaceData } from "../data";

function queryResult(result: unknown, table: string) {
  const query = {
    select() {
      return query;
    },
    eq() {
      return query;
    },
    in() {
      return query;
    },
    order() {
      return query;
    },
    limit() {
      return query;
    },
    or() {
      if (table === "applications" && typeof result === "object" && result) {
        const mutable = result as {
          data: Array<{ company: string; role_title: string }>;
        };
        mutable.data = mutable.data.filter((row) =>
          `${row.company} ${row.role_title}`.toLowerCase().includes("gum"),
        );
      }

      return query;
    },
    maybeSingle() {
      return Promise.resolve(result);
    },
    then(resolve: (value: unknown) => void, reject: (reason?: unknown) => void) {
      return Promise.resolve(result).then(resolve, reject);
    },
  };

  return query;
}

describe("workspace data loader", () => {
  it("loads dashboard data from Supabase-shaped mocks", async () => {
    const applications = [
      {
        id: "app-1",
        company: "Gumloop",
        role_title: "Full Stack Engineer",
        status: "applied",
        source_url: null,
        applied_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "app-2",
        company: "Other Co",
        role_title: "Frontend Engineer",
        status: "draft",
        source_url: null,
        applied_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    const supabase = {
      from(table: string) {
        if (table === "profiles") {
          return queryResult(
            { data: { full_name: "Yegor", email: "yegor@example.com" }, error: null },
            table,
          );
        }

        if (table === "applications") {
          return queryResult({ data: [...applications], error: null }, table);
        }

        if (table === "generation_runs") {
          return queryResult(
            {
              data: [
                {
                  application_id: "app-1",
                  match_result: {
                    score: 88,
                    keywordsHit: [{ term: "React" }],
                    keywordsMissed: [{ term: "MCP" }],
                  },
                  constraint_result: { ok: true, violations: [] },
                  created_at: new Date().toISOString(),
                },
              ],
              error: null,
            },
            table,
          );
        }

        if (table === "documents") {
          return queryResult({ count: 1, error: null }, table);
        }

        return queryResult({ count: 0, error: null }, table);
      },
    };

    const workspace = await loadWorkspaceData(
      supabase as never,
      { id: "user-1", email: "yegor@example.com" } as never,
      "gum",
    );

    expect(workspace.error).toBeUndefined();
    expect(workspace.profileName).toBe("Yegor");
    expect(workspace.applications).toHaveLength(1);
    expect(workspace.applications[0]?.company).toBe("Gumloop");
    expect(workspace.stats.avgScore).toBe(88);
    expect(workspace.latestKeywords.missed).toEqual(["MCP"]);
  });
});
