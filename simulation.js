// simulation.js — Orion Simulation Engine
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ============================================================
// STATE
// ============================================================
const simState = {
    budget: 500000,
    morale: 80,
    trust: 70,
    timeline: 100,       // % on track
    decisionIndex: 0,
    decisionsComplete: false,
    stakeholdersCompleted: [],
    log: [],
    allocation: { tech: 30, marketing: 20, team: 30, operations: 10, outreach: 10 },
    userIdea: "Startup Idea",
    userLevel: "Explorer",
    aiScenarios: [],      // Holds AI-generated scenarios
    isAILoading: false,
    retryCount: 0
};

const GEMINI_API_KEY = "AIzaSyDR-v7ncbMDKPgzDnrIiAoAKTs3LDS2v9c";


// ============================================================
// DECISION SCENARIOS (Local Data — team can swap these)
// ============================================================
const DECISION_SCENARIOS = [
    {
        context: "Month 2: Your NGO partner, who was managing community outreach, suddenly withdraws due to internal restructuring.",
        question: "Your community outreach partner pulls out. Budget drops by 40%. What do you do?",
        choices: [
            {
                text: "Pause outreach entirely and redirect funds to product development",
                effects: { budget: +5, morale: -10, trust: -20, timeline: +5 },
                outcome: "You saved money but lost community trust. Adoption rates will drop without ground-level outreach."
            },
            {
                text: "Hire a small local team to replace the NGO's community work immediately",
                effects: { budget: -15, morale: +5, trust: +10, timeline: -5 },
                outcome: "Quick replacement kept trust intact but increased spend. The team is less experienced."
            },
            {
                text: "Negotiate with 2-3 smaller NGOs to split the outreach work",
                effects: { budget: -5, morale: +10, trust: +15, timeline: -10 },
                outcome: "Smart move. Diversified partnerships reduce single-point dependency. Takes time to onboard."
            }
        ]
    },
    {
        context: "Month 4: A local government official offers to endorse your project — but wants you to change your target demographic from 'urban youth' to 'rural women'.",
        question: "A powerful government endorsement is on the table, but it requires pivoting your target users. Do you accept?",
        choices: [
            {
                text: "Accept fully — government backing opens massive doors",
                effects: { budget: +20, morale: -5, trust: +10, timeline: -15 },
                outcome: "Huge credibility boost and funding access. But your team loses focus and the product-market fit weakens."
            },
            {
                text: "Decline politely — stay focused on your original users",
                effects: { budget: 0, morale: +10, trust: -5, timeline: +5 },
                outcome: "Team respects your conviction. But you missed a strategic partnership opportunity."
            },
            {
                text: "Counter-propose: serve both demographics with a phased approach",
                effects: { budget: +10, morale: +5, trust: +15, timeline: -10 },
                outcome: "Diplomatic and strategic. Both parties feel heard. Execution complexity increases."
            }
        ]
    },
    {
        context: "Month 6: Your lead developer quits unexpectedly, taking critical product knowledge. The tech platform is 60% built.",
        question: "Your tech lead just walked out. The codebase is half-done and undocumented. What's your move?",
        choices: [
            {
                text: "Hire an expensive senior developer immediately — time is critical",
                effects: { budget: -20, morale: +5, trust: 0, timeline: +5 },
                outcome: "Expensive but effective. The new hire gets up to speed in 2 weeks."
            },
            {
                text: "Pause development and switch to a no-code platform to ship faster",
                effects: { budget: +10, morale: -10, trust: -5, timeline: +15 },
                outcome: "Saved money and shipped faster, but the platform is limited. Won't scale past 1000 users."
            },
            {
                text: "Promote a junior developer and pair them with a freelance consultant",
                effects: { budget: -5, morale: +15, trust: +5, timeline: -5 },
                outcome: "The junior grows massively. Morale boost across the team. Some timeline delay."
            }
        ]
    },
    {
        context: "Month 8: You receive an unexpected ₹3,00,000 grant — but it comes with a strict requirement to publish quarterly impact reports to the government.",
        question: "Free money, but with heavy reporting strings attached. Do you take it?",
        choices: [
            {
                text: "Take the grant — the reports are worth the effort",
                effects: { budget: +25, morale: -5, trust: +10, timeline: -10 },
                outcome: "More money in the bank. But quarterly reports eat into your team's bandwidth."
            },
            {
                text: "Decline — the reporting overhead will slow you down",
                effects: { budget: 0, morale: +10, trust: 0, timeline: +10 },
                outcome: "Team stays focused. But you missed capital that could have accelerated growth."
            },
            {
                text: "Accept and hire a part-time analyst to handle the reporting",
                effects: { budget: +15, morale: +5, trust: +10, timeline: 0 },
                outcome: "Balanced approach. Grant money minus analyst cost still nets positive. Smart delegation."
            }
        ]
    },
    {
        context: "Month 11: A well-funded competitor launches an almost identical product in your city with a slick app and heavy marketing spend.",
        question: "A competitor with 10x your budget just launched in your market. How do you respond?",
        choices: [
            {
                text: "Double down on marketing — compete directly on visibility",
                effects: { budget: -25, morale: -5, trust: 0, timeline: +5 },
                outcome: "You burned cash fast. In a spending war against 10x resources, you always lose."
            },
            {
                text: "Focus on your community advantage — they trust you, not the newcomer",
                effects: { budget: 0, morale: +15, trust: +15, timeline: +5 },
                outcome: "Brilliant. Your grassroots trust is your moat. Retention stays high while their users churn."
            },
            {
                text: "Approach the competitor about a partnership or merger",
                effects: { budget: +10, morale: -10, trust: -10, timeline: 0 },
                outcome: "Bold strategic move. Could work long-term, but your team feels sold out."
            }
        ]
    }
];

