import { GeneratedContent, JdAnalysis, Keyword, MatchResult } from "./schemas";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeKeywords(keywords: Keyword[]): Keyword[] {
  const seen = new Set<string>();

  return keywords.filter((keyword) => {
    const key = normalize(keyword.term);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function contentCorpus(generatedContent: GeneratedContent): string {
  return normalize(
    [...generatedContent.resumeBlocks, ...generatedContent.coverLetterBlocks]
      .map((block) => block.value)
      .join(" "),
  );
}

function keywordWasHit(keyword: Keyword, corpus: string): boolean {
  const term = normalize(keyword.term);

  if (term.length === 0) {
    return false;
  }

  if (term.length <= 3) {
    return new RegExp(`(^|\\s)${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(
      corpus,
    );
  }

  return corpus.includes(term);
}

export function calculateKeywordMatchScore(
  jdAnalysis: JdAnalysis,
  generatedContent: GeneratedContent,
): MatchResult {
  const keywords = dedupeKeywords(jdAnalysis.primaryKeywords);
  const corpus = contentCorpus(generatedContent);
  const keywordsHit = keywords.filter((keyword) => keywordWasHit(keyword, corpus));
  const keywordsMissed = keywords.filter(
    (keyword) => !keywordWasHit(keyword, corpus),
  );
  const score =
    keywords.length === 0 ? 0 : Math.round((keywordsHit.length / keywords.length) * 100);

  return {
    score,
    keywordsHit,
    keywordsMissed,
    totalKeywords: keywords.length,
  };
}
