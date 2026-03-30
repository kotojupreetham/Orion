// onboarding.js — NyxTutor Full Adaptive Assessment System (16-Node CAT)
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ============================================================
// STATE
// ============================================================
let currentUser = null;
const state = {
    currentQuestion: null,
    stepIndex: 0,
    totalSteps: 7,
    branch: null,               // 'A' | 'B' | 'C'
    path: [],                   // e.g. ['Q1','Q2','Q3','Q8','Q9','Q14','Q15','Q16']
    answers: {},                // { Q1: 'A', Q2: ['A','B'], Q8: 'some text', Q9: [1,3,0,2], ... }
    scores: { explorer: 0, learner: 0, builder: 0, catalyst: 0 },
    rankingOrder: [],           // for ranking questions
    multiSelected: [],          // for multi questions
};

// ============================================================
// AUTH
// ============================================================
onAuthStateChanged(auth, (user) => {
    if (user) currentUser = user;
});

// ============================================================
// QUESTION TREE — 16 NODES (CAT Architecture)
// ============================================================
const Q = {

    // ─── LAYER 1: ENTRY TRUNK ─────────────────────────────────
    Q1: {
        id: 'Q1', layer: 1, branch: null, type: 'scenario',
        title: 'The Starting Line',
        question: 'You receive ₹50,000 to address a social issue you care about. What is your immediate first step?',
        options: [
            {
                id: 'A', text: 'Research root causes and analyze existing public policies.',
                scores: { learner: 2, explorer: 1 }, next: 'Q2'
            },
            {
                id: 'B', text: 'Mobilize volunteers and directly deliver services to those in need.',
                scores: { explorer: 2, builder: 1 }, next: 'Q4'
            },
            {
                id: 'C', text: 'Map a revenue model so ₹50k acts as seed capital, not a one-time donation.',
                scores: { builder: 2, catalyst: 1 }, next: 'Q6'
            }
        ]
    },

    // ─── LAYER 2: BRANCH A (Conceptual) ──────────────────────
    Q2: {
        id: 'Q2', layer: 2, branch: 'A', type: 'multi',
        title: 'Your Experience So Far',
        question: 'In what contexts have you engaged with social or environmental initiatives? Select all that apply.',
        hint: 'Select one or more',
        options: [
            { id: 'A', text: '📖 Documentaries and academic reading', scores: { learner: 1 } },
            { id: 'B', text: '📝 Designing hypothetical projects for a class', scores: { learner: 1 } },
            { id: 'C', text: '🏆 Hackathons or case competitions', scores: { learner: 1, builder: 1 } },
            { id: 'D', text: "✨ None yet — but I'm eager to start", scores: { explorer: 3 }, exclusive: true }
        ],
        next: 'Q3'
    },
    Q3: {
        id: 'Q3', layer: 2, branch: 'A', type: 'mcq',
        title: 'The Hard Metric',
        question: 'When evaluating a social initiative, which metric is most difficult to accurately measure and attribute?',
        options: [
            { id: 'A', text: 'Operational burn rate and overhead', scores: { explorer: 1 } },
            { id: 'B', text: 'Customer acquisition cost', scores: { explorer: 1 } },
            { id: 'C', text: 'Long-term social impact and causation', scores: { learner: 3, builder: 1 } },
            { id: 'D', text: 'Employee and volunteer retention', scores: { explorer: 1 } }
        ],
        next: 'Q8'
    },

    // ─── LAYER 2: BRANCH B (Grassroots) ──────────────────────
    Q4: {
        id: 'Q4', layer: 2, branch: 'B', type: 'scenario',
        title: 'Low Participation Mystery',
        question: 'You organize a community recycling program, but participation is near zero. What is the most likely systemic reason?',
        options: [
            { id: 'A', text: 'The community simply does not care about the environment.', scores: { explorer: 2 } },
            { id: 'B', text: 'There is hidden friction — inconvenient bin placement or missing incentives.', scores: { builder: 3, learner: 1 } },
            { id: 'C', text: "The marketing campaign wasn't loud enough.", scores: { explorer: 1, learner: 1 } }
        ],
        next: 'Q5'
    },
    Q5: {
        id: 'Q5', layer: 2, branch: 'B', type: 'multi',
        title: 'Real Constraints',
        question: 'Which of these have you personally navigated when working on community projects? Select all that apply.',
        hint: 'Select all that apply',
        options: [
            { id: 'A', text: '💰 Securing initial seed funding or grants', scores: { builder: 1 } },
            { id: 'B', text: '👥 Finding team members willing to work for the mission', scores: { builder: 1 } },
            { id: 'C', text: '⚖️ Navigating legal structures (Non-profit vs B-Corp)', scores: { builder: 2, catalyst: 1 } },
            { id: 'D', text: '📊 Measuring actual impact to satisfy donors', scores: { builder: 2, catalyst: 1 } },
            { id: 'E', text: "🆕 None — I haven't run a project yet", scores: { explorer: 2 }, exclusive: true }
        ],
        next: 'Q10'
    },

    // ─── LAYER 2: BRANCH C (Commercial) ──────────────────────
    Q6: {
        id: 'Q6', layer: 2, branch: 'C', type: 'scenario',
        title: 'The Investor Dilemma',
        question: 'A corporate investor offers funding to scale nationally but demands you cut your community-engagement program to increase margins. Your immediate thought?',
        options: [
            { id: 'A', text: 'Accept the funds — scaling the core product helps more people overall.', scores: { builder: 1, learner: 1 } },
            { id: 'B', text: 'Reject the funds — mission drift is unacceptable.', scores: { learner: 1, explorer: 1 } },
            { id: 'C', text: 'Negotiate a hybrid model, proving community engagement lowers customer churn.', scores: { catalyst: 3, builder: 1 } }
        ],
        next: 'Q7'
    },
    Q7: {
        id: 'Q7', layer: 2, branch: 'C', type: 'mcq',
        title: 'Healthy Unit Economics',
        question: 'Which scenario describes the healthiest unit economics for a sustainable social enterprise?',
        options: [
            { id: 'A', text: 'Each unit of impact is fully covered by a philanthropic grant.', scores: { learner: 1, explorer: 1 } },
            { id: 'B', text: 'LTV of a customer exceeds CAC, allowing profits to cross-subsidize the mission.', scores: { builder: 2, catalyst: 2 } },
            { id: 'C', text: 'The organization relies entirely on volunteers to keep margins high.', scores: { explorer: 2 } }
        ],
        next: 'Q12'
    },

    // ─── LAYER 3: DEEP VALIDATION ─────────────────────────────

    // Branch A Validation
    Q8: {
        id: 'Q8', layer: 3, branch: 'A', type: 'text',
        title: 'When Help Hurts',
        question: 'Good intentions can sometimes cause harm. Briefly describe a scenario (real or hypothetical) where a solution made things worse. What was missing?',
        placeholder: 'Think about unintended consequences, community impact, cultural factors...',
        keywords: {
            explorer:  ['didn\'t work', 'bad', 'failed', 'lazy', 'charity', 'free stuff'],
            learner:   ['community', 'culture', 'consult', 'awareness', 'trust'],
            builder:   ['program design', 'feedback', 'implementation', 'local economy', 'co-design'],
            catalyst:  ['systemic', 'policy', 'causal', 'root', 'structural', 'ecosystem', 'incentive structure']
        },
        next: 'Q9'
    },
    Q9: {
        id: 'Q9', layer: 3, branch: 'A', type: 'ranking',
        title: 'First Things First',
        question: 'Designing a solution for urban food insecurity. Rank these steps in the optimal order of execution.',
        hint: 'Click items in the order you would do them (1st, 2nd, 3rd, 4th)',
        items: [
            { id: 'B', text: 'Map existing food banks and nearby resources', idealRank: 2 },
            { id: 'A', text: 'Interview people experiencing food insecurity', idealRank: 1 },
            { id: 'D', text: 'Apply for a grant', idealRank: 4 },
            { id: 'C', text: 'Draft a business plan', idealRank: 3 }
        ],
        next: 'Q14'
    },

    // Branch B Validation
    Q10: {
        id: 'Q10', layer: 3, branch: 'B', type: 'text',
        title: 'The Resistance Problem',
        question: 'You develop an automated farming tool that increases yield, but a local labor union opposes it because it threatens manual jobs. How do you approach this conflict?',
        placeholder: 'Describe how you would navigate this stakeholder conflict...',
        keywords: {
            explorer:  ['ignore', 'push forward', 'tell them why', 'they\'ll adapt'],
            learner:   ['explain', 'meet them', 'show data', 'present benefits'],
            builder:   ['involve', 'retrain', 'reskill', 'negotiate', 'workshop'],
            catalyst:  ['co-create', 'co-design', 'transition roles', 'systemic', 'ecosystem', 'stakeholder salience']
        },
        next: 'Q11'
    },
    Q11: {
        id: 'Q11', layer: 3, branch: 'B', type: 'ranking',
        title: 'Scarce Resources',
        question: 'Launching a community initiative with highly restricted funds. Rank what you prioritize securing first.',
        hint: 'Click items in the order you would prioritize them (1st, 2nd, 3rd, 4th)',
        items: [
            { id: 'C', text: 'External financial sponsorship', idealRank: 3 },
            { id: 'A', text: 'Local community trust and buy-in', idealRank: 1 },
            { id: 'D', text: 'Media and PR awareness', idealRank: 4 },
            { id: 'B', text: 'A diverse operational team', idealRank: 2 }
        ],
        next: 'Q14'
    },

    // Branch C Validation
    Q12: {
        id: 'Q12', layer: 3, branch: 'C', type: 'text',
        title: 'Beyond the P&L',
        question: 'Describe how you would measure the success of a social enterprise beyond quarterly revenue and profit margins. What indicators would you track?',
        placeholder: 'Think beyond financial metrics — what does real, lasting success look like?',
        keywords: {
            explorer:  ['happy', 'helped people', 'good feedback', 'positive'],
            learner:   ['impact', 'metrics', 'survey', 'KPI', 'beneficiary', 'feedback'],
            builder:   ['SROI', 'theory of change', 'attribution', 'ESG', 'unit economics', 'cost per beneficiary'],
            catalyst:  ['systemic', 'policy', 'ecosystem', 'public narrative', 'regenerative', 'leverage', 'structural change']
        },
        next: 'Q13'
    },
    Q13: {
        id: 'Q13', layer: 3, branch: 'C', type: 'multi',
        title: 'Leverage Points',
        question: 'Evaluating the affordable housing ecosystem — select the TWO options that represent genuine system-level leverage points.',
        hint: 'Select exactly 2',
        maxSelect: 2,
        options: [
            { id: 'A', text: '🏠 Building a new shelter', scores: { builder: 1 } },
            { id: 'B', text: '⚖️ Changing municipal zoning laws', scores: { catalyst: 3 } },
            { id: 'C', text: '🥘 Handing out weekend meals to residents', scores: { explorer: 1 } },
            { id: 'D', text: '📢 Shifting the public narrative on housing data', scores: { catalyst: 3 } }
        ],
        next: 'Q14'
    },

    // ─── LAYER 4: CONVERGENCE CRUCIBLE ───────────────────────
    Q14: {
        id: 'Q14', layer: 4, branch: null, type: 'scenario',
        title: 'The Survival Trade-Off',
        question: 'A supply chain shock doubles your costs overnight. You have 3 months of runway. What is your primary strategic move?',
        options: [
            { id: 'A', text: 'Double the price — revenue survival must come first, even if it prices out low-income beneficiaries.', scores: { explorer: 1 } },
            { id: 'B', text: 'Maintain the price and hope for an emergency grant to bail you out.', scores: { learner: 1 } },
            { id: 'C', text: 'Pivot to tiered pricing — charge corporate clients a premium to cross-subsidize low-income beneficiaries.', scores: { catalyst: 3, builder: 2 } }
        ],
        next: 'Q15'
    },
    Q15: {
        id: 'Q15', layer: 4, branch: null, type: 'ranking',
        title: 'Crisis Communication',
        question: 'A major operational crisis hits. You can only address stakeholders sequentially. Rank who gets your attention first.',
        hint: 'Click items in the order you would communicate (1st = most urgent)',
        items: [
            { id: 'C', text: 'Lead financial investors', idealRank: 3 },
            { id: 'A', text: 'Primary impact beneficiaries', idealRank: 1 },
            { id: 'D', text: 'General public and media', idealRank: 4 },
            { id: 'B', text: 'Internal operational team', idealRank: 2 }
        ],
        next: 'Q16'
    },
    Q16: {
        id: 'Q16', layer: 4, branch: null, type: 'text',
        title: 'The Root Cause Test',
        question: 'In one or two sentences: what is the difference between treating the symptoms of a social problem versus treating its root cause?',
        placeholder: 'How you answer this reveals how you see the world...',
        keywords: {
            explorer:  ['help', 'give', 'fix it', 'solve the problem'],
            learner:   ['cause', 'underlying reason', 'not just surface', 'deeper'],
            builder:   ['root cause', 'long-term', 'sustainable', 'system', 'change behavior'],
            catalyst:  ['structural', 'policy', 'systemic', 'interdependent', 'zoning', 'wages', 'leverage', 'ecosystem', 'regenerative']
        },
        next: null
    }
};

