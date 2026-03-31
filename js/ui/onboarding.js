/**
 * ORION — Onboarding: Level assessment flow (inline SPA)
 */
import { State } from "../state.js";
import { OrionAnim } from "../gsap-animations.js";
import { generateOnboardingQuestion } from "../ai.js";
import { saveOnboardingResult } from "../db.js";
import { LEVELS } from "../config.js";

const STATIC_QUESTIONS = [
    { title: "Strategy Focus", question: "What is the primary focus of your initiative?", type: "mcq", options: [
        { id: "A", text: "General awareness and offering basic community support", scoreLevel: "explorer" },
        { id: "B", text: "Providing direct help to individuals through localised programs", scoreLevel: "learner" },
        { id: "C", text: "Developing a scalable app or digital product to connect users", scoreLevel: "builder" },
        { id: "D", text: "Deeply integrating with existing infrastructure to change policy", scoreLevel: "catalyst" },
    ]},
    { title: "Execution Experience", question: "What have you actually built or worked on?", type: "mcq", options: [
        { id: "A", text: "Nothing yet", scoreLevel: "explorer" },
        { id: "B", text: "Small projects or early prototypes", scoreLevel: "learner" },
        { id: "C", text: "A working product with real users", scoreLevel: "builder" },
        { id: "D", text: "A scaled system with multiple deployments", scoreLevel: "catalyst" },
    ]},
    { title: "Impact Thinking", question: "How do you plan to measure the success of your project?", type: "mcq", options: [
        { id: "A", text: "Hearing personal stories and getting positive feedback", scoreLevel: "explorer" },
        { id: "B", text: "Measuring the number of users or members who join", scoreLevel: "learner" },
        { id: "C", text: "Tracking specific Key Performance Indicators (KPIs)", scoreLevel: "builder" },
        { id: "D", text: "Conducting long-term structural impact studies", scoreLevel: "catalyst" },
    ]},
    { title: "The Constraint Scenario", question: "You have ₹20,000 and 2 weeks to test your idea. What do you do?", type: "mcq", options: [
        { id: "A", text: "Help people directly with the funds", scoreLevel: "explorer" },
        { id: "B", text: "Research more and conduct surveys", scoreLevel: "learner" },
        { id: "C", text: "Build a strict MVP and gather user feedback", scoreLevel: "builder" },
        { id: "D", text: "Design a scalable model to unlock larger grants", scoreLevel: "catalyst" },
    ]},
];

const KEYWORDS = {
    explorer: ["help","give","fix it","solve","charity","free stuff","happy","helped people","positive","ignore"],
    learner: ["cause","deeper","community","consult","awareness","trust","impact","metrics","survey","KPI"],
    builder: ["root cause","sustainable","system","feedback","implementation","co-design","SROI","unit economics"],
    catalyst: ["structural","policy","systemic","ecosystem","regenerative","causal","incentive","co-create","stakeholder"],
};

let obState = null;
let currentScreen = null;

export function initOnboarding() {
    obState = State.get("onboarding");
}

export function startOnboarding(hasProfile, profileData) {
    obState = {
        idea: "", stepIndex: 0, maxSteps: 5,
        scores: { explorer: 0, learner: 0, builder: 0, catalyst: 0 },
        history: [], answers: {}, path: [], currentQuestionData: null,
        hasProfile: !!hasProfile, profileData: profileData || null, retryCount: 0,
    };
    State.set("onboarding", obState);

    const overlay = document.getElementById("onboarding-overlay");
    if (overlay) overlay.classList.remove("hidden");

    currentScreen = document.getElementById("ob-screen-welcome");
    document.querySelectorAll(".ob-screen").forEach(s => s.classList.add("hidden"));
    if (currentScreen) currentScreen.classList.remove("hidden");

    // Boot animation
    gsap.fromTo(currentScreen, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.9, ease: "expo.out", delay: 0.1 });
    gsap.fromTo(".ob-level-chips .ob-chip", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: "expo.out", stagger: 0.08, delay: 0.5 });

    bindOnboardingEvents();
}

