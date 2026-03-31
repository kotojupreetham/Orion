/**
 * ═══════════════════════════════════════════════════════════════
 *  ORION — Onboarding / Assessment Engine
 *  onboarding.js
 *
 *  Architecture:
 *  - Firebase Auth + Firestore data layer (unchanged)
 *  - Gemini AI adaptive question engine (unchanged)
 *  - GSAP cinematic transition system (rewritten)
 *    · One question on screen at a time
 *    · Selected option: compress scale(0.95)
 *    · Current slide: slides UP + fades out (power3.in)
 *    · Next slide: rises from BELOW (power4.out)
 *    · Hairline progress bar: GSAP-driven width over 1s
 *    · Final result: typography reveal scale(0.8→1) expo.out 2s
 * ═══════════════════════════════════════════════════════════════
 */

import { auth, db, aiApiKey } from "../config/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    doc, getDoc, setDoc, updateDoc,
    collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ══════════════════════════════════════════════════════════════
// GEMINI CONFIG
// ══════════════════════════════════════════════════════════════
const GEMINI_API_KEY = aiApiKey || "AIzaSyDR-v7ncbMDKPgzDnrIiAoAKTs3LDS2v9c";
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_ENDPOINT_BASE = `https://generativelanguage.googleapis.com/v1beta2/models/${GEMINI_MODEL}`;

// ══════════════════════════════════════════════════════════════
// APP STATE
// ══════════════════════════════════════════════════════════════
let currentUser = null;
const state = {
    idea:                "",
    currentQuestionData: null,
    stepIndex:           0,
    maxSteps:            5,
    history:             [],   // { question, generatedType, userAnswer, evalScore }
    answers:             {},
    scores:              { explorer: 0, learner: 0, builder: 0, catalyst: 0 },
    hasProfile:          false,
    profileData:         null, // { name, age, gender }
    path:                [],
    retryCount:          0,
    currentScreen:       null, // tracks active screen element
};

// ══════════════════════════════════════════════════════════════
// AUTH LISTENER
// ══════════════════════════════════════════════════════════════
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        try {
            const snap = await getDoc(doc(db, "users", user.email));
            if (snap.exists() && snap.data().profile?.age) {
                state.hasProfile   = true;
                state.profileData  = snap.data().profile;
            }
        } catch (e) { console.error("Profile fetch error:", e); }
    }
});

// ══════════════════════════════════════════════════════════════
// KEYWORD DICTIONARIES (local text evaluation)
// ══════════════════════════════════════════════════════════════
const KEYWORDS = {
    explorer: ["help","give","fix it","solve the problem","didn't work","bad","failed","lazy","charity","free stuff","happy","helped people","positive","ignore","push forward","they'll adapt"],
    learner:  ["cause","underlying reason","deeper","community","culture","consult","awareness","trust","impact","metrics","survey","KPI","beneficiary","explain","meet them","show data"],
    builder:  ["root cause","sustainable","system","change behavior","program design","feedback","implementation","local economy","co-design","SROI","theory of change","ESG","unit economics","retrain","reskill","negotiate"],
    catalyst: ["structural","policy","systemic","interdependent","zoning","ecosystem","regenerative","causal","incentive structure","public narrative","leverage","co-create","co-design","transition roles","stakeholder"],
};

// ══════════════════════════════════════════════════════════════
// STATIC QUESTIONS (pre-filter)
// ══════════════════════════════════════════════════════════════
const STATIC_QUESTIONS = [
    {
        title:    "Strategy Focus",
        question: "What is the primary focus of your initiative?",
        type:     "mcq",
        options:  [
            { id: "A", text: "General awareness and offering basic community support",              scoreLevel: "explorer"  },
            { id: "B", text: "Providing direct help to individuals through localised programs",     scoreLevel: "learner"   },
            { id: "C", text: "Developing a scalable app or digital product to connect users",       scoreLevel: "builder"   },
            { id: "D", text: "Deeply integrating with existing infrastructure to change policy",    scoreLevel: "catalyst"  },
        ],
    },
    {
        title:    "Execution Experience",
        question: "What have you actually built or worked on?",
        type:     "mcq",
        options:  [
            { id: "A", text: "Nothing yet",                                    scoreLevel: "explorer" },
            { id: "B", text: "Small projects or early prototypes",             scoreLevel: "learner"  },
            { id: "C", text: "A working product with real users",              scoreLevel: "builder"  },
            { id: "D", text: "A scaled system with multiple deployments",      scoreLevel: "catalyst" },
        ],
    },
    {
        title:    "Impact Thinking",
        question: "How do you plan to measure the success of your project?",
        type:     "mcq",
        options:  [
            { id: "A", text: "Hearing personal stories and getting positive feedback",     scoreLevel: "explorer" },
            { id: "B", text: "Measuring the number of users or members who join",         scoreLevel: "learner"  },
            { id: "C", text: "Tracking specific Key Performance Indicators (KPIs)",       scoreLevel: "builder"  },
            { id: "D", text: "Conducting long-term structural impact studies",            scoreLevel: "catalyst" },
        ],
    },
    {
        title:    "The Constraint Scenario",
        question: "You have ₹20,000 and 2 weeks to test your idea. What do you do?",
        type:     "mcq",
        options:  [
            { id: "A", text: "Help people directly with the funds",                    scoreLevel: "explorer" },
            { id: "B", text: "Research more and conduct surveys",                      scoreLevel: "learner"  },
            { id: "C", text: "Build a strict MVP and gather user feedback",            scoreLevel: "builder"  },
            { id: "D", text: "Design a scalable model to unlock larger grants",        scoreLevel: "catalyst" },
        ],
    },
];

