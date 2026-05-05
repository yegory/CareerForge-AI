import { describe, expect, it } from "vitest";
import { createGenerationJobRequestSchema } from "../jobs";

describe("generation job request schema", () => {
  it("accepts the mobile quick-generate payload", () => {
    const parsed = createGenerationJobRequestSchema.parse({
      company: "Acme",
      roleTitle: "Product Engineer",
      sourceUrl: "https://example.com/job",
      jobDescription:
        "We need a product engineer with React, Node.js, PostgreSQL, and customer onboarding experience.",
      providerKeyId: "f809be15-b18c-420f-9cd7-6d4f16c71b6d",
      masterProfileId: "787f78b0-af5d-4895-a05f-85d8c4a4798e",
      templateId: "bf73b8ee-5125-441c-adff-831a473816ce",
    });

    expect(parsed.roleTitle).toBe("Product Engineer");
  });

  it("rejects short job descriptions before queueing", () => {
    expect(() =>
      createGenerationJobRequestSchema.parse({
        jobDescription: "too short",
      }),
    ).toThrow();
  });
});
