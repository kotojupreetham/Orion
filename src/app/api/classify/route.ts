import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  ClassifyRequest,
  ClassifyResponse,
  LEVEL_INFO,
} from "@/types";
import {
  scoreSignal1,
  scoreSignal2,
  classifyLevel,
  buildLLMPrompt,
  parseLLMResponse,
} from "@/lib/classify";

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  return new OpenAI({ apiKey });
}

export async function POST(req: NextRequest) {
  let body: ClassifyRequest;
  try {
    body = (await req.json()) as ClassifyRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { exposure, functionalAreas, story, extraContext } = body;

  if (!exposure || !Array.isArray(functionalAreas)) {
    return NextResponse.json(
      { error: "Missing required fields: exposure and functionalAreas" },
      { status: 400 }
    );
  }

  const signal1 = scoreSignal1(exposure);
  const signal2 = scoreSignal2(functionalAreas.length);

  // Signal 3 — LLM analysis
  let signal3 = 1;
  let insight = "We couldn't analyse your story — defaulting to a beginner score.";

  const storyTrimmed = story?.trim() ?? "";

  if (storyTrimmed.length >= 20) {
    try {
      const openai = getOpenAIClient();
      const prompt = buildLLMPrompt({ exposure, functionalAreas, story: storyTrimmed, extraContext: extraContext ?? "" });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 300,
      });
      const raw = completion.choices[0]?.message?.content ?? "";
      const analysis = parseLLMResponse(raw);
      signal3 = analysis.score;
      insight = analysis.insight;
    } catch (err) {
      console.error("LLM analysis failed:", err);
      // Fall back to score 1 with default insight already set
    }
  } else {
    insight = "Your story was too short to analyse — defaulting to a beginner score.";
  }

  const totalScore = signal1 + signal2 + signal3;
  const level = classifyLevel(totalScore);
  const levelName = LEVEL_INFO[level].name;

  const response: ClassifyResponse = {
    level,
    levelName,
    totalScore,
    signal1Score: signal1,
    signal2Score: signal2,
    signal3Score: signal3,
    insight,
  };

  return NextResponse.json(response);
}
