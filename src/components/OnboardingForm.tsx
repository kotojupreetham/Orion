"use client";

import { useState } from "react";
import {
  ExposureLevel,
  EXPOSURE_OPTIONS,
  FUNCTIONAL_AREAS,
  FunctionalArea,
  ClassifyRequest,
  ClassifyResponse,
} from "@/types";
import ResultCard from "./ResultCard";

const STEPS = ["Prior Experience", "Functional Areas", "Your Story", "Results"];

export default function OnboardingForm() {
  const [step, setStep] = useState(0);
  const [exposure, setExposure] = useState<ExposureLevel | "">("");
  const [selectedAreas, setSelectedAreas] = useState<FunctionalArea[]>([]);
  const [story, setStory] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClassifyResponse | null>(null);

  function toggleArea(area: FunctionalArea) {
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const payload: ClassifyRequest = {
        exposure: exposure as ExposureLevel,
        functionalAreas: selectedAreas,
        story,
        extraContext,
      };
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errBody: unknown = await res.json().catch(() => ({}));
        const message =
          errBody !== null &&
          typeof errBody === "object" &&
          "error" in errBody &&
          typeof (errBody as Record<string, unknown>).error === "string"
            ? (errBody as { error: string }).error
            : `Server error: ${res.status}`;
        throw new Error(message);
      }
      const data = (await res.json()) as ClassifyResponse;
      setResult(data);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep(0);
    setExposure("");
    setSelectedAreas([]);
    setStory("");
    setExtraContext("");
    setResult(null);
    setError(null);
  }

  const canProceedStep0 = exposure !== "";
  const canProceedStep2 = story.trim().length >= 20;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10 max-w-xl">
        <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
          NyxTutor · CodeNyx @ CVR
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Your Starting Level</h1>
        <p className="text-gray-500 text-base">
          Answer three quick questions so the simulation can adapt to your experience.
        </p>
      </div>

      {/* Progress */}
      {step < 3 && (
        <div className="w-full max-w-2xl mb-8">
          <div className="flex items-center gap-2">
            {STEPS.slice(0, 3).map((label, i) => (
              <div key={i} className="flex items-center flex-1 gap-2">
                <div
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    i <= step ? "bg-indigo-500" : "bg-gray-200"
                  }`}
                />
                {i < 2 && (
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      i < step ? "bg-indigo-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {STEPS.slice(0, 3).map((label, i) => (
              <span
                key={i}
                className={`text-xs font-medium ${
                  i === step ? "text-indigo-600" : "text-gray-400"
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Step 0 — Prior Exposure */}
      {step === 0 && (
        <div className="w-full max-w-2xl bg-white rounded-2xl border border-gray-200 p-8 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              How would you describe your involvement in social entrepreneurship?
            </h2>
            <p className="text-sm text-gray-500">Choose the option that best fits your experience so far.</p>
          </div>
          <div className="space-y-3">
            {EXPOSURE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  exposure === opt.value
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="exposure"
                  value={opt.value}
                  checked={exposure === opt.value}
                  onChange={() => setExposure(opt.value)}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                    exposure === opt.value
                      ? "border-indigo-500 bg-indigo-500"
                      : "border-gray-300"
                  }`}
                >
                  {exposure === opt.value && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                <span className="text-gray-800 font-medium">{opt.label}</span>
              </label>
            ))}
          </div>
          <button
            disabled={!canProceedStep0}
            onClick={() => setStep(1)}
            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 1 — Functional Areas */}
      {step === 1 && (
        <div className="w-full max-w-2xl bg-white rounded-2xl border border-gray-200 p-8 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              Which of these have you actually dealt with?
            </h2>
            <p className="text-sm text-gray-500">
              Select everything that applies — real experience, not just awareness.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {FUNCTIONAL_AREAS.map((area) => {
              const selected = selectedAreas.includes(area);
              return (
                <button
                  key={area}
                  onClick={() => toggleArea(area)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${
                    selected
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-white border-gray-200 text-gray-700 hover:border-indigo-300"
                  }`}
                >
                  {area}
                </button>
              );
            })}
          </div>
          <div className="text-xs text-gray-400">
            {selectedAreas.length === 0
              ? "None selected"
              : `${selectedAreas.length} selected`}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(0)}
              className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Story */}
      {step === 2 && (
        <div className="w-full max-w-2xl bg-white rounded-2xl border border-gray-200 p-8 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              Tell us about the most complex problem you&apos;ve tackled in this space.
            </h2>
            <p className="text-sm text-gray-500">
              Write in your own words — we&apos;re looking at how you think, not what you know.
            </p>
          </div>
          <textarea
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder="e.g. I helped a rural micro-enterprise navigate a stakeholder conflict between local government and the NGO funding us..."
            rows={5}
            className="w-full rounded-xl border border-gray-200 p-4 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-gray-400"
          />
          <div className="text-xs text-gray-400 text-right">
            {story.trim().length < 20
              ? `${Math.max(0, 20 - story.trim().length)} more characters to continue`
              : `${story.trim().length} characters`}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Anything else you&apos;d like to add? <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={extraContext}
              onChange={(e) => setExtraContext(e.target.value)}
              placeholder="e.g. I'm currently pursuing an MBA with a focus on impact investing..."
              rows={3}
              className="w-full rounded-xl border border-gray-200 p-4 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-gray-400"
            />
          </div>
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              disabled={loading}
              className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              Back
            </button>
            <button
              disabled={!canProceedStep2 || loading}
              onClick={handleSubmit}
              className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Analysing…
                </>
              ) : (
                "Classify Me"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Result */}
      {step === 3 && result && <ResultCard result={result} onRetake={reset} />}
    </div>
  );
}
