/**
 * ═══════════════════════════════════════════════════════════════
 *  ORION — Main Application Logic  (js/app.js)
 *
 *  Responsibilities:
 *  · Firebase auth (Google sign-in / sign-out)
 *  · Firestore workspace CRUD
 *  · Gemini AI chat per workspace
 *  · Evaluation (viability stress test)
 *  · Simulation launcher
 *  · UI wiring: theme, sidebar tabs, crossfade, breadcrumb
 * ═══════════════════════════════════════════════════════════════
 */

import { auth, provider, db, aiApiKey } from "../../config/firebase-config.js";
import {
    onAuthStateChanged,
    signInWithPopup,
    signOut,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    collection, doc,
    addDoc, getDoc, getDocs, updateDoc, deleteDoc,
    query, orderBy, serverTimestamp,
    onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ══════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════
const GEMINI_API_KEY = aiApiKey || "AIzaSyDR-v7ncbMDKPgzDnrIiAoAKTs3LDS2v9c";
if (!GEMINI_API_KEY) {
    console.warn("[Orion App] No Gemini API key found. AI calls will fail.");
}

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_ENDPOINT_BASE = `https://generativelanguage.googleapis.com/v1beta2/models/${GEMINI_MODEL}`;

const LEVEL_META = {
    Explorer:  { icon: "🌱", color: "#10b981", sub: "You are just getting started. Keep ideating." },
    Learner:   { icon: "📖", color: "#f59e0b", sub: "You are building strong foundations." },
    Builder:   { icon: "🏗️", color: "#3b82f6", sub: "You execute with precision and clarity." },
    Catalyst:  { icon: "⚡", color: "#8b5cf6", sub: "You think at the systems level. Exceptional." },
};

// ══════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════
const appState = {
    user:             null,
    userLevel:        "Explorer",
    workspaces:       [],
    activeWorkspace:  null,
    messages:         [],        // current workspace messages
    unsubscribeWs:    null,      // Firestore real-time listener cleanup
};

// ══════════════════════════════════════════════════════════════
// DOM REFERENCES
// ══════════════════════════════════════════════════════════════
const loginBtn           = document.getElementById("login-btn");
const logoutBtn          = document.getElementById("logout-btn");
const loginThemeBtn      = document.getElementById("login-theme-btn");
const appThemeBtn        = document.getElementById("theme-btn");

const toolbarUserPhoto   = document.getElementById("toolbar-user-photo");
const toolbarLevelBadge  = document.getElementById("toolbar-level-badge");
const statusUserName     = document.getElementById("status-user-name");
const statusLevel        = document.getElementById("status-level");

const newWorkspaceBtn    = document.getElementById("new-workspace-btn");
const emptyNewBtn        = document.getElementById("empty-new-btn");
const workspaceList      = document.getElementById("workspace-list");
const noWorkspaceMsg     = document.getElementById("no-workspace-msg");
const workspaceSearch    = document.getElementById("workspace-search");

const breadcrumb         = document.getElementById("active-workspace-breadcrumb");

const emptyState         = document.getElementById("empty-state");
const workspaceView      = document.getElementById("workspace-view");
const evaluationView     = document.getElementById("evaluation-view");

const workspaceTitle     = document.getElementById("workspace-title");
const workspaceTabTitle  = document.getElementById("workspace-tab-title");
const workspaceLevelPill = document.getElementById("workspace-level-pill");
const messagesContainer  = document.getElementById("messages-container");
const messageInput       = document.getElementById("message-input");
const sendBtn            = document.getElementById("send-btn");

const rpIdeaText         = document.getElementById("rp-idea-text");
const rpCreatedAt        = document.getElementById("rp-created-at");
const rpMsgCount         = document.getElementById("rp-msg-count");
const rpSimDesc          = document.getElementById("rp-sim-desc");
const rightPanelEmpty    = document.getElementById("right-panel-empty");
const rightPanelContent  = document.getElementById("right-panel-content");

const statusWorkspace    = document.getElementById("status-workspace");
const statusMsgCount     = document.getElementById("status-msg-count");

const sidebarTabs        = document.querySelectorAll(".sidebar-tab");
const sidebarPanels      = document.querySelectorAll(".sidebar-panel");

const startEvalBtn       = document.getElementById("start-eval-btn");
const launchSimBtn       = document.getElementById("launch-sim-btn");

// ══════════════════════════════════════════════════════════════
// BOOT — Firebase Auth Observer
// ══════════════════════════════════════════════════════════════
onAuthStateChanged(auth, async (user) => {
    if (user) {
        appState.user = user;
        await loadUserProfile(user);
        window.OrionAnim.hideLoader(() => {
            window.OrionAnim.showApp();
            loadWorkspaces();
        });
    } else {
        appState.user = null;
        window.OrionAnim.hideLoader(() => {
            window.OrionAnim.showLogin();
        });
    }
});

// ══════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════
loginBtn.addEventListener("click", async () => {
    try {
        await signInWithPopup(auth, provider);
        // onAuthStateChanged handles the rest
    } catch (e) {
        console.error("Sign-in error:", e);
    }
});

logoutBtn.addEventListener("click", async () => {
    if (appState.unsubscribeWs) appState.unsubscribeWs();
    await signOut(auth);
    // Page reload is simplest for full state reset
    window.location.reload();
});

// ══════════════════════════════════════════════════════════════
// LOAD USER PROFILE (level, avatar, etc.)
// ══════════════════════════════════════════════════════════════
async function loadUserProfile(user) {
    try {
        const snap = await getDoc(doc(db, "users", user.email));
        if (snap.exists()) {
            appState.userLevel = snap.data().level || "Explorer";
        }
    } catch (e) { console.warn("Profile load error:", e); }

    // Populate toolbar
    if (user.photoURL) {
        toolbarUserPhoto.src     = user.photoURL;
        toolbarUserPhoto.style.display = "block";
    }
    const meta = LEVEL_META[appState.userLevel] || LEVEL_META.Explorer;
    toolbarLevelBadge.textContent = `${meta.icon} ${appState.userLevel}`;
    toolbarLevelBadge.classList.remove("hidden");
    toolbarLevelBadge.style.color = meta.color;

    statusUserName.textContent = user.displayName || user.email;
    statusLevel.textContent    = appState.userLevel;
    statusLevel.classList.remove("hidden");
}

// ══════════════════════════════════════════════════════════════
// THEME TOGGLE
// ══════════════════════════════════════════════════════════════
[loginThemeBtn, appThemeBtn].forEach((btn) => {
    if (btn) btn.addEventListener("click", () => window.OrionAnim.toggleTheme());
});

// ══════════════════════════════════════════════════════════════
// SIDEBAR TABS
// ══════════════════════════════════════════════════════════════
sidebarTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        const targetPanel = tab.dataset.tab;
        sidebarTabs.forEach((t) => {
            t.classList.toggle("active", t === tab);
            t.setAttribute("aria-selected", t === tab);
        });
        sidebarPanels.forEach((p) => {
            p.classList.toggle("hidden", p.id !== `panel-${targetPanel}`);
        });
    });
});

