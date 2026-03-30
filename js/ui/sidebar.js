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
