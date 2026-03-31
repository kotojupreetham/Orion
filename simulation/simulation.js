/**
 * ═══════════════════════════════════════════════════════════════
 *  ORION — Simulation Engine
 *  simulation.js
 *
 *  GSAP Animation Contracts:
 *  · Metric counter (budget, morale, trust):
 *      gsap onUpdate → innerHTML ticker for smooth number counts
 *  · Stat bars (right panel):
 *      gsap elastic.out(1, 0.5) to snap to new width
 *  · Metric pill flash: brief scale + glow
 *  · Log entry reveal:
 *      gsap.from(li, { height: 0, opacity: 0, y: -20, duration: 0.6, ease: "power3.out" })
 *      pushes older entries down fluidly
 *  · Scenario reveal: power4.out stagger
 *  · Outcome card: back.out(1.6) spring
 *  · Tab switch: crossfade
 * ═══════════════════════════════════════════════════════════════
 */

import { auth, db, aiApiKey } from "../config/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ══════════════════════════════════════════════════════════════
// GEMINI CONFIG
// ══════════════════════════════════════════════════════════════
const GEMINI_API_KEY = aiApiKey || "AIzaSyDR-v7ncbMDKPgzDnrIiAoAKTs3LDS2v9c";
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_ENDPOINT_BASE = `https://generativelanguage.googleapis.com/v1beta2/models/${GEMINI_MODEL}`;

// ══════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════
const simState = {
    // Metrics — animated from current → next values by GSAP
    budget:   500000,
    morale:   80,
    trust:    70,
    timeline: 100,

    decisionIndex:        0,
    decisionsComplete:    false,
    stakeholdersCompleted: [],
    log:                  [],
    logCount:             0,
    allocation: { tech: 30, marketing: 20, team: 30, operations: 10, outreach: 10 },
    userIdea:     "Startup Idea",
    userLevel:    "Explorer",
    aiScenarios:  [],
    isAILoading:  false,
    retryCount:   0,
};

// ══════════════════════════════════════════════════════════════
// GEMINI CONFIG
// ══════════════════════════════════════════════════════════════
const GEMINI_API_KEY = aiApiKey || "AIzaSyDR-v7ncbMDKPgzDnrIiAoAKTs3LDS2v9c";
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_ENDPOINT_BASE = `https://generativelanguage.googleapis.com/v1beta2/models/${GEMINI_MODEL}`;

// ══════════════════════════════════════════════════════════════
// STATIC SCENARIOS (fallback / default)
// ══════════════════════════════════════════════════════════════
const DECISION_SCENARIOS = [
    {
        context: "Month 2: Your NGO partner, who managed community outreach, suddenly withdraws due to internal restructuring.",
        question: "Your community outreach partner pulls out. Budget drops 40%. What do you do?",
        choices: [
            { text: "Pause outreach entirely and redirect funds to product development",      effects: { budget: +5, morale: -10, trust: -20, timeline: +5  }, outcome: "You saved money but lost community trust. Adoption rates will drop without ground-level outreach." },
            { text: "Hire a small local team to replace the NGO's community work immediately", effects: { budget: -15, morale: +5,  trust: +10, timeline: -5  }, outcome: "Quick replacement kept trust intact but increased spend. The team is less experienced." },
            { text: "Negotiate with 2–3 smaller NGOs to split the outreach work",             effects: { budget: -5,  morale: +10, trust: +15, timeline: -10 }, outcome: "Smart. Diversified partnerships reduce single-point dependency. Takes time to onboard." },
        ],
    },
    {
        context: "Month 4: A local government official offers to endorse your project — but wants you to pivot from 'urban youth' to 'rural women'.",
        question: "A powerful government endorsement is on the table, but it requires pivoting your target users. Do you accept?",
        choices: [
            { text: "Accept fully — government backing opens massive doors",                    effects: { budget: +20, morale: -5,  trust: +10, timeline: -15 }, outcome: "Huge credibility boost and funding. Your team loses focus and product-market fit weakens." },
            { text: "Decline politely — stay focused on original users",                        effects: { budget: 0,   morale: +10, trust: -5,  timeline: +5  }, outcome: "Team respects your conviction. But you missed a strategic partnership opportunity." },
            { text: "Counter-propose: serve both demographics with a phased approach",          effects: { budget: +10, morale: +5,  trust: +15, timeline: -10 }, outcome: "Diplomatic and strategic. Both parties feel heard. Execution complexity increases." },
        ],
    },
    {
        context: "Month 6: Your lead developer quits unexpectedly, taking critical product knowledge. The tech platform is 60% built.",
        question: "Your tech lead just walked out. The codebase is half-done and undocumented. What's your move?",
        choices: [
            { text: "Hire an expensive senior developer immediately — time is critical",            effects: { budget: -20, morale: +5,  trust: 0,  timeline: +5  }, outcome: "Expensive but effective. The new hire gets up to speed in 2 weeks." },
            { text: "Pause development and switch to a no-code platform to ship faster",           effects: { budget: +10, morale: -10, trust: -5, timeline: +15 }, outcome: "Saved money and shipped faster, but the platform won't scale past 1,000 users." },
            { text: "Promote a junior developer and pair them with a freelance consultant",        effects: { budget: -5,  morale: +15, trust: +5, timeline: -5  }, outcome: "The junior grows massively. Morale boost across the team. Some timeline delay." },
        ],
    },
    {
        context: "Month 8: You receive an unexpected ₹3,00,000 grant — but with a strict requirement to publish quarterly impact reports.",
        question: "Free money, but with heavy reporting strings attached. Do you take it?",
        choices: [
            { text: "Take the grant — the reports are worth the effort",                       effects: { budget: +25, morale: -5,  trust: +10, timeline: -10 }, outcome: "More money in the bank. But quarterly reports eat into your team's bandwidth." },
            { text: "Decline — the reporting overhead will slow you down",                     effects: { budget: 0,   morale: +10, trust: 0,  timeline: +10 }, outcome: "Team stays focused. But you missed capital that could have accelerated growth." },
            { text: "Accept and hire a part-time analyst to handle the reporting",             effects: { budget: +15, morale: +5,  trust: +10, timeline: 0   }, outcome: "Balanced approach. Grant minus analyst cost still nets positive. Smart delegation." },
        ],
    },
    {
        context: "Month 11: A well-funded competitor launches an almost identical product in your city with a slick app and heavy marketing spend.",
        question: "A competitor with 10× your budget just launched in your market. How do you respond?",
        choices: [
            { text: "Double down on marketing — compete directly on visibility",                   effects: { budget: -25, morale: -5,  trust: 0,  timeline: +5  }, outcome: "You burned cash fast. In a spending war against 10× resources, you always lose." },
            { text: "Focus on your community advantage — they trust you, not the newcomer",       effects: { budget: 0,   morale: +15, trust: +15, timeline: +5  }, outcome: "Brilliant. Your grassroots trust is your moat. Retention stays high while their users churn." },
            { text: "Approach the competitor about a partnership or merger",                       effects: { budget: +10, morale: -10, trust: -10, timeline: 0   }, outcome: "Bold strategic move. Could work long-term, but your team feels sold out." },
        ],
    },
];

