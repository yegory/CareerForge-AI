import PizZip from "pizzip";
import { describe, expect, it } from "vitest";
import { PlaceholderConstraint } from "../../ats/schemas";
import { renderDocxTemplate } from "../render-template";

function createTemplate(): Buffer {
  const zip = new PizZip();

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.folder("_rels")?.file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  zip.folder("word")?.file(
    "document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>{{Summary}}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{{Experience_Bullet_1}}</w:t></w:r></w:p>
    <w:sectPr/>
  </w:body>
</w:document>`,
  );

  return zip.generate({ type: "nodebuffer" });
}

const constraints: PlaceholderConstraint[] = [
  {
    placeholder: "Summary",
    label: "Summary",
    maxChars: 120,
    maxWords: 20,
    required: true,
    onePageCritical: true,
  },
  {
    placeholder: "Experience_Bullet_1",
    label: "Experience bullet",
    maxChars: 120,
    maxWords: 20,
    required: true,
    onePageCritical: true,
  },
];

describe("renderDocxTemplate", () => {
  it("renders flat placeholder data into a docx buffer", () => {
    const result = renderDocxTemplate({
      template: createTemplate(),
      constraints,
      data: {
        Summary: "Full-stack engineer focused on ATS-safe content.",
        Experience_Bullet_1:
          "Built React onboarding flows that improved activation by 18%.",
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected DOCX render to pass.");
    }

    const renderedZip = new PizZip(result.buffer);
    const documentXml = renderedZip.file("word/document.xml")?.asText();
    expect(documentXml).toContain("Full-stack engineer focused on ATS-safe content.");
    expect(documentXml).toContain(
      "Built React onboarding flows that improved activation by 18%.",
    );
    expect(documentXml).not.toContain("{{Summary}}");
  });

  it("blocks export when a one-page-critical placeholder is too long", () => {
    const result = renderDocxTemplate({
      template: createTemplate(),
      constraints,
      data: {
        Summary: "Full-stack engineer.",
        Experience_Bullet_1:
          "Built a very long onboarding workflow description that keeps going beyond the approved placeholder budget and would break the one-page layout if exported without review.",
      },
    });

    expect(result.ok).toBe(false);
    expect(result.violations[0]?.placeholder).toBe("Experience_Bullet_1");
    expect(result.violations[0]?.severity).toBe("blocking");
  });

  it("can render with violations when explicitly allowed", () => {
    const result = renderDocxTemplate({
      template: createTemplate(),
      constraints,
      allowConstraintViolations: true,
      data: {
        Summary: "Full-stack engineer.",
        Experience_Bullet_1:
          "Built a very long onboarding workflow description that keeps going beyond the approved placeholder budget and would break the one-page layout if exported without review.",
      },
    });

    expect(result.ok).toBe(true);
    expect(result.violations).toHaveLength(1);
  });
});