// ============================================================
// STAKEHOLDER DATA
// ============================================================
const STAKEHOLDERS = [
    {
        avatar: "🏫", name: "School Principal", role: "Education Sector",
        scenario: "The Principal is concerned that your mental health app will distract students from exams or expose the school to liability if a crisis isn't handled perfectly.",
        choices: [
            { text: "Agree to strict monitoring and data sharing with the school board", effects: { trust: +10, morale: -15, timeline: -10 }, result: "School access granted! But students now think your app is 'governed' by the school and are hesitant to use it." },
            { text: "Propose an anonymous pilot with zero data sharing", effects: { trust: +20, morale: +10, timeline: -20 }, result: "High student trust! But you must find your own funding as the school won't put their name on it yet." },
            { text: "Agree to a phased rollout: Education first, then Service", effects: { trust: +15, morale: +5, timeline: -5 }, result: "Brilliant. You built trust through transparency without sacrificing student privacy." }
        ]
    },
    {
        avatar: "🏛️", name: "Health Dept. Official", role: "Government Agency",
        scenario: "The Department of Health is willing to subsidize your pilot, but they require you to follow their 15-year-old psychiatric protocols and reporting templates.",
        choices: [
            { text: "Accept all legacy protocols — you need the funding", effects: { budget: +30, morale: -10, trust: 0, timeline: -20 }, result: "Funded! But your 'modern' app now feels like a generic government form. Innovation is stalled." },
            { text: "Ask for a Sandbox Exception — test new methods with safety rails", effects: { budget: +15, morale: +15, trust: +10, timeline: -10 }, result: "Success! You are now a policy innovator. High credibility, but heavier reporting duty." },
            { text: "Reject the funding and look for private impact investors", effects: { budget: 0, morale: +10, trust: +5, timeline: +10 }, result: "Team is happy to be independent. But capital is tight and you lost the official seal." }
        ]
    },
    {
        avatar: "🏢", name: "CSR Director", role: "Corporate Partner",
        scenario: "A major tech firm wants to fund your 'Digital Wellbeing' portal — but they want their brand front-and-center, and a 'Premium' version for paying corporate families.",
        choices: [
            { text: "Accept fully — scaling requires big corporate partners", effects: { budget: +25, trust: -10, morale: -5 }, result: "Resource rich! But your social mission now looks like a corporate PR stunt for 'richer' kids." },
            { text: "Negotiate for 'Subsidized Scale' — they fund, you keep mission-first", effects: { budget: +15, trust: +5, morale: +5 }, result: "Strategic move. Their money, your values. Takes time to negotiate." },
            { text: "Reject — 'Premium' mental health goes against your core values", effects: { budget: 0, trust: +20, morale: +15 }, result: "The community loves your integrity. You are the 'People's choice', though capital is thin." }
        ]
    },
    {
        avatar: "👩‍👩‍👦", name: "Parents' Association", role: "Community Pillar",
        scenario: "A group of influential parents is worried that discussing mental health will 'plant ideas' in their children's heads. They are calling for a ban on your pilot.",
        choices: [
            { text: "Pivot to call it 'Skill Building & Focus' — hide the mental health label", effects: { trust: -15, morale: -10, timeline: +15 }, result: "Stigma won. You avoided a ban, but lost the chance to normalize mental health conversations." },
            { text: "Hold an open town hall to educate parents on the real data", effects: { trust: +25, morale: +10, timeline: -10 }, result: "The 80/20 rule: 20% remain angry, but 80% now understand. You built a local moat of trust." },
            { text: "Ignore them and focus only on the digital-first 'underground' youth", effects: { trust: +5, morale: +15, budget: -10 }, result: "The 'Cool' factor is high! But without parent buy-in, your reach is limited to kids with private devices." }
        ]
    }
];

