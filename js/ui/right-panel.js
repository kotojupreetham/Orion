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
}
