/**
 * ORION — Grid Workspace (Power BI Style)
 * GridStack-based drag & drop container system
 */
import { State } from "../state.js";
import { CONTAINER_DEFS, LEVELS } from "../config.js";
import { OrionAnim } from "../gsap-animations.js";
import { analyzeProject } from "../ai.js";

let grid = null;
let blocks = {};

const LEVEL_ORDER = { explorer: 1, learner: 2, builder: 3, catalyst: 4 };

// Default layout for new workspaces
const DEFAULT_LAYOUT = [
    { type: "problem",  x: 0, y: 0, w: 4, h: 3 },
    { type: "solution", x: 4, y: 0, w: 4, h: 3 },
    { type: "audience", x: 8, y: 0, w: 4, h: 3 },
];

export function initGrid() {
    // Add container button
    document.getElementById("add-container-toggle")?.addEventListener("click", (e) => {
        e.stopPropagation();
        const menu = document.getElementById("add-container-menu");
        if (menu) menu.classList.toggle("open");
    });

    // Close menu on outside click
    document.addEventListener("click", () => {
        document.getElementById("add-container-menu")?.classList.remove("open");
    });

    // Analyze button
    document.getElementById("grid-analyze-btn")?.addEventListener("click", runAnalysis);

    // Simulate button
    document.getElementById("grid-simulate-btn")?.addEventListener("click", () => {
        State.emit("action:simulate");
    });
}

export function showGridWorkspace(ws) {
    const canvas = document.getElementById("grid-canvas");
    if (!canvas) return;

    if (!grid) {
        grid = GridStack.init({
            column: 12,
            cellHeight: 70,
            margin: 12,
            minRow: 4,
            float: true,
            animate: true,
            disableOneColumnMode: true,
            draggable: { handle: ".container-header" },
            resizable: { handles: "e,se,s,sw,w" },
        }, canvas);
    } else {
        grid.removeAll();
    }
    blocks = {};

    // Build the add menu
    buildAddMenu(ws.level || "explorer");

    // Load existing blocks or default
    const layout = ws.gridLayout || DEFAULT_LAYOUT;
    layout.forEach(item => addBlock(item.type, item, ws.gridData?.[item.type]));

    // Save on change
    grid.on("change", () => saveGridState(ws));

    updateGridStatus();
    checkMinRequirements();
}

function buildAddMenu(userLevel) {
    const menu = document.getElementById("add-container-menu");
    if (!menu) return;

    const userLevelNum = LEVEL_ORDER[userLevel] || 1;
    const categories = { core: [], planning: [], growth: [] };

    Object.entries(CONTAINER_DEFS).forEach(([type, def]) => {
        const cat = def.category || "core";
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push({ type, ...def });
    });

    menu.innerHTML = Object.entries(categories).map(([cat, items]) => {
        if (!items.length) return "";
        return `<div class="add-menu-category">${cat}</div>` +
            items.map(item => {
                const disabled = blocks[item.type] ? ' style="opacity:0.35;pointer-events:none"' : '';
                return `<div class="add-menu-item" data-type="${item.type}"${disabled}>
                    <span class="ami-emoji">${item.emoji}</span>
                    <span class="ami-label">${item.label}</span>
                    <span class="ami-level">Lv${LEVEL_ORDER[Object.keys(LEVEL_ORDER).find(l => CONTAINER_DEFS[item.type])] || 1}+</span>
                </div>`;
            }).join("");
    }).join("");

    menu.querySelectorAll(".add-menu-item").forEach(el => {
        el.addEventListener("click", (e) => {
            e.stopPropagation();
            const type = el.dataset.type;
            if (!blocks[type]) {
                addBlock(type, { x: 0, y: 100, w: 4, h: 3 });
                menu.classList.remove("open");
                updateGridStatus();
                checkMinRequirements();
            }
        });
    });
}