// ============================================================
// RESOURCE ALLOCATION CATEGORIES
// ============================================================
const ALLOCATION_CATEGORIES = [
    { key: "tech", label: "Technology & Development", icon: "💻" },
    { key: "marketing", label: "Marketing & Outreach", icon: "📣" },
    { key: "team", label: "Team & Hiring", icon: "👥" },
    { key: "operations", label: "Operations & Logistics", icon: "⚙️" },
    { key: "outreach", label: "Community Engagement", icon: "🌍" }
];

// ============================================================
// DOM REFERENCES
// ============================================================
const mvBudget     = document.getElementById('mv-budget');
const mvMorale     = document.getElementById('mv-morale');
const mvTrust      = document.getElementById('mv-trust');
const mvTimeline   = document.getElementById('mv-timeline');
const ideaLabel    = document.getElementById('sim-idea-label');
const backBtn      = document.getElementById('back-to-dash');

// Decision
const decisionBadge  = document.getElementById('decision-badge');
const decisionEmpty  = document.getElementById('decision-empty');
const decisionActive = document.getElementById('decision-active');
const decisionOutcome= document.getElementById('decision-outcome');
const startDecision  = document.getElementById('start-decision');
const decisionCtx    = document.getElementById('decision-context');
const decisionQ      = document.getElementById('decision-question');
const decisionChoices= document.getElementById('decision-choices');
const outcomeIcon    = document.getElementById('outcome-icon');
const outcomeText    = document.getElementById('outcome-text');
const outcomeEffects = document.getElementById('outcome-effects');
const decisionNext   = document.getElementById('decision-next');

// Resources
const sliderGroup   = document.getElementById('slider-group');
const projectionDiv = document.getElementById('resource-projection');

// Stakeholders
const stakeholderCards   = document.getElementById('stakeholder-cards');
const negotiationActive = document.getElementById('negotiation-active');
const negoResult        = document.getElementById('nego-result');

// Impact
const impactMetrics = document.getElementById('impact-metrics');
const logList       = document.getElementById('impact-log-list');

// ============================================================
// INIT
// ============================================================
const params = new URLSearchParams(window.location.search);
const wsId   = params.get('ws');
const email  = params.get('user');
const queryLevel = params.get('level') || 'Explorer';

simState.userLevel = queryLevel;

if (!wsId || !email) {
    ideaLabel.textContent = "No workspace loaded.";
} else {
    loadWorkspaceData();
}

async function loadWorkspaceData() {
    try {
        const snap = await getDoc(doc(db, 'users', email, 'workspaces', wsId));
        if (snap.exists()) {
            const d = snap.data();
            simState.userIdea = d.idea || d.title || "Social Startup";
            ideaLabel.textContent = simState.userIdea;
            
            // If level wasn't in URL, use Firestore level
            if (d.level) simState.userLevel = d.level;
        }
    } catch(e) { console.error('Load error:', e); }
}

backBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
});

