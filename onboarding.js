// onboarding.js — Orion: Adaptive AI Profile Engine
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ============================================================
// GEMINI API
// ============================================================
const GEMINI_API_KEY = "AIzaSyDR-v7ncbMDKPgzDnrIiAoAKTs3LDS2v9c"; // Provided by user

// ============================================================
// STATE
// ============================================================
let currentUser = null;
const state = {
    idea: "",
    currentQuestionData: null,
    stepIndex: 0,
    maxSteps: 5,
    history: [],                // { question, generatedType, userAnswer, evalScore }
    answers: {},                // Final storage
    scores: { explorer: 0, learner: 0, builder: 0, catalyst: 0 },
    hasProfile: false,
    profileData: null,          // { name, age, gender }
    path: [],                   // To trace consistency and prevent gaming
    retryCount: 0               // Prevent infinite API retry loops
};

// ============================================================
// AUTH
// ============================================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        try {
            const userSnap = await getDoc(doc(db, 'users', user.email));
            if (userSnap.exists() && userSnap.data().profile?.age) {
                state.hasProfile = true;
                state.profileData = userSnap.data().profile;
            }
        } catch(e) { console.error("Error fetching profile", e); }
    }
});

// ============================================================
// KEYWORD DICTIONARIES (For local text evaluation)
// ============================================================
const KEYWORDS = {
    explorer:  ['help', 'give', 'fix it', 'solve the problem', 'didn\'t work', 'bad', 'failed', 'lazy', 'charity', 'free stuff', 'happy', 'helped people', 'positive', 'ignore', 'push forward', 'they\'ll adapt'],
    learner:   ['cause', 'underlying reason', 'deeper', 'community', 'culture', 'consult', 'awareness', 'trust', 'impact', 'metrics', 'survey', 'KPI', 'beneficiary', 'explain', 'meet them', 'show data'],
    builder:   ['root cause', 'sustainable', 'system', 'change behavior', 'program design', 'feedback', 'implementation', 'local economy', 'co-design', 'SROI', 'theory of change', 'ESG', 'unit economics', 'retrain', 'reskill', 'negotiate'],
    catalyst:  ['structural', 'policy', 'systemic', 'interdependent', 'zoning', 'ecosystem', 'regenerative', 'causal', 'incentive structure', 'public narrative', 'leverage', 'co-create', 'co-design', 'transition roles', 'stakeholder']
};

// ============================================================
// STATIC QUESTIONS (Pre-Filter)
// ============================================================
const STATIC_QUESTIONS = [
    {
        title: "Strategy Focus",
        question: "What is the primary focus of your initiative?",
        type: "mcq",
        options: [
            { id: "A", text: "General awareness and offering basic community support", scoreLevel: "explorer" },
            { id: "B", text: "Providing direct help to individuals through localized programs", scoreLevel: "learner" },
            { id: "C", text: "Developing a scalable app or digital product to connect users", scoreLevel: "builder" },
            { id: "D", text: "Deeply integrating with existing infrastructure to change policy", scoreLevel: "catalyst" }
        ]
    },
    {
        title: "Execution Experience",
        question: "What have you actually built or worked on?",
        type: "mcq",
        options: [
            { id: "A", text: "Nothing yet", scoreLevel: "explorer" },
            { id: "B", text: "Small projects or early prototypes", scoreLevel: "learner" },
            { id: "C", text: "A working product with real users", scoreLevel: "builder" },
            { id: "D", text: "A scaled system with multiple deployments", scoreLevel: "catalyst" }
        ]
    },
    {
        title: "Impact Thinking",
        question: "How do you plan to measure the success of your project?",
        type: "mcq",
        options: [
            { id: "A", text: "Hearing personal stories and getting positive feedback", scoreLevel: "explorer" },
            { id: "B", text: "Measuring the number of users or members who join the platform", scoreLevel: "learner" },
            { id: "C", text: "Tracking specific Key Performance Indicators (KPIs)", scoreLevel: "builder" },
            { id: "D", text: "Conducting long-term structural impact studies", scoreLevel: "catalyst" }
        ]
    },
    {
        title: "The Constraint Scenario",
        question: "You have ₹20,000 and 2 weeks to test your idea. What do you do?",
        type: "mcq",
        options: [
            { id: "A", text: "Help people directly with the funds", scoreLevel: "explorer" },
            { id: "B", text: "Research more and conduct surveys", scoreLevel: "learner" },
            { id: "C", text: "Build a strict MVP and gather user feedback", scoreLevel: "builder" },
            { id: "D", text: "Design a scalable model to unlock larger grants", scoreLevel: "catalyst" }
        ]
    }
];

