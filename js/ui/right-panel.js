<<<<<<< HEAD
// js/ui/right-panel.js
// Standalone — no imports from other app modules

const rpEmpty   = document.getElementById("rp-empty");
const rpContent = document.getElementById("rp-content");
const rpIcon    = document.getElementById("rp-icon");
const rpLevel   = document.getElementById("rp-level");
const rpSub     = document.getElementById("rp-sub");
const rpFill    = document.getElementById("rp-fill");
const rpScore   = document.getElementById("rp-score");
const rpDate    = document.getElementById("rp-date");
const rpMsgs    = document.getElementById("rp-msgs");

const ICONS = { Explorer: "🌱", Learner: "📖", Builder: "🔨", Catalyst: "🚀" };
const SUBS  = { Explorer: "Passion meets Potential", Learner: "Theoretical Bridge", Builder: "Operational Engine", Catalyst: "Systemic Architect" };

export function showRightPanel(data) {
    if (!rpContent) return;
    rpEmpty.style.display = "none";
    rpContent.style.display = "block";

    const level = data.level || "Explorer";
    const score = data.score || 0;

    rpIcon.textContent  = ICONS[level] || "⚡";
    rpLevel.textContent = level;
    rpSub.textContent   = SUBS[level] || "";
    rpFill.style.width  = Math.min((score / 7) * 100, 100) + "%";
    rpScore.textContent = score + " / 7";

    if (data.createdAt && data.createdAt.toDate) {
        rpDate.textContent = data.createdAt.toDate().toLocaleDateString();
    }

    // 3D entrance for right-panel sections
    gsap.fromTo(rpContent.children,
        { z: -400, rotateY: 30, opacity: 0 },
        { z: 0, rotateY: 0, opacity: 1, stagger: 0.08, duration: 0.9, ease: "back.out(1.4)" }
    );
}

export function updateMsgCount(n) {
    if (rpMsgs) rpMsgs.textContent = n + " entries";
=======
/**
 * ORION — Right Panel: workspace details + action triggers
 */
import { State } from "../state.js";
import { LEVELS } from "../config.js";

export function initRightPanel() {
    const analyzeBtn = document.getElementById("rp-analyze-btn");
    const evalBtn = document.getElementById("rp-eval-btn");
    const simBtn = document.getElementById("rp-sim-btn");

    if (analyzeBtn) analyzeBtn.addEventListener("click", () => State.emit("action:analyze"));
    if (evalBtn) evalBtn.addEventListener("click", () => State.emit("action:evaluate"));
    if (simBtn) simBtn.addEventListener("click", () => State.emit("action:simulate"));
}

export function updateRightPanel(ws) {
    const empty = document.querySelector(".right-panel-empty");
    const content = document.querySelector(".right-panel-content");
    if (!ws) {
        if (empty) empty.classList.remove("hidden");
        if (content) content.classList.add("hidden");
        return;
    }
    if (empty) empty.classList.add("hidden");
    if (content) content.classList.remove("hidden");

    const ideaText = document.getElementById("rp-idea-text");
    const levelText = document.getElementById("rp-level-text");
    const msgCount = document.getElementById("rp-msg-count");

    if (ideaText) ideaText.textContent = ws.idea || "—";
    if (levelText) {
        const lv = LEVELS[ws.level] || LEVELS.explorer;
        levelText.textContent = `${lv.emoji} ${lv.name}`;
    }
    if (msgCount) msgCount.textContent = (ws.messages || []).length + " messages";
>>>>>>> 666476a (final)
}