// ══════════════════════════════════════════════════════════════
// DOM REFERENCES
// ══════════════════════════════════════════════════════════════
const progressEl   = document.getElementById("ob-progress");
const stepLabelEl  = document.getElementById("ob-step-label");
const themeBtn     = document.getElementById("ob-theme-btn");
const themeIcon    = document.getElementById("ob-theme-icon");
const kbdHint      = document.getElementById("ob-kbd-hint");

const screenWelcome  = document.getElementById("screen-welcome");
const screenProfile  = document.getElementById("screen-profile");
const screenIdea     = document.getElementById("screen-idea");
const screenLoading  = document.getElementById("screen-loading");
const screenQuestion = document.getElementById("screen-question");
const screenResult   = document.getElementById("screen-result");

// Profile
const profName         = document.getElementById("prof-name");
const profAge          = document.getElementById("prof-age");
const profGender       = document.getElementById("prof-gender");
const submitProfileBtn = document.getElementById("submit-profile-btn");
const backProfileBtn   = document.getElementById("back-profile-btn");

// Idea
const ideaInput      = document.getElementById("idea-input");
const ideaCharHint   = document.getElementById("idea-char-hint");
const submitIdeaBtn  = document.getElementById("submit-idea-btn");
const backIdeaBtn    = document.getElementById("back-idea-btn");

// Question
const qStep      = document.getElementById("q-step");
const qBranchTag = document.getElementById("q-branch-tag");
const qTitle     = document.getElementById("q-title");
const qText      = document.getElementById("q-text");
const qOptions   = document.getElementById("q-options");
const qChips     = document.getElementById("q-chips");
const qRanking   = document.getElementById("q-ranking");
const qTextArea  = document.getElementById("q-text-area");
const qTextareaEl= document.getElementById("q-textarea");
const backBtn    = document.getElementById("back-btn");
const nextBtn    = document.getElementById("next-btn");

// Result
const enterBtn   = document.getElementById("enter-btn");

// ══════════════════════════════════════════════════════════════
// ─────────────────── GSAP ANIMATION CORE ─────────────────────
// ══════════════════════════════════════════════════════════════

/**
 * slideTransition(fromEl, toEl, direction)
 * direction: 'forward' | 'back'
 *
 * OUT: current question slides UP + fades  (power3.in)
 * IN:  next question rises FROM BELOW      (power4.out)
 */
function slideTransition(fromEl, toEl, direction = "forward", onMidpoint = null) {
    const outY = direction === "forward" ? -50 : 50;
    const inY  = direction === "forward" ?  50 : -50;

    const tl = gsap.timeline();

    // ── PHASE 1: Slide current OUT ──────────────────────────────
    if (fromEl && !fromEl.classList.contains("hidden")) {
        tl.to(fromEl, {
            y:        outY,
            opacity:  0,
            duration: 0.38,
            ease:     "power3.in",
        });

        tl.call(() => {
            fromEl.classList.add("hidden");
            fromEl.style.transform = "";
            fromEl.style.opacity   = "";
            onMidpoint && onMidpoint();
        });
    } else {
        onMidpoint && onMidpoint();
    }

    // ── PHASE 2: Slide next IN (slight delay so they don't overlap) ─
    tl.call(() => {
        toEl.classList.remove("hidden");
        gsap.set(toEl, { y: inY, opacity: 0 });
    });

    tl.to(toEl, {
        y:        0,
        opacity:  1,
        duration: 0.55,
        ease:     "power4.out",
    }, "+=0.04"); // 40ms gap

    // Stagger inner children if any are marked
    tl.fromTo(
        toEl.querySelectorAll(".option-card, .chip-item, .ranking-item, .ob-cta-btn, .ob-ghost-btn"),
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.35, ease: "power3.out", stagger: 0.06 },
        "-=0.3"
    );

    return tl;
}

