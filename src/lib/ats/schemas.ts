import { z } from "zod";

export const llmProviderSchema = z.enum([
  "openai",
  "anthropic",
  "gemini",
  "deepseek",
]);

export const keywordPrioritySchema = z.enum(["must", "should", "nice"]);

export const keywordSchema = z.object({
  term: z.string().min(1),
  category: z.enum(["hard_skill", "soft_skill", "tool", "domain", "responsibility"]),
  priority: keywordPrioritySchema,
});

export const jdAnalysisSchema = z.object({
  roleTitle: z.string().min(1),
  company: z.string().optional(),
  seniority: z.string().optional(),
  tone: z.string().min(1),
  primaryKeywords: z.array(keywordSchema).min(1),
  hardSkills: z.array(z.string()).default([]),
  softSkills: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  atsWarnings: z.array(z.string()).default([]),
});

export const profileExperienceSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  bullets: z.array(z.string()).default([]),
  metrics: z.array(z.string()).default([]),
});

export const masterProfileSchema = z.object({
  fullName: z.string().min(1),
  headline: z.string().min(1),
  contact: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    links: z.array(z.string()).default([]),
  }),
  summary: z.string().default(""),
  skills: z.array(z.string()).default([]),
  experience: z.array(profileExperienceSchema).default([]),
  education: z.array(z.string()).default([]),
  projects: z.array(z.string()).default([]),
});

export const toneRulesSchema = z.object({
  voice: z.string().default("clear, confident, direct"),
  bannedPhrases: z.array(z.string()).default([]),
  preferredActionVerbs: z.array(z.string()).default([
    "Led",
    "Built",
    "Improved",
    "Launched",
    "Reduced",
    "Increased",
  ]),
  metricStyle: z.string().default("prefer numeric impact and X-Y-Z bullets"),
});

export const placeholderConstraintSchema = z.object({
  placeholder: z.string().min(1),
  label: z.string().min(1),
  maxChars: z.number().int().positive(),
  maxWords: z.number().int().positive().optional(),
  required: z.boolean().default(true),
  onePageCritical: z.boolean().default(true),
});

export const generatedBlockSchema = z.object({
  placeholder: z.string().min(1),
  value: z.string(),
  sourceKeywords: z.array(z.string()).default([]),
  rationale: z.string().optional(),
});

export const generatedContentSchema = z.object({
  resumeBlocks: z.array(generatedBlockSchema),
  coverLetterBlocks: z.array(generatedBlockSchema).default([]),
});

export const keywordMatchSchema = z.object({
  term: z.string(),
  category: keywordSchema.shape.category,
  priority: keywordPrioritySchema,
});

export const matchResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  keywordsHit: z.array(keywordMatchSchema),
  keywordsMissed: z.array(keywordMatchSchema),
  totalKeywords: z.number().int().nonnegative(),
});

export const spatialViolationSchema = z.object({
  placeholder: z.string(),
  label: z.string(),
  value: z.string(),
  charCount: z.number().int().nonnegative(),
  maxChars: z.number().int().positive(),
  wordCount: z.number().int().nonnegative(),
  maxWords: z.number().int().positive().optional(),
  severity: z.enum(["warning", "blocking"]),
  message: z.string(),
});

export const spatialEvaluationSchema = z.object({
  ok: z.boolean(),
  violations: z.array(spatialViolationSchema),
});

export const atsGenerationResultSchema = z.object({
  jdAnalysis: jdAnalysisSchema,
  generatedContent: generatedContentSchema,
  matchResult: matchResultSchema,
  spatialEvaluation: spatialEvaluationSchema,
  promptFingerprint: z.string(),
});

export type LlmProvider = z.infer<typeof llmProviderSchema>;
export type Keyword = z.infer<typeof keywordSchema>;
export type JdAnalysis = z.infer<typeof jdAnalysisSchema>;
export type MasterProfile = z.infer<typeof masterProfileSchema>;
export type ToneRules = z.infer<typeof toneRulesSchema>;
export type PlaceholderConstraint = z.infer<typeof placeholderConstraintSchema>;
export type GeneratedBlock = z.infer<typeof generatedBlockSchema>;
export type GeneratedContent = z.infer<typeof generatedContentSchema>;
export type MatchResult = z.infer<typeof matchResultSchema>;
export type SpatialViolation = z.infer<typeof spatialViolationSchema>;
export type SpatialEvaluation = z.infer<typeof spatialEvaluationSchema>;
export type AtsGenerationResult = z.infer<typeof atsGenerationResultSchema>;