// ============================================================
// AI SCENARIO GENERATION
// ============================================================
async function generateAIScenarios() {
    if (simState.isAILoading) return;
    simState.isAILoading = true;
    
    // Show loading in early state
    startDecision.textContent = "AI Generating Scenarios...";
    startDecision.disabled = true;

    const prompt = `You are an AI Simulation Engine for a social entrepreneurship hackathon focused on "Adolescent Mental Health & Early Support Systems". 

Your Goal: Generate 5 high-stakes "operational reality" crisis scenarios for this startup: "${simState.userIdea}".
The founder is at the "${simState.userLevel}" level.

The scenarios MUST bridge the gap between "Ambition" and "Execution" by emphasizing:
1. **The Execution Gap**: Risk management (e.g. data leaks, lead dev quitting, school board bans).
2. **Complex Ecosystems**: Navigating bureaucracy (govt/school officials) and genuine community needs (stigma).
3. **Resource Constraints**: Financial sustainability vs Social Impact.

Return a JSON array of objects:
[
  {
    "context": "Short description of the 'operational reality' (e.g. Month 3: ...)",
    "question": "A decision where impact and sustainability or trust and safety are at odds.",
    "choices": [
      {
        "text": "Option A...",
        "effects": { "budget": -10, "morale": +5, "trust": 0, "timeline": -5 },
        "outcome": "Briefly explain the specific consequence in the context of adolescent mental health and startup survival."
      },
      ... (at least 3 choices per scenario)
    ]
  }
]

Constraints:
- Budget effects are % of total.
- Scenarios must be SPECIFIC to the idea "${simState.userIdea}".
- Include themes like "System Stigma", "Privacy Breaches", "Partnership Failures", or "Sustainability Crises".`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { 
                    temperature: 0.8, 
                    responseMimeType: "application/json"
                }
            })
        });

        if (response.status === 429) {
            console.warn("429 Rate Limited. Falling back to static scenarios.");
            simState.aiScenarios = [...DECISION_SCENARIOS];
        } else {
            const data = await response.json();
            const raw = data.candidates[0].content.parts[0].text;
            simState.aiScenarios = JSON.parse(raw);
        }
    } catch (err) {
        console.error("AI Error:", err);
        simState.aiScenarios = [...DECISION_SCENARIOS]; // Fallback
    } finally {
        simState.isAILoading = false;
        startDecision.textContent = "Begin Simulation →";
        startDecision.disabled = false;
        renderDecisionScenario();
    }
}

// ============================================================
// UPDATE TOP METRICS
// ============================================================
function updateMetrics() {
    mvBudget.textContent   = `₹${(simState.budget / 100000).toFixed(1)}L`;
    mvMorale.textContent   = `${Math.max(0, Math.min(100, simState.morale))}%`;
    mvTrust.textContent    = `${Math.max(0, Math.min(100, simState.trust))}%`;

    const tl = simState.timeline;
    if (tl >= 80)      mvTimeline.textContent = "On Track";
    else if (tl >= 50) mvTimeline.textContent = "Delayed";
    else               mvTimeline.textContent = "At Risk";

    // Flash animation
    document.querySelectorAll('.metric-pill').forEach(p => {
        p.classList.add('flash');
        setTimeout(() => p.classList.remove('flash'), 600);
    });

    renderImpactDashboard();
}
function addLog(text, type = 'neutral') {
    const emptyLi = logList.querySelector('.log-empty');
    if (emptyLi) emptyLi.remove();

    const li = document.createElement('li');
    li.textContent = text;
    li.className = type === 'positive' ? 'log-positive' : type === 'negative' ? 'log-negative' : '';
    logList.prepend(li);
    simState.log.push({ text, type });
}

function applyEffects(effects) {
    if (effects.budget)   simState.budget   += (effects.budget / 100) * 500000;
    if (effects.morale)   simState.morale   += (effects.morale || 0);
    if (effects.trust)    simState.trust    += (effects.trust || 0);
    if (effects.timeline) simState.timeline += (effects.timeline || 0);

    // Clamp
    simState.morale   = Math.max(0, Math.min(100, simState.morale));
    simState.trust    = Math.max(0, Math.min(100, simState.trust));
    simState.timeline = Math.max(0, Math.min(100, simState.timeline));
    simState.budget   = Math.max(0, simState.budget);

    updateMetrics();
}


// ============================================================
// 1. DECISION SIMULATOR
// ============================================================
startDecision.addEventListener('click', () => {
    simState.decisionIndex = 0;
    if (simState.aiScenarios.length === 0) {
        generateAIScenarios();
    } else {
        renderDecisionScenario();
    }
});

