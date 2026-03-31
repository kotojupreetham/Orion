/**
 * ═══════════════════════════════════════════════════════════════
 *  ORION — Configuration
 *  API keys, Firebase config, constants, container definitions
 * ═══════════════════════════════════════════════════════════════
 */

// ── Firebase ──
export const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDxPx7dhn3gEbFl54DMrd9eRlkjZ9lbqIk",
    authDomain: "orion-52356.firebaseapp.com",
    databaseURL: "https://orion-52356-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "orion-52356",
    storageBucket: "orion-52356.firebasestorage.app",
    messagingSenderId: "66921521599",
    appId: "1:66921521599:web:dc6bb1d31515848f0c410a",
    measurementId: "G-TFJH37VZYC"
};

// ── AI (OpenRouter) ──
export const AI_CONFIG = {
    apiKey: "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",
    model: "google/gemini-2.5-flash-lite",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    maxTokens: 2048,
    temperature: 0.7,
};

// ── Level Metadata ──
export const LEVELS = {
    explorer: { name: "Explorer", emoji: "🌱", color: "var(--explorer)", description: "You're taking your first steps into social innovation. Start by understanding the problem deeply." },
    learner:  { name: "Learner",  emoji: "📚", color: "var(--learner)",  description: "You're building knowledge and validating assumptions through research and community engagement." },
    builder:  { name: "Builder",  emoji: "🔨", color: "var(--builder)",  description: "You're executing with purpose — building MVPs, testing with real users, and iterating fast." },
    catalyst: { name: "Catalyst", emoji: "⚡", color: "var(--catalyst)", description: "You're thinking systemically — creating ecosystems, influencing policy, and scaling impact." },
};

// ── Container Definitions (10 types) ──
// ── Container Definitions (11 types) ──
export const CONTAINER_DEFS = {
    problem:       { label: "Problem",        emoji: "🔴", category: "core",     template: "text",   fields: ["title", "description"] },
    solution:      { label: "Solution",       emoji: "🟢", category: "core",     template: "text",   fields: ["title", "description"] },
    audience:      { label: "Target Audience",emoji: "👥", category: "core",     template: "text",   fields: ["title", "description"] },
    techstack:     { label: "Technical Stack",emoji: "⚡", category: "core",     template: "checkbox", options: ["React Base", "Node.js", "Firebase", "Gemini AI", "Stripe API", "AWS Hosting"] },
    resources:     { label: "Resources Needs",emoji: "💰", category: "planning", template: "slider", sliders: ["Marketing", "Operations", "Development"] },
    risks:         { label: "Risks & Threats",emoji: "⚠️", category: "planning", template: "text",   fields: ["title", "description"] },
    milestones:    { label: "Milestones",     emoji: "🎯", category: "planning", template: "text",   fields: ["title", "description"] },
    partnerships:  { label: "Partnerships",   emoji: "🤝", category: "growth",   template: "text",   fields: ["title", "description"] },
    impact:        { label: "Impact Goals",   emoji: "📊", category: "growth",   template: "kpi",    kpis: ["Lives Impacted Target", "Carbon Reduced (Tons)"] },
    revenue:       { label: "Revenue Model",  emoji: "💵", category: "growth",   template: "text",   fields: ["title", "description"] },
    sustainability:{ label: "Sustainability", emoji: "♻️",  category: "growth",   template: "text",   fields: ["title", "description"] },
};

// ── Simulation Stakeholders ──
export const STAKEHOLDERS = [
    { id: "community", name: "Community Leader", emoji: "👤", role: "Local Representative" },
    { id: "investor",  name: "Impact Investor",  emoji: "💼", role: "Funding Partner" },
    { id: "government",name: "City Official",    emoji: "🏛️", role: "Government Liaison" },
    { id: "ngo",       name: "NGO Director",     emoji: "🌍", role: "Strategic Partner" },
];

// ── Chat Prompt Suggestions ──
export const PROMPT_SUGGESTIONS = [
    { icon: "🔍", text: "Analyze my startup idea for strengths and weaknesses" },
    { icon: "📊", text: "How should I measure impact for my initiative?" },
    { icon: "⚡", text: "What risks should I prepare for?" },
    { icon: "🤝", text: "How do I find the right partners?" },
];