// ══════════════════════════════════════════════════════════════
// WORKSPACES — Load from Firestore
// ══════════════════════════════════════════════════════════════
async function loadWorkspaces() {
    if (!appState.user) return;
    try {
        const q     = query(collection(db, "users", appState.user.email, "workspaces"), orderBy("createdAt", "desc"));
        const snap  = await getDocs(q);
        appState.workspaces = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        renderWorkspaceList();
    } catch (e) { console.error("Workspace load error:", e); }
}

function renderWorkspaceList() {
    workspaceList.innerHTML = "";
    if (appState.workspaces.length === 0) {
        noWorkspaceMsg.classList.remove("hidden");
        return;
    }
    noWorkspaceMsg.classList.add("hidden");

    appState.workspaces.forEach((ws, idx) => {
        const item = document.createElement("div");
        item.className = `workspace-item ${appState.activeWorkspace?.id === ws.id ? "active" : ""}`;
        item.role      = "option";
        item.setAttribute("aria-selected", appState.activeWorkspace?.id === ws.id);
        item.dataset.id = ws.id;

        const level  = ws.level || "Explorer";
        const meta   = LEVEL_META[level] || LEVEL_META.Explorer;
        const title  = ws.title || ws.idea?.substring(0, 40) || "Untitled Workspace";

        item.innerHTML = `
          <span class="ws-icon" aria-hidden="true">${meta.icon}</span>
          <span class="ws-title">${title}</span>
          <button class="ws-delete-btn" title="Delete workspace" aria-label="Delete ${title}" data-id="${ws.id}">✕</button>
        `;

        item.addEventListener("click", (e) => {
            if (e.target.classList.contains("ws-delete-btn")) return;
            selectWorkspace(ws);
        });

        item.querySelector(".ws-delete-btn").addEventListener("click", (e) => {
            e.stopPropagation();
            deleteWorkspace(ws.id);
        });

        workspaceList.appendChild(item);
        window.OrionAnim.animateWorkspaceItem(item, idx);
    });
}