// ============================================================
// ROUTING TABLE
// ============================================================
// Defines which questions a user traverses per branch
// Branch A: Q1 → Q2 → Q3 → Q8 → Q9 → Q14 → Q15 → Q16
// Branch B: Q1 → Q4 → Q5 → Q10 → Q11 → Q14 → Q15 → Q16
// Branch C: Q1 → Q6 → Q7 → Q12 → Q13 → Q14 → Q15 → Q16

const BRANCH_PATHS = {
    A: ['Q1','Q2','Q3','Q8','Q9','Q14','Q15','Q16'],
    B: ['Q1','Q4','Q5','Q10','Q11','Q14','Q15','Q16'],
    C: ['Q1','Q6','Q7','Q12','Q13','Q14','Q15','Q16']
};

// ============================================================
// LEVEL DEFINITIONS
// ============================================================
const LEVELS = {
    Explorer: {
        icon: '🌱', tagline: 'Driven by passion. Ready to learn.',
        color: 'explorer',
        desc: 'You bring fresh energy and genuine desire to create change. The platform will guide you through foundational concepts — understanding stakeholders, building basic models, and discovering how social initiatives actually operate. Your simulation starts in a supportive, stable environment.'
    },
    Learner: {
        icon: '📖', tagline: 'Solid theory. Ready to apply.',
        color: 'learner',
        desc: 'You understand the concepts and frameworks of social entrepreneurship. Now it\'s time to bridge theory and practice. Your simulations will present moderate complexity — resource constraints, stakeholder trade-offs, and early operational decisions where textbook knowledge meets real friction.'
    },
    Builder: {
        icon: '🔨', tagline: 'Operational experience. Ready to scale.',
        color: 'builder',
        desc: 'You\'ve been in the field. You\'ve felt the friction of real implementation. Your simulations introduce resource scarcity, market volatility, and complex stakeholder conflicts. You\'ll practice cross-subsidization, crisis navigation, and scaling strategies under realistic pressure.'
    },
    Catalyst: {
        icon: '🚀', tagline: 'Systemic thinker. Ready to architect change.',
        color: 'catalyst',
        desc: 'You operate at the system level. Your simulations spawn wicked problems — hostile regulatory environments, entrenched poverty traps, and conflicts between investor demands and beneficiary rights. Success is measured by ecosystem-level change, not just organizational survival.'
    }
};

