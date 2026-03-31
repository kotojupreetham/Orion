/**
 * ORION — Workspace: Chat view with messages + AI responses
 */
import { State } from "../state.js";
import { saveMessages } from "../db.js";
import { getChatResponse } from "../ai.js";
import { OrionAnim } from "../gsap-animations.js";
import { PROMPT_SUGGESTIONS } from "../config.js";

export function initWorkspace() {
    const input = document.getElementById("message-input");
    const sendBtn = document.querySelector(".send-btn");
    const container = document.querySelector(".messages-container");

    if (sendBtn) sendBtn.addEventListener("click", () => sendMessage());
    if (input) {
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
        });
        input.addEventListener("input", () => {
            input.style.height = "auto";
            input.style.height = Math.min(input.scrollHeight, 120) + "px";
        });
    }

    // Chip click handler (delegated)
    if (container) {
        container.addEventListener("click", (e) => {
            const chip = e.target.closest(".cw-chip");
            if (chip) {
                const text = chip.querySelector(".cw-chip-text")?.textContent || chip.textContent;
                if (input) input.value = text;
                sendMessage();
            }
        });
    }
}

export function showWorkspaceView(ws) {
    const view = document.getElementById("workspace-view");
    const emptyState = document.querySelector(".editor-empty");
    const titleEl = document.getElementById("workspace-title");
    const levelPill = document.getElementById("level-pill");
    const container = document.querySelector(".messages-container");

    if (emptyState) {
        emptyState.classList.add("hidden");
        emptyState.classList.remove("active");
    }
    if (view) view.classList.remove("hidden");
    if (titleEl) { titleEl.textContent = ws.title || ws.idea || "Untitled"; titleEl.contentEditable = "true"; }
    if (levelPill) { levelPill.textContent = (ws.level || "explorer").toUpperCase(); levelPill.className = `level-pill ${ws.level || "explorer"}`; }

    // Render messages or welcome
    const messages = ws.messages || [];
    State.set("messages", messages);
    renderMessages(messages, ws);
}

function renderMessages(messages, ws) {
    const container = document.querySelector(".messages-container");
    if (!container) return;
    container.innerHTML = "";

    if (!messages.length) {
        // Show welcome state
        const welcome = document.createElement("div");
        welcome.className = "chat-welcome";
        welcome.innerHTML = `
            <div class="cw-greeting">
                <span class="cw-wave">👋</span>
                <div>
                    <div class="cw-title">Welcome to your workspace</div>
                    <p class="cw-sub">Ask Orion anything about your initiative. I'll help analyze, strategize, and challenge your thinking.</p>
                </div>
            </div>
            <div class="cw-idea-card">
                <span class="cw-idea-label">Your Initiative</span>
                <p class="cw-idea-text">${ws.idea || "No idea set"}</p>
            </div>
            <div class="cw-divider-row"><div class="cw-divider-line"></div><span class="cw-divider-text">Try asking</span><div class="cw-divider-line"></div></div>
            <div class="cw-chips">
                ${PROMPT_SUGGESTIONS.map(s => `<div class="cw-chip"><span class="cw-chip-icon">${s.icon}</span><span class="cw-chip-text">${s.text}</span></div>`).join("")}
            </div>`;
        container.appendChild(welcome);
        OrionAnim.revealChatWelcome(welcome);
        return;
    }

    messages.forEach(msg => {
        const el = createMessageEl(msg);
        container.appendChild(el);
    });
    container.scrollTop = container.scrollHeight;
}

function createMessageEl(msg) {
    const el = document.createElement("div");
    el.className = `message ${msg.role === "ai" ? "ai-message" : ""}`;
    el.innerHTML = `<span class="message-prefix">${msg.role === "ai" ? "ORION" : "YOU"}</span><span class="message-text">${msg.text}</span>`;
    return el;
}

async function sendMessage() {
    const input = document.getElementById("message-input");
    const text = input?.value?.trim();
    if (!text) return;
    input.value = "";
    input.style.height = "auto";

    const wsId = State.get("currentWorkspaceId");
    const ws = State.get("currentWorkspace");
    if (!wsId || !ws) return;

    // Hide welcome
    const welcome = document.querySelector(".chat-welcome");
    if (welcome) welcome.remove();

    // Add user message
    const messages = State.get("messages") || [];
    messages.push({ role: "user", text, ts: Date.now() });
    State.set("messages", messages);

    const container = document.querySelector(".messages-container");
    const userEl = createMessageEl({ role: "user", text });
    container.appendChild(userEl);
    OrionAnim.animateMessage(userEl);
    container.scrollTop = container.scrollHeight;

    // Get AI response
    const history = messages.map(m => ({ role: m.role, content: m.text }));
    const reply = await getChatResponse(text, ws.idea, ws.level, history);

    messages.push({ role: "ai", text: reply, ts: Date.now() });
    State.set("messages", messages);
    saveMessages(wsId, messages);

    const aiEl = createMessageEl({ role: "ai", text: reply });
    container.appendChild(aiEl);
    OrionAnim.animateMessage(aiEl);
    container.scrollTop = container.scrollHeight;
}

export function clearWorkspaceView() {
    const view = document.getElementById("workspace-view");
    const emptyState = document.querySelector(".editor-empty");
    if (view) view.classList.add("hidden");
    if (emptyState) {
        emptyState.classList.remove("hidden");
        emptyState.classList.add("active");
    }
}