const STAKEHOLDERS = [
    {
        avatar: "🏫", name: "School Principal", role: "Education Sector",
        scenario: "The Principal is concerned that your mental health app will distract students from exams or expose the school to liability if a crisis isn't handled perfectly.",
        choices: [
            { text: "Agree to strict monitoring and data sharing with the school board",  effects: { trust: +10, morale: -15, timeline: -10 }, result: "School access granted! But students now think your app is 'governed' by the school and are hesitant to use it." },
            { text: "Propose an anonymous pilot with zero data sharing",                  effects: { trust: +20, morale: +10, timeline: -20 }, result: "High student trust! But you must find your own funding as the school won't formally endorse it." },
            { text: "Agree to a phased rollout: education first, then service",           effects: { trust: +15, morale: +5,  timeline: -5  }, result: "Brilliant. You built trust through transparency without sacrificing student privacy." },
        ],
    },
    {
        avatar: "🏛️", name: "Health Dept. Official", role: "Government Agency",
        scenario: "The Department of Health is willing to subsidise your pilot, but they require you to follow their 15-year-old psychiatric protocols and reporting templates.",
        choices: [
            { text: "Accept all legacy protocols — you need the funding",              effects: { budget: +30, morale: -10, trust: 0,   timeline: -20 }, result: "Funded! But your 'modern' app now feels like a generic government form. Innovation is stalled." },
            { text: "Ask for a Sandbox Exception — test new methods with safety rails", effects: { budget: +15, morale: +15, trust: +10, timeline: -10 }, result: "Success! You are now a policy innovator. High credibility, but heavier reporting duty." },
            { text: "Reject the funding and look for private impact investors",        effects: { budget: 0,   morale: +10, trust: +5,  timeline: +10 }, result: "Team is happy to be independent. But capital is tight and you lost the official seal." },
        ],
    },
    {
        avatar: "🏢", name: "CSR Director", role: "Corporate Partner",
        scenario: "A major tech firm wants to fund your 'Digital Wellbeing' portal — but they want their brand front-and-centre, and a 'Premium' version for paying corporate families.",
        choices: [
            { text: "Accept fully — scaling requires big corporate partners",                    effects: { budget: +25, trust: -10, morale: -5 }, result: "Resource rich! But your social mission now looks like a corporate PR stunt." },
            { text: "Negotiate for 'Subsidised Scale' — they fund, you keep mission-first",      effects: { budget: +15, trust: +5,  morale: +5 }, result: "Strategic move. Their money, your values. Takes time to negotiate." },
            { text: "Reject — 'Premium' mental health goes against your core values",           effects: { budget: 0,   trust: +20, morale: +15 }, result: "The community loves your integrity. Capital is thin, but your credibility is enormous." },
        ],
    },
    {
        avatar: "👩‍👩‍👦", name: "Parents' Association", role: "Community Pillar",
        scenario: "Influential parents are worried that discussing mental health will 'plant ideas' in their children's heads. They are calling for a ban on your pilot.",
        choices: [
            { text: "Pivot to call it 'Skill Building & Focus' — hide the mental health label",  effects: { trust: -15, morale: -10, timeline: +15 }, result: "Stigma won. You avoided a ban, but lost the chance to normalise mental health conversations." },
            { text: "Hold an open town hall to educate parents on the real data",               effects: { trust: +25, morale: +10, timeline: -10 }, result: "80% now understand. You built a local moat of trust. 20% remain angry." },
            { text: "Ignore them and focus on digital-first 'underground' youth",               effects: { trust: +5,  morale: +15, budget: -10  }, result: "Cool factor is high! But without parent buy-in, your reach is limited to kids with private devices." },
        ],
    },
];