// ============================================================
// DOM REFERENCES
// ============================================================
const progressEl   = document.getElementById('ob-progress');
const layerBadge   = document.getElementById('layer-badge');
const card         = document.getElementById('ob-card');

const screenWelcome  = document.getElementById('screen-welcome');
const screenQuestion = document.getElementById('screen-question');
const screenResult   = document.getElementById('screen-result');

const startBtn    = document.getElementById('start-btn');
const backBtn     = document.getElementById('back-btn');
const nextBtn     = document.getElementById('next-btn');
const enterBtn    = document.getElementById('enter-btn');

const qStep       = document.getElementById('q-step');
const qBranchTag  = document.getElementById('q-branch-tag');
const qTitle      = document.getElementById('q-title');
const qText       = document.getElementById('q-text');
const qOptions    = document.getElementById('q-options');
const qChips      = document.getElementById('q-chips');
const qRanking    = document.getElementById('q-ranking');
const qTextArea   = document.getElementById('q-text-area');
const qTextarea   = document.getElementById('q-textarea');

// ============================================================
// ANIMATION HELPERS
// ============================================================
function animateIn(el) {
    gsap.fromTo(el, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
}
function animateOut(el, cb) {
    gsap.to(el, { opacity: 0, y: -12, duration: 0.22, ease: 'power2.in', onComplete: cb });
}
function shakeBtn(btn) {
    gsap.to(btn, { x: -6, duration: 0.05, yoyo: true, repeat: 5, ease: 'none', onComplete: () => gsap.set(btn, { x: 0 }) });
}

// ============================================================
// START
// ============================================================
gsap.fromTo(card, { opacity: 0, scale: 0.96, y: 20 }, { opacity: 1, scale: 1, y: 0, duration: 0.6, ease: 'back.out(1.5)' });

startBtn.addEventListener('click', () => {
    gsap.to(startBtn, { scale: 0.96, duration: 0.08, yoyo: true, repeat: 1, onComplete: () => {
        switchScreen(screenWelcome, screenQuestion);
        renderQuestion('Q1');
    }});
});

// ============================================================
// SCREEN TRANSITIONS
// ============================================================
function switchScreen(from, to) {
    animateOut(from, () => {
        from.classList.remove('active');
        from.classList.add('hidden');
        to.classList.remove('hidden');
        to.classList.add('active');
        animateIn(to);
    });
}

// ============================================================
// RENDER QUESTION
// ============================================================
function renderQuestion(qId) {
    const q = Q[qId];
    if (!q) return;

    state.currentQuestion = qId;
    if (!state.path.includes(qId)) state.path.push(qId);

    // Determine branch
    if (q.branch) state.branch = q.branch;

    // Progress
    const branchPath = state.branch ? BRANCH_PATHS[state.branch] : BRANCH_PATHS.A;
    const stepInPath = branchPath.indexOf(qId);
    const progress = stepInPath >= 0 ? Math.round(((stepInPath + 1) / branchPath.length) * 100) : 100;
    progressEl.style.width = progress + '%';

    // Meta
    const displayStep = stepInPath >= 0 ? stepInPath + 1 : branchPath.length;
    qStep.textContent = `Step ${displayStep} of ${branchPath.length}`;

    if (q.branch && q.layer < 4) {
        qBranchTag.textContent = `Branch ${q.branch}`;
        qBranchTag.classList.remove('hidden');
    } else {
        qBranchTag.classList.add('hidden');
    }

    // Layer badge
    layerBadge.textContent = `Layer ${q.layer}`;
    layerBadge.classList.add('visible');

    // Content
    qTitle.textContent = q.title;
    qText.textContent  = q.question;

    // Reset panels
    qOptions.innerHTML  = '';
    qChips.innerHTML    = '';
    qRanking.innerHTML  = '';
    qOptions.classList.add('hidden');
    qChips.classList.add('hidden');
    qRanking.classList.add('hidden');
    qTextArea.classList.add('hidden');
    state.multiSelected = [];
    state.rankingOrder  = [];

    // Disable next by default
    disableNext();

    // Back button
    const pathIdx = state.path.indexOf(qId);
    backBtn.style.display = pathIdx <= 0 ? 'none' : 'flex';

    // Render by type
    switch (q.type) {
        case 'scenario':
        case 'mcq':
            renderMCQ(q);
            break;
        case 'multi':
            renderMulti(q);
            break;
        case 'ranking':
            renderRanking(q);
            break;
        case 'text':
            renderText(q);
            break;
    }

    animateIn(screenQuestion);
}

// ─── MCQ / SCENARIO ──────────────────────────────────────
function renderMCQ(q) {
    qOptions.classList.remove('hidden');
    q.options.forEach(opt => {
        const div = document.createElement('div');
        div.className = 'option-card';
        div.innerHTML = `<span class="opt-key">${opt.id}</span><span class="opt-text">${opt.text}</span>`;
        div.addEventListener('click', () => {
            document.querySelectorAll('#q-options .option-card').forEach(c => c.classList.remove('selected'));
            div.classList.add('selected');
            gsap.fromTo(div, { scale: 0.98 }, { scale: 1, duration: 0.2, ease: 'back.out(2)' });
            state.answers[state.currentQuestion] = opt.id;
            // Apply scores
            applyScores(opt.scores);
            enableNext(() => advanceFromMCQ(q, opt));
        });
        qOptions.appendChild(div);
    });
}

function advanceFromMCQ(q, opt) {
    const next = opt.next || q.next;
    if (next) {
        animateOut(screenQuestion, () => renderQuestion(next));
    } else {
        showResult();
    }
}

// ─── MULTI SELECT ─────────────────────────────────────────
function renderMulti(q) {
    qChips.classList.remove('hidden');
    const maxSel = q.maxSelect || 999;

    q.options.forEach(opt => {
        const div = document.createElement('div');
        div.className = `chip-item${opt.exclusive ? ' exclusive' : ''}`;
        div.textContent = opt.text;
        div.dataset.id = opt.id;

        div.addEventListener('click', () => {
            if (opt.exclusive) {
                // Deselect all others
                document.querySelectorAll('#q-chips .chip-item').forEach(c => c.classList.remove('selected'));
                state.multiSelected = [opt.id];
                div.classList.add('selected');
            } else {
                // Deselect exclusive
                document.querySelectorAll('#q-chips .chip-item.exclusive').forEach(c => c.classList.remove('selected'));
                state.multiSelected = state.multiSelected.filter(id => {
                    const o = q.options.find(x => x.id === id);
                    return !o?.exclusive;
                });

                if (div.classList.contains('selected')) {
                    div.classList.remove('selected');
                    state.multiSelected = state.multiSelected.filter(id => id !== opt.id);
                } else {
                    if (state.multiSelected.length < maxSel) {
                        div.classList.add('selected');
                        state.multiSelected.push(opt.id);
                    } else {
                        shakeBtn(div);
                        return;
                    }
                }
            }

            gsap.fromTo(div, { scale: 0.95 }, { scale: 1, duration: 0.2, ease: 'back.out(2)' });

            if (state.multiSelected.length > 0) {
                enableNext(() => {
                    // Apply scores for all selected
                    state.multiSelected.forEach(id => {
                        const o = q.options.find(x => x.id === id);
                        if (o?.scores) applyScores(o.scores);
                    });
                    state.answers[state.currentQuestion] = [...state.multiSelected];
                    const next = q.next;
                    if (next) animateOut(screenQuestion, () => renderQuestion(next));
                    else showResult();
                });
            } else {
                disableNext();
            }
        });

        qChips.appendChild(div);
    });
}

// ─── RANKING ─────────────────────────────────────────────
function renderRanking(q) {
    qRanking.classList.remove('hidden');

    const hint = document.createElement('p');
    hint.className = 'ranking-hint';
    hint.textContent = q.hint || 'Click items in your preferred order (1st → last)';
    qRanking.appendChild(hint);

    let clickOrder = []; // array of item ids in click order

    const itemEls = {};
    q.items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'ranking-item';
        div.innerHTML = `<div class="rank-num">?</div><span>${item.text}</span>`;
        div.dataset.id = item.id;
        itemEls[item.id] = div;

        div.addEventListener('click', () => {
            if (clickOrder.includes(item.id)) {
                // Unrank: remove from order
                clickOrder = clickOrder.filter(id => id !== item.id);
                div.classList.remove('ranked');
                div.querySelector('.rank-num').textContent = '?';
                // Update ranks of remaining
                clickOrder.forEach((id, idx) => {
                    itemEls[id].querySelector('.rank-num').textContent = idx + 1;
                });
            } else {
                clickOrder.push(item.id);
                div.classList.add('ranked');
                div.querySelector('.rank-num').textContent = clickOrder.length;
            }

            gsap.fromTo(div, { scale: 0.97 }, { scale: 1, duration: 0.2, ease: 'back.out(2)' });

            if (clickOrder.length === q.items.length) {
                enableNext(() => {
                    // Score based on how close to ideal ranking
                    scoreRanking(q, clickOrder);
                    state.answers[state.currentQuestion] = [...clickOrder];
                    state.rankingOrder = [...clickOrder];
                    const next = q.next;
                    if (next) animateOut(screenQuestion, () => renderQuestion(next));
                    else showResult();
                });
            } else {
                disableNext();
            }
        });

        qRanking.appendChild(div);
    });
}