// ============================================================
// DOM REFERENCES
// ============================================================
const progressEl   = document.getElementById('ob-progress');
const layerBadge   = document.getElementById('layer-badge');
const card         = document.getElementById('ob-card');

const screenWelcome  = document.getElementById('screen-welcome');
const screenProfile  = document.getElementById('screen-profile');
const screenIdea     = document.getElementById('screen-idea');
const screenLoading  = document.getElementById('screen-loading');
const screenQuestion = document.getElementById('screen-question');
const screenResult   = document.getElementById('screen-result');

const profName       = document.getElementById('prof-name');
const profAge        = document.getElementById('prof-age');
const profGender     = document.getElementById('prof-gender');
const submitProfileBtn = document.getElementById('submit-profile-btn');

const startBtn       = document.getElementById('start-btn');
const ideaInput      = document.getElementById('idea-input');
const submitIdeaBtn  = document.getElementById('submit-idea-btn');
const backBtn        = document.getElementById('back-btn');
const nextBtn        = document.getElementById('next-btn');
const enterBtn       = document.getElementById('enter-btn');

const qStep       = document.getElementById('q-step');
const qBranchTag  = document.getElementById('q-branch-tag'); // unused now
const qTitle      = document.getElementById('q-title');
const qText       = document.getElementById('q-text');
const qOptions    = document.getElementById('q-options');
const qChips      = document.getElementById('q-chips');      // unused
const qRanking    = document.getElementById('q-ranking');    // unused
const qTextArea   = document.getElementById('q-text-area');
const qTextareaEl = document.getElementById('q-textarea');

// ============================================================
// ANIMATION HELPERS
// ============================================================
function animateIn(el) { gsap.fromTo(el, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }); }
function animateOut(el, cb) { gsap.to(el, { opacity: 0, y: -12, duration: 0.22, ease: 'power2.in', onComplete: cb }); }
function shakeBtn(btn) { gsap.to(btn, { x: -6, duration: 0.05, yoyo: true, repeat: 5, ease: 'none', onComplete: () => gsap.set(btn, { x: 0 }) }); }
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
// FLOW: Start -> Idea -> Loading -> Generate Q -> ...
// ============================================================
gsap.fromTo(card, { opacity: 0, scale: 0.96, y: 20 }, { opacity: 1, scale: 1, y: 0, duration: 0.6, ease: 'back.out(1.5)' });

startBtn.addEventListener('click', () => {
    gsap.to(startBtn, { scale: 0.96, duration: 0.08, yoyo: true, repeat: 1, onComplete: () => {
        if (state.hasProfile) {
            switchScreen(screenWelcome, screenIdea);
        } else {
            // Auto-fill name if available via auth
            if (currentUser && currentUser.displayName) profName.value = currentUser.displayName;
            switchScreen(screenWelcome, screenProfile);
        }
    }});
});

const updateProfileBtn = () => {
    if (profName.value.trim() !== '' && profAge.value !== '' && profGender.value !== '') {
        submitProfileBtn.classList.remove('disabled');
    } else {
        submitProfileBtn.classList.add('disabled');
    }
};

profName.addEventListener('input', updateProfileBtn);
profAge.addEventListener('input', updateProfileBtn);
profGender.addEventListener('change', updateProfileBtn);

submitProfileBtn.addEventListener('click', () => {
    if (submitProfileBtn.classList.contains('disabled')) return;
    state.profileData = {
        name: profName.value.trim(),
        age: parseInt(profAge.value, 10),
        gender: profGender.value
    };
    switchScreen(screenProfile, screenIdea);
});

ideaInput.addEventListener('input', () => {
    if (ideaInput.value.trim().length > 10) {
        submitIdeaBtn.classList.remove('disabled');
    } else {
        submitIdeaBtn.classList.add('disabled');
    }
});