function bindOnboardingEvents() {
    // Start btn
    document.getElementById("ob-start-btn")?.addEventListener("click", async (e) => {
        await OrionAnim.selectOptionAnimation(e.currentTarget);
        const next = obState.hasProfile ? document.getElementById("ob-screen-idea") : document.getElementById("ob-screen-profile");
        OrionAnim.slideTransition(currentScreen, next);
        currentScreen = next;
    });

    // Profile
    const profName = document.getElementById("prof-name");
    const profAge = document.getElementById("prof-age");
    const profGender = document.getElementById("prof-gender");
    const submitProf = document.getElementById("submit-profile-btn");

    [profName, profAge, profGender].forEach(el => el?.addEventListener("input", () => {
        const ok = profName?.value?.trim() && profAge?.value && profGender?.value;
        if (submitProf) { submitProf.disabled = !ok; submitProf.classList.toggle("disabled", !ok); }
    }));

    submitProf?.addEventListener("click", () => {
        obState.profileData = { name: profName?.value?.trim(), age: parseInt(profAge?.value, 10), gender: profGender?.value };
        const next = document.getElementById("ob-screen-idea");
        OrionAnim.slideTransition(currentScreen, next);
        currentScreen = next;
    });

    // Idea
    const ideaInput = document.getElementById("ob-idea-input");
    const ideaHint = document.getElementById("ob-idea-char-hint");
    const submitIdea = document.getElementById("ob-submit-idea-btn");

    ideaInput?.addEventListener("input", () => {
        const len = ideaInput.value.trim().length;
        if (ideaHint) ideaHint.textContent = len < 20 ? `${20 - len} chars remaining` : "✓ Ready";
        if (submitIdea) { submitIdea.disabled = len < 10; submitIdea.classList.toggle("disabled", len < 10); }
    });

    submitIdea?.addEventListener("click", async () => {
        obState.idea = ideaInput.value.trim();
        const age = obState.profileData?.age ?? 25;
        obState.maxSteps = age <= 16 ? 5 : age <= 20 ? 6 : 7;
        const loading = document.getElementById("ob-screen-loading");
        OrionAnim.slideTransition(currentScreen, loading);
        currentScreen = loading;
        OrionAnim.animateProgressBar(document.getElementById("ob-progress"), 15);
        await fetchNextQuestion();
    });

    // Next / Back buttons
    document.getElementById("ob-next-btn")?.addEventListener("click", () => {
        if (obState._nextCallback) obState._nextCallback();
    });

    // Enter key
    document.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey && document.activeElement?.tagName !== "TEXTAREA") {
            if (obState?._nextCallback) obState._nextCallback();
        }
    });

    // Enter workspace button
    document.getElementById("ob-enter-btn")?.addEventListener("click", async () => {
        const user = State.get("user");
        if (user?.email) {
            await saveOnboardingResult(user.email, getWinnerLevel(), obState.scores, obState.profileData, obState.idea);
        }
        State.set("userLevel", getWinnerLevel());
        const overlay = document.getElementById("onboarding-overlay");
        if (overlay) {
            gsap.to(overlay, { opacity: 0, duration: 0.4, onComplete: () => overlay.classList.add("hidden") });
        }
        State.emit("onboarding:complete", { level: getWinnerLevel(), idea: obState.idea });
    });
}

async function fetchNextQuestion() {
    if (obState.stepIndex >= obState.maxSteps) { showResult(); return; }

    if (obState.stepIndex < STATIC_QUESTIONS.length) {
        obState.currentQuestionData = STATIC_QUESTIONS[obState.stepIndex];
        obState.stepIndex++;
        renderQuestion(obState.currentQuestionData);
        return;
    }

    // AI phase
    obState.stepIndex++;
    const targetType = obState.stepIndex % 2 !== 0 ? "mcq" : "text";
    const pastQs = obState.history.map(h => h.question);
    const targetLevel = determineTargetLevel();

    const q = await generateOnboardingQuestion(obState.idea, targetLevel, pastQs, obState.profileData?.age ?? 21, targetType);
    if (!q) { showResult(); return; }

    obState.currentQuestionData = q;
    renderQuestion(q);
}

function renderQuestion(q) {
    const totalSteps = Math.max(obState.maxSteps, STATIC_QUESTIONS.length);
    const qScreen = document.getElementById("ob-screen-question");
    const stepEl = document.getElementById("ob-q-step");
    const titleEl = document.getElementById("ob-q-title");
    const textEl = document.getElementById("ob-q-text");
    const optionsEl = document.getElementById("ob-q-options");
    const textAreaWrap = document.getElementById("ob-q-text-area");
    const textareaEl = document.getElementById("ob-q-textarea");

    if (stepEl) stepEl.textContent = `Step ${obState.stepIndex} of ~${totalSteps}`;
    if (titleEl) titleEl.textContent = q.title || "Next Scenario";
    if (textEl) textEl.textContent = q.question;

    optionsEl.innerHTML = "";
    optionsEl.classList.add("hidden");
    textAreaWrap?.classList.add("hidden");
    obState._nextCallback = null;

    const pct = Math.min(95, Math.round((obState.stepIndex / totalSteps) * 90) + 5);
    OrionAnim.animateProgressBar(document.getElementById("ob-progress"), pct);

    if (q.type === "mcq" && q.options) {
        optionsEl.classList.remove("hidden");
        q.options.forEach(opt => {
            const card = document.createElement("div");
            card.className = "option-card";
            card.innerHTML = `<span class="opt-key">${opt.id}</span><span class="opt-text">${opt.text}</span>`;
            card.addEventListener("click", async () => {
                await OrionAnim.selectOptionAnimation(card);
                optionsEl.querySelectorAll(".option-card").forEach(c => c.classList.remove("selected"));
                card.classList.add("selected");
                obState._nextCallback = () => handleAnswer(opt.text, opt.scoreLevel);
                // Auto-advance for MCQ
                handleAnswer(opt.text, opt.scoreLevel);
            });
            optionsEl.appendChild(card);
        });
    } else {
        textAreaWrap?.classList.remove("hidden");
        if (textareaEl) textareaEl.value = "";
        textareaEl?.addEventListener("input", () => {
            if (textareaEl.value.trim().length >= 10) {
                obState._nextCallback = () => handleAnswer(textareaEl.value.trim(), null);
            } else {
                obState._nextCallback = null;
            }
        });
    }

    // Transition
    if (currentScreen === qScreen) {
        gsap.fromTo(qScreen, { opacity: 0.3, y: 20 }, { opacity: 1, y: 0, duration: 0.45, ease: "power4.out" });
    } else {
        OrionAnim.slideTransition(currentScreen, qScreen);
        currentScreen = qScreen;
    }
}