function scoreRanking(q, clickOrder) {
    // Compare click order to ideal order
    // Score: +builder/catalyst for correct top 2, +explorer for completely wrong
    let correctPositions = 0;
    clickOrder.forEach((id, idx) => {
        const item = q.items.find(i => i.id === id);
        if (item && item.idealRank === idx + 1) correctPositions++;
    });

    if (correctPositions >= 3) {
        applyScores({ catalyst: 2, builder: 1 });
    } else if (correctPositions >= 2) {
        applyScores({ builder: 2, learner: 1 });
    } else if (correctPositions === 1) {
        applyScores({ learner: 2, explorer: 1 });
    } else {
        applyScores({ explorer: 2 });
    }
}

// ─── FREE TEXT ────────────────────────────────────────────
function renderText(q) {
    qTextArea.classList.remove('hidden');
    qTextarea.placeholder = q.placeholder || 'Type your answer here...';
    qTextarea.value = state.answers[q.id] || '';

    const updateBtn = () => {
        const len = qTextarea.value.trim().length;
        if (len >= 20) {
            enableNext(() => {
                const text = qTextarea.value.trim();
                state.answers[state.currentQuestion] = text;
                scoreText(q, text);
                const next = q.next;
                if (next) animateOut(screenQuestion, () => renderQuestion(next));
                else showResult();
            });
        } else {
            disableNext();
        }
    };

    qTextarea.addEventListener('input', updateBtn);
    updateBtn();
}