/**
 * animateProgressBar(pct)  — GSAP drives width over 1s
 */
function animateProgressBar(pct) {
    gsap.to(progressEl, {
        width:    pct + "%",
        duration: 1.0,
        ease:     "expo.out",
    });
}

/**
 * selectOptionAnimation(el)
 * Brief compress on click before advancing.
 */
function selectOptionAnimation(el) {
    return new Promise((resolve) => {
        gsap.timeline({ onComplete: resolve })
            .to(el, { scale: 0.95, duration: 0.10, ease: "power2.in"  })
            .to(el, { scale: 1.00, duration: 0.25, ease: "back.out(2)" });
    });
}

/**
 * shakeEl(el) — validation feedback
 */
function shakeEl(el) {
    gsap.to(el, { x: -7, duration: 0.06, yoyo: true, repeat: 5, ease: "none",
                  onComplete: () => gsap.set(el, { x: 0 }) });
}

/**
 * revealResult() — the "proud" typographic level reveal
 * Scale 0.8 → 1 over 2s, expo.out
 */
function revealResult() {
    const icon  = document.getElementById("result-icon");
    const level = document.getElementById("result-level");
    const tag   = document.getElementById("result-tagline");
    const bars  = document.getElementById("score-bars");
    const desc  = document.getElementById("result-desc");

    const tl = gsap.timeline();

    // Eyebrow
    tl.fromTo("#result-eyebrow",
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.5, ease: "expo.out" }
    );

    // Icon pop
    tl.fromTo(icon,
        { scale: 0.4, opacity: 0 },
        { scale: 1,   opacity: 1, duration: 0.7, ease: "back.out(2.2)" },
        "-=0.1"
    );

    // ──── THE HERO: level name scale 0.8 → 1, 2s, expo.out ────
    tl.fromTo(level,
        { scale: 0.8, opacity: 0, y: 20 },
        { scale: 1,   opacity: 1, y: 0, duration: 2.0, ease: "expo.out" },
        "-=0.2"
    );

    // Tagline
    tl.fromTo(tag,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.6, ease: "expo.out" },
        "-=1.4"
    );

    // Score bars — animate widths with elastic easing
    tl.call(() => {
        document.querySelectorAll(".score-bar").forEach((bar) => {
            const target = parseFloat(bar.dataset.target || 0);
            gsap.fromTo(bar,
                { width: "0%" },
                { width: target + "%", duration: 1.1, ease: "expo.out", delay: parseFloat(bar.dataset.delay || 0) }
            );
        });
    }, null, "-=0.8");

    // Desc card
    tl.fromTo(desc,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.6, ease: "expo.out" },
        "-=0.4"
    );

    // Enter button
    tl.fromTo(enterBtn,
        { opacity: 0, y: 10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(1.4)" },
        "-=0.3"
    );
}

// ── Track current screen ────────────────────────────────────
state.currentScreen = screenWelcome;

// ══════════════════════════════════════════════════════════════
// THEME TOGGLE
// ══════════════════════════════════════════════════════════════
themeBtn.addEventListener("click", () => {
    const root  = document.documentElement;
    const next  = root.getAttribute("data-theme") === "dark" ? "light" : "dark";

    gsap.timeline()
        .to("body", { opacity: 0.6, scale: 0.97, duration: 0.15, ease: "power3.in" })
        .call(() => {
            root.setAttribute("data-theme", next);
            localStorage.setItem("orion-theme", next);
            themeIcon.textContent = next === "dark" ? "☽" : "☀";
            // Propagate to parent if in iframe
            try { window.parent.document.documentElement.setAttribute("data-theme", next); } catch(_) {}
        })
        .to("body", { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(1.5)" });
});

// ══════════════════════════════════════════════════════════════
// BOOT SEQUENCE — welcome screen entrance
// ══════════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
    gsap.set(screenWelcome, { opacity: 0, y: 30 });
    gsap.to(screenWelcome, {
        opacity:  1,
        y:        0,
        duration: 0.9,
        ease:     "expo.out",
        delay:    0.1,
    });
    gsap.fromTo(".ob-level-chips .ob-chip",
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.5, ease: "expo.out", stagger: 0.08, delay: 0.5 }
    );
    gsap.fromTo(".ob-cta-btn",
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1,   duration: 0.5, ease: "back.out(1.4)", delay: 0.4 }
    );
});

