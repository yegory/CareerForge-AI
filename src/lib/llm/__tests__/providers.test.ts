import { z } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";

const geminiGenerateContent = vi.fn();
const deepSeekCreate = vi.fn();
const anthropicCreate = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = {
      generateContent: geminiGenerateContent,
    };
  },
}));

vi.mock("openai", () => ({
  default: class {
    chat = {
      completions: {
        create: deepSeekCreate,
      },
    };
  },
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = {
      create: anthropicCreate,
    };
  },
}));

const sampleSchema = z.object({
  ok: z.boolean(),
});

describe("provider adapters", () => {
  beforeEach(() => {
    geminiGenerateContent.mockReset();
    deepSeekCreate.mockReset();
    anthropicCreate.mockReset();
  });

  it("parses Gemini JSON into the requested schema", async () => {
    geminiGenerateContent.mockResolvedValue({
      text: JSON.stringify({ ok: true }),
    });
    const { createGeminiClient } = await import("../providers");
    const client = createGeminiClient("gemini-key");

    await expect(
      client.generateObject({
        step: "jd-analysis",
        system: "system",
        prompt: "prompt",
        schema: sampleSchema,
      }),
    ).resolves.toEqual({ ok: true });
    expect(geminiGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          responseMimeType: "application/json",
        }),
      }),
    );
  });

  it("parses DeepSeek JSON into the requested schema", async () => {
    deepSeekCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({ ok: true }),
          },
        },
      ],
    });
    const { createDeepSeekClient } = await import("../providers");
    const client = createDeepSeekClient("deepseek-key");

    await expect(
      client.generateObject({
        step: "jd-analysis",
        system: "system",
        prompt: "prompt",
        schema: sampleSchema,
      }),
    ).resolves.toEqual({ ok: true });
    expect(deepSeekCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        response_format: { type: "json_object" },
      }),
    );
  });

  it("parses Anthropic tool output into the requested schema", async () => {
    anthropicCreate.mockResolvedValue({
      content: [
        {
          type: "tool_use",
          input: { ok: true },
        },
      ],
    });
    const { createAnthropicClient } = await import("../providers");
    const client = createAnthropicClient("anthropic-key");

    await expect(
      client.generateObject({
        step: "jd-analysis",
        system: "system",
        prompt: "prompt",
        schema: sampleSchema,
      }),
    ).resolves.toEqual({ ok: true });
    expect(anthropicCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        tool_choice: expect.objectContaining({
          type: "tool",
        }),
      }),
    );
  });
});