function scoreText(q, text) {
    const lower = text.toLowerCase();
    const scores = { explorer: 0, learner: 0, builder: 0, catalyst: 0 };

    Object.entries(q.keywords).forEach(([level, kws]) => {
        kws.forEach(kw => {
            if (lower.includes(kw.toLowerCase())) scores[level]++;
        });
    });

    // Add the highest-matching level's score
    const max = Math.max(...Object.values(scores));
    if (max > 0) {
        Object.entries(scores).forEach(([level, val]) => {
            if (val === max) state.scores[level] += 3;
            else if (val > 0) state.scores[level] += 1;
        });
    } else {
        // No keywords → likely explorer (very basic answer)
        state.scores.explorer += 1;
    }
}

// ============================================================
// SCORE HELPERS
// ============================================================
function applyScores(scores) {
    if (!scores) return;
    Object.entries(scores).forEach(([level, val]) => {
        if (state.scores[level] !== undefined) state.scores[level] += val;
    });
}

// ============================================================
// NAVIGATION HELPERS
// ============================================================
let nextCallback = null;
function enableNext(cb) {
    nextCallback = cb;
    nextBtn.classList.remove('disabled');
}
function disableNext() {
    nextCallback = null;
    nextBtn.classList.add('disabled');
}

nextBtn.addEventListener('click', () => {
    if (nextBtn.classList.contains('disabled')) { shakeBtn(nextBtn); return; }
    if (nextCallback) nextCallback();
});