function renderDecisionScenario() {
    const dataSource = simState.aiScenarios.length > 0 ? simState.aiScenarios : DECISION_SCENARIOS;
    
    if (simState.decisionIndex >= dataSource.length) {
        // All done
        decisionActive.classList.add('hidden');
        decisionOutcome.classList.add('hidden');
        decisionEmpty.classList.remove('hidden');
        decisionEmpty.innerHTML = `<p style="color:var(--green); font-weight:600;">✅ All 5 scenarios completed!</p>
            <p style="font-size:13px;">Check the Impact Dashboard for your final metrics.</p>`;
        decisionBadge.textContent = `5 / 5`;
        simState.decisionsComplete = true;
        return;
    }

    const s = dataSource[simState.decisionIndex];
    decisionEmpty.classList.add('hidden');
    decisionOutcome.classList.add('hidden');
    decisionActive.classList.remove('hidden');

    decisionCtx.textContent = s.context;
    decisionQ.textContent   = s.question;
    decisionChoices.innerHTML = '';

    s.choices.forEach((c, i) => {
        const btn = document.createElement('div');
        btn.className = 'scenario-choice';
        btn.textContent = c.text;
        btn.addEventListener('click', () => handleDecisionChoice(i));
        decisionChoices.appendChild(btn);
    });

    decisionBadge.textContent = `${simState.decisionIndex} / 5`;
    gsap.fromTo(decisionActive, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35 });
}