// ══════════════════════════════════════════════════════════════
// WORKSPACES — Create
// ══════════════════════════════════════════════════════════════
async function aiSuggestWorkspaceTitle(idea) {
    const fallback = idea.substring(0, 28) + (idea.length > 28 ? "…" : "");
    if (!GEMINI_API_KEY) return fallback;

    const prompt = `Create a short workspace title (max 28 chars) for this startup idea without extra commentary:\n${idea}`;
    try {
        const raw = await callGemini(prompt, null);
        if (!raw || /^(ai service unavailable|sorry|\[ai offline\])/i.test(raw.trim())) {
            return fallback;
        }

        let title = raw.trim().split(/\r?\n/)[0] || "";
        title = title.replace(/^\s*"|"\s*$/g, "").replace(/[^\w\s-]/g, "").trim();
        if (!title) return fallback;
        if (title.length > 28) title = title.substring(0, 28).trim() + "…";
        return title;
    } catch (e) {
        console.warn("AI workspace title suggestion failed:", e);
        return fallback;
    }
}

async function createWorkspace() {
    if (!appState.user) return;

    const ideaRaw = await OrionModal.prompt(
        "New Workspace",
        "Describe the problem you want to solve. 1–2 sentences is enough — don't overthink it.",
        "e.g. A platform to reduce food waste by connecting restaurants to local NGOs…",
        10
    );
    if (!ideaRaw?.trim()) return;

    const idea = ideaRaw.trim();
    let title = await aiSuggestWorkspaceTitle(idea);

    // Enforce deterministic short title in all cases, max 28 chars
    if (!title) title = idea;
    title = title.trim().split(/\r?\n/)[0];
    title = title.replace(/^\"|\"$/g, "").trim();
    if (title.length > 28) title = title.substring(0, 28).trim() + "…";

    try {
        const ref = await addDoc(
            collection(db, "users", appState.user.email, "workspaces"),
            {
                idea,
                title,
                level:     appState.userLevel,
                messages:  [],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            }
        );
        const newWs = { id: ref.id, idea, title, level: appState.userLevel, messages: [], createdAt: new Date() };
        appState.workspaces.unshift(newWs);
        renderWorkspaceList();
        selectWorkspace(newWs);
    } catch (e) { console.error("Create workspace error:", e); }
}

[newWorkspaceBtn, emptyNewBtn].forEach((btn) => {
    if (btn) btn.addEventListener("click", createWorkspace);
});

// ══════════════════════════════════════════════════════════════
// WORKSPACES — Delete
// ══════════════════════════════════════════════════════════════
async function deleteWorkspace(wsId) {
    const confirmed = await OrionModal.confirm(
        "Delete Workspace?",
        "This will permanently remove the workspace and all its messages. This cannot be undone."
    );
    if (!confirmed) return;
    try {
        await deleteDoc(doc(db, "users", appState.user.email, "workspaces", wsId));
        appState.workspaces = appState.workspaces.filter((w) => w.id !== wsId);
        if (appState.activeWorkspace?.id === wsId) {
            appState.activeWorkspace = null;
            showEmptyState();
        }
        renderWorkspaceList();
    } catch (e) { console.error("Delete error:", e); }
}

// ══════════════════════════════════════════════════════════════
// WORKSPACES — Select / open
// ══════════════════════════════════════════════════════════════
function selectWorkspace(ws) {
    if (appState.activeWorkspace?.id === ws.id) return;
    appState.activeWorkspace = ws;

    // Mark active in sidebar
    document.querySelectorAll(".workspace-item").forEach((el) => {
        const isActive = el.dataset.id === ws.id;
        el.classList.toggle("active", isActive);
        el.setAttribute("aria-selected", isActive);
    });

    // Breadcrumb
    breadcrumb.textContent = ws.title || ws.idea?.substring(0, 40) || "Workspace";

    // Crossfade center panel
    window.OrionAnim.crossfadeCenter(() => {
        emptyState.classList.remove("active");
        emptyState.classList.add("hidden");
        evaluationView.classList.add("hidden");
        workspaceView.classList.remove("hidden");
        populateWorkspaceView(ws);
    });

    // Right panel
    populateRightPanel(ws);
    rightPanelEmpty.classList.add("hidden");
    rightPanelContent.classList.remove("hidden");

    // Load messages
    loadMessages(ws.id);
}

function populateWorkspaceView(ws) {
    const title = ws.title || ws.idea?.substring(0, 45) || "Untitled";
    workspaceTitle.textContent   = title;
    workspaceTabTitle.textContent = title.substring(0, 20) + (title.length > 20 ? "…" : "");

    const level = ws.level || "Explorer";
    const meta  = LEVEL_META[level] || LEVEL_META.Explorer;
    workspaceLevelPill.textContent = `${meta.icon} ${level}`;
    workspaceLevelPill.classList.remove("hidden");
    workspaceLevelPill.style.background   = meta.color + "20";
    workspaceLevelPill.style.color        = meta.color;
    workspaceLevelPill.style.border       = `1px solid ${meta.color}40`;
    workspaceLevelPill.style.borderRadius = "20px";
    workspaceLevelPill.style.padding      = "3px 12px";
    workspaceLevelPill.style.fontSize     = "12px";
    workspaceLevelPill.style.fontWeight   = "600";

    // ── Populate chat welcome state ───────────────────────────
    populateChatWelcome(ws);
}

// ── Prompt chips per level ────────────────────────────────────
const LEVEL_PROMPTS = {
    Explorer: [
        { icon: "🌱", text: "What problem does my idea actually solve for people?" },
        { icon: "🤔", text: "Help me understand my target user better." },
        { icon: "💡", text: "What are the biggest assumptions I'm making right now?" },
    ],
    Learner: [
        { icon: "🔍", text: "How do I validate this idea without writing code?" },
        { icon: "📊", text: "What metrics should I track to know if this is working?" },
        { icon: "🗣️", text: "Who are the key stakeholders I need to talk to?" },
    ],
    Builder: [
        { icon: "⚙️",  text: "What should my MVP include — and what should it cut?" },
        { icon: "📈", text: "How do I build a unit economics model for this?" },
        { icon: "🚧", text: "What's the biggest execution risk I'm underestimating?" },
    ],
    Catalyst: [
        { icon: "🌐", text: "How do I think about scaling this beyond my first city?" },
        { icon: "🏛️", text: "What policy or systemic changes would make this easier?" },
        { icon: "🤝", text: "Which ecosystem partners would accelerate impact the most?" },
    ],
};

function populateChatWelcome(ws) {
    const welcomeEl = document.getElementById("chat-welcome");
    if (!welcomeEl) return;

    // Show it (might have been hidden by a previous workspace)
    welcomeEl.classList.remove("cw-hidden");

    // Greeting
    const userName   = appState.user?.displayName?.split(" ")[0] || "there";
    const cwTitle    = document.getElementById("cw-title");
    const cwSub      = document.getElementById("cw-sub");
    const cwIdeaText = document.getElementById("cw-idea-text");
    const cwChips    = document.getElementById("cw-chips");

    if (cwTitle)    cwTitle.textContent = `Welcome, ${userName}.`;
    if (cwSub)      cwSub.textContent   = `"${ws.title || ws.idea?.substring(0, 50)}" is open. Start by sharing an idea, question, or challenge.`;
    if (cwIdeaText) cwIdeaText.textContent = ws.idea || ws.title || "Your startup idea";

    // Build chips
    if (cwChips) {
        cwChips.innerHTML = "";
        const level   = ws.level || "Explorer";
        const prompts = LEVEL_PROMPTS[level] || LEVEL_PROMPTS.Explorer;

        prompts.forEach((p, i) => {
            const chip = document.createElement("button");
            chip.className = "cw-chip magnetic";
            chip.setAttribute("role", "listitem");
            chip.setAttribute("aria-label", p.text);
            chip.innerHTML = `<span class="cw-chip-icon" aria-hidden="true">${p.icon}</span><span class="cw-chip-text">${p.text}</span>`;

            // Click fills the input and focuses it
            chip.addEventListener("click", () => {
                messageInput.value = p.text;
                messageInput.focus();
                messageInput.style.height = "auto";
                messageInput.style.height = Math.min(messageInput.scrollHeight, 160) + "px";
                // Pulse the input wrapper
                gsap.fromTo(".input-wrapper",
                    { boxShadow: `0 0 0 3px var(--accent-glow)` },
                    { boxShadow: `0 0 0 0px transparent`, duration: 0.6, ease: "expo.out" }
                );
            });

            cwChips.appendChild(chip);
        });
    }

    // GSAP entrance animation
    gsap.set(welcomeEl, { opacity: 0 });
    gsap.set(".cw-greeting", { opacity: 0, y: 18 });
    gsap.set(".cw-idea-card", { opacity: 0, y: 14 });
    gsap.set(".cw-divider-row", { opacity: 0 });
    gsap.set(".cw-chips .cw-chip", { opacity: 0, y: 10 });

    const tl = gsap.timeline({ delay: 0.15 });
    tl.to(welcomeEl,         { opacity: 1, duration: 0.4, ease: "expo.out" });
    tl.to(".cw-greeting",    { opacity: 1, y: 0, duration: 0.55, ease: "expo.out" }, "-=0.2");
    tl.to(".cw-wave",        { rotation: 20, duration: 0.25, ease: "back.out(3)", yoyo: true, repeat: 1 }, "-=0.3");
    tl.to(".cw-idea-card",   { opacity: 1, y: 0, duration: 0.45, ease: "expo.out" }, "-=0.25");
    tl.to(".cw-divider-row", { opacity: 1, duration: 0.3, ease: "expo.out" }, "-=0.15");
    tl.to(".cw-chips .cw-chip", { opacity: 1, y: 0, duration: 0.35, ease: "expo.out", stagger: 0.08 }, "-=0.1");
}

function populateRightPanel(ws) {
    rpIdeaText.textContent  = ws.idea || "—";
    rpCreatedAt.textContent = ws.createdAt?.toDate
        ? ws.createdAt.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "Just now";
    rpMsgCount.textContent  = `${(ws.messages || []).length} notes`;

    const level = ws.level || "Explorer";
    const meta  = LEVEL_META[level] || LEVEL_META.Explorer;
    rpSimDesc.textContent = meta.sub;
}

// ══════════════════════════════════════════════════════════════
// MESSAGES — Load + render
// ══════════════════════════════════════════════════════════════
function loadMessages(wsId) {
    if (appState.unsubscribeWs) appState.unsubscribeWs();

    // Clear messages but preserve the welcome state element
    const welcomeEl = document.getElementById("chat-welcome");
    messagesContainer.innerHTML = "";
    if (welcomeEl) messagesContainer.appendChild(welcomeEl);
    appState.messages = [];

    const msgsRef = collection(db, "users", appState.user.email, "workspaces", wsId, "messages");
    const q       = query(msgsRef, orderBy("createdAt", "asc"));

    appState.unsubscribeWs = onSnapshot(q, (snap) => {
        const docs = snap.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                role: data.role || "ai",
                text: data.text || "",
                createdAt: data.createdAt || null,
            };
        });

        // Sort client-side as a safety fallback.
        docs.sort((a, b) => {
            const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
            const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
            return tA - tB;
        });

        appState.messages = docs;

        // Hide welcome state once we have at least one real message.
        if (appState.messages.length > 0 && welcomeEl && !welcomeEl.classList.contains("cw-hidden")) {
            gsap.to(welcomeEl, {
                opacity: 0, y: -10, duration: 0.3, ease: "expo.in",
                onComplete: () => welcomeEl.classList.add("cw-hidden"),
            });
        }

        // Re-render all messages to prevent duplicates and preserve order.
        // Keep welcome element if present.
        messagesContainer.innerHTML = "";
        if (welcomeEl) messagesContainer.appendChild(welcomeEl);

        appState.messages.forEach((message) => renderMessage(message));
        updateMsgCounts();
    }, (error) => {
        console.error("Load messages snapshot error:", error);
        // Optionally show user error notification here.
    });
}


