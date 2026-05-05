import { z } from "zod";

export const adapterKindSchema = z.enum([
  "openai",
  "anthropic",
  "gemini",
  "openai-compatible",
]);

export type AdapterKind = z.infer<typeof adapterKindSchema>;

export interface ProviderDefinition {
  providerId: string;
  displayName: string;
  adapterKind: AdapterKind;
  baseUrl?: string;
  defaultModel: string;
  supportsJsonSchema: boolean;
  supportsTools: boolean;
  pricingMetadata: {
    source: "provider" | "manual";
    notes: string;
  };
}

export const providerDefinitions: readonly ProviderDefinition[] = [
  {
    providerId: "openai",
    displayName: "OpenAI",
    adapterKind: "openai",
    defaultModel: "gpt-4o-mini",
    supportsJsonSchema: true,
    supportsTools: true,
    pricingMetadata: {
      source: "provider",
      notes: "Pricing varies by selected OpenAI model.",
    },
  },
  {
    providerId: "anthropic",
    displayName: "Anthropic Claude",
    adapterKind: "anthropic",
    defaultModel: "claude-3-5-haiku-latest",
    supportsJsonSchema: true,
    supportsTools: true,
    pricingMetadata: {
      source: "provider",
      notes: "Structured output is requested through a forced tool call.",
    },
  },
  {
    providerId: "gemini",
    displayName: "Google Gemini",
    adapterKind: "gemini",
    defaultModel: "gemini-2.5-flash",
    supportsJsonSchema: true,
    supportsTools: true,
    pricingMetadata: {
      source: "provider",
      notes: "Uses the Google GenAI SDK structured-output mode.",
    },
  },
  {
    providerId: "deepseek",
    displayName: "DeepSeek",
    adapterKind: "openai-compatible",
    baseUrl: "https://api.deepseek.com",
    defaultModel: "deepseek-v4-flash",
    supportsJsonSchema: false,
    supportsTools: false,
    pricingMetadata: {
      source: "provider",
      notes: "OpenAI-compatible API; JSON mode is validated locally.",
    },
  },
  {
    providerId: "openrouter",
    displayName: "OpenRouter",
    adapterKind: "openai-compatible",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
    supportsJsonSchema: false,
    supportsTools: false,
    pricingMetadata: {
      source: "provider",
      notes: "Model pricing depends on the routed model/provider.",
    },
  },
  {
    providerId: "groq",
    displayName: "Groq",
    adapterKind: "openai-compatible",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.1-8b-instant",
    supportsJsonSchema: false,
    supportsTools: false,
    pricingMetadata: {
      source: "provider",
      notes: "Fast OpenAI-compatible inference; model availability varies.",
    },
  },
  {
    providerId: "mistral",
    displayName: "Mistral AI",
    adapterKind: "openai-compatible",
    baseUrl: "https://api.mistral.ai/v1",
    defaultModel: "mistral-small-latest",
    supportsJsonSchema: false,
    supportsTools: false,
    pricingMetadata: {
      source: "provider",
      notes: "OpenAI-compatible chat completions supported.",
    },
  },
  {
    providerId: "together",
    displayName: "Together AI",
    adapterKind: "openai-compatible",
    baseUrl: "https://api.together.xyz/v1",
    defaultModel: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
    supportsJsonSchema: false,
    supportsTools: false,
    pricingMetadata: {
      source: "manual",
      notes: "Model catalog changes frequently; override per preset.",
    },
  },
  {
    providerId: "fireworks",
    displayName: "Fireworks AI",
    adapterKind: "openai-compatible",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    defaultModel: "accounts/fireworks/models/llama-v3p1-8b-instruct",
    supportsJsonSchema: false,
    supportsTools: false,
    pricingMetadata: {
      source: "manual",
      notes: "Model catalog changes frequently; override per preset.",
    },
  },
  {
    providerId: "cerebras",
    displayName: "Cerebras",
    adapterKind: "openai-compatible",
    baseUrl: "https://api.cerebras.ai/v1",
    defaultModel: "llama3.1-8b",
    supportsJsonSchema: false,
    supportsTools: false,
    pricingMetadata: {
      source: "manual",
      notes: "OpenAI-compatible adapter; confirm model access per key.",
    },
  },
  {
    providerId: "perplexity",
    displayName: "Perplexity",
    adapterKind: "openai-compatible",
    baseUrl: "https://api.perplexity.ai",
    defaultModel: "sonar",
    supportsJsonSchema: false,
    supportsTools: false,
    pricingMetadata: {
      source: "manual",
      notes: "Useful for research-style helpers; generation output is revalidated.",
    },
  },
  {
    providerId: "xai",
    displayName: "xAI",
    adapterKind: "openai-compatible",
    baseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-2-latest",
    supportsJsonSchema: false,
    supportsTools: false,
    pricingMetadata: {
      source: "manual",
      notes: "OpenAI-compatible adapter; override model as needed.",
    },
  },
  {
    providerId: "ollama",
    displayName: "Ollama",
    adapterKind: "openai-compatible",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3.1",
    supportsJsonSchema: false,
    supportsTools: false,
    pricingMetadata: {
      source: "manual",
      notes: "Local endpoint for desktop/dev deployments.",
    },
  },
  {
    providerId: "vllm",
    displayName: "vLLM compatible",
    adapterKind: "openai-compatible",
    baseUrl: "http://localhost:8000/v1",
    defaultModel: "default",
    supportsJsonSchema: false,
    supportsTools: false,
    pricingMetadata: {
      source: "manual",
      notes: "Self-hosted OpenAI-compatible endpoint.",
    },
  },
] as const;

const providerIds = providerDefinitions.map((provider) => provider.providerId);

export const providerNameSchema = z.enum(
  providerIds as [string, ...string[]],
);
export type ProviderName = z.infer<typeof providerNameSchema>;

export function listProviderDefinitions() {
  return providerDefinitions;
}

export function getProviderDefinition(providerId: ProviderName) {
  return providerDefinitions.find((provider) => provider.providerId === providerId);
}

export function requireProviderDefinition(providerId: ProviderName) {
  const definition = getProviderDefinition(providerId);

  if (!definition) {
    throw new Error(`Unsupported provider: ${providerId}`);
  }

  return definition;
}