const ALLOCATION_CATEGORIES = [
    { key: "tech",       label: "Technology & Development", icon: "💻" },
    { key: "marketing",  label: "Marketing & Outreach",     icon: "📣" },
    { key: "team",       label: "Team & Hiring",            icon: "👥" },
    { key: "operations", label: "Operations & Logistics",   icon: "⚙️"  },
    { key: "outreach",   label: "Community Engagement",     icon: "🌍" },
];

// ══════════════════════════════════════════════════════════════
// DOM REFERENCES
// ══════════════════════════════════════════════════════════════
// Top bar metrics
const mvBudget   = document.getElementById("mv-budget");
const mvMorale   = document.getElementById("mv-morale");
const mvTrust    = document.getElementById("mv-trust");
const mvTimeline = document.getElementById("mv-timeline");
const mpBudget   = document.getElementById("mp-budget");
const mpMorale   = document.getElementById("mp-morale");
const mpTrust    = document.getElementById("mp-trust");
const mpTimeline = document.getElementById("mp-timeline");
const ideaLabel  = document.getElementById("sim-idea-label");

// Side bar metric bars
const barBudget   = document.getElementById("bar-budget");
const barMorale   = document.getElementById("bar-morale");
const barTrust    = document.getElementById("bar-trust");
const barTimeline = document.getElementById("bar-timeline");
const lmBudget    = document.getElementById("lm-budget-val");
const lmMorale    = document.getElementById("lm-morale-val");
const lmTrust     = document.getElementById("lm-trust-val");
const lmTimeline  = document.getElementById("lm-timeline-val");

// Decisions
const decisionBadge  = document.getElementById("decision-badge");
const decisionEmpty  = document.getElementById("decision-empty");
const decisionActive = document.getElementById("decision-active");
const decisionOutcome= document.getElementById("decision-outcome");
const startDecision  = document.getElementById("start-decision");
const decisionCtx    = document.getElementById("decision-context");
const decisionQ      = document.getElementById("decision-question");
const decisionChoices= document.getElementById("decision-choices");
const outcomeIcon    = document.getElementById("outcome-icon");
const outcomeVerdict = document.getElementById("outcome-verdict");
const outcomeText    = document.getElementById("outcome-text");
const outcomeEffects = document.getElementById("outcome-effects");
const decisionNext   = document.getElementById("decision-next");

// Resources
const sliderGroup   = document.getElementById("slider-group");
const projectionDiv = document.getElementById("resource-projection");

// Stakeholders
const stakeholderCards    = document.getElementById("stakeholder-cards");
const negotiationActive   = document.getElementById("negotiation-active");
const negoResult          = document.getElementById("nego-result");
const stakeholderBadge    = document.getElementById("stakeholder-badge");

// Impact log
const logList  = document.getElementById("impact-log-list");
const logEmpty = document.getElementById("log-empty");
const logCountEl = document.getElementById("log-count");

// Compass
const compassPoint = document.getElementById("compass-point");

// ══════════════════════════════════════════════════════════════
// INIT — URL params + Firebase load
// ══════════════════════════════════════════════════════════════
const params     = new URLSearchParams(window.location.search);
const wsId       = params.get("ws");
const email      = params.get("user");
const queryLevel = params.get("level") || "Explorer";
simState.userLevel = queryLevel;

if (!wsId || !email) {
    ideaLabel.textContent = "No workspace loaded.";
} else {
    loadWorkspaceData();
}

async function loadWorkspaceData() {
    try {
        const snap = await getDoc(doc(db, "users", email, "workspaces", wsId));
        if (snap.exists()) {
            const d = snap.data();
            simState.userIdea = d.idea || d.title || "Social Startup";
            ideaLabel.textContent = simState.userIdea;
            if (d.level) simState.userLevel = d.level;
        }
    } catch (e) { console.error("Load error:", e); }
}

document.getElementById("back-to-dash").addEventListener("click", () => {
    gsap.to(".sim-shell", { opacity: 0, scale: 0.97, duration: 0.3, ease: "power3.in",
        onComplete: () => { window.location.href = "index.html"; }
    });
});