function renderMessage({ role, text, createdAt }) {
    const bubble = document.createElement("div");
    bubble.className = `message-bubble ${role === "user" ? "user-msg" : "ai-msg"}`;

    const time = createdAt?.toDate
        ? createdAt.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "";

    bubble.innerHTML = `
      <div class="msg-content">${escapeHtml(text).replace(/\n/g, "<br>")}</div>
      ${time ? `<div class="msg-time">${time}</div>` : ""}
    `;
    messagesContainer.appendChild(bubble);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    window.OrionAnim.animateMessage(bubble);
}

function updateMsgCounts() {
    const count = appState.messages.length;
    rpMsgCount.textContent   = `${count} note${count !== 1 ? "s" : ""}`;
    statusMsgCount.textContent = `${count} note${count !== 1 ? "s" : ""}`;

    // Sync workspace object
    if (appState.activeWorkspace) appState.activeWorkspace.messages = appState.messages;
    const wsInList = appState.workspaces.find((w) => w.id === appState.activeWorkspace?.id);
    if (wsInList) wsInList.messages = appState.messages;
}

// ══════════════════════════════════════════════════════════════
// MESSAGES — Send
// ══════════════════════════════════════════════════════════════
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !appState.activeWorkspace) return;

    messageInput.value = "";
    messageInput.style.height = "auto";

    const wsId   = appState.activeWorkspace.id;
    const email  = appState.user.email;

    // Save user message
    await addDoc(collection(db, "users", email, "workspaces", wsId, "messages"), {
        role: "user", text, createdAt: serverTimestamp(),
    });

    // Show typing indicator
    const typingEl = showTyping();

    // Call Gemini
    const aiText = await callGemini(text, wsId);
    typingEl.remove();

    // Save AI response
    await addDoc(collection(db, "users", email, "workspaces", wsId, "messages"), {
        role: "ai", text: aiText, createdAt: serverTimestamp(),
    });

    // Update workspace updatedAt
    await updateDoc(doc(db, "users", email, "workspaces", wsId), {
        updatedAt: serverTimestamp(),
    });
}

