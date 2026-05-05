import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { z } from "zod";
import type { LanguageModelClient } from "@/lib/ats/engine";
import {
  providerNameSchema,
  requireProviderDefinition,
  type ProviderName,
} from "@/lib/llm/registry";

export { providerNameSchema, type ProviderName };

const validationSchema = z.object({
  ok: z.boolean(),
});

function parseJsonText<T>(text: string, schema: z.ZodType<T>) {
  const parsed = JSON.parse(text);
  return schema.parse(parsed);
}

function schemaName(step: "jd-analysis" | "content-generation") {
  return step === "jd-analysis" ? "jd_analysis_result" : "content_generation_result";
}

export function createOpenAiCompatibleClient(input: {
  apiKey: string;
  model: string;
  baseURL?: string;
}): LanguageModelClient {
  const openai = new OpenAI({
    apiKey: input.apiKey,
    baseURL: input.baseURL,
  });

  return {
    async generateObject(request) {
      const completion = await openai.chat.completions.create({
        model: input.model,
        messages: [
          { role: "system", content: request.system },
          {
            role: "user",
            content: `${request.prompt}\n\nReturn JSON only.`,
          },
        ],
        response_format: { type: "json_object" },
      });
      const text = completion.choices[0]?.message.content ?? "{}";

      return parseJsonText(text, request.schema);
    },
  };
}

export function createOpenAIClient(
  apiKey: string,
  model: string = requireProviderDefinition("openai").defaultModel,
): LanguageModelClient {
  return createOpenAiCompatibleClient({ apiKey, model });
}

export function createGeminiClient(
  apiKey: string,
  model: string = requireProviderDefinition("gemini").defaultModel,
): LanguageModelClient {
  const ai = new GoogleGenAI({ apiKey });

  return {
    async generateObject(request) {
      const response = await ai.models.generateContent({
        model,
        contents: `${request.system}\n\n${request.prompt}`,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: {
            type: "object",
          },
        },
      });

      return parseJsonText(response.text ?? "{}", request.schema);
    },
  };
}

export function createAnthropicClient(
  apiKey: string,
  model: string = requireProviderDefinition("anthropic").defaultModel,
): LanguageModelClient {
  const anthropic = new Anthropic({ apiKey });

  return {
    async generateObject(request) {
      const response = await anthropic.messages.create({
        model,
        max_tokens: 4096,
        system: request.system,
        messages: [{ role: "user", content: request.prompt }],
        tools: [
          {
            name: schemaName(request.step),
            description: "Return the requested resume-generation JSON payload.",
            input_schema: {
              type: "object",
              additionalProperties: true,
            },
          },
        ],
        tool_choice: {
          type: "tool",
          name: schemaName(request.step),
        },
      });
      const toolUse = response.content.find((block) => block.type === "tool_use");

      if (!toolUse || toolUse.type !== "tool_use") {
        throw new Error("Anthropic response did not include structured tool output.");
      }

      return request.schema.parse(toolUse.input);
    },
  };
}

export function createDeepSeekClient(
  apiKey: string,
  model: string = requireProviderDefinition("deepseek").defaultModel,
): LanguageModelClient {
  return createOpenAiCompatibleClient({
    apiKey,
    model,
    baseURL: requireProviderDefinition("deepseek").baseUrl,
  });
}

export function createProviderClient(input: {
  provider: ProviderName;
  apiKey: string;
  model?: string;
  baseURL?: string;
}) {
  const definition = requireProviderDefinition(input.provider);
  const model = input.model ?? definition.defaultModel;

  if (definition.adapterKind === "gemini") {
    return createGeminiClient(input.apiKey, model);
  }

  if (definition.adapterKind === "anthropic") {
    return createAnthropicClient(input.apiKey, model);
  }

  if (definition.adapterKind === "openai") {
    return createOpenAIClient(input.apiKey, model);
  }

  return createOpenAiCompatibleClient({
    apiKey: input.apiKey,
    model,
    baseURL: input.baseURL ?? definition.baseUrl,
  });
}

export async function validateProviderKey(input: {
  provider: ProviderName;
  apiKey: string;
  model?: string;
}) {
  const client = createProviderClient(input);
  const result = await client.generateObject({
    step: "jd-analysis",
    system: "Return a tiny JSON health check.",
    prompt: "Return exactly this shape with ok true.",
    schema: validationSchema,
  });

  return validationSchema.parse(result).ok === true;
}