// Keyboard hint helper
function showKbdHint(show) {
    kbdHint.classList.toggle("visible", show);
}

// ══════════════════════════════════════════════════════════════
// HELPER: enable / disable next
// ══════════════════════════════════════════════════════════════
let nextCallback = null;
function enableNext(cb) {
    nextCallback = cb;
    nextBtn.disabled = false;
    nextBtn.classList.remove("disabled");
    showKbdHint(true);
}
function disableNext() {
    nextCallback = null;
    nextBtn.disabled = true;
    nextBtn.classList.add("disabled");
    showKbdHint(false);
}

// Forward Enter key to next btn
document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        const focused = document.activeElement;
        // Don't intercept inside textareas
        if (focused && focused.tagName === "TEXTAREA") return;
        if (nextCallback && !nextBtn.classList.contains("disabled")) {
            nextCallback();
        }
    }
});

// ══════════════════════════════════════════════════════════════
// FLOW: WELCOME → PROFILE / IDEA
// ══════════════════════════════════════════════════════════════
document.getElementById("start-btn").addEventListener("click", async (e) => {
    await selectOptionAnimation(e.currentTarget);
    const next = state.hasProfile ? screenIdea : screenProfile;
    if (!state.hasProfile && currentUser?.displayName) profName.value = currentUser.displayName;
    slideTransition(state.currentScreen, next);
    state.currentScreen = next;
    stepLabelEl.textContent = "";
});

// ──── Profile screen ────────────────────────────────────────
function checkProfile() {
    const ok = profName.value.trim() !== "" && profAge.value !== "" && profGender.value !== "";
    submitProfileBtn.disabled = !ok;
    submitProfileBtn.classList.toggle("disabled", !ok);
}
profName.addEventListener("input",  checkProfile);
profAge.addEventListener("input",   checkProfile);
profGender.addEventListener("change", checkProfile);

submitProfileBtn.addEventListener("click", async () => {
    if (submitProfileBtn.classList.contains("disabled")) { shakeEl(submitProfileBtn); return; }
    state.profileData = {
        name:   profName.value.trim(),
        age:    parseInt(profAge.value, 10),
        gender: profGender.value,
    };
    slideTransition(state.currentScreen, screenIdea);
    state.currentScreen = screenIdea;
});

backProfileBtn.addEventListener("click", () => {
    slideTransition(state.currentScreen, screenWelcome, "back");
    state.currentScreen = screenWelcome;
});

// ──── Idea screen ────────────────────────────────────────────
ideaInput.addEventListener("input", () => {
    const len = ideaInput.value.trim().length;
    ideaCharHint.textContent = len < 20 ? `${20 - len} characters remaining` : "✓ Ready";
    const ok = len >= 10;
    submitIdeaBtn.disabled = !ok;
    submitIdeaBtn.classList.toggle("disabled", !ok);
});

submitIdeaBtn.addEventListener("click", async () => {
    if (submitIdeaBtn.classList.contains("disabled")) { shakeEl(submitIdeaBtn); return; }

    state.idea = ideaInput.value.trim();

    // Set dynamic limit by age
    const age = state.profileData?.age ?? 25;
    if (age <= 16)      state.maxSteps = 5;
    else if (age <= 20) state.maxSteps = 6;
    else                state.maxSteps = 7;

    slideTransition(state.currentScreen, screenLoading);
    state.currentScreen = screenLoading;
    animateProgressBar(15);

    await fetchNextQuestion();
});

backIdeaBtn.addEventListener("click", () => {
    const prev = state.hasProfile ? screenWelcome : screenProfile;
    slideTransition(state.currentScreen, prev, "back");
    state.currentScreen = prev;
});