sendBtn.addEventListener("click", sendMessage);

messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Auto-resize textarea
messageInput.addEventListener("input", () => {
    messageInput.style.height = "auto";
    messageInput.style.height = Math.min(messageInput.scrollHeight, 160) + "px";
});

// ── Typing indicator ────────────────────────────────────────
function showTyping() {
    const el = document.createElement("div");
    el.className = "message-bubble ai-msg typing-indicator";
    el.innerHTML = `<span></span><span></span><span></span>`;
    messagesContainer.appendChild(el);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    window.OrionAnim.animateMessage(el);
    return el;
}

// ══════════════════════════════════════════════════════════════
// GEMINI CHAT
// ══════════════════════════════════════════════════════════════
async function callGemini(userMessage, wsId) {
    if (!GEMINI_API_KEY) {
        console.warn("Gemini API key missing; returning fallback response.");
        return "[AI offline] Please set GEMINI_API_KEY in firebase-config.";
    }

    const ws   = appState.workspaces.find((w) => w.id === wsId);
    const idea = ws?.idea || "a social startup";

    // Build conversation history (last 5 exchanges for context)
    const messages = appState.messages.slice(-10); // last 10 messages
    const history = messages.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.text}`).join('\n');

    const systemPrompt = `You are OrionAI — the intelligent co-pilot for social entrepreneurs.