function handleDecisionChoice(idx) {
    const dataSource = simState.aiScenarios.length > 0 ? simState.aiScenarios : DECISION_SCENARIOS;
    const s = dataSource[simState.decisionIndex];
    const c = s.choices[idx];

    applyEffects(c.effects);

    // Show outcome
    decisionActive.classList.add('hidden');
    decisionOutcome.classList.remove('hidden');

    const net = (c.effects.trust || 0) + (c.effects.morale || 0);
    outcomeIcon.textContent = net >= 0 ? '✅' : '⚠️';
    outcomeText.textContent = c.outcome;

    outcomeEffects.innerHTML = '';
    Object.entries(c.effects).forEach(([key, val]) => {
        if (val === 0) return;
        const tag = document.createElement('span');
        tag.className = `effect-tag ${val > 0 ? 'positive' : 'negative'}`;
        tag.textContent = `${key}: ${val > 0 ? '+' : ''}${val}`;
        outcomeEffects.appendChild(tag);
    });

    addLog(`Decision ${simState.decisionIndex + 1}: ${c.text.substring(0, 50)}...`, net >= 0 ? 'positive' : 'negative');
    simState.decisionIndex++;

    gsap.fromTo(decisionOutcome, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    
    // Save partial progress
    saveSimulationProgress();
}

async function saveSimulationProgress() {
    if (!wsId || !email) return;
    try {
        await updateDoc(doc(db, 'users', email, 'workspaces', wsId), {
            'simulation.lastStats': {
                budget: simState.budget,
                morale: simState.morale,
                trust: simState.trust,
                timeline: simState.timeline
            },
            'simulation.updatedAt': new Date().toISOString()
        });
    } catch(e) { console.error('Save error:', e); }
}

decisionNext.addEventListener('click', renderDecisionScenario);

// ============================================================
// 2. RESOURCE ALLOCATION
// ============================================================
function renderSliders() {
    sliderGroup.innerHTML = '';
    ALLOCATION_CATEGORIES.forEach(cat => {
        const row = document.createElement('div');
        row.className = 'slider-row';
        row.innerHTML = `
            <div class="slider-label">
                <span>${cat.icon} ${cat.label}</span>
                <span id="val-${cat.key}">${simState.allocation[cat.key]}%</span>
            </div>
            <input type="range" min="0" max="100" value="${simState.allocation[cat.key]}" id="slider-${cat.key}">
        `;
        sliderGroup.appendChild(row);

        const slider = row.querySelector(`#slider-${cat.key}`);
        slider.addEventListener('input', () => {
            simState.allocation[cat.key] = parseInt(slider.value);
            document.getElementById(`val-${cat.key}`).textContent = slider.value + '%';
            updateSimulationStateFromAllocation();
            updateProjection();
        });
    });
    updateProjection();
}

function updateSimulationStateFromAllocation() {
    const a = simState.allocation;
    const total = Object.values(a).reduce((sum, v) => sum + v, 0);
    
    // Budget health is inverse of overspending
    // Starting budget is ₹5L. If total > 100%, we are burning cash faster.
    if (total > 100) {
        simState.budget = 500000 - ((total - 100) * 5000); // Rough burn calculation
    } else {
        simState.budget = 500000 + ((100 - total) * 2000); // Saving
    }
    
    // Morale depends on Team/Operations spend
    simState.morale = 60 + (a.team * 0.5) + (a.operations * 0.2);
    
    // Trust depends on Outreach
    simState.trust = 50 + (a.outreach * 1.5);
    
    // Timeline depends on Tech + Team
    simState.timeline = 40 + (a.tech * 1.0) + (a.team * 0.5);

    updateMetrics();
}

function updateProjection() {
    const a = simState.allocation;
    const total = a.tech + a.marketing + a.team + a.operations + a.outreach;

    let analysis = '';
    let riskClass = 'risk-mid';

    if (a.tech > 40 && a.outreach < 15) {
        analysis = 'Tech-heavy allocation: fast product development but weak community connection. Risk: low adoption.';
        riskClass = 'risk-high';
    } else if (a.marketing > 35 && a.team < 20) {
        analysis = 'Marketing-heavy: strong visibility but understaffed. Risk: team burnout.';
        riskClass = 'risk-high';
    } else if (a.outreach > 30 && a.tech < 20) {
        analysis = 'Strong community focus: high trust, but slow digital product delivery.';
        riskClass = 'risk-mid';
    } else if (a.team > 40) {
        analysis = 'Team-first strategy: strong execution capacity. Ensure that product and outreach keep pace.';
        riskClass = 'risk-low';
    } else if (Math.max(a.tech, a.marketing, a.team, a.operations, a.outreach) - Math.min(a.tech, a.marketing, a.team, a.operations, a.outreach) <= 15) {
        analysis = 'Balanced allocation: Stable growth across all verticals. Low-risk, sustainable approach.';
        riskClass = 'risk-low';
    } else {
        analysis = 'Mixed strategy. Watch for gaps in underfunded areas.';
        riskClass = 'risk-mid';
    }

    const totalBudget = simState.budget;
    projectionDiv.innerHTML = `
        <p class="projection-title">AI Budget Projection</p>
        <p class="projection-text">${analysis}</p>
        <p style="margin-top:10px; font-size:12px; color:var(--text-dim);">
            Total allocated: ${total}% of ₹${(totalBudget / 100000).toFixed(1)}L
            ${total > 100 ? '<span style="color:var(--red); font-weight:600;"> — Over budget!</span>' : ''}
        </p>
        <span class="projection-tag ${riskClass}">${riskClass === 'risk-low' ? '✅ Low Risk' : riskClass === 'risk-mid' ? '⚠️ Medium Risk' : '🔴 High Risk'}</span>
    `;
}

renderSliders();

// ============================================================
// 3. STAKEHOLDER NAVIGATION
// ============================================================
function renderStakeholders() {
    stakeholderCards.innerHTML = '';
    STAKEHOLDERS.forEach((sh, i) => {
        const card = document.createElement('div');
        card.className = `stakeholder-card ${simState.stakeholdersCompleted.includes(i) ? 'completed' : ''}`;
        card.innerHTML = `
            <div class="sh-avatar">${sh.avatar}</div>
            <div class="sh-name">${sh.name}</div>
            <div class="sh-role">${sh.role}</div>
        `;
        card.addEventListener('click', () => startNegotiation(i));
        stakeholderCards.appendChild(card);
    });
}

function startNegotiation(index) {
    if (simState.stakeholdersCompleted.includes(index)) return;
    const sh = STAKEHOLDERS[index];

    stakeholderCards.classList.add('hidden');
    negoResult.classList.add('hidden');
    negotiationActive.classList.remove('hidden');

    document.getElementById('nego-avatar').textContent = sh.avatar;
    document.getElementById('nego-name').textContent = sh.name;
    document.getElementById('nego-role').textContent = sh.role;
    document.getElementById('nego-scenario').textContent = sh.scenario;

    const choicesDiv = document.getElementById('nego-choices');
    choicesDiv.innerHTML = '';
    sh.choices.forEach((c, ci) => {
        const btn = document.createElement('div');
        btn.className = 'nego-choice';
        btn.textContent = c.text;
        btn.addEventListener('click', () => handleNegotiation(index, ci));
        choicesDiv.appendChild(btn);
    });

    gsap.fromTo(negotiationActive, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3 });
}

