import {
  JdAnalysis,
  MasterProfile,
  PlaceholderConstraint,
  ToneRules,
} from "./schemas";
import { constraintsPromptBlock } from "./spatial-constraints";

export function buildJdAnalysisPrompt(jobDescription: string): string {
  return [
    "Analyze this job description for ATS targeting.",
    "Return JSON only. Extract primary keywords, required hard skills, soft skills, responsibilities, seniority, and writing tone.",
    "Prioritize exact terms a recruiter or ATS would search for.",
    "",
    "Job description:",
    jobDescription,
  ].join("\n");
}

export function buildContentGenerationPrompt(input: {
  masterProfile: MasterProfile;
  jdAnalysis: JdAnalysis;
  constraints: PlaceholderConstraint[];
  toneRules: ToneRules;
}): string {
  return [
    "Generate ATS-friendly resume and cover letter placeholder content as JSON only.",
    "Use flat plain text. Do not use markdown tables, nested tables, text boxes, icons, columns, or decorative styling.",
    "Rewrite bullets with strong action verbs and quantifiable X-Y-Z structure: Accomplished X as measured by Y, by doing Z.",
    "Use the JD keywords naturally. Do not fabricate employers, titles, credentials, metrics, or tools not supported by the master profile.",
    "Respect every placeholder length limit. Shorter and precise is better than dense.",
    "",
    `Tone: ${input.toneRules.voice}`,
    `Metric style: ${input.toneRules.metricStyle}`,
    `Preferred action verbs: ${input.toneRules.preferredActionVerbs.join(", ")}`,
    `Banned phrases: ${input.toneRules.bannedPhrases.join(", ") || "none"}`,
    "",
    "Placeholder limits:",
    constraintsPromptBlock(input.constraints),
    "",
    "JD analysis:",
    JSON.stringify(input.jdAnalysis, null, 2),
    "",
    "Master profile:",
    JSON.stringify(input.masterProfile, null, 2),
  ].join("\n");
}

export const ATS_SYSTEM_PROMPT = [
  "You are CareerForge AI, an ATS optimization engine.",
  "Return valid JSON matching the requested schema.",
  "Keep claims truthful, concise, measurable, and recruiter-readable.",
].join(" ");