// ══════════════════════════════════════════════════════════════
// ──────────────────── GSAP ANIMATION CORE ────────────────────
// ══════════════════════════════════════════════════════════════

/**
 * animateMetricCounter(el, fromVal, toVal, format)
 * Animates the innerHTML number from → to using GSAP onUpdate ticker.
 */
function animateMetricCounter(el, fromVal, toVal, format) {
    const proxy = { val: fromVal };
    gsap.to(proxy, {
        val:      toVal,
        duration: 0.9,
        ease:     "power3.out",
        onUpdate: () => {
            el.textContent = format(proxy.val);
        },
    });
}

/**
 * animateBar(barEl, toPct, color)
 * Snaps bar width with elastic.out(1, 0.5)
 */
function animateBar(barEl, toPct, color) {
    if (color) barEl.style.background = color;
    gsap.to(barEl, {
        width:    Math.max(0, Math.min(100, toPct)) + "%",
        duration: 0.9,
        ease:     "elastic.out(1, 0.5)",
    });
}

/**
 * flashPill(pillEl, type)
 * type: 'positive' | 'negative' | 'neutral'
 */
function flashPill(pillEl, type) {
    const colMap = { positive: "good", negative: "danger", neutral: "flash" };
    pillEl.classList.add(colMap[type] || "flash");
    gsap.timeline()
        .to(pillEl, { scale: 1.05, duration: 0.12, ease: "power2.out" })
        .to(pillEl, { scale: 1,    duration: 0.3,  ease: "back.out(2)" })
        .call(() => {
            pillEl.classList.remove("good","danger","warning","flash");
        }, null, "+=0.4");
}

/**
 * addLogEntry(text, type)
 * Drops in from top with height:0 → full height, pushes older entries down.
 */
function addLogEntry(text, type = "neutral") {
    // Remove empty placeholder
    if (logEmpty) logEmpty.style.display = "none";

    simState.logCount++;
    logCountEl.textContent = `${simState.logCount} ${simState.logCount === 1 ? "entry" : "entries"}`;

    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const li = document.createElement("li");
    li.className = "log-entry";
    li.innerHTML = `
      <span class="log-dot ${type}" aria-hidden="true"></span>
      <span class="log-text">${text}</span>
      <span class="log-time" aria-hidden="true">${time}</span>
    `;

    // Prepend — new entries push old ones down
    logList.prepend(li);
    simState.log.push({ text, type });

    // ── THE KEY ANIMATION: height:0 → natural, from top ──────
    gsap.from(li, {
        height:   0,
        opacity:  0,
        y:        -20,
        duration: 0.6,
        ease:     "power3.out",
    });
}

/**
 * updateMetrics(fromBudget, fromMorale, fromTrust, fromTimeline)
 * Updates top bar (animated counters) + side bars (elastic) + compass.
 */
function updateMetrics(prev) {
    const s = simState;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    s.budget   = clamp(s.budget,   0, 1000000);
    s.morale   = clamp(s.morale,   0, 100);
    s.trust    = clamp(s.trust,    0, 100);
    s.timeline = clamp(s.timeline, 0, 100);

    const budgetPct  = (s.budget / 500000) * 100;
    const timelineLabel = s.timeline >= 80 ? "On Track" : s.timeline >= 50 ? "Delayed" : "At Risk";

    // ── Top bar counters ──────────────────────────────────────
    animateMetricCounter(mvBudget,   prev.budget,   s.budget,   (v) => `₹${(v / 100000).toFixed(1)}L`);
    animateMetricCounter(mvMorale,   prev.morale,   s.morale,   (v) => `${Math.round(v)}%`);
    animateMetricCounter(mvTrust,    prev.trust,    s.trust,    (v) => `${Math.round(v)}%`);
    mvTimeline.textContent = timelineLabel;

    // ── Side bar text mirrors ──────────────────────────────────
    lmBudget.textContent   = `₹${(s.budget / 100000).toFixed(1)}L`;
    lmMorale.textContent   = `${s.morale}%`;
    lmTrust.textContent    = `${s.trust}%`;
    lmTimeline.textContent = timelineLabel;

    // ── Elastic bar fills ──────────────────────────────────────
    const budgetColor  = s.budget >= 300000 ? "var(--green)" : s.budget >= 150000 ? "var(--yellow)" : "var(--red)";
    const moraleColor  = s.morale >= 60 ? "var(--accent)" : s.morale >= 30 ? "var(--yellow)" : "var(--red)";
    const trustColor   = s.trust  >= 60 ? "var(--yellow)" : s.trust  >= 30 ? "var(--accent)" : "var(--red)";
    const timelineColor= s.timeline >= 80 ? "var(--green)" : s.timeline >= 50 ? "var(--yellow)" : "var(--red)";

    animateBar(barBudget,   budgetPct,  budgetColor);
    animateBar(barMorale,   s.morale,   moraleColor);
    animateBar(barTrust,    s.trust,    trustColor);
    animateBar(barTimeline, s.timeline, timelineColor);

    // ── Pill flashes ───────────────────────────────────────────
    const budgetDelta = s.budget - prev.budget;
    flashPill(mpBudget,   budgetDelta > 0 ? "positive" : budgetDelta < 0 ? "negative" : "neutral");
    flashPill(mpMorale,   s.morale > prev.morale ? "positive" : "neutral");
    flashPill(mpTrust,    s.trust  > prev.trust  ? "positive" : "neutral");
    flashPill(mpTimeline, "neutral");

    // ── Compass position (GSAP for smooth movement) ────────────
    const cx = clamp((s.budget / 500000) * 100, 0, 100);
    const cy = clamp(s.trust, 0, 100);
    gsap.to(compassPoint, {
        left:     cx + "%",
        top:      (100 - cy) + "%",
        duration: 0.8,
        ease:     "power3.out",
    });
    const compassColor = (cx < 30 || cy < 30) ? "var(--red)" : (cx > 70 && cy > 70) ? "var(--green)" : "var(--accent)";
    gsap.to(compassPoint, { background: compassColor, duration: 0.5 });
}

