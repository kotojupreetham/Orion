/**
 * ═══════════════════════════════════════════════════════════════
 *  ORION — AI Engine (OpenRouter → Gemini 2.5 Flash Lite)
 *  Analysis · Simulation · Evaluation · Onboarding · Fallbacks
 * ═══════════════════════════════════════════════════════════════
 */

import { AI_CONFIG } from "./config.js";

// ── Core API Call ──
async function callAI(systemPrompt, userPrompt, jsonMode = true) {
    try {
        const res = await fetch(AI_CONFIG.endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${AI_CONFIG.apiKey}`,
                "HTTP-Referer": window.location.origin,
                "X-Title": "Orion Decision Engine",
            },
            body: JSON.stringify({
                model: AI_CONFIG.model,
                max_tokens: AI_CONFIG.maxTokens,
                temperature: AI_CONFIG.temperature,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
            }),
        });

        if (!res.ok) {
            console.warn(`[AI] API returned ${res.status}`);
            return null;
        }

        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || "";

        if (jsonMode) {
            const s = text.indexOf("{");
            const e = text.lastIndexOf("}");
            if (s !== -1 && e !== -1) return JSON.parse(text.substring(s, e + 1));
            // Try array
            const as = text.indexOf("[");
            const ae = text.lastIndexOf("]");
            if (as !== -1 && ae !== -1) return JSON.parse(text.substring(as, ae + 1));
            return null;
        }
        return text;
    } catch (err) {
        console.error("[AI] Call failed:", err);
        return null;
    }
}

// ══════════════════════════════════════════════════════════════
// 1. PROJECT ANALYSIS
// ══════════════════════════════════════════════════════════════
export async function analyzeProject(messages, idea, level) {
    const system = `You are Orion, an AI mentor for young social entrepreneurs. Analyze the user's startup idea and provide actionable feedback. Be warm, encouraging, and specific. Return JSON.`;
    const user = `Startup Idea: "${idea}"
User Level: ${level}
Recent messages: ${JSON.stringify(messages.slice(-6))}

Analyze and return JSON:
{
  "scores": { "vision": 0-100, "strategy": 0-100, "feasibility": 0-100, "impact": 0-100 },
  "feedback": "2-3 sentence overall assessment",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["area 1", "area 2"],
  "nextStep": "One specific actionable next step"
}`;

    const result = await callAI(system, user);
    return result || FALLBACK_ANALYSIS;
}

// ══════════════════════════════════════════════════════════════
// 2. CHAT RESPONSE
// ══════════════════════════════════════════════════════════════
export async function getChatResponse(message, idea, level, history) {
    const system = `You are Orion, a warm AI mentor helping young social entrepreneurs. You're discussing their startup idea. Keep responses concise (2-4 sentences), actionable, and encouraging. Don't use markdown formatting.`;
    const user = `Idea: "${idea}"
Level: ${level}
Chat history: ${JSON.stringify(history.slice(-4))}
User says: "${message}"

Respond naturally as a mentor.`;

    const result = await callAI(system, user, false);
    return result || "That's a great point! Let me think about how we can build on that. Try adding more details about your target audience — who specifically would benefit most from this?";
}

// ══════════════════════════════════════════════════════════════
// 3. SIMULATION SCENARIOS
// ══════════════════════════════════════════════════════════════
export async function generateScenario(idea, level, pastDecisions, metrics) {
    const system = `You are a simulation engine for social entrepreneurship training. Generate realistic decision scenarios based on the user's startup idea. Return JSON only.`;
    const user = `Idea: "${idea}"
Level: ${level}
Past decisions: ${pastDecisions.length}
Current metrics: ${JSON.stringify(metrics)}

Generate ONE decision scenario. Return JSON:
{
  "context": "Brief situation description (1-2 sentences)",
  "question": "The decision question",
  "choices": [
    { "id": "A", "text": "Choice description", "effects": { "funds": -10, "trust": +5, "impact": +10, "sustainability": 0 } },
    { "id": "B", "text": "Choice description", "effects": { "funds": 0, "trust": -5, "impact": +5, "sustainability": +10 } },
    { "id": "C", "text": "Choice description", "effects": { "funds": +5, "trust": 0, "impact": 0, "sustainability": +5 } }
  ]
}`;

    const result = await callAI(system, user);
    return result || FALLBACK_SCENARIOS[Math.min(pastDecisions.length, FALLBACK_SCENARIOS.length - 1)];
}

// ══════════════════════════════════════════════════════════════
// 4. RESOLVE CHOICE OUTCOME
// ══════════════════════════════════════════════════════════════
export async function resolveChoice(scenario, choice, idea) {
    const system = `You are a simulation engine. Describe the realistic outcome of a decision in a social startup context. Be vivid but concise. Return JSON.`;
    const user = `Scenario: "${scenario.question}"
Choice made: "${choice.text}"
Startup: "${idea}"

Return JSON:
{
  "verdict": "POSITIVE" or "MIXED" or "NEGATIVE",
  "icon": "emoji representing outcome",
  "narrative": "2-3 sentence vivid description of what happened",
  "lesson": "One key takeaway"
}`;

    const result = await callAI(system, user);
    return result || { verdict: "MIXED", icon: "⚖️", narrative: "Your decision sets things in motion. The community watches closely as you navigate this challenge. Time will tell if this was the right call.", lesson: "Every decision in social entrepreneurship involves trade-offs." };
}

// ══════════════════════════════════════════════════════════════
// 5. EVALUATION SCORECARD
// ══════════════════════════════════════════════════════════════
export async function evaluateStartup(answers, level, idea) {
    const system = `You are an expert startup evaluator assessing a social initiative. Generate a detailed viability scorecard. Return JSON.`;
    const user = `Idea: "${idea}"
Level: ${level}
Evaluation answers: ${JSON.stringify(answers)}

Return JSON:
{
  "overall": 0-100,
  "metrics": {
    "Problem Clarity": { "score": 0-100, "color": "#4ade80" },
    "Solution Fit": { "score": 0-100, "color": "#4f8ef7" },
    "Market Viability": { "score": 0-100, "color": "#f59e0b" },
    "Impact Potential": { "score": 0-100, "color": "#a78bfa" },
    "Team Readiness": { "score": 0-100, "color": "#22d3ee" },
    "Sustainability": { "score": 0-100, "color": "#fb923c" }
  },
  "summary": "2-3 sentence executive summary",
  "feedback": "3-4 sentence detailed feedback with specific recommendations"
}`;

    const result = await callAI(system, user);
    return result || FALLBACK_EVALUATION;
}

// ══════════════════════════════════════════════════════════════
// 6. ONBOARDING QUESTION GENERATION
// ══════════════════════════════════════════════════════════════
export async function generateOnboardingQuestion(idea, targetLevel, pastQuestions, userAge, questionType) {
    const system = `You are a warm, conversational mentor evaluating a user's social initiative startup. Ask contextual, scenario-based questions.`;
    const ageNote = userAge <= 18
        ? "The user is a teenager. Focus on grassroots, app-building, community organising."
        : "The user is an adult. You may include advanced funding models, legal structures.";

    const user = `Startup Idea: "${idea}"
Target Level: "${targetLevel}"
${ageNote}
Previous questions (DO NOT REPEAT): ${JSON.stringify(pastQuestions)}

Return ONLY valid JSON (no markdown):
{
  "title": "Short 3-word title",
  "question": "Conversational scenario question...",
  "type": "${questionType}"${questionType === "mcq" ? `,
  "options": [{"id":"A","text":"...","scoreLevel":"explorer"},{"id":"B","text":"...","scoreLevel":"learner"},{"id":"C","text":"...","scoreLevel":"builder"}]` : ""}
}`;

    return await callAI(system, user);
}

// ══════════════════════════════════════════════════════════════
// 7. STAKEHOLDER NEGOTIATION
// ══════════════════════════════════════════════════════════════
export async function generateNegotiation(stakeholder, idea, metrics) {
    const system = `You are simulating a stakeholder negotiation for a social startup. Create a realistic negotiation scenario. Return JSON.`;
    const user = `Stakeholder: ${stakeholder.name} (${stakeholder.role})
Startup: "${idea}"
Current metrics: ${JSON.stringify(metrics)}

Return JSON:
{
  "scenario": "2-3 sentence setup for the negotiation",
  "choices": [
    { "id": "A", "text": "Approach description", "outcome": "What happens", "effects": { "trust": 10, "funds": -5 } },
    { "id": "B", "text": "Approach description", "outcome": "What happens", "effects": { "trust": -5, "funds": 10 } },
    { "id": "C", "text": "Approach description", "outcome": "What happens", "effects": { "trust": 5, "funds": 0 } }
  ]
}`;

    const result = await callAI(system, user);
    return result || FALLBACK_NEGOTIATION;
}

// ══════════════════════════════════════════════════════════════
// FALLBACK DATA
// ══════════════════════════════════════════════════════════════
const FALLBACK_ANALYSIS = {
    scores: { vision: 65, strategy: 55, feasibility: 60, impact: 70 },
    feedback: "Your initiative shows promising potential! Focus on sharpening your target audience and building a clear execution roadmap.",
    strengths: ["Strong social mission", "Clear problem identification"],
    improvements: ["Define measurable impact metrics", "Develop a sustainability plan"],
    nextStep: "Interview 5 potential beneficiaries this week to validate your assumptions.",
};

const FALLBACK_SCENARIOS = [
    {
        context: "Your initiative is gaining attention in the local community. A news outlet wants to cover your story.",
        question: "How do you handle the sudden media attention?",
        choices: [
            { id: "A", text: "Embrace it fully — use the coverage to attract donors and volunteers", effects: { funds: 10, trust: 5, impact: 15, sustainability: -5 } },
            { id: "B", text: "Be cautious — ensure your messaging is accurate and mission-aligned", effects: { funds: 0, trust: 10, impact: 5, sustainability: 10 } },
            { id: "C", text: "Decline for now — you're not ready for the spotlight yet", effects: { funds: -5, trust: -5, impact: -10, sustainability: 5 } },
        ],
    },
    {
        context: "A competing organization approaches you about merging efforts to avoid duplication.",
        question: "Do you merge, collaborate, or stay independent?",
        choices: [
            { id: "A", text: "Merge — combine resources for greater impact", effects: { funds: 15, trust: -10, impact: 20, sustainability: 10 } },
            { id: "B", text: "Collaborate on specific projects while maintaining independence", effects: { funds: 5, trust: 10, impact: 10, sustainability: 5 } },
            { id: "C", text: "Stay independent — your vision is unique and shouldn't be diluted", effects: { funds: -5, trust: 5, impact: 0, sustainability: 0 } },
        ],
    },
    {
        context: "Your primary funding source announces they're cutting grants by 40% next quarter.",
        question: "How do you respond to the funding crisis?",
        choices: [
            { id: "A", text: "Pivot to a revenue-generating model immediately", effects: { funds: 10, trust: -10, impact: -5, sustainability: 20 } },
            { id: "B", text: "Diversify — launch a crowdfunding campaign and seek corporate sponsors", effects: { funds: 5, trust: 5, impact: 0, sustainability: 10 } },
            { id: "C", text: "Scale down operations to match the reduced budget", effects: { funds: 0, trust: 0, impact: -15, sustainability: 5 } },
        ],
    },
];

const FALLBACK_EVALUATION = {
    overall: 62,
    metrics: {
        "Problem Clarity": { score: 70, color: "#4ade80" },
        "Solution Fit": { score: 60, color: "#4f8ef7" },
        "Market Viability": { score: 55, color: "#f59e0b" },
        "Impact Potential": { score: 72, color: "#a78bfa" },
        "Team Readiness": { score: 50, color: "#22d3ee" },
        "Sustainability": { score: 58, color: "#fb923c" },
    },
    summary: "Your initiative demonstrates strong social awareness with room for strategic refinement.",
    feedback: "Focus on building a clear theory of change that connects your activities to measurable outcomes. Consider conducting user research to validate your assumptions before scaling.",
};

const FALLBACK_NEGOTIATION = {
    scenario: "The stakeholder is interested but has concerns about your long-term viability. They want to see evidence of community support.",
    choices: [
        { id: "A", text: "Present community testimonials and engagement data", outcome: "They're impressed by ground-level support", effects: { trust: 10, funds: 0 } },
        { id: "B", text: "Offer an equity stake in exchange for their support", outcome: "They negotiate hard but agree", effects: { trust: -5, funds: 15 } },
        { id: "C", text: "Propose a small pilot project to prove the concept", outcome: "They agree to a limited trial period", effects: { trust: 5, funds: -5 } },
    ],
};