function addBlock(type, pos = {}, savedData = {}) {
    const def = CONTAINER_DEFS[type];
    if (!def || blocks[type]) return;

    let innerBody = "";
    if (def.template === "checkbox" && def.options) {
        innerBody = `<div class="checkbox-grid">` + def.options.map((opt, i) => {
            const isChecked = savedData[opt] ? "checked" : "";
            return `<label class="glass-checkbox">
                <input type="checkbox" class="container-input hidden-check" data-type="${type}" data-field="${opt}" ${isChecked}>
                <span class="check-box-display"></span>
                <span class="check-label">${opt}</span>
            </label>`;
        }).join("") + `</div>`;
    } 
    else if (def.template === "slider" && def.sliders) {
        innerBody = `<div class="slider-group">` + def.sliders.map((sl, i) => {
            const val = savedData[sl] || 50;
            return `<div class="slider-row">
                <div class="slider-meta"><span class="slider-name">${sl}</span><span class="slider-val" id="val-${type}-${i}">${val}%</span></div>
                <input type="range" class="container-input custom-slider" min="0" max="100" value="${val}" data-type="${type}" data-field="${sl}">
            </div>`;
        }).join("") + `</div>`;
    }
    else if (def.template === "kpi" && def.kpis) {
        innerBody = `<div class="kpi-grid">` + def.kpis.map((kpi, i) => {
            const val = savedData[kpi] || "";
            return `<div class="kpi-card">
                <div class="kpi-label">${kpi}</div>
                <input type="number" class="container-input kpi-input" data-type="${type}" data-field="${kpi}" value="${val}" placeholder="0">
            </div>`;
        }).join("") + `</div>`;
    }
    else {
        // Default text template
        const titleVal = savedData.title || "";
        const descVal = savedData.description || "";
        innerBody = `
            <div class="container-field">
                <label class="container-field-label">Title</label>
                <input type="text" class="container-input" data-type="${type}" data-field="title" placeholder="Name your ${def.label.toLowerCase()}…" value="${titleVal}">
            </div>
            <div class="container-field">
                <label class="container-field-label">Description</label>
                <textarea class="container-input" data-type="${type}" data-field="description" rows="3" placeholder="Describe in detail…">${descVal}</textarea>
            </div>`;
    }

    const itemHTML = `<div class="grid-stack-item" id="block-${type}">
        <div class="grid-stack-item-content gs-item-content">
            <div class="container-header">
                <div class="container-header-left">
                    <span class="container-emoji">${def.emoji}</span>
                    <span class="container-label">${def.label}</span>
                </div>
                <div class="container-actions">
                    <button class="container-action-btn delete" data-type="${type}" title="Remove">✕</button>
                </div>
            </div>
            <div class="container-body">
                ${innerBody}
            </div>
        </div>
    </div>`;

    let el = null;
    try {
        // Assign smarter default widget sizes based on template type
        const defaultW = def.template === "kpi" ? 5 : def.template === "checkbox" ? 3 : 4;
        const defaultH = def.template === "slider" ? 4 : def.template === "checkbox" ? 4 : def.template === "kpi" ? 2 : 3;

        const widgetOpt = {
            id: type,
            w: pos.w ?? defaultW, 
            h: pos.h ?? defaultH
        };

        // Use precise coordinates if loading from DB, otherwise let GridStack find empty space cleanly!
        if (pos.x !== undefined && pos.y !== undefined) {
            widgetOpt.x = pos.x;
            widgetOpt.y = pos.y;
        } else {
            widgetOpt.autoPosition = true;
        }

        el = grid.addWidget(itemHTML, widgetOpt);
    } catch(err) {
        console.error("GridStack addWidget error:", err);
    }
    
    // GridStack 10 may return the element directly, or an object with an 'el' property
    el = el?.el ? el.el : el;
    
    if (!el) return;
    blocks[type] = true;

    // Premium 3D Tilt interaction
    const contentEl = el.querySelector(".gs-item-content");
    if (contentEl) OrionAnim.applyTilt(contentEl);

    // Animate entrance
    gsap.fromTo(el, { opacity: 0, scale: 0.92, y: 14 }, { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: "back.out(1.4)" });

    // Delete handler
    el.querySelector(".delete")?.addEventListener("click", () => {
        gsap.to(el, { opacity: 0, scale: 0.9, duration: 0.25, ease: "power3.in", onComplete: () => {
            grid.removeWidget(el);
            delete blocks[type];
            updateGridStatus();
            checkMinRequirements();
            buildAddMenu(State.get("userLevel") || "explorer");
        }});
    });

    // Auto-save on input
    el.querySelectorAll(".container-input").forEach(input => {
        input.addEventListener("input", () => {
            // Live update for slider values
            if (input.type === "range") {
                const slValEl = el.querySelector(`#val-${type}-${Array.from(el.querySelectorAll('.custom-slider')).indexOf(input)}`);
                if (slValEl) slValEl.textContent = input.value + "%";
            }
            const ws = State.get("currentWorkspace");
            if (ws) saveGridState(ws);
        });
    });
}