function applyEffects(effects) {
    const prev = {
        budget:   simState.budget,
        morale:   simState.morale,
        trust:    simState.trust,
        timeline: simState.timeline,
    };
    if (effects.budget)   simState.budget   += (effects.budget / 100) * 500000;
    if (effects.morale)   simState.morale   += effects.morale;
    if (effects.trust)    simState.trust    += effects.trust;
    if (effects.timeline) simState.timeline += effects.timeline;
    updateMetrics(prev);
}

// ══════════════════════════════════════════════════════════════
// TAB NAVIGATION
// ══════════════════════════════════════════════════════════════
document.querySelectorAll(".sim-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
        const targetId = tab.id.replace("tab-", "panel-");
        const targetPanel = document.getElementById(targetId);
        if (!targetPanel || tab.classList.contains("active")) return;

        // Deactivate all
        document.querySelectorAll(".sim-tab").forEach((t) => {
            t.classList.remove("active");
            t.setAttribute("aria-selected", "false");
        });
        document.querySelectorAll(".sim-panel").forEach((p) => {
            p.classList.remove("active");
        });

        tab.classList.add("active");
        tab.setAttribute("aria-selected", "true");

        // Crossfade panel
        gsap.set(targetPanel, { opacity: 0, y: 12 });
        targetPanel.classList.add("active");
        gsap.to(targetPanel, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" });
    });
});

// ══════════════════════════════════════════════════════════════
// AI SCENARIO GENERATION
// ══════════════════════════════════════════════════════════════
async function generateAIScenarios() {
    if (simState.isAILoading) return;
    simState.isAILoading = true;
    startDecision.textContent = "Generating Scenarios…";
    startDecision.disabled    = true;

    const prompt = `You are an AI Simulation Engine for a social entrepreneurship platform.

Goal: Generate 5 high-stakes "operational reality" crisis scenarios for: "${simState.userIdea}".
Founder Level: "${simState.userLevel}".

Scenarios must bridge Ambition and Execution by covering:
1. Execution Gap: risk management (data leaks, key person quitting, school board bans).
2. Complex Ecosystems: navigating bureaucracy and genuine community needs (stigma).
3. Resource Constraints: financial sustainability vs social impact.

Return ONLY a valid JSON array (no markdown, no backticks):
[
  {
    "context": "Month X: short description of the operational crisis",
    "question": "The key decision the founder faces.",
    "choices": [
      {
        "text": "Option description",
        "effects": { "budget": -10, "morale": +5, "trust": 0, "timeline": -5 },
        "outcome": "Specific consequence explanation."
      }
    ]
  }
]

Constraints:
- All effects are percentages of total (budget effects are % of ₹5L).
- Minimum 3 choices per scenario.
- Make scenarios specific to "${simState.userIdea}".`;

    try {
        const contentUrl = `${GEMINI_ENDPOINT_BASE}:generateContent?key=${GEMINI_API_KEY}`;
        const textUrl    = `${GEMINI_ENDPOINT_BASE}:generateText?key=${GEMINI_API_KEY}`;

        let response = await fetch(contentUrl, {
            method:  "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": GEMINI_API_KEY,
            },
            body: JSON.stringify({
                contents:         [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.8, responseMimeType: "application/json" },
            }),
        });

        if (!response.ok) {
            console.warn("Simulation Gemini generateContent failed, retrying generateText", response.status);
            response = await fetch(textUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": GEMINI_API_KEY,
                },
                body: JSON.stringify({
                    prompt: { text: prompt },
                    temperature: 0.8,
                    responseMimeType: "application/json",
                }),
            });
        }

        if (response.status === 429) {
            console.warn("429 Rate Limited — using static scenarios.");
            simState.aiScenarios = [...DECISION_SCENARIOS];
        } else {
            const data = await response.json();
            const raw  = data.candidates[0].content.parts[0].text;
            simState.aiScenarios = JSON.parse(raw);
        }
    } catch (err) {
        console.error("AI Generation Error:", err);
        simState.aiScenarios = [...DECISION_SCENARIOS];
    } finally {
        simState.isAILoading  = false;
        startDecision.textContent = "Begin Simulation →";
        startDecision.disabled    = false;
        renderDecisionScenario();
    }
}

