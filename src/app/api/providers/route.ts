import { NextResponse } from "next/server";
import { listProviderDefinitions } from "@/lib/llm/registry";

export async function GET() {
  return NextResponse.json({
    providers: listProviderDefinitions().map((provider) => ({
      providerId: provider.providerId,
      displayName: provider.displayName,
      adapterKind: provider.adapterKind,
      baseUrl: provider.baseUrl ?? null,
      defaultModel: provider.defaultModel,
      supportsJsonSchema: provider.supportsJsonSchema,
      supportsTools: provider.supportsTools,
      pricingMetadata: provider.pricingMetadata,
    })),
  });
}
