export type ExposureLevel =
  | "none"
  | "volunteered"
  | "led"
  | "multiple";

export const EXPOSURE_OPTIONS: { value: ExposureLevel; label: string; score: number }[] = [
  { value: "none", label: "No involvement", score: 0 },
  { value: "volunteered", label: "Volunteered or participated", score: 1 },
  { value: "led", label: "Led or co-founded one", score: 2 },
  { value: "multiple", label: "Ran multiple initiatives", score: 3 },
];

export const FUNCTIONAL_AREAS = [
  "Managing a budget",
  "Fundraising or grants",
  "Working with government",
  "Stakeholder partnerships",
  "Hiring or managing a team",
  "Community outreach",
  "Program design",
  "Impact measurement",
  "Crisis or pivot decisions",
  "Strategic partnerships",
] as const;

export type FunctionalArea = (typeof FUNCTIONAL_AREAS)[number];

export interface ClassifyRequest {
  exposure: ExposureLevel;
  functionalAreas: FunctionalArea[];
  story: string;
  extraContext: string;
}

export interface LLMAnalysis {
  score: number;
  insight: string;
}

export interface ClassifyResponse {
  level: 1 | 2 | 3 | 4;
  levelName: string;
  totalScore: number;
  signal1Score: number;
  signal2Score: number;
  signal3Score: number;
  insight: string;
}

export const LEVEL_INFO: Record<
  1 | 2 | 3 | 4,
  { name: string; description: string; color: string; bgColor: string }
> = {
  1: {
    name: "Explorer",
    description:
      "Brand new to social entrepreneurship — the simulation will start you from the ground up, building intuition through early-stage decisions.",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 border-emerald-200",
  },
  2: {
    name: "Learner",
    description:
      "You have conceptual awareness — the simulation will bridge theory and practice, challenging you with realistic scenarios that test your frameworks.",
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200",
  },
  3: {
    name: "Builder",
    description:
      "You have hands-on experience — the simulation will throw operational complexity at you: resource crunches, stakeholder conflicts, and scaling decisions.",
    color: "text-violet-600",
    bgColor: "bg-violet-50 border-violet-200",
  },
  4: {
    name: "Catalyst",
    description:
      "Real-world operational depth — the simulation will push you into systemic challenges: policy environments, cross-sector strategy, and ecosystem change.",
    color: "text-orange-600",
    bgColor: "bg-orange-50 border-orange-200",
  },
};
