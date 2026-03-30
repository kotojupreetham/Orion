// js/app.js — The Master Orchestrator
// This is the ONLY file that imports from multiple modules.
// All other modules use dependency injection (callbacks) to avoid circular deps.

import { auth, db } from "./core/firebase-config.js";
import { AppState } from "./core/state.js";
import { initAuth } from "./core/auth.js";
import { initGyroscope } from "./animations/gyro-mouse.js";
import { initMagnetics } from "./animations/magnetic.js";
import { loadWorkspaces } from "./ui/sidebar.js";
import { loadMessages } from "./ui/chat.js";
import { showRightPanel } from "./ui/right-panel.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ═══════════════════════════════════
// 1. BOOT ANIMATION ENGINE
// ═══════════════════════════════════
const ideBody = document.getElementById("ide-body");
if (ideBody) {
    initGyroscope(ideBody);
}
initMagnetics(document);

// ═══════════════════════════════════
// 2. BOOT AUTH (with callbacks)
// ═══════════════════════════════════
initAuth(handleLoggedIn, handleLoggedOut);

// ═══════════════════════════════════
// 3. AUTH HANDLERS
// ═══════════════════════════════════
function handleLoggedIn(user, level) {
    hide("loading-screen");
    hide("login-screen");
    show("app-screen");

    const avatar = document.getElementById("avatar");
    if (avatar) avatar.src = user.photoURL || "";

    const statusName = document.getElementById("status-name");
    if (statusName) statusName.textContent = user.displayName || user.email;

    const badge = document.getElementById("badge");
    if (badge) badge.textContent = level || "";

    // Wait one frame so the DOM is painted before animating
    requestAnimationFrame(() => {
        const panels = document.querySelectorAll("#app-screen .glass");
        if (panels.length) {
            gsap.fromTo(panels,
                { z: -800, rotateX: 40, opacity: 0 },
                { z: 0, rotateX: 0, opacity: 1, stagger: 0.1, duration: 1.2, ease: "power4.out" }
            );
        }

        // Re-init magnetics now that the app screen is visible
        initMagnetics(document);

        // Load workspaces (passes selectWorkspace as callback)
        loadWorkspaces(selectWorkspace);

        // If no level yet → open onboarding
        if (!level) {
            setTimeout(openOnboarding, 1200);
        }
    });
}

function handleLoggedOut() {
    show("login-screen");
    hide("loading-screen");
    hide("app-screen");

    // Login card entrance
    gsap.fromTo(".login-card",
        { scale: 0.6, z: -600, rotateX: 30, opacity: 0 },
        { scale: 1, z: 0, rotateX: 0, opacity: 1, duration: 1, ease: "back.out(1.4)" }
    );

    initMagnetics(document);
}

// ═══════════════════════════════════
// 4. WORKSPACE SELECTION
// ═══════════════════════════════════
function selectWorkspace(id, title, data) {
    AppState.currentWorkspaceId = id;
    AppState.currentWorkspaceData = { id, title, ...data };

    // Highlight active in sidebar
    document.querySelectorAll(".ws-item").forEach(el => el.classList.remove("active"));

    const wsTitle = document.getElementById("ws-title");
    const wsBread = document.getElementById("ws-breadcrumb");
    if (wsTitle) wsTitle.textContent = title;
    if (wsBread) wsBread.textContent = `workspace/${id.substring(0, 8)}`;

    // Switch views
    const empty = document.getElementById("empty-state");
    const wsView = document.getElementById("ws-view");
    if (empty) empty.style.display = "none";
    if (wsView) {
        wsView.style.display = "flex";
        gsap.fromTo(wsView,
            { z: -400, opacity: 0, rotateY: 15 },
            { z: 0, opacity: 1, rotateY: 0, duration: 0.7, ease: "power2.out" }
        );
    }

    showRightPanel(data);
    loadMessages(id);
}