// ══════════════════════════════════════════════════════════════
// GEMINI INTELLIGENCE ENGINE (unchanged logic, new transitions)
// ══════════════════════════════════════════════════════════════
async function fetchNextQuestion() {
    const targetLevel = determineTargetLevel();

    // Early exit after static phase
    if (state.stepIndex === STATIC_QUESTIONS.length) {
        if (state.scores.explorer >= 6 && state.scores.catalyst === 0 && state.scores.builder <= 2) {
            showResult();
            return;
        }
    }

    if (state.stepIndex >= state.maxSteps) { showResult(); return; }

    // ── STATIC PHASE ───────────────────────────────────────────
    if (state.stepIndex < STATIC_QUESTIONS.length) {
        state.currentQuestionData = STATIC_QUESTIONS[state.stepIndex];
        state.stepIndex++;
        renderGeneratedQuestion(state.currentQuestionData);
        return;
    }

    // ── DYNAMIC AI PHASE ───────────────────────────────────────
    if (state.currentScreen !== screenLoading) {
        slideTransition(state.currentScreen, screenLoading);
        state.currentScreen = screenLoading;
    }

    state.stepIndex++;
    const targetType = state.stepIndex % 2 !== 0 ? "mcq" : "text";
    const pastQs     = state.history.map((h) => h.question);
    const userAge    = state.profileData?.age ?? 21;

    const ageConstraint = userAge <= 18
        ? "- The user is a teenager. Focus on grassroots, app-building, community organising, and user safety."
        : "- The user is an adult. You may include advanced funding models, legal structures, and large-scale deployment.";

    const scenarioTemplates = {
        Explorer: "Give a simple scenario testing if they understand the true root cause of the problem they are addressing.",
        Learner:  "Give a scenario testing their ability to conduct root-cause user research to validate their assumptions.",
        Builder:  "Give a severe resource constraint scenario testing their ability to execute scaling.",
        Catalyst: "Give a complex system-level trade-off scenario testing their ability to handle ecosystem stakeholders.",
    };

    const prompt = `You are a warm, conversational human mentor evaluating a user's social initiative startup.

Startup Idea: "${state.idea}"
User Age: ${userAge}
Target Difficulty Level: "${targetLevel}"

AI Scenario Constraint:
-> ${scenarioTemplates[targetLevel] || scenarioTemplates.Explorer}

Tone: Friendly, empathetic, conversational — like a supportive mentor, not an examiner.
${ageConstraint}

Previous Questions (DO NOT REPEAT CONCEPTS):
${JSON.stringify(pastQs)}

RULES:
1. Ask ONLY ONE unique question entirely based on their specific idea.
2. Return ONLY a valid JSON object. No markdown, no backticks.
3. The "type" MUST be exactly "${targetType}".
4. If "text", omit "options".
5. If "mcq", provide 3–4 options, each with "id", "text", and "scoreLevel" (explorer|learner|builder|catalyst).

JSON format:
{
  "title": "Short 3-word title",
  "question": "Conversational scenario question...",
  "type": "${targetType}"${targetType === "mcq" ? `,\n  "options": [{"id":"A","text":"...","scoreLevel":"learner"},{"id":"B","text":"...","scoreLevel":"builder"}]` : ""}
}`;

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
                generationConfig: { temperature: 0.7, maxOutputTokens: 1200, responseMimeType: "application/json" },
            }),
        });

        if (!response.ok) {
            console.warn("Onboarding Gemini generateContent failed, retrying generateText", response.status);
            response = await fetch(textUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": GEMINI_API_KEY,
                },
                body: JSON.stringify({
                    prompt: { text: prompt },
                    temperature: 0.7,
                    maxOutputTokens: 1200,
                    responseMimeType: "application/json",
                }),
            });
        }

        if (response.status === 429) {
            state.retryCount++;
            if (state.retryCount >= 3) { showResult(); return; }
            state.stepIndex--;
            await new Promise((r) => setTimeout(r, 4000));
            return fetchNextQuestion();
        }

        const data = await response.json();
        if (!data.candidates?.length) throw new Error("No candidates from Gemini");

        const candidate = data.candidates[0];
        let rawText     = candidate.content?.parts?.[0]?.text || "";

        if (candidate.finishReason !== "STOP" && !rawText.endsWith("}")) {
            state.retryCount++;
            if (state.retryCount >= 3) { showResult(); return; }
            state.stepIndex--;
            return fetchNextQuestion();
        }

        const s = rawText.indexOf("{");
        const e = rawText.lastIndexOf("}");
        if (s === -1 || e === -1) {
            state.retryCount++;
            if (state.retryCount >= 3) { showResult(); return; }
            state.stepIndex--;
            return fetchNextQuestion();
        }

        state.currentQuestionData = JSON.parse(rawText.substring(s, e + 1));
        state.retryCount = 0;
        renderGeneratedQuestion(state.currentQuestionData);

    } catch (err) {
        console.error("Gemini Error:", err);
        showResult();
    }
}

