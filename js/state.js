/**
 * ═══════════════════════════════════════════════════════════════
 *  ORION — Reactive State Manager
 *  Event-driven, centralized state · No circular dependencies
 * ═══════════════════════════════════════════════════════════════
 */

class OrionState {
    constructor() {
        this._listeners = {};
        this._data = {
            // Auth
            user: null,
            userLevel: null,     // explorer | learner | builder | catalyst
            userProfile: null,   // { name, age, gender }

            // Workspaces
            workspaces: [],
            currentWorkspace: null,
            currentWorkspaceId: null,

            // Messages
            messages: [],

            // Views
            currentView: "loading",  // loading | login | onboarding | app
            editorView: "empty",     // empty | workspace | evaluation | simulation

            // Onboarding
            onboarding: {
                idea: "",
                stepIndex: 0,
                maxSteps: 5,
                scores: { explorer: 0, learner: 0, builder: 0, catalyst: 0 },
                history: [],
                answers: {},
                path: [],
                currentQuestionData: null,
                hasProfile: false,
                profileData: null,
                retryCount: 0,
            },

            // Simulation
            simulation: {
                active: false,
                metrics: { funds: 100, trust: 50, impact: 0, sustainability: 50 },
                decisions: [],
                currentScenario: null,
                scenarioIndex: 0,
                stakeholders: {},
                resources: { marketing: 30, operations: 30, research: 20, community: 20 },
                impactLog: [],
            },

            // UI
            theme: localStorage.getItem("orion-theme") || "dark",
            sidebarTab: "workspaces",
        };
    }

    /** Get a state value by dot-notation path */
    get(path) {
        return path.split(".").reduce((obj, key) => obj?.[key], this._data);
    }

    /** Set a state value and emit change event */
    set(path, value) {
        const keys = path.split(".");
        const last = keys.pop();
        const target = keys.reduce((obj, key) => {
            if (!obj[key]) obj[key] = {};
            return obj[key];
        }, this._data);
        const prev = target[last];
        target[last] = value;
        this.emit(`${path}:changed`, value, prev);
        return value;
    }

    /** Update a nested object (merge) */
    merge(path, partial) {
        const current = this.get(path) || {};
        const merged = { ...current, ...partial };
        this.set(path, merged);
        return merged;
    }

    /** Listen for an event */
    on(event, callback) {
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event].push(callback);
        return () => this.off(event, callback);
    }

    /** Remove a listener */
    off(event, callback) {
        if (!this._listeners[event]) return;
        this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
    }

    /** Emit an event */
    emit(event, ...args) {
        const listeners = this._listeners[event] || [];
        listeners.forEach(cb => {
            try { cb(...args); }
            catch (e) { console.error(`[State] Error in listener for "${event}":`, e); }
        });
    }

    /** Get full snapshot (for debugging) */
    snapshot() {
        return JSON.parse(JSON.stringify(this._data));
    }
}

// ── Singleton ──
export const State = new OrionState();
