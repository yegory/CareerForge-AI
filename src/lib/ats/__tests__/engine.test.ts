import { describe, expect, it } from "vitest";
import { generateAtsPackage, LanguageModelClient } from "../engine";
import {
  JdAnalysis,
  MasterProfile,
  PlaceholderConstraint,
} from "../schemas";

const masterProfile: MasterProfile = {
  fullName: "Avery Chen",
  headline: "Full-stack product engineer",
  contact: {
    email: "avery@example.com",
    links: ["https://example.com"],
  },
  summary: "Builds SaaS products across React, Node.js, and data workflows.",
  skills: ["React", "Node.js", "PostgreSQL", "Supabase", "TypeScript"],
  experience: [
    {
      company: "Northstar Labs",
      role: "Senior Software Engineer",
      startDate: "2021",
      endDate: "Present",
      bullets: [
        "Built onboarding flows for B2B customers.",
        "Improved API reliability and release quality.",
      ],
      metrics: ["Reduced onboarding time by 34%", "Increased activation by 18%"],
    },
  ],
  education: [],
  projects: [],
};

const constraints: PlaceholderConstraint[] = [
  {
    placeholder: "Summary",
    label: "Resume summary",
    maxChars: 180,
    maxWords: 32,
    required: true,
    onePageCritical: true,
  },
  {
    placeholder: "Experience_Bullet_1",
    label: "Experience bullet 1",
    maxChars: 150,
    maxWords: 24,
    required: true,
    onePageCritical: true,
  },
];

const jdAnalysis: JdAnalysis = {
  roleTitle: "Senior Full-Stack Engineer",
  company: "Acme",
  seniority: "Senior",
  tone: "Direct, product-minded, technical",
  primaryKeywords: [
    { term: "React", category: "tool", priority: "must" },
    { term: "Node.js", category: "tool", priority: "must" },
    { term: "PostgreSQL", category: "hard_skill", priority: "should" },
    { term: "customer onboarding", category: "domain", priority: "should" },
  ],
  hardSkills: ["React", "Node.js", "PostgreSQL"],
  softSkills: ["cross-functional collaboration"],
  responsibilities: ["Build customer onboarding workflows"],
  atsWarnings: [],
};

it("runs JD analysis, generation, deterministic scoring, and spatial checks", async () => {
  const calls: string[] = [];
  const client: LanguageModelClient = {
    async generateObject(request) {
      calls.push(request.step);

      if (request.step === "jd-analysis") {
        return jdAnalysis;
      }

      return {
        resumeBlocks: [
          {
            placeholder: "Summary",
            value:
              "Full-stack engineer building React and Node.js onboarding systems backed by PostgreSQL.",
            sourceKeywords: ["React", "Node.js", "PostgreSQL", "customer onboarding"],
          },
          {
            placeholder: "Experience_Bullet_1",
            value:
              "Improved customer onboarding by 34% by rebuilding React workflows and Node.js APIs.",
            sourceKeywords: ["React", "Node.js", "customer onboarding"],
          },
        ],
        coverLetterBlocks: [],
      };
    },
  };

  const result = await generateAtsPackage({
    client,
    jobDescription: "We need React, Node.js, PostgreSQL, customer onboarding.",
    masterProfile,
    constraints,
  });

  expect(calls).toEqual(["jd-analysis", "content-generation"]);
  expect(result.matchResult.score).toBe(100);
  expect(result.matchResult.keywordsMissed).toEqual([]);
  expect(result.spatialEvaluation.ok).toBe(true);
  expect(result.promptFingerprint).toHaveLength(64);
});

it("flags blocking placeholder violations before export", async () => {
  const client: LanguageModelClient = {
    async generateObject(request) {
      if (request.step === "jd-analysis") {
        return jdAnalysis;
      }

      return {
        resumeBlocks: [
          {
            placeholder: "Summary",
            value: "React engineer.",
            sourceKeywords: ["React"],
          },
          {
            placeholder: "Experience_Bullet_1",
            value:
              "Improved activation by 34% by rebuilding React workflows, Node.js APIs, PostgreSQL reporting, stakeholder feedback loops, experimentation dashboards, support handoff processes, release automation, and lifecycle messaging.",
            sourceKeywords: ["React", "Node.js", "PostgreSQL"],
          },
        ],
        coverLetterBlocks: [],
      };
    },
  };

  const result = await generateAtsPackage({
    client,
    jobDescription: "We need React, Node.js, PostgreSQL, customer onboarding.",
    masterProfile,
    constraints,
  });

  expect(result.matchResult.score).toBe(75);
  expect(result.spatialEvaluation.ok).toBe(false);
  expect(result.spatialEvaluation.violations[0]?.placeholder).toBe(
    "Experience_Bullet_1",
  );
});

describe("prompt safety", () => {
  it("injects placeholder limits into the content generation prompt", async () => {
    let contentPrompt = "";
    const client: LanguageModelClient = {
      async generateObject(request) {
        if (request.step === "jd-analysis") {
          return jdAnalysis;
        }

        contentPrompt = request.prompt;
        return {
          resumeBlocks: [
            { placeholder: "Summary", value: "React engineer.", sourceKeywords: [] },
            {
              placeholder: "Experience_Bullet_1",
              value: "Built React onboarding flows.",
              sourceKeywords: [],
            },
          ],
          coverLetterBlocks: [],
        };
      },
    };

    await generateAtsPackage({
      client,
      jobDescription: "React role",
      masterProfile,
      constraints,
    });

    expect(contentPrompt).toContain("Summary");
    expect(contentPrompt).toContain("max 180 characters");
    expect(contentPrompt).toContain("Experience_Bullet_1");
    expect(contentPrompt).toContain("max 24 words");
  });
});