This conversation is specific to this workspace only. Do not reference or recall information from other workspaces, ideas, or previous interactions outside this one.

The user is developing this startup idea: "${idea}".
Their level: ${appState.userLevel}.

Recent conversation history:
${history}

Your job is to provide structured idea reviews focusing on:
- Problem clarity: Is the problem well-defined and significant?
- Solution feasibility: Does the solution address the problem effectively?
- Market potential: Who are the users, and what's the market size?
- Execution risks: What are the biggest challenges or assumptions?
- Impact potential: How does this create social value?

Guidelines:
- Be concise (max 3-4 sentences per response).
- Ask probing questions to stress-test assumptions.
- If the user forgets to provide key details (e.g., target users, budget, timeline), ask for them specifically.
- Do not ask personal questions about the user.
- Focus only on the idea and its business/social aspects.
- Be warm but direct. No fluff.`;

    try {
        const contentEndpoint = `${GEMINI_ENDPOINT_BASE}:generateContent?key=${GEMINI_API_KEY}`;
        const textEndpoint    = `${GEMINI_ENDPOINT_BASE}:generateText?key=${GEMINI_API_KEY}`;

        const payload = {
            contents: [
                { role: "system", parts: [{ text: systemPrompt }] },
                { role: "user", parts: [{ text: userMessage }] },
            ],
            generationConfig: { temperature: 0.75, maxOutputTokens: 512 },
        };

        let res = await fetch(contentEndpoint, {
            method:  "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": GEMINI_API_KEY,
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            console.warn("Gemini generateContent failed, trying generateText", res.status);
            const alternatePayload = { prompt: { text: `${systemPrompt}\n${userMessage}` }, temperature: 0.75, maxOutputTokens: 512 };
            res = await fetch(textEndpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": GEMINI_API_KEY,
                },
                body: JSON.stringify(alternatePayload),
            });
        }

        if (!res.ok) {
            const errorText = await res.text();
            console.error("Gemini API HTTP error:", res.status, errorText);
            return "AI service unavailable. Please try again later.";
        }

        const data = await res.json();
        const aiText =
            data?.candidates?.[0]?.content?.[0]?.text ||
            data?.candidates?.[0]?.content?.parts?.[0]?.text ||
            data?.candidates?.[0]?.message?.content?.text ||
            data?.output?.text?.[0] ||
            data?.output?.content?.[0]?.text ||
            "";
        return aiText?.trim() || "I couldn't generate a response. Please try again.";
    } catch (e) {
        console.error("Gemini error:", e);

        // Intelligent local fallback if the AI endpoint is down
        const ws = appState.workspaces.find((w) => w.id === wsId);
        const baseIdea = ws?.idea || "your workspace idea";

        if (/what problem.*solve/i.test(userMessage) || /what.*does.*solve/i.test(userMessage)) {
            const problem = baseIdea.split('.')[0] || "a social challenge";
            return `Your idea addresses ${problem.toLowerCase()}, aiming to create positive impact. What makes this problem important to solve right now?`;
        }

        if (baseIdea && userMessage.length < 100) {
            return `Based on your idea (${baseIdea}), it seems you're working on a social initiative. Can you share more about your target users or the solution you're proposing?`;
        }

        return "Sorry, AI service is currently unavailable. Please try again later or provide more details about your idea.";
    }
}

// ══════════════════════════════════════════════════════════════
// WORKSPACE TITLE — Inline edit + Firestore save
// ══════════════════════════════════════════════════════════════
workspaceTitle.addEventListener("blur", async () => {
    const newTitle = workspaceTitle.textContent.trim();
    if (!newTitle || !appState.activeWorkspace) return;

    appState.activeWorkspace.title = newTitle;
    workspaceTabTitle.textContent  = newTitle.substring(0, 20) + (newTitle.length > 20 ? "…" : "");
    breadcrumb.textContent         = newTitle;

    // Update sidebar label
    const sidebarItem = workspaceList.querySelector(`[data-id="${appState.activeWorkspace.id}"] .ws-title`);
    if (sidebarItem) sidebarItem.textContent = newTitle;

    try {
        await updateDoc(
            doc(db, "users", appState.user.email, "workspaces", appState.activeWorkspace.id),
            { title: newTitle, updatedAt: serverTimestamp() }
        );
    } catch (e) { console.error("Title save error:", e); }
});

workspaceTitle.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        workspaceTitle.blur();
    }
});

// ══════════════════════════════════════════════════════════════
// WORKSPACE SEARCH
// ══════════════════════════════════════════════════════════════
workspaceSearch?.addEventListener("input", () => {
    const q = workspaceSearch.value.toLowerCase().trim();
    document.querySelectorAll(".workspace-item").forEach((item) => {
        const title = item.querySelector(".ws-title")?.textContent?.toLowerCase() || "";
        item.style.display = title.includes(q) ? "" : "none";
    });
});

// ══════════════════════════════════════════════════════════════
// STATUS BAR — workspace name
// ══════════════════════════════════════════════════════════════
function updateStatusBar() {
    statusWorkspace.textContent = appState.activeWorkspace
        ? appState.activeWorkspace.title || appState.activeWorkspace.idea?.substring(0, 30)
        : "No workspace open";
}

// ══════════════════════════════════════════════════════════════
// SHOW EMPTY STATE
// ══════════════════════════════════════════════════════════════
function showEmptyState() {
    window.OrionAnim.crossfadeCenter(() => {
        workspaceView.classList.add("hidden");
        evaluationView.classList.add("hidden");
        emptyState.classList.remove("hidden");
        emptyState.classList.add("active");
    });
    breadcrumb.textContent = "Select a workspace";
    rightPanelEmpty.classList.remove("hidden");
    rightPanelContent.classList.add("hidden");
    statusWorkspace.textContent = "No workspace open";
    statusMsgCount.textContent  = "0 notes";
}

// ══════════════════════════════════════════════════════════════
// VIABILITY STRESS TEST (Evaluation)
// ══════════════════════════════════════════════════════════════
startEvalBtn?.addEventListener("click", () => {
    if (!appState.activeWorkspace) return;

    window.OrionAnim.crossfadeCenter(() => {
        workspaceView.classList.add("hidden");
        evaluationView.classList.remove("hidden");
        initEvaluation();
    });
});

async function initEvaluation() {
    const evalGrid      = document.getElementById("eval-grid");
    const evalFinalizeC = document.getElementById("eval-finalize-container");
    const evalLoading   = document.getElementById("eval-loading");
    const evalScorecard = document.getElementById("eval-scorecard");
    const evalFinalizeBtn = document.getElementById("eval-finalize-btn");

    // Reset
    evalGrid.classList.remove("hidden");
    evalFinalizeC.classList.add("hidden");
    evalLoading.classList.add("hidden");
    evalScorecard.classList.add("hidden");

    const ws   = appState.activeWorkspace;
    const idea = ws?.idea || "a social startup";

    const QUESTION_BOXES = [
        { id: "eval-q-vision",    prompt: "Ask one deep question about the founder's core problem definition and personal motivation. Max 2 sentences.", placeholder: "Why does this problem need to be solved now, and why are you the right person to solve it?" },
        { id: "eval-q-strategy",  prompt: "Ask one hard question about their target market and unfair advantage. Max 2 sentences.", placeholder: "Who exactly is your first user, and why would they choose you over doing nothing?" },
        { id: "eval-q-resources", prompt: "Ask one sharp question about their first 90-day budget and resource constraints. Max 2 sentences.", placeholder: "What is your ₹0 version of this idea, and what does the ₹5L version unlock?" },
        { id: "eval-q-risks",     prompt: "Ask one incisive question about their biggest operational risk and team gaps. Max 2 sentences.", placeholder: "What is the one assumption, if wrong, that would kill this idea?" },
    ];

    // Generate questions for each box (in parallel)
    const questionPromises = QUESTION_BOXES.map(async ({ id, prompt, placeholder }) => {
        const box = document.getElementById(id);
        box.innerHTML = `<p class="eval-generating">Generating…</p>`;
        try {
            const q = await evalGenerateQuestion(idea, prompt);
            box.innerHTML = `<p class="eval-question-text">${q}</p><textarea class="eval-answer" placeholder="${placeholder}" rows="3"></textarea>`;
        } catch {
            box.innerHTML = `<p class="eval-question-text">${placeholder}</p><textarea class="eval-answer" placeholder="Your answer…" rows="3"></textarea>`;
        }
    });

    await Promise.all(questionPromises);

    window.OrionAnim.revealEvalBoxes();

    evalFinalizeC.classList.remove("hidden");

    evalFinalizeBtn.onclick = async () => {
        // Collect answers
        const answers = QUESTION_BOXES.map(({ id }, i) => {
            const box = document.getElementById(id);
            const q   = box.querySelector(".eval-question-text")?.textContent || "";
            const a   = box.querySelector(".eval-answer")?.value?.trim() || "(no answer)";
            return { q, a };
        });

        const allEmpty = answers.every((a) => a.a === "(no answer)");
        if (allEmpty) {
            await OrionModal.alert(
                "Nothing to Analyse",
                "Please answer at least one question before running the startup analysis.",
                "warning"
            );
            return;
        }

        evalGrid.classList.add("hidden");
        evalFinalizeC.classList.add("hidden");
        evalLoading.classList.remove("hidden");

        const scorecard = await evalGenerateScorecard(idea, answers);
        evalLoading.classList.add("hidden");
        evalScorecard.classList.remove("hidden");
        evalScorecard.innerHTML = scorecard;
        window.OrionAnim.animateMetricBars();
    };
}

async function evalGenerateQuestion(idea, prompt) {
    const res = await fetch(GEMINI_ENDPOINT, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: `Social startup idea: "${idea}". ${prompt} Return only the question itself, no labels, no intro.` }],
            }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 120 },
        }),
    });
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "No question generated.";
}

async function evalGenerateScorecard(idea, answers) {
    const answerText = answers.map(({ q, a }, i) =>
        `Q${i + 1}: ${q}\nAnswer: ${a}`
    ).join("\n\n");

    const prompt = `You are a brutal but fair startup evaluator for social enterprises.