// ══════════════════════════════════════════════════════════════
// DECISION SIMULATOR
// ══════════════════════════════════════════════════════════════
startDecision.addEventListener("click", async () => {
    gsap.to(startDecision, {
        scale: 0.94, duration: 0.1, ease: "power2.in",
        onComplete: () => gsap.to(startDecision, { scale: 1, duration: 0.25, ease: "back.out(2)" }),
    });
    simState.decisionIndex = 0;
    if (simState.aiScenarios.length === 0) {
        await generateAIScenarios();
    } else {
        renderDecisionScenario();
    }
});

function renderDecisionScenario() {
    const data = simState.aiScenarios.length > 0 ? simState.aiScenarios : DECISION_SCENARIOS;
    const total = data.length;

    if (simState.decisionIndex >= total) {
        // All done
        decisionActive.classList.add("hidden");
        decisionOutcome.classList.add("hidden");
        decisionEmpty.classList.remove("hidden");
        decisionEmpty.className = "sim-empty-state complete";
        decisionEmpty.innerHTML = `
          <p>✅ All ${total} scenarios completed!</p>
          <p class="sub">Check the Impact Log and metric bars for your final profile.</p>`;
        decisionBadge.textContent = `SCENARIO ${total} / ${total}`;
        simState.decisionsComplete = true;
        return;
    }

    const s = data[simState.decisionIndex];
    decisionBadge.textContent = `SCENARIO ${simState.decisionIndex + 1} / ${total}`;

    decisionEmpty.classList.add("hidden");
    decisionOutcome.classList.add("hidden");
    decisionActive.classList.remove("hidden");

    decisionCtx.textContent  = s.context;
    decisionQ.textContent    = s.question;
    decisionChoices.innerHTML = "";

    const keys = ["A","B","C","D"];
    s.choices.forEach((c, i) => {
        const card = document.createElement("div");
        card.className   = "scenario-choice";
        card.role        = "option";
        card.ariaSelected = "false";
        card.innerHTML   = `<span class="choice-key">${keys[i] || i+1}</span><span>${c.text}</span>`;
        card.addEventListener("click", () => handleDecisionChoice(i));
        decisionChoices.appendChild(card);
    });

    // Staggered reveal of scenario + choices
    gsap.fromTo(decisionActive,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.45, ease: "power4.out" }
    );
    gsap.fromTo(".scenario-choice",
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.38, ease: "power3.out", stagger: 0.07, delay: 0.15 }
    );
}

function handleDecisionChoice(idx) {
    const data = simState.aiScenarios.length > 0 ? simState.aiScenarios : DECISION_SCENARIOS;
    const s    = data[simState.decisionIndex];
    const c    = s.choices[idx];

    // Compress the selected choice before revealing outcome
    const chosen = decisionChoices.children[idx];
    if (chosen) {
        gsap.to(chosen, { scale: 0.95, duration: 0.1, ease: "power2.in",
            onComplete: () => {
                applyEffects(c.effects);
                renderOutcome(c, s);
            }
        });
    } else {
        applyEffects(c.effects);
        renderOutcome(c, s);
    }

    simState.decisionIndex++;
    saveSimulationProgress();
}

function renderOutcome(c, s) {
    const net = (c.effects.trust || 0) + (c.effects.morale || 0);

    decisionActive.classList.add("hidden");
    decisionOutcome.classList.remove("hidden");

    outcomeIcon.textContent    = net >= 0 ? "✅" : "⚠️";
    outcomeVerdict.textContent = net >= 5 ? "GOOD OUTCOME" : net >= 0 ? "NEUTRAL OUTCOME" : "ROUGH OUTCOME";
    outcomeText.textContent    = c.outcome;

    outcomeEffects.innerHTML = "";
    const LABELS = { budget: "Budget", morale: "Morale", trust: "Trust", timeline: "Timeline" };
    const UNITS  = { budget: "%", morale: "%", trust: "%", timeline: "%" };
    Object.entries(c.effects).forEach(([key, val]) => {
        if (val === 0) return;
        const tag     = document.createElement("span");
        tag.className = `effect-tag ${val > 0 ? "positive" : "negative"}`;
        tag.textContent = `${LABELS[key] || key} ${val > 0 ? "+" : ""}${val}%`;
        outcomeEffects.appendChild(tag);
    });

    // Spring reveal of outcome card
    gsap.fromTo(decisionOutcome,
        { opacity: 0, scale: 0.95, y: 10 },
        { opacity: 1, scale: 1,    y: 0, duration: 0.5, ease: "back.out(1.6)" }
    );

    // Log entry drops in from top
    const logText = `Decision ${simState.decisionIndex}: ${c.text.substring(0, 55)}…`;
    addLogEntry(logText, net >= 0 ? "positive" : "negative");
}