function saveGridState(ws) {
    if (!grid || !ws) return;

    const gridLayout = [];
    const gridData = {};

    grid.getGridItems().forEach(el => {
        const node = el.gridstackNode;
        const type = node?.id;
        if (!type) return;

        gridLayout.push({ type, x: node.x, y: node.y, w: node.w, h: node.h });

        gridData[type] = {};
        el.querySelectorAll(".container-input").forEach(input => {
            const field = input.dataset.field;
            gridData[type][field] = (input.type === "checkbox") ? input.checked : input.value;
        });
    });

    // Debounced save to Firestore
    clearTimeout(saveGridState._timer);
    saveGridState._timer = setTimeout(async () => {
        const { updateDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        const { db } = await import("../db.js");
        const wsId = State.get("currentWorkspaceId");
        if (wsId) {
            try {
                await updateDoc(doc(db, "workspaces", wsId), { gridLayout, gridData });
            } catch (e) { console.warn("[Grid] Save error:", e); }
        }
    }, 1200);
}

function updateGridStatus() {
    const status = document.getElementById("grid-status");
    const count = Object.keys(blocks).length;
    if (status) status.textContent = `${count} container${count !== 1 ? "s" : ""} · Grid`;
}

function checkMinRequirements() {
    const warning = document.getElementById("grid-req-warning");
    const analyzeBtn = document.getElementById("grid-analyze-btn");
    const hasReq = blocks["problem"] && blocks["solution"] && blocks["resources"];

    if (warning) warning.classList.toggle("hidden", hasReq);
    if (analyzeBtn) analyzeBtn.disabled = !hasReq;
}

async function runAnalysis() {
    const ws = State.get("currentWorkspace");
    if (!ws) return;

    const resultsPanel = document.getElementById("grid-analysis-results");
    if (resultsPanel) resultsPanel.classList.remove("hidden");

    // Collect all container data dynamically based on input types
    const containerData = {};
    document.querySelectorAll(".container-input").forEach(input => {
        const type = input.dataset.type;
        const field = input.dataset.field;
        if (!containerData[type]) containerData[type] = {};
        containerData[type][field] = (input.type === "checkbox") ? input.checked : input.value;
    });

    // Show loading
    resultsPanel.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;padding:30px;gap:12px;">
        <div class="eval-orb" style="width:32px;height:32px;"></div>
        <span style="color:var(--text-muted);font-size:13px;">Analyzing your initiative…</span>
    </div>`;

    const messages = Object.entries(containerData).map(([type, data]) => {
        const def = CONTAINER_DEFS[type];
        // Format object to a readable string for Gemini
        const formattedData = Object.entries(data).map(([k, v]) => `${k}: ${v === true ? 'Yes' : v === false ? 'No' : v}`).join(", ");
        return {
            role: "user",
            text: `${def?.label || type}: ${formattedData}`
        };
    });

    const result = await analyzeProject(messages, ws.idea, ws.level);

    // Render results
    const scores = result.scores || {};
    resultsPanel.innerHTML = `
        <div class="analysis-title">Project Analysis</div>
        <div class="analysis-metrics">
            ${Object.entries(scores).map(([key, val]) => {
                const level = val >= 70 ? "high" : val >= 40 ? "medium" : "low";
                const colors = { high: "var(--green)", medium: "var(--amber)", low: "var(--red)" };
                return `<div class="analysis-metric gsap-reveal">
                    <div class="am-label">${key}</div>
                    <div class="am-value ${level} am-counter">0%</div>
                    <div class="am-bar"><div class="am-bar-fill" data-target="${val}" style="background:${colors[level]}"></div></div>
                </div>`;
            }).join("")}
        </div>
        <div class="analysis-feedback gsap-reveal" style="opacity:0; transform:translateY(14px)">${result.feedback || ""}</div>`;

    // Premium Animations: Counters + Bars + Fade in
    setTimeout(() => {
        // 1. Reveal Metric Cards
        gsap.fromTo(".analysis-metric.gsap-reveal", 
            { y: 20, opacity: 0 }, 
            { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: "expo.out" }
        );

        // 2. Animate Counters
        const scoreValues = Object.values(scores);
        resultsPanel.querySelectorAll(".am-counter").forEach((counter, i) => {
            OrionAnim.animateCounter(counter, scoreValues[i], "%", 1.5, i * 0.1);
        });

        // 3. Animate Bars
        OrionAnim.animateMetricBars();

        // 4. Reveal Feedback Text
        gsap.to(".analysis-feedback.gsap-reveal", { y: 0, opacity: 1, duration: 0.7, delay: 0.5, ease: "power3.out" });
    }, 50);
}

export function clearGrid() {
    if (grid) {
        grid.removeAll();
        grid.destroy();
        grid = null;
    }
    blocks = {};
}