Startup Idea: "${idea}"
Founder Answers:
${answerText}

Evaluate the founder on 4 dimensions (0-100 each):
1. Problem Clarity
2. Market Insight
3. Resource Realism
4. Risk Awareness

Return a concise HTML scorecard (no backticks, no code block). Include:
- <h3> for each dimension with a score e.g. "Problem Clarity — 72/100"
- <p> with 2-sentence assessment
- <div class="metric-bar-track"><div class="metric-bar-fill" data-target="72" data-delay="0" style="background:#4f8ef7;height:4px;width:0%;border-radius:4px;"></div></div>
- A final <p class="eval-verdict"> with 3-sentence overall verdict.`;

    try {
        const res  = await fetch(GEMINI_ENDPOINT, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.6, maxOutputTokens: 1200 },
            }),
        });
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "<p>Could not generate scorecard.</p>";
    } catch {
        return "<p>Scorecard generation failed. Please try again.</p>";
    }
}

// ══════════════════════════════════════════════════════════════
// SIMULATION LAUNCHER
// ══════════════════════════════════════════════════════════════
launchSimBtn?.addEventListener("click", () => {
    if (!appState.activeWorkspace) return;
    const ws    = appState.activeWorkspace;
    const email = appState.user?.email || "";
    const url   = `simulation.html?ws=${ws.id}&user=${encodeURIComponent(email)}&level=${ws.level || appState.userLevel}`;
    window.location.href = url;
});

// ══════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════
function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

console.log("%c[Orion App] Module loaded ✦", "color:#4f8ef7; font-weight:700;");