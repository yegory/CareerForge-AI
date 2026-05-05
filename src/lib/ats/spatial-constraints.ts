import {
  GeneratedBlock,
  PlaceholderConstraint,
  SpatialEvaluation,
  SpatialViolation,
} from "./schemas";

export function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export function evaluateSpatialConstraints(
  blocks: GeneratedBlock[],
  constraints: PlaceholderConstraint[],
): SpatialEvaluation {
  const valuesByPlaceholder = new Map(
    blocks.map((block) => [block.placeholder, block.value]),
  );

  const violations = constraints.flatMap<SpatialViolation>((constraint) => {
    const value = valuesByPlaceholder.get(constraint.placeholder) ?? "";
    const charCount = value.length;
    const wordCount = countWords(value);
    const missingRequired = constraint.required && value.trim().length === 0;
    const overChars = charCount > constraint.maxChars;
    const overWords =
      typeof constraint.maxWords === "number" && wordCount > constraint.maxWords;

    if (!missingRequired && !overChars && !overWords) {
      return [];
    }

    const limits = [
      overChars ? `${charCount}/${constraint.maxChars} chars` : null,
      overWords && constraint.maxWords
        ? `${wordCount}/${constraint.maxWords} words`
        : null,
      missingRequired ? "required text missing" : null,
    ].filter(Boolean);

    return [
      {
        placeholder: constraint.placeholder,
        label: constraint.label,
        value,
        charCount,
        maxChars: constraint.maxChars,
        wordCount,
        maxWords: constraint.maxWords,
        severity: constraint.onePageCritical ? "blocking" : "warning",
        message: `${constraint.label} violates layout limits: ${limits.join(", ")}.`,
      },
    ];
  });

  return {
    ok: violations.every((violation) => violation.severity !== "blocking"),
    violations,
  };
}

export function constraintsPromptBlock(
  constraints: PlaceholderConstraint[],
): string {
  return constraints
    .map((constraint) => {
      const wordLimit = constraint.maxWords
        ? `, max ${constraint.maxWords} words`
        : "";

      return `- ${constraint.placeholder} (${constraint.label}): max ${constraint.maxChars} characters${wordLimit}`;
    })
    .join("\n");
}