decisionNext.addEventListener("click", () => {
    gsap.to(decisionOutcome, {
        opacity: 0, y: -10, duration: 0.25, ease: "power3.in",
        onComplete: renderDecisionScenario,
    });
});

async function saveSimulationProgress() {
    if (!wsId || !email) return;
    try {
        await updateDoc(doc(db, "users", email, "workspaces", wsId), {
            "simulation.lastStats": {
                budget:   simState.budget,
                morale:   simState.morale,
                trust:    simState.trust,
                timeline: simState.timeline,
            },
            "simulation.updatedAt": new Date().toISOString(),
        });
    } catch (e) { console.error("Save error:", e); }
}

// ══════════════════════════════════════════════════════════════
// RESOURCE ALLOCATION
// ══════════════════════════════════════════════════════════════
function renderSliders() {
    sliderGroup.innerHTML = "";
    ALLOCATION_CATEGORIES.forEach((cat) => {
        const row = document.createElement("div");
        row.className = "slider-row";
        row.innerHTML = `
          <div class="slider-meta">
            <span class="slider-name">${cat.icon} ${cat.label}</span>
            <span class="slider-val" id="val-${cat.key}">${simState.allocation[cat.key]}%</span>
          </div>
          <div class="slider-track">
            <div class="slider-fill" id="fill-${cat.key}" style="width:${simState.allocation[cat.key]}%"></div>
            <input type="range" min="0" max="100" value="${simState.allocation[cat.key]}"
                   id="slider-${cat.key}" aria-label="${cat.label} allocation">
          </div>`;
        sliderGroup.appendChild(row);

        const slider  = row.querySelector(`#slider-${cat.key}`);
        const fillEl  = row.querySelector(`#fill-${cat.key}`);
        const valSpan = row.querySelector(`#val-${cat.key}`);

        slider.addEventListener("input", () => {
            simState.allocation[cat.key] = parseInt(slider.value, 10);
            valSpan.textContent           = slider.value + "%";
            fillEl.style.width            = slider.value + "%";
            updateSimulationStateFromAllocation();
            updateProjection();
        });
    });
    updateProjection();
}

function updateSimulationStateFromAllocation() {
    const a   = simState.allocation;
    const tot = Object.values(a).reduce((s, v) => s + v, 0);
    const prev = { budget: simState.budget, morale: simState.morale, trust: simState.trust, timeline: simState.timeline };

    simState.budget   = tot > 100 ? 500000 - (tot - 100) * 5000 : 500000 + (100 - tot) * 2000;
    simState.morale   = 60 + a.team * 0.5 + a.operations * 0.2;
    simState.trust    = 50 + a.outreach * 1.5;
    simState.timeline = 40 + a.tech * 1.0 + a.team * 0.5;

    updateMetrics(prev);
}

function updateProjection() {
    const a   = simState.allocation;
    const tot = a.tech + a.marketing + a.team + a.operations + a.outreach;

    let analysis = "";
    let risk     = "mid";

    if (a.tech > 40 && a.outreach < 15)      { analysis = "Tech-heavy allocation — fast product delivery but weak community connection. Risk: low adoption."; risk = "high"; }
    else if (a.marketing > 35 && a.team < 20) { analysis = "Marketing-heavy — strong visibility but understaffed. Risk: team burnout."; risk = "high"; }
    else if (a.outreach > 30 && a.tech < 20)  { analysis = "Strong community focus — high trust, but slow digital product delivery."; risk = "mid"; }
    else if (a.team > 40)                      { analysis = "Team-first strategy — strong execution capacity. Keep product and outreach in step."; risk = "low"; }
    else if (Math.max(...Object.values(a)) - Math.min(...Object.values(a)) <= 15) {
        analysis = "Balanced allocation — stable growth across all verticals. Sustainable, low-risk approach."; risk = "low";
    } else {
        analysis = "Mixed strategy. Watch for gaps in underfunded areas."; risk = "mid";
    }

    const overBudget = tot > 100;
    projectionDiv.innerHTML = `
      <p class="projection-label">AI Budget Projection</p>
      <p class="projection-text">${analysis}</p>
      <p class="projection-meta ${overBudget ? "over" : ""}">
        Total allocated: ${tot}% of ₹${(simState.budget / 100000).toFixed(1)}L
        ${overBudget ? " — Over budget!" : ""}
      </p>
      <span class="risk-chip ${risk}">
        ${risk === "low" ? "✅ Low Risk" : risk === "mid" ? "⚠️ Medium Risk" : "🔴 High Risk"}
      </span>`;
}

renderSliders();

