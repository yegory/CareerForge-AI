import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { PlaceholderConstraint } from "../ats/schemas";
import { evaluateSpatialConstraints } from "../ats/spatial-constraints";

export interface RenderDocxTemplateInput {
  template: Buffer | Uint8Array;
  data: Record<string, string>;
  constraints: PlaceholderConstraint[];
  allowConstraintViolations?: boolean;
}

export type RenderDocxTemplateResult =
  | {
      ok: true;
      buffer: Buffer;
      violations: ReturnType<typeof evaluateSpatialConstraints>["violations"];
    }
  | {
      ok: false;
      buffer?: never;
      violations: ReturnType<typeof evaluateSpatialConstraints>["violations"];
    };

export function renderDocxTemplate(
  input: RenderDocxTemplateInput,
): RenderDocxTemplateResult {
  const blocks = Object.entries(input.data).map(([placeholder, value]) => ({
    placeholder,
    value,
    sourceKeywords: [],
  }));
  const spatialEvaluation = evaluateSpatialConstraints(blocks, input.constraints);

  if (!spatialEvaluation.ok && !input.allowConstraintViolations) {
    return {
      ok: false,
      violations: spatialEvaluation.violations,
    };
  }

  const zip = new PizZip(input.template);
  const document = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: {
      start: "{{",
      end: "}}",
    },
  });

  document.render(input.data);

  return {
    ok: true,
    buffer: document.getZip().generate({ type: "nodebuffer" }),
    violations: spatialEvaluation.violations,
  };
}
