"use client";

import { ClassifyResponse, LEVEL_INFO } from "@/types";

interface ResultCardProps {
  result: ClassifyResponse;
  onRetake: () => void;
}

const LEVEL_ICONS: Record<1 | 2 | 3 | 4, string> = {
  1: "🌱",
  2: "📚",
  3: "🔨",
  4: "⚡",
};

export default function ResultCard({ result, onRetake }: ResultCardProps) {
  const info = LEVEL_INFO[result.level];
  const icon = LEVEL_ICONS[result.level];
  const maxScore = 9;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Level badge */}
      <div className={`rounded-2xl border-2 p-8 text-center ${info.bgColor}`}>
        <div className="text-6xl mb-4">{icon}</div>
        <div className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-1">
          Level {result.level}
        </div>
        <h2 className={`text-4xl font-bold mb-3 ${info.color}`}>
          {result.levelName}
        </h2>
        <p className="text-gray-600 text-base leading-relaxed max-w-md mx-auto">
          {info.description}
        </p>
      </div>

      {/* Score breakdown */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
          Score Breakdown
        </h3>
        <div className="space-y-3">
          <ScoreRow label="Prior Exposure" score={result.signal1Score} max={3} />
          <ScoreRow label="Functional Experience" score={result.signal2Score} max={3} />
          <ScoreRow label="Language Depth" score={result.signal3Score} max={3} />
        </div>
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">Total</span>
          <span className="text-lg font-bold text-gray-900">
            {result.totalScore} / {maxScore}
          </span>
        </div>
      </div>

      {/* LLM Insight */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">
          What We Noticed
        </h3>
        <p className="text-gray-700 leading-relaxed italic">&ldquo;{result.insight}&rdquo;</p>
      </div>

      <button
        onClick={onRetake}
        className="w-full py-3 rounded-xl border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
      >
        Start Over
      </button>
    </div>
  );
}

function ScoreRow({
  label,
  score,
  max,
}: {
  label: string;
  score: number;
  max: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-44 shrink-0">{label}</span>
      <div className="flex-1 flex gap-1">
        {Array.from({ length: max }).map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full transition-colors ${
              i < score ? "bg-indigo-500" : "bg-gray-100"
            }`}
          />
        ))}
      </div>
      <span className="text-sm font-semibold text-gray-700 w-10 text-right">
        {score}/{max}
      </span>
    </div>
  );
}
