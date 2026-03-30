import { ClassifyRequest, LLMAnalysis } from "@/types";

export function scoreSignal1(exposure: ClassifyRequest["exposure"]): number {
  const map: Record<ClassifyRequest["exposure"], number> = {
    none: 0,
    volunteered: 1,
    led: 2,
    multiple: 3,
  };
  return map[exposure] ?? 0;
}

export function scoreSignal2(count: number): number {
  if (count === 0) return 0;
  if (count <= 3) return 1;
  if (count <= 6) return 2;
  return 3;
}

export function classifyLevel(total: number): 1 | 2 | 3 | 4 {
  if (total <= 1) return 1;
  if (total <= 3) return 2;
  if (total <= 6) return 3;
  return 4;
}

export function buildLLMPrompt(req: ClassifyRequest): string {
  const exposureLabel =
    req.exposure === "none"
      ? "No involvement"
      : req.exposure === "volunteered"
      ? "Volunteered or participated"
      : req.exposure === "led"
      ? "Led or co-founded one initiative"
      : "Ran multiple initiatives";

  const chipsLabel =
    req.functionalAreas.length > 0
      ? req.functionalAreas.join(", ")
      : "None selected";

  return `You are evaluating a user for a social entrepreneurship simulation platform. Based on their background, classify their language complexity and experience depth.

User inputs:
- Prior exposure: ${exposureLabel}
- Functional areas they've dealt with: ${chipsLabel}
- Their story: "${req.story}"
- Additional context: "${req.extraContext}"

Return ONLY a valid JSON object with exactly these fields:
{
  "score": <integer 1, 2, or 3>,
  "insight": "<1-2 sentence specific insight about how they write and think>"
}

Scoring rubric for score:
1 = Beginner/exploratory language — vague, general terms, no field vocabulary
2 = Some field vocabulary — uses terms like stakeholder, impact, sustainability, community
3 = Operational depth — uses terms like stakeholder, pivot, runway, co-design, impact measurement, cross-subsidy naturally and in context`;
}

export function parseLLMResponse(raw: string): LLMAnalysis {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON object found in LLM response");
  }
  const parsed = JSON.parse(jsonMatch[0]) as Partial<LLMAnalysis>;
  const score = Number(parsed.score);
  if (!score || score < 1 || score > 3) {
    throw new Error(`Invalid score in LLM response: ${parsed.score}`);
  }
  return {
    score: score as 1 | 2 | 3,
    insight: parsed.insight ?? "No insight provided.",
  };
}