backBtn.addEventListener('click', () => {
    const pathIdx = state.path.indexOf(state.currentQuestion);
    if (pathIdx <= 0) return;

    // Undo scores (not perfectly reversible, but re-initialize from scratch would be complex)
    // For hackathon: just go back visually, don't undo score
    state.path.pop();
    const prevId = state.path[state.path.length - 1];
    animateOut(screenQuestion, () => renderQuestion(prevId));
});

// ============================================================
// CLASSIFY
// ============================================================
function getClassification() {
    const s = state.scores;
    const max = Math.max(s.explorer, s.learner, s.builder, s.catalyst);

    if (s.catalyst === max)  return 'Catalyst';
    if (s.builder  === max)  return 'Builder';
    if (s.learner  === max)  return 'Learner';
    return 'Explorer';
}

// ============================================================
// SHOW RESULT
// ============================================================
function showResult() {
    const level    = getClassification();
    const meta     = LEVELS[level];
    const totalScr = Object.values(state.scores).reduce((a,b) => a + b, 0);
    const branchName = { A: 'Conceptual (A)', B: 'Grassroots (B)', C: 'Commercial (C)' };

    document.getElementById('result-icon').textContent = meta.icon;
    const levelEl = document.getElementById('result-level');
    levelEl.textContent = level;
    levelEl.className = `result-level-name ${meta.color}`;
    document.getElementById('result-tagline').textContent = meta.tagline;
    document.getElementById('result-desc').textContent   = meta.desc;
    document.getElementById('path-text').textContent     = state.branch ? `${branchName[state.branch]} → Convergence Layer` : 'Direct convergence';

    // Score bars
    const barsEl = document.getElementById('score-bars');
    barsEl.innerHTML = '';
    const levels = ['Explorer','Learner','Builder','Catalyst'];
    levels.forEach(lv => {
        const key = lv.toLowerCase();
        const val = state.scores[key] || 0;
        const pct = totalScr > 0 ? Math.round((val / totalScr) * 100) : 0;
        const isActive = lv === level;

        barsEl.innerHTML += `
          <div class="score-row">
            <span class="score-label${isActive ? ' active' : ''}">${lv}</span>
            <div class="score-track"><div class="score-bar ${key}" data-pct="${pct}" style="width:0%"></div></div>
            <span class="score-val">${pct}%</span>
          </div>`;
    });

    // Switch screen
    progressEl.style.width = '100%';
    layerBadge.textContent = 'Complete';
    switchScreen(screenQuestion, screenResult);

    // Animate bars after switch
    setTimeout(() => {
        document.querySelectorAll('.score-bar').forEach(bar => {
            gsap.to(bar, { width: bar.dataset.pct + '%', duration: 1, ease: 'power2.out', delay: 0.2 });
        });
        gsap.fromTo('#result-icon', { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(2)' });
    }, 400);
}

// ============================================================
// ENTER WORKSPACE — Save to Firestore + Notify Parent
// ============================================================
enterBtn.addEventListener('click', async () => {
    if (!currentUser) return;

    enterBtn.disabled  = true;
    enterBtn.textContent = 'Saving...';

    const level = getClassification();
    const meta  = LEVELS[level];
    const totalScore = Object.values(state.scores).reduce((a,b) => a + b, 0);

    const defaultTitles = {
        Explorer: 'My First Initiative',
        Learner:  'Learning Project',
        Builder:  'Scaling Initiative',
        Catalyst: 'Systemic Change Hub'
    };

    const payload = {
        level,
        score: totalScore,
        scores: state.scores,        // per-level breakdown
        branch: state.branch,
        path: state.path,
        answers: state.answers,
        assessmentVersion: 'v2-cat16',
        completedAt: serverTimestamp()
    };

    try {
        // Save user profile
        await setDoc(doc(db, 'users', currentUser.uid), payload);

        const wsTitle = defaultTitles[level];

        // Notify parent (if in iframe)
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'ONBOARDING_COMPLETE',
                level,
                score: totalScore,
                scores: state.scores,
                branch: state.branch,
                workspaceTitle: wsTitle
            }, '*');
        } else {
            window.location.href = 'index.html';
        }
    } catch (err) {
        console.error('Save error:', err);
        enterBtn.textContent = 'Error — try again';
        enterBtn.disabled = false;
    }
});