// ══════════════════════════════════════════════════════════════
// STAKEHOLDER NAVIGATION
// ══════════════════════════════════════════════════════════════
function renderStakeholders() {
    stakeholderCards.innerHTML = "";
    STAKEHOLDERS.forEach((sh, i) => {
        const done = simState.stakeholdersCompleted.includes(i);
        const card = document.createElement("div");
        card.className  = `stakeholder-card ${done ? "completed" : ""}`;
        card.role       = "listitem";
        card.innerHTML  = `
          <div class="sh-avatar" aria-hidden="true">${sh.avatar}</div>
          <div class="sh-name">${sh.name}</div>
          <div class="sh-role">${sh.role}</div>
          ${done ? `<div class="sh-status">✓ Completed</div>` : ""}`;
        card.addEventListener("click", () => !done && startNegotiation(i));
        stakeholderCards.appendChild(card);
    });

    const remaining = STAKEHOLDERS.length - simState.stakeholdersCompleted.length;
    stakeholderBadge.textContent = `${remaining} Meeting${remaining !== 1 ? "s" : ""} Left`;
}

function startNegotiation(index) {
    if (simState.stakeholdersCompleted.includes(index)) return;
    const sh = STAKEHOLDERS[index];

    stakeholderCards.classList.add("hidden");
    negoResult.classList.add("hidden");
    negotiationActive.classList.remove("hidden");

    document.getElementById("nego-avatar").textContent  = sh.avatar;
    document.getElementById("nego-name").textContent    = sh.name;
    document.getElementById("nego-role").textContent    = sh.role;
    document.getElementById("nego-scenario").textContent= sh.scenario;

    const choicesDiv = document.getElementById("nego-choices");
    choicesDiv.innerHTML = "";
    sh.choices.forEach((c, ci) => {
        const btn       = document.createElement("div");
        btn.className   = "nego-choice";
        btn.role        = "option";
        btn.textContent = c.text;
        btn.addEventListener("click", () => handleNegotiation(index, ci));
        choicesDiv.appendChild(btn);
    });

    gsap.fromTo(negotiationActive,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power4.out" }
    );
    gsap.fromTo(".nego-choice",
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, ease: "power3.out", stagger: 0.07, delay: 0.15 }
    );
}

function handleNegotiation(shIndex, choiceIndex) {
    const sh = STAKEHOLDERS[shIndex];
    const c  = sh.choices[choiceIndex];

    applyEffects(c.effects);
    simState.stakeholdersCompleted.push(shIndex);

    gsap.to(negotiationActive, {
        opacity: 0, y: -10, duration: 0.25, ease: "power3.in",
        onComplete: () => {
            negotiationActive.classList.add("hidden");
            negoResult.classList.remove("hidden");
            document.getElementById("nego-result-text").textContent = c.result;

            gsap.fromTo(negoResult,
                { opacity: 0, scale: 0.96, y: 10 },
                { opacity: 1, scale: 1,    y: 0, duration: 0.45, ease: "back.out(1.5)" }
            );
        },
    });

    const logText = `Met ${sh.name}: ${c.text.substring(0, 45)}…`;
    const net = (c.effects.trust || 0) + (c.effects.morale || 0);
    addLogEntry(logText, net >= 0 ? "positive" : "negative");

    stakeholderBadge.textContent = `${STAKEHOLDERS.length - simState.stakeholdersCompleted.length} Left`;
}

document.getElementById("nego-back").addEventListener("click", () => {
    gsap.to(negoResult, {
        opacity: 0, y: -8, duration: 0.2, ease: "power3.in",
        onComplete: () => {
            negoResult.classList.add("hidden");
            stakeholderCards.classList.remove("hidden");
            renderStakeholders();
            gsap.fromTo(stakeholderCards,
                { opacity: 0, y: 10 },
                { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }
            );
        },
    });
});

renderStakeholders();

// ══════════════════════════════════════════════════════════════
// BOOT — initial metric render + entrance animation
// ══════════════════════════════════════════════════════════════
updateMetrics({
    budget:   simState.budget,
    morale:   simState.morale,
    trust:    simState.trust,
    timeline: simState.timeline,
});

// Set compass initial position without animation
gsap.set(compassPoint, {
    left:  (simState.budget / 500000) * 100 + "%",
    top:   (100 - simState.trust) + "%",
});

// Entrance animations
document.addEventListener("DOMContentLoaded", () => {
    gsap.fromTo(".sim-topbar",
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.5, ease: "expo.out" }
    );
    gsap.fromTo(".sim-center",
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, duration: 0.6, ease: "expo.out", delay: 0.1 }
    );
    gsap.fromTo(".sim-right",
        { opacity: 0, x: 20 },
        { opacity: 1, x: 0, duration: 0.6, ease: "expo.out", delay: 0.15 }
    );
    gsap.fromTo(".metric-pill",
        { opacity: 0, y: -6, scale: 0.95 },
        { opacity: 1, y: 0,  scale: 1, duration: 0.4, ease: "back.out(1.4)", stagger: 0.06, delay: 0.3 }
    );
    // Bars snap in on boot with elastic
    animateBar(barBudget,   (simState.budget / 500000) * 100, "var(--green)");
    animateBar(barMorale,   simState.morale,   "var(--accent)");
    animateBar(barTrust,    simState.trust,    "var(--yellow)");
    animateBar(barTimeline, simState.timeline, "var(--accent)");
});
