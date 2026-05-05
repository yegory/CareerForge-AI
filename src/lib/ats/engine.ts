import { createHash } from "node:crypto";
import { z } from "zod";
import {
  atsGenerationResultSchema,
  generatedContentSchema,
  jdAnalysisSchema,
  MasterProfile,
  PlaceholderConstraint,
  ToneRules,
  toneRulesSchema,
} from "./schemas";
import {
  ATS_SYSTEM_PROMPT,
  buildContentGenerationPrompt,
  buildJdAnalysisPrompt,
} from "./prompts";
import { calculateKeywordMatchScore } from "./match-score";
import { evaluateSpatialConstraints } from "./spatial-constraints";

export interface LanguageModelClient {
  generateObject<T>(request: {
    step: "jd-analysis" | "content-generation";
    system: string;
    prompt: string;
    schema: z.ZodType<T>;
  }): Promise<unknown>;
}

export interface GenerateAtsPackageInput {
  client: LanguageModelClient;
  jobDescription: string;
  masterProfile: MasterProfile;
  constraints: PlaceholderConstraint[];
  toneRules?: Partial<ToneRules>;
}

function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function generateAtsPackage(input: GenerateAtsPackageInput) {
  const toneRules = toneRulesSchema.parse(input.toneRules ?? {});
  const analysisPrompt = buildJdAnalysisPrompt(input.jobDescription);
  const jdAnalysis = jdAnalysisSchema.parse(
    await input.client.generateObject({
      step: "jd-analysis",
      system: ATS_SYSTEM_PROMPT,
      prompt: analysisPrompt,
      schema: jdAnalysisSchema,
    }),
  );

  const contentPrompt = buildContentGenerationPrompt({
    masterProfile: input.masterProfile,
    jdAnalysis,
    constraints: input.constraints,
    toneRules,
  });
  const generatedContent = generatedContentSchema.parse(
    await input.client.generateObject({
      step: "content-generation",
      system: ATS_SYSTEM_PROMPT,
      prompt: contentPrompt,
      schema: generatedContentSchema,
    }),
  );

  const allBlocks = [
    ...generatedContent.resumeBlocks,
    ...generatedContent.coverLetterBlocks,
  ];
  const spatialEvaluation = evaluateSpatialConstraints(allBlocks, input.constraints);
  const matchResult = calculateKeywordMatchScore(jdAnalysis, generatedContent);

  return atsGenerationResultSchema.parse({
    jdAnalysis,
    generatedContent,
    matchResult,
    spatialEvaluation,
    promptFingerprint: fingerprint(`${analysisPrompt}\n\n${contentPrompt}`),
  });
}