function handleAnswer(text, scoreLevel) {
    let level = scoreLevel?.toLowerCase();
    if (!level) {
        const lower = text.toLowerCase();
        const counts = { explorer: 0, learner: 0, builder: 0, catalyst: 0 };
        Object.entries(KEYWORDS).forEach(([lv, words]) => words.forEach(w => { if (lower.includes(w)) counts[lv]++; }));
        const max = Math.max(...Object.values(counts));
        level = max > 0 ? Object.keys(counts).find(k => counts[k] === max) : "explorer";
    }

    obState.scores[level] += 2;
    obState.path.push(level);
    obState.history.push({ question: obState.currentQuestionData.question, userAnswer: text, inferredLevel: level });
    obState.answers[`Q${obState.stepIndex}`] = text;

    if (obState.stepIndex < STATIC_QUESTIONS.length) {
        setTimeout(() => fetchNextQuestion(), 80);
    } else {
        const loading = document.getElementById("ob-screen-loading");
        OrionAnim.slideTransition(currentScreen, loading);
        currentScreen = loading;
        fetchNextQuestion();
    }
}

function getWinnerLevel() {
    let max = -1, winner = "explorer";
    Object.entries(obState.scores).forEach(([k, v]) => { if (v > max) { max = v; winner = k; } });
    return winner;
}

function determineTargetLevel() {
    if (obState.stepIndex === 0) return "Explorer";
    let maxLvl = "explorer", maxScore = -1;
    Object.entries(obState.scores).forEach(([lv, s]) => { if (s > maxScore) { maxScore = s; maxLvl = lv; } });
    if (maxLvl === "learner" && obState.scores.learner > 3) return "Builder";
    if (maxLvl === "builder" && obState.scores.builder > 3) return "Catalyst";
    return maxLvl.charAt(0).toUpperCase() + maxLvl.slice(1);
}

function showResult() {
    OrionAnim.animateProgressBar(document.getElementById("ob-progress"), 100);
    const winner = getWinnerLevel();
    const lv = LEVELS[winner];
    const resultScreen = document.getElementById("ob-screen-result");

    document.getElementById("result-icon").textContent = lv.emoji;
    const levelEl = document.getElementById("result-level");
    levelEl.textContent = lv.name;
    levelEl.className = `ob-result-level ${winner}`;
    document.getElementById("result-tagline").textContent = lv.description;
    document.getElementById("result-desc").textContent = lv.description;

    // Score bars
    const barsContainer = document.getElementById("ob-score-bars");
    const total = Object.values(obState.scores).reduce((a, b) => a + b, 1);
    barsContainer.innerHTML = Object.entries(obState.scores).map(([k, v], i) => {
        const pct = Math.round((v / total) * 100);
        return `<div class="score-row">
            <span class="score-label ${k === winner ? 'active' : ''}">${k}</span>
            <div class="score-track"><div class="score-bar ${k}" data-target="${pct}" data-delay="${i * 0.15}"></div></div>
            <span class="score-val">${pct}%</span>
        </div>`;
    }).join("");

    OrionAnim.slideTransition(currentScreen, resultScreen);
    currentScreen = resultScreen;

    setTimeout(() => {
        OrionAnim.revealResult({
            iconEl: document.getElementById("result-icon"),
            levelEl: document.getElementById("result-level"),
            taglineEl: document.getElementById("result-tagline"),
            barsEl: barsContainer,
            descEl: document.getElementById("result-desc"),
            enterBtn: document.getElementById("ob-enter-btn"),
        });
    }, 600);
}
