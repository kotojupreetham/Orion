
/**
 * ORION — Simulation Engine (inline, not separate page)
 */
import { State } from "../state.js";
import { generateScenario, resolveChoice, generateNegotiation } from "../ai.js";
import { OrionAnim } from "../gsap-animations.js";
import { STAKEHOLDERS } from "../config.js";
import { saveSimulationState } from "../db.js";

let simState = null;

export function initSimulation() {
    // Tab switching
    document.getElementById("sim-view")?.addEventListener("click", (e) => {
        const tab = e.target.closest(".sim-tab");
        if (!tab) return;
        document.querySelectorAll(".sim-tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".sim-panel").forEach(p => p.classList.remove("active"));
        tab.classList.add("active");
        const panel = document.getElementById(tab.dataset.panel);
        if (panel) panel.classList.add("active");
    });

    // Back button
    document.getElementById("sim-back-btn")?.addEventListener("click", () => State.emit("simulation:exit"));
}

export async function startSimulation(ws) {
    simState = {
        idea: ws.idea,
        level: ws.level,
        metrics: { funds: 100, trust: 50, impact: 0, sustainability: 50 },
        decisions: [],
        scenarioIndex: 0,
        stakeholders: {},
        resources: { marketing: 30, operations: 30, research: 20, community: 20 },
        impactLog: [],
    };
    State.set("simulation", simState);
    updateMetricPills();
    updateLiveMetrics();
    renderStakeholders();
    initResourceSliders();
    await loadNextScenario();
}

async function loadNextScenario() {
    const decisionPanel = document.getElementById("panel-decisions");
    if (!decisionPanel) return;

    if (simState.scenarioIndex >= 5) {
        decisionPanel.innerHTML = `<div class="sim-empty-state complete"><p>✅ All scenarios completed!</p><p class="sub">Review your impact log to see how your decisions shaped the outcome.</p></div>`;
        return;
    }

    decisionPanel.innerHTML = `<div class="decision-badge">⏳ Generating scenario…</div>`;
    const scenario = await generateScenario(simState.idea, simState.level, simState.decisions, simState.metrics);
    if (!scenario) return;

    simState.currentScenario = scenario;
    renderScenario(scenario, decisionPanel);
}

function renderScenario(scenario, container) {
    container.innerHTML = `
        <div class="decision-badge">🎯 Decision ${simState.scenarioIndex + 1} of 5</div>
        <div class="scenario-wrapper">
            <div class="scenario-context">${scenario.context}</div>
            <div class="scenario-question">${scenario.question}</div>
            <div class="scenario-choices" id="scenario-choices">
                ${scenario.choices.map(c => `
                    <div class="scenario-choice" data-id="${c.id}">
                        <span class="choice-key">${c.id}</span>
                        <span>${c.text}</span>
                    </div>`).join("")}
            </div>
        </div>`;

    // Animate in
    gsap.fromTo(container.querySelectorAll(".scenario-choice"), { y: 12, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.4, ease: "expo.out" });

    container.querySelectorAll(".scenario-choice").forEach(el => {
        el.addEventListener("click", async () => {
            const choiceId = el.dataset.id;
            const choice = scenario.choices.find(c => c.id === choiceId);
            if (!choice) return;

            // Select animation
            await OrionAnim.selectOptionAnimation(el);
            el.classList.add("selected");

            // Apply effects
            Object.entries(choice.effects || {}).forEach(([key, val]) => {
                simState.metrics[key] = Math.max(0, Math.min(100, (simState.metrics[key] || 0) + val));
            });

            // Log
            const newLog = { 
                text: `Decision: ${choice.text}`, 
                type: choice.effects.impact > 0 ? "positive" : choice.effects.impact < 0 ? "negative" : "neutral", 
                time: new Date().toLocaleTimeString() 
            };
            simState.decisions.push({ scenario: scenario.question, choice: choice.text, effects: choice.effects });
            simState.impactLog.push(newLog);
            simState.scenarioIndex++;

            updateMetricPills();
            updateLiveMetrics();
            updateImpactLog(newLog);

            // Show outcome
            const outcome = await resolveChoice(scenario, choice, simState.idea);
            showOutcome(outcome, container);

            // Save
            const wsId = State.get("currentWorkspaceId");
            if (wsId) saveSimulationState(wsId, simState);
        });
    });
}

function showOutcome(outcome, container) {
    const choicesEl = container.querySelector(".scenario-choices");
    if (choicesEl) choicesEl.innerHTML = "";

    const el = document.createElement("div");
    el.className = "scenario-outcome";
    el.innerHTML = `
        <div class="outcome-header">
            <span class="outcome-icon">${outcome.icon || "⚖️"}</span>
            <span class="outcome-verdict">${outcome.verdict}</span>
        </div>
        <div class="outcome-text">${outcome.narrative}</div>
        <div class="outcome-effects">
            ${outcome.lesson ? `<span class="effect-tag positive">💡 ${outcome.lesson}</span>` : ""}
        </div>
        <button class="sim-btn" id="next-scenario-btn">Next Scenario →</button>`;

    container.appendChild(el);
    gsap.fromTo(el, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "expo.out" });

    el.querySelector("#next-scenario-btn")?.addEventListener("click", () => loadNextScenario());
}

function updateMetricPills() {
    ["funds", "trust", "impact", "sustainability"].forEach(key => {
        const valEl = document.getElementById(`mp-${key}-val`);
        const pillEl = document.getElementById(`mp-${key}`);
        if (valEl) valEl.textContent = simState.metrics[key];
        if (pillEl) {
            pillEl.classList.remove("danger", "warning", "good");
            const v = simState.metrics[key];
            if (v <= 20) pillEl.classList.add("danger");
            else if (v <= 40) pillEl.classList.add("warning");
            else if (v >= 70) pillEl.classList.add("good");
            OrionAnim.flashMetricPill(pillEl);
        }
    });
}

