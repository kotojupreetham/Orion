/**
 * ═══════════════════════════════════════════════════════════════
 *  ORION — Firebase Auth Module
 *  Google sign-in with clean event dispatching
 * ═══════════════════════════════════════════════════════════════
 */

import { FIREBASE_CONFIG } from "./config.js";
import { State } from "./state.js";

// ── Firebase SDK (CDN) ──
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    signOut,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ── Initialize ──
const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ── Export raw auth for other modules ──
export { app, auth };

// ── Auth State Listener ──
onAuthStateChanged(auth, (user) => {
    if (user) {
        State.set("user", {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
        });
        State.emit("auth:signedIn", user);
    } else {
        State.set("user", null);
        State.emit("auth:signedOut");
    }
});

// ── Sign In ──
export async function signInWithGoogle() {
    try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (error) {
        console.error("[Auth] Sign-in error:", error);
        State.emit("auth:error", error);
        return null;
    }
}

// ── Sign Out ──
export async function logOut() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("[Auth] Sign-out error:", error);
    }
}