submitIdeaBtn.addEventListener('click', async () => {
    if (submitIdeaBtn.classList.contains('disabled')) return;
    state.idea = ideaInput.value.trim();
    switchScreen(screenIdea, screenLoading);
    
    // Set dynamic limit based on age
    const age = state.profileData ? state.profileData.age : 25;
    if (age <= 16) state.maxSteps = 5;       // 4 static + 1 AI
    else if (age <= 20) state.maxSteps = 6;  // 4 static + 2 AI
    else state.maxSteps = 7;                 // 4 static + 3 AI

    // Kick off first AI question
    layerBadge.textContent = `Layer 1`;
    layerBadge.classList.add('visible');
    progressEl.style.width = '20%';
    
    await fetchNextQuestion();
});

// ============================================================
// GEMINI INTELLIGENCE ENGINE (Hybrid Flow)
// ============================================================
async function fetchNextQuestion() {
    const targetLevel = determineTargetLevel();
    
    // Check Early Exit after the 4 Static questions are done
    if (state.stepIndex === STATIC_QUESTIONS.length) {
        if (state.scores.explorer >= 6 && state.scores.catalyst === 0 && state.scores.builder <= 2) {
            console.log("Early exit triggered: Strong Explorer detected.");
            showResult();
            return;
        }
    }
    
    // Check Max Steps
    if (state.stepIndex >= state.maxSteps) {
        showResult();
        return;
    }

    // STATIC PHASE: Serve the Pre-Filter Questions instantly
    if (state.stepIndex < STATIC_QUESTIONS.length) {
        state.currentQuestionData = STATIC_QUESTIONS[state.stepIndex];
        state.stepIndex++;
        
        // If coming from loading, switch safely
        if (document.querySelector('.ob-screen.active').id === 'screen-loading') {
            switchScreen(screenLoading, screenQuestion);
            renderGeneratedQuestion(state.currentQuestionData);
        } else {
            // It's a static-to-static transition, DOM updates happen after fade out in the setTimeout
            renderGeneratedQuestion(state.currentQuestionData);
        }
        return;
    }

    // DYNAMIC AI PHASE: Trigger loading and call Gemini
    // Ensure we are showing the loading screen
    if (document.querySelector('.ob-screen.active').id !== 'screen-loading') {
        switchScreen(screenQuestion, screenLoading);
    }
    
    state.stepIndex++;
    const targetType = (state.stepIndex % 2 !== 0) ? "mcq" : "text"; 

    const pastQs = state.history.map(h => h.question);
    
    const userAge = state.profileData ? state.profileData.age : 21;
    let ageConstraint = "";
    if (userAge <= 18) {
        ageConstraint = "- The user is a teenager. DO NOT ask about massive enterprise budgets, complex institutional sponsors, or high-level corporate legal structures. Instead, tailor questions around real-world deployment, grassroots community organizing, user mental-health safety, and app-building.";
    } else {
        ageConstraint = "- The user is an adult. You may ask about advanced funding models, sustainability, legal structures, and deployment scale if appropriate for their level.";
    }

    // Dynamic AI Prompt Control (Template Injection based on level target)
    let scenarioTemplate = "";
    if (targetLevel === "Explorer") {
        scenarioTemplate = "Give a simple scenario testing if they understand the true root cause of the problem they are addressing.";
    } else if (targetLevel === "Learner") {
        scenarioTemplate = "Give a scenario testing their ability to conduct root-cause user research to validate their assumptions.";
    } else if (targetLevel === "Builder") {
        scenarioTemplate = "Give a severe resource constraint scenario (e.g., lost funding, tech hurdles, tight deadline) testing their ability to execute scaling.";
    } else if (targetLevel === "Catalyst") {
        scenarioTemplate = "Give a complex system-level trade-off scenario testing their ability to handle ecosystem stakeholders and unintended consequences.";
    }
    
    const prompt = `You are a warm, conversational human mentor evaluating a user based on their social initiative startup idea.
    
Startup Idea: "${state.idea}"
User Age: ${userAge}
Target Difficulty Level: "${targetLevel}"

AI Scenario Constraint (CRITICAL INSTRUCTION):
-> ${scenarioTemplate}

Tone Guidelines:
- Friendly, empathetic, and highly conversational.
- Speak like a supportive mentor, NOT an examiner. No test jargon.
${ageConstraint}

Previous Questions Asked (DO NOT REPEAT CONCEPTS):
${JSON.stringify(pastQs)}

IMPORTANT RULES:
1. Ask ONLY ONE unique question entirely based on their specific idea and following the "Scenario Constraint".
2. Return ONLY a valid JSON object. Do not wrap in markdown or backticks (no \`\`\`).
3. The "type" MUST be EXACTLY "${targetType}".
4. If "${targetType}" is "text", omit "options".
5. If "${targetType}" is "mcq", provide 3 or 4 "options". Each option MUST have an "id" (A,B,C) and a "scoreLevel" (explorer, learner, builder, catalyst) reflecting what choosing that option implies.

Example Output Format:
{
  "title": "A short 3-word title",
  "question": "The mentor's actual conversational constraint scenario targeting their idea...",
  "type": "${targetType}",
  ${targetType === 'mcq' ? `"options": [
    {"id": "A", "text": "...", "scoreLevel": "learner"},
    {"id": "B", "text": "...", "scoreLevel": "builder"}
  ]` : `// no options needed for text`}
}`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { 
                    temperature: 0.7, 
                    maxOutputTokens: 1200,
                    responseMimeType: "application/json"
                }
            })
        });

        // Handle rate limiting (429)
        if (response.status === 429) {
            state.retryCount++;
            if (state.retryCount >= 3) {
                console.warn("Rate limited 3 times. Skipping to results.");
                alert("API rate limit reached. Let's review your profile with the data we have!");
                showResult();
                return;
            }
            console.warn(`Rate limited (429). Retry ${state.retryCount}/3 in 4s...`);
            state.stepIndex--;
            await new Promise(r => setTimeout(r, 4000));
            return fetchNextQuestion();
        }

        const data = await response.json();
        
        if (!data.candidates || data.candidates.length === 0) {
            if (data.promptFeedback && data.promptFeedback.blockReason) {
                console.warn("Safety blocked:", data.promptFeedback.blockReason);
            }
            throw new Error("No candidates returned from Gemini (Safety/Block)");
        }

        const candidate = data.candidates[0];
        let rawResponse = candidate.content?.parts?.[0]?.text || "";
        console.log(`AI Raw Output (Finish Reason: ${candidate.finishReason}):`, rawResponse);
        
        // Sometimes the model cuts off mid-generation (MAX_TOKENS or safety)
        if (candidate.finishReason !== 'STOP' && !rawResponse.endsWith('}')) {
            state.retryCount++;
            if (state.retryCount >= 3) {
                console.warn("Too many incomplete generations. Skipping to results.");
                showResult();
                return;
            }
            console.warn(`Incomplete generation. Retry ${state.retryCount}/3...`);
            state.stepIndex--; 
            return fetchNextQuestion(); 
        }

        // Robust JSON extraction
        const firstBrace = rawResponse.indexOf('{');
        const lastBrace  = rawResponse.lastIndexOf('}');
        
        if (firstBrace === -1 || lastBrace === -1) {
            state.retryCount++;
            if (state.retryCount >= 3) {
                console.warn("No JSON found after 3 tries. Skipping to results.");
                showResult();
                return;
            }
            console.warn(`No JSON object found. Retry ${state.retryCount}/3...`);
            state.stepIndex--;
            return fetchNextQuestion();
        }
        
        let jsonStr = rawResponse.substring(firstBrace, lastBrace + 1);
        
        state.currentQuestionData = JSON.parse(jsonStr);
        state.retryCount = 0; // Reset on success
        renderGeneratedQuestion(state.currentQuestionData);
        
    } catch (err) {
        console.error("Gemini Error:", err);
        // Fallback: If it completely fails, move to results so they don't get permanently stuck
        alert("AI stumbled generating the next scenario. Let's look at your profile so far!");
        showResult();
    }
}

// Determine next difficulty level to target based on current score
function determineTargetLevel() {
    if (state.stepIndex === 0) return "Explorer";
    
    // Pick highest score level
    let maxLvl = 'explorer';
    let maxScore = -1;
    ['explorer','learner','builder','catalyst'].forEach(lv => {
        if (state.scores[lv] > maxScore) { maxScore = state.scores[lv]; maxLvl = lv; }
    });
    
    // If they are acing builder/learner, push them harder
    if (maxLvl === 'learner' && state.scores.learner > 3) return 'Builder';
    if (maxLvl === 'builder' && state.scores.builder > 3) return 'Catalyst';
    
    return maxLvl.charAt(0).toUpperCase() + maxLvl.slice(1);
}

// Dynamic Early Exit Protocol & Failure Detection (Hackathon Safe)
function shouldExit() {
    const s = state.scores;
    const count = state.stepIndex - 1; // questions already answered
    
    // Early exit based on pure static responses
    if (count >= 2 && s.explorer >= 4 && s.builder === 0 && s.catalyst === 0) return "Explorer";
    
    // Failure Detection (Shallow Answers check):
    // If they hit the AI round, but immediately give another shallow answer, trap them and exit.
    if (count >= STATIC_QUESTIONS.length + 1) { // They faced at least 1 AI text question
        const latestPerformance = state.path[state.path.length-1];
        if (latestPerformance === "explorer" && s.builder < 4) {
            console.warn("Failure detection triggered: User provided shallow AI answers after low static baseline.");
            return "Learner"; // Exit to prevent them spinning their wheels
        }
    }

    if (count >= 3 && s.learner >= 5 && s.catalyst === 0) return "Learner";
    if (count >= 4 && s.builder >= 6) return "Builder";
    if (count >= 4 && s.catalyst >= 6) return "Catalyst";
    
    return null; // Don't exit yet
}


// ============================================================
// RENDER DYNAMIC QUESTION
// ============================================================
function renderGeneratedQuestion(q) {
    qStep.textContent = `Step ${state.stepIndex} of ~5`;
    qTitle.textContent = q.title || "Next Scenario";
    qText.textContent = q.question;
    layerBadge.textContent = determineTargetLevel() + ' Phase';
    
    backBtn.style.display = 'none'; // Forward-only in AI mode

    qOptions.innerHTML = '';
    qOptions.classList.add('hidden');
    qChips.classList.add('hidden');
    qRanking.classList.add('hidden');
    qTextArea.classList.add('hidden');
    disableNext();

    if (q.type === 'mcq' && q.options) {
        qOptions.classList.remove('hidden');
        q.options.forEach(opt => {
            const div = document.createElement('div');
            div.className = 'option-card';
            div.innerHTML = `<span class="opt-key">${opt.id}</span><span class="opt-text">${opt.text}</span>`;
            div.addEventListener('click', () => {
                document.querySelectorAll('#q-options .option-card').forEach(c => c.classList.remove('selected'));
                div.classList.add('selected');
                gsap.fromTo(div, { scale: 0.98 }, { scale: 1, duration: 0.2, ease: 'back.out(2)' });
                
                enableNext(() => {
                    handleAnswerSubmission(opt.text, opt.scoreLevel);
                });
            });
            qOptions.appendChild(div);
        });
    } else {
        // Text type
        qTextArea.classList.remove('hidden');
        qTextareaEl.value = '';
        qTextareaEl.placeholder = 'How would you handle this...?';
        
        const updateTextBtn = () => {
            if (qTextareaEl.value.trim().length >= 10) {
                enableNext(() => handleAnswerSubmission(qTextareaEl.value.trim(), null));
            } else { disableNext(); }
        };
        qTextareaEl.removeEventListener('input', qTextareaEl._handler); // prevent duplicates
        qTextareaEl._handler = updateTextBtn;
        qTextareaEl.addEventListener('input', updateTextBtn);
        updateTextBtn();
    }

    // Progress bar visual
    const pct = Math.min(100, Math.round((state.stepIndex / 5) * 100));
    progressEl.style.width = pct + '%';

    // Transition visually from loading/prev to this q
    switchScreen(document.querySelector('.ob-screen.active'), screenQuestion);
}


// ============================================================
// LOCAL EVALUATION
// ============================================================
function handleAnswerSubmission(answerText, predefinedScoreLevel) {
    let earnedLevel = predefinedScoreLevel;
    
    if (!earnedLevel) {
        // Free Text: Evaluate locally using Keywords
        const lower = answerText.toLowerCase();
        const counts = { explorer: 0, learner: 0, builder: 0, catalyst: 0 };
        
        Object.entries(KEYWORDS).forEach(([lvl, words]) => {
            words.forEach(w => { if (lower.includes(w)) counts[lvl]++; });
        });
        
        const maxHits = Math.max(...Object.values(counts));
        if (maxHits > 0) {
            // Pick highest scoring level
            earnedLevel = Object.keys(counts).find(k => counts[k] === maxHits);
        } else {
            earnedLevel = 'explorer'; // fallback for brief basic answers
        }
    } else {
        // Cleanup Gemini's casing
        earnedLevel = earnedLevel.toLowerCase();
        if (!['explorer','learner','builder','catalyst'].includes(earnedLevel)) earnedLevel = 'learner';
    }

    // Apply Confidence Weighting (Preventing gaming the system)
    let applyPenalty = false;
    // Condition: If they claimed "Nothing yet" on Execution (Static 2) which sets Explorer on path[1]
    // But then suddenly claim they are a Catalyst building scalable models.
    if (state.path.length >= 2) {
        if (state.path[1] === 'explorer' && earnedLevel === 'catalyst') {
            applyPenalty = true;
        }
    }

    if (applyPenalty) {
        state.scores['explorer'] -= 1; // Tax the fake score
        state.scores[earnedLevel] += 1; // Suppressed boost
        console.log("Consistency Penalty Applied: Score suppressed to prevent system gaming.");
    } else {
        state.scores[earnedLevel] += 2; // Normal
    }
    
    // Save trajectory Path
    state.path.push(earnedLevel);
    
    // Save to history
    state.history.push({
        question: state.currentQuestionData.question,
        targetDifficulty: determineTargetLevel(),
        userAnswer: answerText,
        inferredLevel: earnedLevel
    });
    
    state.answers[`Q${state.stepIndex}`] = answerText;

    if (state.stepIndex < STATIC_QUESTIONS.length) {
        // Instant static transition without loading orb
        switchScreen(screenQuestion, screenQuestion);
        setTimeout(() => { fetchNextQuestion(); }, 250); // wait for fade out
    } else {
        // AI generation requires loading orb
        switchScreen(screenQuestion, screenLoading);
        fetchNextQuestion();
    }
}


// ============================================================
// CLASSIFICATION & RESULT
// ============================================================
function getClassification() {
    const s = state.scores;
    const max = Math.max(s.explorer, s.learner, s.builder, s.catalyst);
    if (s.catalyst === max)  return 'Catalyst';
    if (s.builder  === max)  return 'Builder';
    if (s.learner  === max)  return 'Learner';
    return 'Explorer';
}

function showResult() {
    const level    = getClassification();

    const completionMeta = {
        Explorer:  { icon: '✅', title: 'Profile Complete', tagline: 'Your learning journey starts now.', desc: 'Your workspace is ready. The platform has calibrated your simulation environment based on your idea.' },
        Learner: { icon: '✅', title: 'Profile Complete', tagline: 'Your simulation is ready.', desc: 'Based on your idea, your workspace has been personalized. You will encounter stakeholder challenges and resource trade-offs.' },
        Builder: { icon: '✅', title: 'Profile Complete', tagline: 'Your environment is calibrated.', desc: 'The platform has profiled your decision-making style. Your simulations will reflect real-world operational tensions.' },
        Catalyst: { icon: '✅', title: 'Profile Complete', tagline: 'High-complexity mode activated.', desc: 'Your profile reflects a systemic mindset. Your simulations will involve interconnected challenges with no easy resolution.' }
    };

    const meta = completionMeta[level];
    document.getElementById('result-icon').textContent         = meta.icon;
    document.getElementById('result-level').textContent        = meta.title;
    document.getElementById('result-level').className          = 'result-level-name';
    document.getElementById('result-tagline').textContent      = meta.tagline;
    document.getElementById('result-desc').textContent         = meta.desc;

    document.getElementById('score-bars').innerHTML            = '';
    document.getElementById('result-path').style.display       = 'none';

    progressEl.style.width = '100%';
    layerBadge.classList.remove('visible');
    switchScreen(document.querySelector('.ob-screen.active'), screenResult);

    setTimeout(() => {
        gsap.fromTo('#result-icon', { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(2)' });
    }, 400);
}

// ============================================================
// ENTER WORKSPACE & FIREBASE SAVE
// ============================================================
let nextCallback = null;
function enableNext(cb) { nextCallback = cb; nextBtn.classList.remove('disabled'); }
function disableNext() { nextCallback = null; nextBtn.classList.add('disabled'); }

nextBtn.addEventListener('click', () => {
    if (nextBtn.classList.contains('disabled')) { shakeBtn(nextBtn); return; }
    if (nextCallback) nextCallback();
});

enterBtn.addEventListener('click', async () => {
    if (!currentUser) return;

    enterBtn.disabled    = true;
    enterBtn.textContent = 'Saving...';

    const level      = getClassification();
    const s = state.scores;
    const totalScore = [s.explorer, s.learner, s.builder, s.catalyst].reduce((a, b) => a + b, 0);

    // Provide detailed explanation to Judges
    const reasonCard = document.getElementById('result-explanation');
    const reasonPoints = document.getElementById('explain-points');
    const reasonLevelName = document.getElementById('explain-level-name');
    
    reasonLevelName.textContent = `a ${level}`;
    reasonCard.style.display = 'block';
    
    let htmlReasons = "";
    if (level === 'Explorer') {
        htmlReasons += "<li>You showed a strong passion for solving the problem.</li>";
        htmlReasons += "<li>Your execution experience is still in the early stages.</li>";
        htmlReasons += "<li>You require foundational focus on user needs before scaling.</li>";
        if (state.path.includes('explorer')) htmlReasons += "<li>You gave self-reported signals matching a grassroots visionary.</li>";
    } else if (level === 'Learner') {
        htmlReasons += "<li>You demonstrated an understanding of localized, structured impact.</li>";
        htmlReasons += "<li>You handled qualitative constraints better than basic generalities.</li>";
        htmlReasons += "<li>You showed massive potential, but still need to solidify systematic planning.</li>";
    } else if (level === 'Builder') {
        htmlReasons += "<li>You showed real execution thinking and product focus.</li>";
        if (state.path.includes('builder')) htmlReasons += "<li>You handled the constraints optimally.</li>";
        htmlReasons += "<li>You consistently chose practical scalability over pure passion.</li>";
    } else if (level === 'Catalyst') {
        htmlReasons += "<li>You handled complex system-level trade-offs flawlessly.</li>";
        htmlReasons += "<li>You possess scaled system experience and focus on long-term shifts.</li>";
        htmlReasons += "<li>The system validated your high self-reported skills during the AI stress test.</li>";
    }

    reasonPoints.innerHTML = htmlReasons;

    const emailKey   = currentUser.email; 
    
    const wsTitle = state.idea.substring(0, 30) + "..."; // Use idea as title roughly

    try {
        // Save Global Profile (merge: true so we don't overwrite if they just logged in without doing the profile screen)
        const profilePayload = {
            email: currentUser.email,
            uid: currentUser.uid,
            photoURL: currentUser.photoURL || '',
            lastLoginAt: serverTimestamp()
        };
        
        // If they just filled out the demographics screen, include it. 
        // Otherwise try to keep their existing name or Google name.
        if (state.profileData) {
            profilePayload.name = state.profileData.name;
            profilePayload.age = state.profileData.age;
            profilePayload.gender = state.profileData.gender;
        } else if (!state.hasProfile) {
            profilePayload.name = currentUser.displayName || '';
        }

        await setDoc(doc(db, 'users', emailKey), { profile: profilePayload }, { merge: true });

        // Save Assessment completely contained inside the Workspace!
        const wsRef = await addDoc(
            collection(db, 'users', emailKey, 'workspaces'),
            {
                title: wsTitle,
                // The localized assessment data:
                level: level,
                score: totalScore,
                scores: state.scores,
                idea: state.idea,
                history: state.history,
                answers: state.answers,
                assessmentVersion: 'v4-ai-per-workspace',
                // Metadata:
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            }
        );

        if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'ONBOARDING_COMPLETE',
                level,
                score: totalScore,
                scores: state.scores,
                workspaceTitle: wsTitle,
                workspaceId: wsRef.id
            }, '*');
        } else {
            window.location.href = 'index.html';
        }
    } catch (err) {
        console.error('Save error:', err);
        enterBtn.textContent = 'Error — try again';
        enterBtn.disabled    = false;
    }
});
