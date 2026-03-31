/**
 * ═══════════════════════════════════════════════════════════════
 *  ORION — Firestore Database Abstraction
 *  Workspace CRUD · Real-time listeners · Message persistence
 * ═══════════════════════════════════════════════════════════════
 */

import { app } from "./auth.js";
import { State } from "./state.js";

import {
    getFirestore,
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    setDoc,
    onSnapshot,
    serverTimestamp,
    query,
    orderBy,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const db = getFirestore(app);
export { db };

// ══════════════════════════════════════════════════════════════
// WORKSPACE CRUD
// ══════════════════════════════════════════════════════════════

/** Create a new workspace */
export async function createWorkspace(idea, level = "explorer") {
    const user = State.get("user");
    if (!user) return null;

    const wsRef = await addDoc(collection(db, "workspaces"), {
        userId: user.uid,
        userEmail: user.email,
        idea: idea,
        level: level,
        title: idea.substring(0, 40) + (idea.length > 40 ? "…" : ""),
        messages: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return wsRef.id;
}

/** Load workspaces with real-time listener */
export function listenWorkspaces(callback) {
    const user = State.get("user");
    if (!user) return () => {};

    const q = query(
        collection(db, "workspaces"),
        orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (snapshot) => {
        const workspaces = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.userId === user.uid || data.userEmail === user.email) {
                workspaces.push({ id: doc.id, ...data });
            }
        });
        State.set("workspaces", workspaces);
        if (callback) callback(workspaces);
    });
}

/** Delete a workspace */
export async function deleteWorkspace(wsId) {
    try {
        await deleteDoc(doc(db, "workspaces", wsId));
        // If this was the active workspace, clear it
        if (State.get("currentWorkspaceId") === wsId) {
            State.set("currentWorkspace", null);
            State.set("currentWorkspaceId", null);
            State.set("messages", []);
            State.emit("workspace:cleared");
        }
        return true;
    } catch (e) {
        console.error("[DB] Delete workspace error:", e);
        return false;
    }
}

/** Update workspace title */
export async function updateWorkspaceTitle(wsId, title) {
    try {
        await updateDoc(doc(db, "workspaces", wsId), {
            title: title,
            updatedAt: serverTimestamp(),
        });
    } catch (e) {
        console.error("[DB] Update title error:", e);
    }
}

/** Save messages to workspace */
let _saveDebounce = null;
export function saveMessages(wsId, messages) {
    clearTimeout(_saveDebounce);
    _saveDebounce = setTimeout(async () => {
        try {
            await updateDoc(doc(db, "workspaces", wsId), {
                messages: messages,
                updatedAt: serverTimestamp(),
            });
        } catch (e) {
            console.error("[DB] Save messages error:", e);
        }
    }, 800);
}

/** Load a single workspace */
export async function loadWorkspace(wsId) {
    try {
        const snap = await getDoc(doc(db, "workspaces", wsId));
        if (snap.exists()) {
            return { id: snap.id, ...snap.data() };
        }
        return null;
    } catch (e) {
        console.error("[DB] Load workspace error:", e);
        return null;
    }
}

// ══════════════════════════════════════════════════════════════
// USER PROFILE / ONBOARDING
// ══════════════════════════════════════════════════════════════

/** Save onboarding result */
export async function saveOnboardingResult(email, level, scores, profile, idea) {
    try {
        await setDoc(doc(db, "users", email), {
            level: level,
            scores: scores,
            profile: profile,
            idea: idea,
            completedAt: serverTimestamp(),
        }, { merge: true });
    } catch (e) {
        console.error("[DB] Save onboarding error:", e);
    }
}

/** Check if user has completed onboarding */
export async function getUserProfile(email) {
    try {
        const snap = await getDoc(doc(db, "users", email));
        if (snap.exists()) return snap.data();
        return null;
    } catch (e) {
        console.error("[DB] Get profile error:", e);
        return null;
    }
}

/** Save simulation state */
export async function saveSimulationState(wsId, simData) {
    try {
        await updateDoc(doc(db, "workspaces", wsId), {
            simulation: simData,
            updatedAt: serverTimestamp(),
        });
    } catch (e) {
        console.error("[DB] Save simulation error:", e);
    }
}
