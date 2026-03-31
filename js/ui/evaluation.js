/**
 * ORION — Evaluation: Viability stress test with AI scorecard
 */
import { State } from "../state.js";
import { evaluateStartup } from "../ai.js";
import { OrionAnim } from "../gsap-animations.js";

export function initEvaluation() {
    const finalizeBtn = document.getElementById("eval-finalize-btn");
    if (finalizeBtn) finalizeBtn.addEventListener("click", runEvaluation);

    // Chip toggle
    document.getElementById("evaluation-view")?.addEventListener("click", (e) => {
        const chip = e.target.closest(".eval-chip-small");
        if (chip) chip.classList.toggle("selected");
        checkEvalReady();
    });

    // Input monitoring
    document.getElementById("evaluation-view")?.addEventListener("input", checkEvalReady);
}

function checkEvalReady() {
    const inputs = document.querySelectorAll("#evaluation-view .eval-input-small");
    const filled = [...inputs].filter(i => i.value.trim().length > 5).length;
    const btn = document.getElementById("eval-finalize-btn");
    if (btn) btn.disabled = filled < 2;
}

async function runEvaluation() {
    const ws = State.get("currentWorkspace");
    if (!ws) return;

    // Collect answers
    const answers = {};
    document.querySelectorAll("#evaluation-view .eval-box").forEach(box => {
        const title = box.querySelector(".eval-box-title")?.textContent?.trim() || "";
        const inputs = box.querySelectorAll(".eval-input-small");
        const chips = [...box.querySelectorAll(".eval-chip-small.selected")].map(c => c.textContent);
        answers[title] = { text: [...inputs].map(i => i.value).join("; "), chips };
    });

    // Show loading
    const evalView = document.getElementById("evaluation-view");
    const loading = document.getElementById("eval-loading");
    const resultsEl = document.getElementById("eval-results");
    if (evalView) evalView.querySelector(".eval-grid")?.classList.add("hidden");
    if (loading) loading.classList.remove("hidden");
    if (resultsEl) resultsEl.classList.add("hidden");

    const result = await evaluateStartup(answers, ws.level, ws.idea);

    if (loading) loading.classList.add("hidden");
    if (resultsEl) {
        resultsEl.classList.remove("hidden");
        renderScorecard(result, resultsEl);
    }
}

function renderScorecard(data, container) {
    let html = `<div class="scorecard-grid">
        <div class="scorecard-summary">
            <h3 style="margin-bottom:8px;">Overall Score: <span class="text-gradient">${data.overall}/100</span></h3>
            <p style="color:var(--text-secondary);font-size:14px;line-height:1.7;">${data.summary}</p>
        </div>`;

    Object.entries(data.metrics || {}).forEach(([name, m]) => {
        html += `<div class="metric-card">
            <div class="metric-header"><span>${name}</span><span style="color:${m.color}">${m.score}%</span></div>
            <div class="metric-bar-bg"><div class="metric-bar-fill" data-target="${m.score}" style="background:${m.color}"></div></div>
        </div>`;
    });

    html += `<div class="scorecard-feedback">${data.feedback || ""}</div></div>`;
    container.innerHTML = html;
    OrionAnim.animateMetricBars();
}

export function showEvaluation() {
    OrionAnim.revealEvalBoxes();
}