function handleNegotiation(shIndex, choiceIndex) {
    const sh = STAKEHOLDERS[shIndex];
    const c  = sh.choices[choiceIndex];

    applyEffects(c.effects);
    simState.stakeholdersCompleted.push(shIndex);

    negotiationActive.classList.add('hidden');
    negoResult.classList.remove('hidden');
    document.getElementById('nego-result-text').textContent = c.result;

    addLog(`Met ${sh.name}: ${c.text.substring(0, 40)}...`, (c.effects.trust || 0) > 0 ? 'positive' : 'negative');

    document.getElementById('stakeholder-badge').textContent = `${4 - simState.stakeholdersCompleted.length} left`;

    gsap.fromTo(negoResult, { opacity: 0 }, { opacity: 1, duration: 0.3 });
}

document.getElementById('nego-back').addEventListener('click', () => {
    negoResult.classList.add('hidden');
    stakeholderCards.classList.remove('hidden');
    renderStakeholders();
});

renderStakeholders();

// ============================================================
// 4. IMPACT DASHBOARD
// ============================================================
function updateCompass() {
    const cp = document.getElementById('compass-point');
    if (!cp) return;

    // X-axis: Sustainability (Budget) — 0% = burning cash, 100% = fully funded
    const x = (simState.budget / 500000) * 100;
    // Y-axis: Impact (Trust) — 0% = stigma/no trust, 100% = high impact
    const y = simState.trust;

    const finalX = Math.max(0, Math.min(100, x));
    const finalY = Math.max(0, Math.min(100, y));

    cp.style.left = `${finalX}%`;
    cp.style.top  = `${100 - finalY}%`;  // Inverted: CSS top:0 = visual top

    // Color shift: red = danger zone, green = sweet spot
    if (finalX < 30 || finalY < 30) cp.style.background = 'var(--red)';
    else if (finalX > 70 && finalY > 70) cp.style.background = 'var(--green)';
    else cp.style.background = 'var(--accent)';
}

const COMPASS_HTML = `
    <div class="stat-card">
        <span class="stat-label">Sustainability Compass</span>
        <div class="compass-container">
            <div class="compass-plot">
                <div class="compass-axis-x"></div>
                <div class="compass-axis-y"></div>
                <div class="compass-point" id="compass-point"></div>
                <span class="axis-label x-high">Sustainability</span>
                <span class="axis-label x-low">Burn</span>
                <span class="axis-label y-high">Impact</span>
                <span class="axis-label y-low">Stigma</span>
            </div>
        </div>
    </div>`;

function renderImpactDashboard() {
    const metrics = [
        { label: 'Budget Health', value: `₹${(simState.budget / 100000).toFixed(1)}L`, pct: (simState.budget / 500000) * 100, color: simState.budget > 300000 ? 'var(--green)' : simState.budget > 150000 ? 'var(--yellow)' : 'var(--red)' },
        { label: 'Team Morale', value: `${simState.morale}%`, pct: simState.morale, color: simState.morale > 60 ? 'var(--green)' : simState.morale > 30 ? 'var(--yellow)' : 'var(--red)' },
        { label: 'Community Trust', value: `${simState.trust}%`, pct: simState.trust, color: simState.trust > 60 ? 'var(--green)' : simState.trust > 30 ? 'var(--yellow)' : 'var(--red)' },
        { label: 'Timeline Status', value: simState.timeline >= 80 ? 'On Track' : simState.timeline >= 50 ? 'Delayed' : 'At Risk', pct: simState.timeline, color: simState.timeline >= 80 ? 'var(--green)' : simState.timeline >= 50 ? 'var(--yellow)' : 'var(--red)' }
    ];

    // Build metric cards + compass together
    let html = '';
    metrics.forEach(m => {
        html += `
            <div class="impact-metric-card">
                <p class="im-label">${m.label}</p>
                <p class="im-value">${m.value}</p>
                <div class="im-bar">
                    <div class="im-bar-fill" style="width:${Math.min(100, m.pct)}%; background:${m.color};"></div>
                </div>
            </div>`;
    });
    // Re-inject the compass after the metrics
    html += COMPASS_HTML;
    impactMetrics.innerHTML = html;

    // Update compass position after DOM is rebuilt
    updateCompass();
}

// Initial render
updateMetrics();

// ============================================================
// GSAP card entrance animation
// ============================================================
gsap.fromTo('.sim-card', 
    { opacity: 0, y: 20, scale: 0.97 }, 
    { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.1, ease: 'back.out(1.2)' }
);