function determineTargetLevel() {
    if (state.stepIndex === 0) return "Explorer";
    let maxLvl = "explorer", maxScore = -1;
    ["explorer","learner","builder","catalyst"].forEach((lv) => {
        if (state.scores[lv] > maxScore) { maxScore = state.scores[lv]; maxLvl = lv; }
    });
    if (maxLvl === "learner"  && state.scores.learner  > 3) return "Builder";
    if (maxLvl === "builder"  && state.scores.builder  > 3) return "Catalyst";
    return maxLvl.charAt(0).toUpperCase() + maxLvl.slice(1);
}

// ══════════════════════════════════════════════════════════════
// RENDER QUESTION — with full slide transition
// ══════════════════════════════════════════════════════════════
function renderGeneratedQuestion(q) {
    // ── Populate DOM ──────────────────────────────────────────
    const totalSteps = Math.max(state.maxSteps, STATIC_QUESTIONS.length);
    qStep.textContent           = `Step ${state.stepIndex} of ~${totalSteps}`;
    stepLabelEl.textContent     = `${state.stepIndex} / ${totalSteps}`;
    qTitle.textContent          = q.title  || "Next Scenario";
    qText.textContent           = q.question;
    backBtn.style.display       = "none";   // forward-only in AI flow
    qBranchTag.classList.add("hidden");

    qOptions.innerHTML  = "";
    qOptions.classList.add("hidden");
    qChips.classList.add("hidden");
    qRanking.classList.add("hidden");
    qTextArea.classList.add("hidden");
    disableNext();

    if (q.type === "mcq" && q.options) {
        qOptions.classList.remove("hidden");
        q.options.forEach((opt) => {
            const card = document.createElement("div");
            card.className   = "option-card";
            card.role        = "option";
            card.ariaSelected = "false";
            card.innerHTML   = `<span class="opt-key">${opt.id}</span><span class="opt-text">${opt.text}</span>`;

            card.addEventListener("click", async () => {
                // Compress the clicked card first
                await selectOptionAnimation(card);

                // Deselect others, mark this one
                document.querySelectorAll("#q-options .option-card").forEach((c) => {
                    c.classList.remove("selected");
                    c.ariaSelected = "false";
                });
                card.classList.add("selected");
                card.ariaSelected = "true";

                enableNext(() => handleAnswerSubmission(opt.text, opt.scoreLevel));
            });

            qOptions.appendChild(card);
        });
    } else {
        // Text type
        qTextArea.classList.remove("hidden");
        qTextareaEl.value       = "";
        qTextareaEl.placeholder = "How would you handle this…?";

        const updateTextBtn = () => {
            if (qTextareaEl.value.trim().length >= 10) {
                enableNext(() => handleAnswerSubmission(qTextareaEl.value.trim(), null));
            } else {
                disableNext();
            }
        };
        qTextareaEl.removeEventListener("input", qTextareaEl._handler);
        qTextareaEl._handler = updateTextBtn;
        qTextareaEl.addEventListener("input", updateTextBtn);
    }

    // ── Progress bar ──────────────────────────────────────────
    const pct = Math.min(95, Math.round((state.stepIndex / totalSteps) * 90) + 5);
    animateProgressBar(pct);

    // ── Slide transition FROM current screen TO question screen ─
    const fromEl = state.currentScreen;
    const toEl   = screenQuestion;

    if (fromEl === toEl) {
        // Same screen (Q→Q): subtle re-entrance
        gsap.fromTo(screenQuestion,
            { opacity: 0.3, y: 20 },
            { opacity: 1,   y: 0, duration: 0.45, ease: "power4.out" }
        );
        gsap.fromTo(
            "#q-options .option-card, #q-text-area",
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, stagger: 0.06, duration: 0.3, ease: "power3.out", delay: 0.15 }
        );
    } else if (fromEl === screenLoading) {
        // Loading screen → question: kill any running entrance tween on the loader
        // and immediately hide it so it never overlaps the question screen.
        gsap.killTweensOf(fromEl);
        fromEl.classList.add("hidden");
        gsap.set(fromEl, { clearProps: "all" });
        state.currentScreen = toEl;

        // Animate the question screen in from scratch
        toEl.classList.remove("hidden");
        gsap.fromTo(toEl,
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.55, ease: "power4.out" }
        );
        gsap.fromTo(
            "#q-options .option-card, #q-text-area",
            { opacity: 0, y: 12 },
            { opacity: 1, y: 0, stagger: 0.07, duration: 0.35, ease: "power3.out", delay: 0.2 }
        );
    } else {
        slideTransition(fromEl, toEl, "forward");
        state.currentScreen = toEl;
    }
}