// ═══════════════════════════════════
// 5. ONBOARDING MODAL
// ═══════════════════════════════════
function openOnboarding() {
    const overlay = document.getElementById("onboarding-overlay");
    const iframe  = document.getElementById("onboarding-iframe");
    if (!overlay || !iframe) return;

    iframe.src = "onboarding.html";
    overlay.classList.remove("hidden");

    gsap.fromTo(".onboarding-shell",
        { opacity: 0, scale: 0.3, z: -1500, rotateY: -120 },
        { opacity: 1, scale: 1, z: 100, rotateY: 0, duration: 1.3, ease: "back.out(1.2)" }
    );
}

function closeOnboarding() {
    gsap.to(".onboarding-shell", {
        opacity: 0, scale: 0.3, z: -1500, rotateY: 120,
        duration: 0.7, ease: "power2.in",
        onComplete: () => {
            const overlay = document.getElementById("onboarding-overlay");
            const iframe  = document.getElementById("onboarding-iframe");
            if (overlay) overlay.classList.add("hidden");
            if (iframe) iframe.src = "";
        }
    });
}

// Make accessible for auth.js and external triggers
window.openOnboardingModal = openOnboarding;

document.getElementById("close-onboarding")?.addEventListener("click", closeOnboarding);

// Listen for onboarding completion from iframe
window.addEventListener("message", async (event) => {
    if (event.data?.type === "ONBOARDING_COMPLETE") {
        const { level, score } = event.data;
        closeOnboarding();

        const badge = document.getElementById("badge");
        if (badge) badge.textContent = level;

        // Auto-create first workspace
        if (AppState.currentUser) {
            const title = `Decision_${Math.floor(Math.random() * 9000) + 1000}`;
            try {
                const ref = await addDoc(collection(db, "workspaces"), {
                    userId: AppState.currentUser.uid,
                    title, level, score,
                    createdAt: serverTimestamp()
                });
                selectWorkspace(ref.id, title, { level, score });
            } catch (e) {
                console.error("Workspace creation error:", e);
            }
        }
    }
});

// ═══════════════════════════════════
// 6. NEW WORKSPACE BUTTONS
// ═══════════════════════════════════
document.getElementById("new-ws-btn")?.addEventListener("click", openOnboarding);
document.getElementById("empty-new-btn")?.addEventListener("click", openOnboarding);

// ═══════════════════════════════════
// 7. HOVER EXTRUSIONS (Global)
// ═══════════════════════════════════
document.addEventListener("mouseenter", (e) => {
    if (e.target.classList?.contains("extrude")) {
        gsap.to(e.target, { z: 50, duration: 0.3, ease: "power2.out" });
    }
}, true);

document.addEventListener("mouseleave", (e) => {
    if (e.target.classList?.contains("extrude")) {
        gsap.to(e.target, { z: 0, duration: 0.5, ease: "elastic.out(1, 0.5)" });
    }
}, true);

// ═══════════════════════════════════
// 8. THEME SYSTEM (Dark / Light)
// ═══════════════════════════════════
function initTheme() {
    const saved = localStorage.getItem("orion-theme");
    const theme = saved || "dark";
    applyTheme(theme);
}

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("orion-theme", theme);

    // Update all toggle button icons
    const btns = document.querySelectorAll(".theme-toggle");
    btns.forEach(btn => {
        btn.textContent = theme === "dark" ? "☽" : "☀";
        btn.title = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
    });
}

function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";

    // Spin animation on all toggle buttons
    document.querySelectorAll(".theme-toggle").forEach(btn => {
        gsap.to(btn, {
            rotateZ: 360, duration: 0.5, ease: "power2.inOut",
            onComplete: () => gsap.set(btn, { rotateZ: 0 })
        });
    });

    applyTheme(next);
}

// Boot theme on load
initTheme();

// Bind toggle buttons (login screen + dashboard toolbar)
document.getElementById("theme-btn")?.addEventListener("click", toggleTheme);
document.getElementById("login-theme-btn")?.addEventListener("click", toggleTheme);

// ═══════════════════════════════════
// UTILITIES
// ═══════════════════════════════════
function show(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove("hidden");
}
function hide(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
}
