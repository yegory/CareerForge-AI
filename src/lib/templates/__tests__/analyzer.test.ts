import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { analyzeTemplateBuffer } from "../analyzer";

const coverLetterTemplatePath =
  "/Users/yegorye/Documents/Job/resume and cover letter template/Yegor_Yeryomenko_Cover_Letter_Template.docx";

describe("template analyzer", () => {
  const maybeIt = existsSync(coverLetterTemplatePath) ? it : it.skip;

  maybeIt("reports zero placeholders for the current cover letter template", async () => {
    const analysis = await analyzeTemplateBuffer({
      buffer: readFileSync(coverLetterTemplatePath),
      filename: "Yegor_Yeryomenko_Cover_Letter_Template.docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    expect(analysis.placeholders).toEqual([]);
    expect(analysis.needsConversion).toBe(true);
    expect(analysis.text).toContain("Yegor Yeryomenko");
  });
});