// ══════════════════════════════════════════════════════════════
// ANSWER SUBMISSION + LOCAL EVALUATION
// ══════════════════════════════════════════════════════════════
function handleAnswerSubmission(answerText, predefinedScoreLevel) {
    let earnedLevel = predefinedScoreLevel;

    if (!earnedLevel) {
        const lower  = answerText.toLowerCase();
        const counts = { explorer: 0, learner: 0, builder: 0, catalyst: 0 };
        Object.entries(KEYWORDS).forEach(([lv, words]) => {
            words.forEach((w) => { if (lower.includes(w)) counts[lv]++; });
        });
        const maxHits = Math.max(...Object.values(counts));
        earnedLevel   = maxHits > 0
            ? Object.keys(counts).find((k) => counts[k] === maxHits)
            : "explorer";
    } else {
        earnedLevel = earnedLevel.toLowerCase();
        if (!["explorer","learner","builder","catalyst"].includes(earnedLevel)) earnedLevel = "learner";
    }

    // Consistency penalty
    let applyPenalty = false;
    if (state.path.length >= 2 && state.path[1] === "explorer" && earnedLevel === "catalyst") {
        applyPenalty = true;
    }

    if (applyPenalty) {
        state.scores["explorer"] -= 1;
        state.scores[earnedLevel] += 1;
    } else {
        state.scores[earnedLevel] += 2;
    }

    state.path.push(earnedLevel);
    state.history.push({
        question:         state.currentQuestionData.question,
        targetDifficulty: determineTargetLevel(),
        userAnswer:       answerText,
        inferredLevel:    earnedLevel,
    });
    state.answers[`Q${state.stepIndex}`] = answerText;

    if (state.stepIndex < STATIC_QUESTIONS.length) {
        // Static-to-static: update dom then slide
        setTimeout(() => { fetchNextQuestion(); }, 80);
    } else {
        // AI phase: show loading screen
        slideTransition(state.currentScreen, screenLoading, "forward");
        state.currentScreen = screenLoading;
        fetchNextQuestion();
    }
}

// ══════════════════════════════════════════════════════════════
// CLASSIFICATION
// ══════════════════════════════════════════════════════════════
function getClassification() {
    const s   = state.scores;
    const max = Math.max(s.explorer, s.learner, s.builder, s.catalyst);
    if (s.catalyst === max) return "Catalyst";
    if (s.builder  === max) return "Builder";
    if (s.learner  === max) return "Learner";
    return "Explorer";
}

// ══════════════════════════════════════════════════════════════
// SHOW RESULT — cinematic typographic reveal
// ══════════════════════════════════════════════════════════════
function showResult() {
    const level = getClassification();

    const meta = {
        Explorer: { icon: "🌱", tagline: "Your learning journey starts now.",      desc: "Your workspace is ready. The platform has calibrated your simulation environment based on your idea."                                              },
        Learner:  { icon: "📖", tagline: "Your simulation is ready.",              desc: "Based on your idea, your workspace has been personalised. You will encounter stakeholder challenges and resource trade-offs."                    },
        Builder:  { icon: "⚙️",  tagline: "Your environment is calibrated.",        desc: "The platform has profiled your decision-making style. Your simulations will reflect real-world operational tensions."                         },
        Catalyst: { icon: "🚀", tagline: "High-complexity mode activated.",        desc: "Your profile reflects a systemic mindset. Your simulations will involve interconnected challenges with no easy resolution."                    },
    }[level];

    // Populate DOM before revealing
    const levelEl   = document.getElementById("result-level");
    const taglineEl = document.getElementById("result-tagline");
    const iconEl    = document.getElementById("result-icon");
    const descEl    = document.getElementById("result-desc");
    const eyebrow   = document.getElementById("result-eyebrow");

    iconEl.textContent      = meta.icon;
    levelEl.textContent     = level;
    levelEl.className       = `ob-result-level ${level.toLowerCase()}`;
    taglineEl.textContent   = meta.tagline;
    descEl.textContent      = meta.desc;
    eyebrow && (eyebrow.textContent = "Your Orion Profile");

    // Build score bars
    const scoreBarsEl = document.getElementById("score-bars");
    scoreBarsEl.innerHTML   = "";
    const total = Object.values(state.scores).reduce((a,b) => a + Math.max(b, 0), 0) || 1;
    const LEVELS = ["Explorer","Learner","Builder","Catalyst"];
    LEVELS.forEach((lv, i) => {
        const raw = Math.max(state.scores[lv.toLowerCase()], 0);
        const pct = Math.round((raw / total) * 100);
        const isActive = lv === level;
        scoreBarsEl.innerHTML += `
          <div class="score-row" role="listitem">
            <span class="score-label ${isActive ? "active" : ""}">${lv}</span>
            <div class="score-track">
              <div class="score-bar ${lv.toLowerCase()}"
                   data-target="${pct}"
                   data-delay="${i * 0.12}"></div>
            </div>
            <span class="score-val">${pct}%</span>
          </div>`;
    });

    // Progress bar to 100%
    animateProgressBar(100);

    // Slide to result
    slideTransition(state.currentScreen, screenResult, "forward", () => {
        state.currentScreen = screenResult;
    });
    state.currentScreen = screenResult;
    stepLabelEl.textContent = "";

    // Trigger the big cinematic reveal after slide finishes
    setTimeout(revealResult, 480);
}

