// js/ui/chat.js
// Takes callbacks — never imports from app.js
import { db } from "../core/firebase-config.js";
import { AppState } from "../core/state.js";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { updateMsgCount } from "./right-panel.js";

const msgArea   = document.getElementById("msg-area");
const msgInput  = document.getElementById("msg-input");
const sendBtn   = document.getElementById("send-btn");
const statusCnt = document.getElementById("status-count");

function esc(s) {
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

export function loadMessages(workspaceId) {
    if (AppState.unsubMessages) AppState.unsubMessages();
    if (!msgArea) return;
    msgArea.innerHTML = "";

    const q = query(
        collection(db, "messages"),
        where("workspaceId", "==", workspaceId),
        orderBy("timestamp", "asc")
    );

    AppState.unsubMessages = onSnapshot(q, (snap) => {
        updateMsgCount(snap.size);
        if (statusCnt) statusCnt.textContent = snap.size;

        snap.docChanges().forEach(change => {
            if (change.type === "added") {
                const d = change.doc.data();
                const el = document.createElement("div");
                el.className = "msg extrude";
                el.innerHTML = `<span class="msg-tag">SYS&gt;</span><span class="msg-body">${esc(d.text)}</span>`;
                msgArea.appendChild(el);

                // 3D entry from deep Z
                gsap.fromTo(el,
                    { z: -400, rotateX: 50, opacity: 0 },
                    { z: 0, rotateX: 0, opacity: 1, duration: 0.9, ease: "back.out(1.3)" }
                );
            }
        });

        requestAnimationFrame(() => {
            msgArea.scrollTo({ top: msgArea.scrollHeight, behavior: "smooth" });
        });
    }, (error) => {
        console.error("🔥 MESSAGES ERROR:", error);
        if (error.code === 'failed-precondition') {
            console.warn("⚠️ Firestore Composite Index Required! Check the link in the error above.");
        }
    });
}

async function sendMessage() {
    const text = msgInput?.value.trim();
    if (!text || !AppState.currentWorkspaceId) return;
    msgInput.value = "";

    // Send button press animation
    gsap.fromTo(sendBtn, { scale: 0.85 }, { scale: 1, duration: 0.5, ease: "elastic.out(1, 0.35)" });

    try {
        await addDoc(collection(db, "messages"), {
            workspaceId: AppState.currentWorkspaceId,
            text,
            timestamp: serverTimestamp()
        });
        console.log("✅ Message sent successfully");
    } catch (e) {
        console.error("❌ Send error:", e);
        // Put text back if it failed
        if (msgInput) msgInput.value = text;
    }
}

sendBtn?.addEventListener("click", sendMessage);
msgInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
