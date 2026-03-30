// js/assessment/onboarding-flow.js
// Entry point for onboarding.html — completely self-contained
import { QUESTIONS, LEVELS } from "./cat-data.js";
import { auth, db } from "../core/firebase-config.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { initMagnetics } from "../animations/magnetic.js";

// ── State ──
const state = {
    current: null,
    path: [],
    answers: {},
    scores: { explorer: 0, learner: 0, builder: 0, catalyst: 0 },
    questionIndex: 0
};

// ── DOM ──
const monolith   = document.getElementById("monolith");
const scrWelcome = document.getElementById("scr-welcome");
const scrQ       = document.getElementById("scr-question");
const scrResult  = document.getElementById("scr-result");

// ── Gyroscope for the monolith card ──
(function initLocalGyro() {
    if (!monolith) return;
    const qx = gsap.quickTo(monolith, "rotateX", { duration: 0.5, ease: "power3" });
    const qy = gsap.quickTo(monolith, "rotateY", { duration: 0.5, ease: "power3" });
    window.addEventListener("mousemove", (e) => {
        const nx = (e.clientX / window.innerWidth) * 2 - 1;
        const ny = (e.clientY / window.innerHeight) * 2 - 1;
        qy(nx * 6);
        qx(ny * -4);
    });
})();

// ── Init magnetics on load ──
initMagnetics(document);

// ── Z-Axis Fly-Through Transition ──
function flyTransition(from, to, onMid) {
    // Current screen blows past camera
    gsap.to(from, {
        opacity: 0, scale: 1.8, z: 500,
        duration: 0.7, ease: "power2.in",
        onComplete: () => {
            from.classList.add("is-hidden");
            gsap.set(from, { clearProps: "all" });

            if (onMid) onMid();

            // Next screen emerges from deep space
            to.classList.remove("is-hidden");
            gsap.fromTo(to,
                { opacity: 0, scale: 0.5, z: -1000 },
                { opacity: 1, scale: 1, z: 0, duration: 1, ease: "back.out(1.4)" }
            );
        }
    });
}

// ── Start Button ──
document.getElementById("start-btn")?.addEventListener("click", () => {
    flyTransition(scrWelcome, scrQ, () => renderQuestion("Q1"));
});

// ── Back Button ──
document.getElementById("back-btn")?.addEventListener("click", () => {
    if (state.path.length <= 1) return;
    state.path.pop();
    const prev = state.path[state.path.length - 1];
    state.questionIndex--;

    // Reverse fly — current goes deep, previous comes from front
    gsap.to(scrQ, {
        opacity: 0, scale: 0.5, z: -1000, duration: 0.5, ease: "power2.in",
        onComplete: () => {
            gsap.set(scrQ, { clearProps: "all" });
            renderQuestion(prev, true);
            gsap.fromTo(scrQ,
                { opacity: 0, scale: 1.5, z: 500 },
                { opacity: 1, scale: 1, z: 0, duration: 0.8, ease: "back.out(1.3)" }
            );
        }
    });
});

// ── Render a Question ──
function renderQuestion(qId, isBack) {
    const q = QUESTIONS[qId];
    if (!q) return;

    state.current = qId;
    if (!isBack) {
        state.path.push(qId);
        state.questionIndex = state.path.length;
    }

    document.getElementById("q-meta").textContent = `NODE ${state.questionIndex} / 6`;
    document.getElementById("q-title").textContent = q.title;
    document.getElementById("q-body").textContent = q.question;

    const optsBox = document.getElementById("q-opts");
    optsBox.innerHTML = "";

    q.options.forEach(opt => {
        const div = document.createElement("div");
        div.className = "opt extrude";
        if (state.answers[qId] === opt.key) div.classList.add("picked");

        div.innerHTML = `<span class="opt-key">${opt.key}</span><span class="opt-text">${opt.text}</span>`;

        div.addEventListener("click", () => {
            // Depress physics
            gsap.to(div, {
                z: -30, duration: 0.15, yoyo: true, repeat: 1,
                onStart: () => {
                    optsBox.querySelectorAll(".opt").forEach(o => o.classList.remove("picked"));
                    div.classList.add("picked");
                }
            });

            // Pulse glow
            gsap.fromTo(div,
                { boxShadow: "0 0 0px rgba(0,229,255,0)" },
                { boxShadow: "0 0 50px rgba(0,229,255,0.6)", duration: 0.3, yoyo: true, repeat: 1 }
            );

            // Score
            applyScores(opt.scores);
            state.answers[qId] = opt.key;

            // Advance after short delay
            setTimeout(() => {
                const next = opt.next;
                if (next) {
                    flyTransition(scrQ, scrQ, () => renderQuestion(next));
                } else {
                    showResult();
                }
            }, 550);
        });

        optsBox.appendChild(div);
    });

    // Option cards stagger in from Z-depth
    gsap.fromTo(".opt",
        { z: -300, opacity: 0, scale: 0.7, rotateX: -20 },
        { z: 0, opacity: 1, scale: 1, rotateX: 0, stagger: 0.08, duration: 0.7, ease: "back.out(1.5)" }
    );

    // Re-init magnetics
    initMagnetics(optsBox);
}

function applyScores(scores) {
    if (!scores) return;
    Object.entries(scores).forEach(([k, v]) => {
        if (state.scores[k] !== undefined) state.scores[k] += v;
    });
}

// ── Result Screen ──
function showResult() {
    flyTransition(scrQ, scrResult, () => {
        const s = state.scores;
        const max = Math.max(s.explorer, s.learner, s.builder, s.catalyst);
        let level = "Explorer";
        if (s.catalyst === max) level = "Catalyst";
        else if (s.builder === max) level = "Builder";
        else if (s.learner === max) level = "Learner";

        const info = LEVELS[level];
        document.getElementById("res-icon").textContent = info.icon;
        document.getElementById("res-title").textContent = level;
        document.getElementById("res-desc").textContent = info.desc;

        // Celebratory pop
        gsap.fromTo("#res-icon",
            { scale: 0, rotateZ: -180 },
            { scale: 1, rotateZ: 0, duration: 1.2, ease: "elastic.out(1, 0.3)" }
        );

        document.getElementById("enter-btn").onclick = async () => {
            // Sink the monolith into the abyss
            gsap.to(monolith, {
                z: -3000, rotateX: 70, opacity: 0,
                duration: 0.9, ease: "power3.in"
            });

            const user = auth.currentUser;
            if (user) {
                const totalScore = Object.values(state.scores).reduce((a, b) => a + b, 0);
                await setDoc(doc(db, "users", user.uid), {
                    level, score: totalScore, answers: state.answers, completedAt: serverTimestamp()
                });
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({ type: "ONBOARDING_COMPLETE", level, score: totalScore }, "*");
                }
            }
        };
    });
}