// ══════════════════════════════════════════════════════════════
// NEXT BUTTON
// ══════════════════════════════════════════════════════════════
nextBtn.addEventListener("click", () => {
    if (nextBtn.classList.contains("disabled")) { shakeEl(nextBtn); return; }
    if (nextCallback) nextCallback();
});

// ══════════════════════════════════════════════════════════════
// ENTER WORKSPACE + FIREBASE SAVE
// ══════════════════════════════════════════════════════════════
enterBtn.addEventListener("click", async () => {
    // Not authenticated (e.g. local preview) — just redirect
    if (!currentUser) {
        window.location.href = "index.html";
        return;
    }

    enterBtn.disabled     = true;
    enterBtn.textContent  = "Saving…";
    gsap.to(enterBtn, { opacity: 0.6, duration: 0.2 });

    const level      = getClassification();
    const s          = state.scores;
    const totalScore = [s.explorer, s.learner, s.builder, s.catalyst].reduce((a,b) => a + b, 0);
    const wsTitle    = state.idea.substring(0, 60) + (state.idea.length > 60 ? "…" : "");

    // Build reasoning card
    const reasonCard    = document.getElementById("result-explanation");
    const reasonPoints  = document.getElementById("explain-points");
    const explainName   = document.getElementById("explain-level-name");
    const REASONS = {
        Explorer: ["You showed strong passion for solving the problem.","Your execution experience is still in the early stages.","You require foundational focus on user needs before scaling."],
        Learner:  ["You demonstrated an understanding of localised, structured impact.","You handled qualitative constraints better than basic generalities.","You showed massive potential, but still need to solidify systematic planning."],
        Builder:  ["You showed real execution thinking and product focus.","You consistently chose practical scalability over pure passion.","You handled resource constraints optimally."],
        Catalyst: ["You handled complex system-level trade-offs flawlessly.","You possess scaled system experience and focus on long-term shifts.","The system validated your high self-reported skills during the AI stress test."],
    };
    explainName.textContent    = `a ${level}`;
    reasonPoints.innerHTML     = REASONS[level].map((r) => `<li>${r}</li>`).join("");
    reasonCard.classList.remove("hidden");
    gsap.fromTo(reasonCard,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.5, ease: "expo.out", delay: 0.1 }
    );

    const emailKey = currentUser.email;

    try {
        const profilePayload = {
            email:       currentUser.email,
            uid:         currentUser.uid,
            photoURL:    currentUser.photoURL || "",
            lastLoginAt: serverTimestamp(),
        };
        if (state.profileData) {
            profilePayload.name   = state.profileData.name;
            profilePayload.age    = state.profileData.age;
            profilePayload.gender = state.profileData.gender;
        } else if (!state.hasProfile) {
            profilePayload.name = currentUser.displayName || "";
        }

        await setDoc(doc(db, "users", emailKey), { profile: profilePayload }, { merge: true });

        const wsRef = await addDoc(
            collection(db, "users", emailKey, "workspaces"),
            {
                title:             wsTitle,
                level,
                score:             totalScore,
                scores:            state.scores,
                idea:              state.idea,
                history:           state.history,
                answers:           state.answers,
                assessmentVersion: "v5-cinematic",
                createdAt:         serverTimestamp(),
                updatedAt:         serverTimestamp(),
            }
        );

        // Tell the parent window we're done
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type:           "ONBOARDING_COMPLETE",
                level,
                score:          totalScore,
                scores:         state.scores,
                workspaceTitle: wsTitle,
                workspaceId:    wsRef.id,
            }, "*");
        } else {
            window.location.href = "index.html";
        }

    } catch (err) {
        console.error("Save error:", err);
        enterBtn.textContent = "Error — try again";
        enterBtn.disabled    = false;
        gsap.to(enterBtn, { opacity: 1, duration: 0.2 });
        shakeEl(enterBtn);
    }
});
