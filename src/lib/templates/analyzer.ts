import mammoth from "mammoth";
import PizZip from "pizzip";

export interface TemplateAnalysis {
  text: string;
  placeholders: string[];
  needsConversion: boolean;
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function extensionFor(filename: string) {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts.at(-1) ?? "" : "";
}

function docxPlaceholders(buffer: Buffer) {
  const zip = new PizZip(buffer);
  const xml = zip.file("word/document.xml")?.asText() ?? "";
  const matches = xml.match(/\{\{[^}]+\}\}/g) ?? [];

  return unique(matches.map((match) => match.replace(/[{}]/g, "").trim()));
}

async function extractDocxText(buffer: Buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}

async function extractPdfText(buffer: Buffer) {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return result.text.trim();
  } finally {
    await parser.destroy();
  }
}

export async function analyzeTemplateBuffer(input: {
  buffer: Buffer;
  filename: string;
  mimeType?: string;
}): Promise<TemplateAnalysis> {
  const extension = extensionFor(input.filename);
  const isDocx =
    extension === "docx" ||
    input.mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const isPdf = extension === "pdf" || input.mimeType === "application/pdf";
  const isText = extension === "txt" || input.mimeType === "text/plain";

  if (isDocx) {
    const placeholders = docxPlaceholders(input.buffer);

    return {
      text: await extractDocxText(input.buffer),
      placeholders,
      needsConversion: placeholders.length === 0,
    };
  }

  if (isPdf) {
    return {
      text: await extractPdfText(input.buffer),
      placeholders: [],
      needsConversion: true,
    };
  }

  if (isText) {
    return {
      text: input.buffer.toString("utf8").trim(),
      placeholders: [],
      needsConversion: true,
    };
  }

  throw new Error("Supported imports are DOCX, PDF, and TXT files.");
}

export function placeholdersToConstraints(placeholders: string[]) {
  return placeholders.map((placeholder) => ({
    placeholder,
    label: placeholder.replaceAll("_", " "),
    maxChars: 600,
    maxWords: 110,
    required: true,
    onePageCritical: true,
  }));
}
