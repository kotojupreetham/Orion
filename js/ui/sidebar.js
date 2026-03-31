<<<<<<< HEAD
// js/ui/sidebar.js
// Takes onSelect callback — never imports from app.js
import { db } from "../core/firebase-config.js";
import { AppState } from "../core/state.js";
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { initMagnetics } from "../animations/magnetic.js";
import { bindScrollDepth } from "../animations/scroll-3d.js";

const wsList = document.getElementById("ws-list");
const noWs   = document.getElementById("no-ws");

const ICONS = { Explorer: "🌱", Learner: "📖", Builder: "🔨", Catalyst: "🚀" };

export function loadWorkspaces(onSelect) {
    if (!AppState.currentUser) return;

    const q = query(
        collection(db, "workspaces"),
        where("userId", "==", AppState.currentUser.uid),
        orderBy("createdAt", "desc")
    );

    AppState.unsubWorkspaces = onSnapshot(q, (snap) => {
        AppState.allWorkspaces = [];
        snap.forEach(d => AppState.allWorkspaces.push({ id: d.id, ...d.data() }));
        render(AppState.allWorkspaces, onSelect);
    });
}

function render(list, onSelect) {
    if (!wsList) return;
    wsList.innerHTML = "";

    if (list.length === 0) {
        if (noWs) noWs.style.display = "block";
        return;
    }
    if (noWs) noWs.style.display = "none";

    list.forEach(ws => {
        const el = document.createElement("div");
        el.className = `ws-item extrude ${ws.id === AppState.currentWorkspaceId ? "active" : ""}`;
        el.innerHTML = `
            <span class="ws-icon">${ICONS[ws.level] || "⚡"}</span>
            <span class="ws-name">${ws.title}</span>
            <button class="btn btn-ghost ws-del magnetic">✕</button>
        `;

        el.addEventListener("click", () => onSelect(ws.id, ws.title, ws));

        el.querySelector(".ws-del").addEventListener("click", async (e) => {
            e.stopPropagation();
            if (confirm(`Delete "${ws.title}"?`)) {
                gsap.to(el, { x: -300, opacity: 0, duration: 0.4, ease: "power2.in",
                    onComplete: () => deleteDoc(doc(db, "workspaces", ws.id))
                });
            }
        });

        wsList.appendChild(el);
    });

    // Re-init magnetics on new delete buttons
    initMagnetics(wsList);

    // Stagger entrance
    gsap.from(".ws-item", {
        z: -250, rotateX: -20, opacity: 0,
        stagger: 0.06, duration: 0.8, ease: "back.out(1.3)"
    });

    // Bind scroll depth physics
    bindScrollDepth(wsList, ".ws-item");
}
=======
/**
 * ORION — Sidebar: Workspace explorer with real-time Firestore sync
 */
import { State } from "../state.js";
import { listenWorkspaces, deleteWorkspace, createWorkspace } from "../db.js";
import { OrionAnim } from "../gsap-animations.js";
import { OrionModal } from "./modals.js";

let unsubscribe = null;

export function initSidebar() {
    const list = document.getElementById("workspace-list");
    const searchInput = document.querySelector(".search-input");
    const newBtn = document.querySelector(".new-workspace-btn");

    // Real-time listener
    State.on("auth:signedIn", () => {
        if (unsubscribe) unsubscribe();
        unsubscribe = listenWorkspaces((workspaces) => renderList(workspaces));
    });

    // Search filter
    if (searchInput) {
        searchInput.addEventListener("input", () => {
            const q = searchInput.value.toLowerCase();
            const all = State.get("workspaces") || [];
            renderList(q ? all.filter(w => (w.title || w.idea || "").toLowerCase().includes(q)) : all);
        });
    }

    // New workspace
    if (newBtn) {
        newBtn.addEventListener("click", async () => {
            const idea = await OrionModal.prompt("New Workspace", "Describe your social initiative idea:", "e.g. A mental health app for rural teens…", 10);
            if (!idea) return;
            const wsId = await createWorkspace(idea, State.get("userLevel") || "explorer");
            if (wsId) State.emit("workspace:select", wsId);
        });
    }
}

function renderList(workspaces) {
    const list = document.getElementById("workspace-list");
    if (!list) return;
    list.innerHTML = "";

    if (!workspaces.length) {
        list.innerHTML = `<div class="sidebar-empty-msg">No workspaces yet.<br>Click <strong>+ New</strong> to start.</div>`;
        return;
    }

    workspaces.forEach((ws, i) => {
        const el = document.createElement("div");
        el.className = "workspace-item" + (ws.id === State.get("currentWorkspaceId") ? " active" : "");
        el.innerHTML = `
            <span class="workspace-item-icon">📄</span>
            <span class="workspace-item-content">${ws.title || ws.idea || "Untitled"}</span>
            <button class="delete-workspace-btn" title="Delete">✕</button>`;

        el.addEventListener("click", (e) => {
            if (e.target.closest(".delete-workspace-btn")) return;
            State.emit("workspace:select", ws.id);
        });

        el.querySelector(".delete-workspace-btn").addEventListener("click", async (e) => {
            e.stopPropagation();
            const ok = await OrionModal.confirm("Delete Workspace", `Delete "${ws.title || "this workspace"}"? This cannot be undone.`, true);
            if (ok) deleteWorkspace(ws.id);
        });

        list.appendChild(el);
        OrionAnim.animateWorkspaceItem(el, i);
    });
}

// Highlight active workspace on change
State.on("currentWorkspaceId:changed", () => {
    document.querySelectorAll(".workspace-item").forEach((el, i) => {
        const ws = (State.get("workspaces") || [])[i];
        if (ws) el.classList.toggle("active", ws.id === State.get("currentWorkspaceId"));
    });
});
>>>>>>> 666476a (final)
