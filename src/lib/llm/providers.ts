import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { z } from "zod";
import type { LanguageModelClient } from "@/lib/ats/engine";

export const providerNameSchema = z.enum(["gemini", "deepseek"]);
export type ProviderName = z.infer<typeof providerNameSchema>;

const validationSchema = z.object({
  ok: z.boolean(),
});

function parseJsonText<T>(text: string, schema: z.ZodType<T>) {
  const parsed = JSON.parse(text);
  return schema.parse(parsed);
}

export function createGeminiClient(apiKey: string, model = "gemini-2.5-flash"): LanguageModelClient {
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

export function createDeepSeekClient(
  apiKey: string,
  model = "deepseek-v4-flash",
): LanguageModelClient {
  const openai = new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com",
  });

  return {
    async generateObject(request) {
      const completion = await openai.chat.completions.create({
        model,
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

export function createProviderClient(input: {
  provider: ProviderName;
  apiKey: string;
}) {
  if (input.provider === "gemini") {
    return createGeminiClient(input.apiKey);
  }

  return createDeepSeekClient(input.apiKey);
}

export async function validateProviderKey(input: {
  provider: ProviderName;
  apiKey: string;
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
