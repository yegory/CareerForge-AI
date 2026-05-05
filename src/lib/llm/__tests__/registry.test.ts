import { describe, expect, it } from "vitest";
import {
  listProviderDefinitions,
  providerNameSchema,
  requireProviderDefinition,
} from "../registry";

describe("provider registry", () => {
  it("exposes native and OpenAI-compatible BYOK providers", () => {
    const providers = listProviderDefinitions().map((provider) => provider.providerId);

    expect(providers).toEqual(
      expect.arrayContaining([
        "openai",
        "anthropic",
        "gemini",
        "deepseek",
        "openrouter",
        "groq",
        "mistral",
        "ollama",
        "vllm",
      ]),
    );
  });

  it("validates provider ids from the registry", () => {
    expect(providerNameSchema.parse("deepseek")).toBe("deepseek");
    expect(() => providerNameSchema.parse("unknown")).toThrow();
  });

  it("keeps compatible providers configurable through base URLs", () => {
    const groq = requireProviderDefinition("groq");

    expect(groq.adapterKind).toBe("openai-compatible");
    expect(groq.baseUrl).toContain("groq.com");
  });
});