function updateLiveMetrics() {
    ["funds", "trust", "impact", "sustainability"].forEach(key => {
        const fill = document.getElementById(`lm-${key}-fill`);
        const val = document.getElementById(`lm-${key}-val`);
        if (fill) OrionAnim.animateLiveBar(fill, val, simState.metrics[key], "%");
    });
    // Compass Animation
    const dot = document.getElementById("compass-dot");
    if (dot) {
        gsap.to(dot, {
            left: simState.metrics.sustainability + "%",
            top: (100 - simState.metrics.trust) + "%",
            duration: 1.2,
            ease: "elastic.out(1, 0.7)"
        });
    }
}

function updateImpactLog(newEntry = null) {
    const list = document.getElementById("impact-log-list");
    const count = document.getElementById("log-count");
    if (!list) return;
    if (count) count.textContent = simState.impactLog.length;

    const emptyMsg = list.querySelector(".log-empty-msg");
    if (emptyMsg) emptyMsg.remove();

    if (newEntry) {
        // Premium feed animation: insert at top and spring down
        const li = document.createElement("li");
        li.className = "log-entry";
        li.innerHTML = `
            <span class="log-dot ${newEntry.type}"></span>
            <span class="log-text">${newEntry.text}</span>
            <span class="log-time">${newEntry.time}</span>`;
        list.prepend(li);
        gsap.fromTo(li, { height: 0, opacity: 0, x: 20 }, { height: "auto", opacity: 1, x: 0, duration: 0.6, ease: "back.out(1.4)" });
    } else {
        // Initial load
        list.innerHTML = simState.impactLog.map(e => `
            <li class="log-entry">
                <span class="log-dot ${e.type}"></span>
                <span class="log-text">${e.text}</span>
                <span class="log-time">${e.time}</span>
            </li>`).reverse().join("");
    }
}

function renderStakeholders() {
    const grid = document.getElementById("stakeholder-grid");
    if (!grid) return;
    grid.innerHTML = STAKEHOLDERS.map(s => `
        <div class="stakeholder-card ${simState.stakeholders[s.id] ? 'completed' : ''}" data-id="${s.id}">
            <div class="sh-avatar">${s.emoji}</div>
            <div class="sh-name">${s.name}</div>
            <div class="sh-role">${s.role}</div>
            ${simState.stakeholders[s.id] ? '<div class="sh-status">✓ Negotiated</div>' : ''}
        </div>`).join("");

    grid.querySelectorAll(".stakeholder-card:not(.completed)").forEach(el => {
        el.addEventListener("click", async () => {
            const sh = STAKEHOLDERS.find(s => s.id === el.dataset.id);
            if (!sh) return;
            const neg = await generateNegotiation(sh, simState.idea, simState.metrics);
            if (neg) showNegotiation(sh, neg);
        });
    });
}

function showNegotiation(stakeholder, neg) {
    const panel = document.getElementById("panel-stakeholders");
    if (!panel) return;
    panel.innerHTML = `
        <div class="negotiation-view">
            <div class="negotiation-header">
                <span class="nego-avatar">${stakeholder.emoji}</span>
                <div><div class="nego-name">${stakeholder.name}</div><div class="nego-role">${stakeholder.role}</div></div>
            </div>
            <div class="nego-scenario">${neg.scenario}</div>
            <div class="nego-choices">
                ${neg.choices.map(c => `<div class="nego-choice" data-id="${c.id}"><strong>${c.id}.</strong> ${c.text}</div>`).join("")}
            </div>
        </div>`;

    panel.querySelectorAll(".nego-choice").forEach(el => {
        el.addEventListener("click", () => {
            const choice = neg.choices.find(c => c.id === el.dataset.id);
            if (!choice) return;
            Object.entries(choice.effects || {}).forEach(([k, v]) => {
                simState.metrics[k] = Math.max(0, Math.min(100, (simState.metrics[k] || 0) + v));
            });
            simState.stakeholders[stakeholder.id] = true;
            const newLog = { 
                text: `Negotiated with ${stakeholder.name}: ${choice.outcome}`, 
                type: "positive", 
                time: new Date().toLocaleTimeString() 
            };
            simState.impactLog.push(newLog);
            updateMetricPills(); updateLiveMetrics(); updateImpactLog(newLog);
            renderStakeholders();
            // Show result
            panel.innerHTML = `<div class="nego-result-view">
                <div class="nego-result-text">${choice.outcome}</div>
                <button class="sim-btn ghost" onclick="document.querySelector('.sim-tab[data-panel=panel-stakeholders]')?.click()">← Back to Stakeholders</button>
            </div>`;
        });
    });
}

function initResourceSliders() {
    const group = document.getElementById("resource-sliders");
    if (!group) return;
    group.innerHTML = ["marketing", "operations", "research", "community"].map(key => `
        <div class="slider-row">
            <div class="slider-meta"><span class="slider-name">${key.charAt(0).toUpperCase() + key.slice(1)}</span><span class="slider-val" id="sv-${key}">${simState.resources[key]}%</span></div>
            <input type="range" min="0" max="100" value="${simState.resources[key]}" data-key="${key}">
        </div>`).join("");

    group.querySelectorAll("input[type=range]").forEach(slider => {
        slider.addEventListener("input", () => {
            const key = slider.dataset.key;
            simState.resources[key] = parseInt(slider.value);
            const valEl = document.getElementById(`sv-${key}`);
            if (valEl) valEl.textContent = slider.value + "%";
        });
    });
}
