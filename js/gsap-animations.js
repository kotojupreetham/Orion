/**
 * ═══════════════════════════════════════════════════════════════
 *  ORION — GSAP Animation Engine
 *  Source: temp-UI animation/app/js/gsap-animations.js
 *        + temp-UI animation/onboarding/onboarding.js
 *  20 animation systems · Cinematic Minimalism
 * ═══════════════════════════════════════════════════════════════
 */

// ── GSAP is loaded via CDN in index.html ──

// ══════════════════════════════════════════════════════════════
// 1. GLOBAL DEFAULTS
// ══════════════════════════════════════════════════════════════
gsap.defaults({ ease: "expo.out", duration: 0.7 });

// ══════════════════════════════════════════════════════════════
// 2. MOUSE TRACKING — ambient glow
// ══════════════════════════════════════════════════════════════
let _mouseRAF = false;
document.addEventListener("mousemove", (e) => {
    if (_mouseRAF) return;
    _mouseRAF = true;
    requestAnimationFrame(() => {
        document.documentElement.style.setProperty("--mouse-x", e.clientX + "px");
        document.documentElement.style.setProperty("--mouse-y", e.clientY + "px");
        _mouseRAF = false;
    });
});

// ══════════════════════════════════════════════════════════════
// 3. MAGNETIC MICRO-INTERACTION
// ══════════════════════════════════════════════════════════════
function initMagnetic() {
    document.querySelectorAll(".magnetic").forEach((el) => {
        const strength = 0.35;
        const radius = 80;

        el.addEventListener("mousemove", (e) => {
            const rect = el.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dx = e.clientX - cx;
            const dy = e.clientY - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < radius) {
                gsap.to(el, { x: dx * strength, y: dy * strength, duration: 0.3, ease: "power3.out" });
            }
        });

        el.addEventListener("mouseleave", () => {
            gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.4)" });
        });
    });
}

// ══════════════════════════════════════════════════════════════
// 4. BUTTON SCALE PHYSICS
// ══════════════════════════════════════════════════════════════
function initButtonPhysics() {
    document.querySelectorAll("button, .btn-primary, .btn-ghost, .ob-cta-btn, .cw-chip, .send-btn").forEach((btn) => {
        btn.addEventListener("pointerdown", () => {
            gsap.to(btn, { scale: 0.93, duration: 0.12, ease: "power2.in" });
        });
        btn.addEventListener("pointerup", () => {
            gsap.to(btn, { scale: 1, duration: 0.4, ease: "elastic.out(1, 0.5)" });
        });
        btn.addEventListener("pointerleave", () => {
            gsap.to(btn, { scale: 1, duration: 0.3, ease: "power3.out" });
        });
    });
}

// ══════════════════════════════════════════════════════════════
// 5. 3D TILT PHYSICS (Premium Card Effect)
// ══════════════════════════════════════════════════════════════
function init3DTilt(el) {
    const maxRot = 5; // max degrees
    el.addEventListener("mousemove", (e) => {
        const rect = el.getBoundingClientRect();
        // Mouse position relative to center of element (-0.5 to 0.5)
        const xPct = (e.clientX - rect.left) / rect.width - 0.5;
        const yPct = (e.clientY - rect.top) / rect.height - 0.5;
        
        gsap.to(el, {
            rotationY: xPct * maxRot * 2,
            rotationX: -yPct * maxRot * 2,
            transformPerspective: 1000,
            transformOrigin: "center center",
            duration: 0.4,
            ease: "power2.out",
            force3D: true
        });
    });
    
    el.addEventListener("pointerleave", () => {
        gsap.to(el, {
            rotationY: 0,
            rotationX: 0,
            duration: 0.7,
            ease: "elastic.out(1, 0.4)"
        });
    });
}

// ══════════════════════════════════════════════════════════════
// EXPORTED ANIMATION OBJECT
// ══════════════════════════════════════════════════════════════
export const OrionAnim = {

    /** Initialize all passive effects */
    init() {
        initMagnetic();
        initButtonPhysics();
    },

    /** Apply 3D tilt to a specific element */
    applyTilt(el) {
        init3DTilt(el);
    },

    // ══════════════════════════════════════════════════════════
    // 5. HIDE LOADING SCREEN
    // ══════════════════════════════════════════════════════════
    hideLoader() {
        const el = document.getElementById("loading-screen");
        if (!el) return Promise.resolve();
        return new Promise((resolve) => {
            gsap.to(el, {
                opacity: 0, scale: 1.04, duration: 0.55, ease: "expo.in",
                onComplete: () => { el.classList.add("hidden"); resolve(); },
            });
        });
    },

    // ══════════════════════════════════════════════════════════
    // 6. LOGIN BOOT SEQUENCE
    // ══════════════════════════════════════════════════════════
    showLogin() {
        const screen = document.getElementById("login-screen");
        if (!screen) return;
        screen.classList.remove("hidden");
        screen.classList.add("active");

        const tl = gsap.timeline();
        tl.fromTo(screen, { opacity: 0 }, { opacity: 1, duration: 0.4 });
        tl.fromTo(".login-container", { opacity: 0, y: 30, scale: 0.92 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "back.out(1.4)" }, "-=0.1");
        tl.fromTo(".login-orb", { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(2)" }, "-=0.4");
        tl.fromTo(".login-orb-ring", { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 0.5, duration: 0.8, ease: "expo.out", stagger: 0.15 }, "-=0.3");
        tl.fromTo(".login-brand", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5 }, "-=0.4");
        tl.fromTo(".login-tagline", { opacity: 0 }, { opacity: 1, duration: 0.4 }, "-=0.2");
        tl.fromTo("#google-login-btn", { opacity: 0, y: 10, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(1.4)" }, "-=0.2");
    },

    hideLogin() {
        const screen = document.getElementById("login-screen");
        if (!screen) return Promise.resolve();
        return new Promise((resolve) => {
            gsap.to(screen, {
                opacity: 0, scale: 0.96, duration: 0.4, ease: "expo.in",
                onComplete: () => { screen.classList.add("hidden"); screen.classList.remove("active"); resolve(); },
            });
        });
    },

    // ══════════════════════════════════════════════════════════
    // 7. APP SHELL BOOT — cinematic entrance
    // ══════════════════════════════════════════════════════════
    showApp() {
        const app = document.getElementById("app-screen");
        if (!app) return;
        app.classList.add("active");

        const tl = gsap.timeline({ delay: 0.1 });
        tl.fromTo(app, { opacity: 0 }, { opacity: 1, duration: 0.3 });
        tl.fromTo(".toolbar", { y: -46, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, "-=0.1");
        tl.fromTo(".toolbar-logo", { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.4 }, "-=0.2");
        tl.fromTo(".ide-sidebar", { x: -256, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6 }, "-=0.3");
        tl.fromTo(".ide-editor", { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.5 }, "-=0.3");
        tl.fromTo(".ide-right-panel", { x: 236, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5 }, "-=0.3");
        tl.fromTo(".status-bar", { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 }, "-=0.2");
    },

    // ══════════════════════════════════════════════════════════
    // 8. CENTER CROSSFADE — swap editor views
    // ══════════════════════════════════════════════════════════
    crossfadeCenter(hideEl, showEl, onMidpoint) {
        const tl = gsap.timeline();

        if (hideEl) {
            tl.to(hideEl, { opacity: 0, scale: 0.97, duration: 0.25, ease: "power3.in" });
            tl.call(() => {
                hideEl.classList.add("hidden");
                gsap.set(hideEl, { clearProps: "all" });
                if (onMidpoint) onMidpoint();
            });
        } else if (onMidpoint) {
            onMidpoint();
        }

        if (showEl) {
            tl.call(() => showEl.classList.remove("hidden"));
            tl.fromTo(showEl, { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.45, ease: "expo.out" });

            // Stagger child reveals
            const reveals = showEl.querySelectorAll(".gsap-reveal");
            if (reveals.length) {
                tl.fromTo(reveals, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.06, ease: "expo.out" }, "-=0.2");
            }
        }

        return tl;
    },

    // ══════════════════════════════════════════════════════════
    // 9. THEME TOGGLE
    // ══════════════════════════════════════════════════════════
    toggleTheme(newTheme) {
        gsap.timeline()
            .to("body", { opacity: 0.7, scale: 0.97, duration: 0.15, ease: "power3.in" })
            .call(() => {
                document.documentElement.setAttribute("data-theme", newTheme);
                localStorage.setItem("orion-theme", newTheme);
            })
            .to("body", { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(1.5)" });
    },

    // ══════════════════════════════════════════════════════════
    // 10. MESSAGE APPEAR
    // ══════════════════════════════════════════════════════════
    animateMessage(el) {
        gsap.fromTo(el, { y: 14, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: "expo.out" });
    },

    // ══════════════════════════════════════════════════════════
    // 11. WORKSPACE ITEM STAGGER
    // ══════════════════════════════════════════════════════════
    animateWorkspaceItem(el, index = 0) {
        gsap.fromTo(el, { x: -16, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, delay: index * 0.04, ease: "expo.out" });
    },

    // ══════════════════════════════════════════════════════════
    // 12. EVAL BOX STAGGER
    // ══════════════════════════════════════════════════════════
    revealEvalBoxes() {
        gsap.fromTo(".eval-box", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: "expo.out" });
    },

    // ══════════════════════════════════════════════════════════
    // 13. SCORECARD BAR FILL & COUNTER
    // ══════════════════════════════════════════════════════════
    animateMetricBars() {
        document.querySelectorAll(".metric-bar-fill, .am-bar-fill").forEach((bar, i) => {
            const target = bar.dataset.target || parseFloat(bar.style.width) || "0";
            gsap.fromTo(bar, { width: "0%" }, { width: target + "%", duration: 1.3, delay: i * 0.12, ease: "expo.out" });
        });
    },

    animateCounter(el, endValue, suffix = "%", duration = 1.3, delay = 0) {
        gsap.fromTo(el, 
            { innerText: 0 }, 
            { 
                innerText: endValue, 
                duration: duration, 
                delay: delay,
                snap: { innerText: 1 }, 
                ease: "expo.out",
                onUpdate: function() { 
                    el.textContent = Math.round(parseFloat(el.textContent)) + suffix; 
                }
            }
        );
    },

    // ══════════════════════════════════════════════════════════
    // 14. GENERIC REVEAL
    // ══════════════════════════════════════════════════════════
    reveal(target, opts = {}) {
        const defaults = { y: 18, opacity: 0, duration: 0.5, ease: "expo.out" };
        gsap.fromTo(target, { y: defaults.y, opacity: 0 }, { y: 0, opacity: 1, ...defaults, ...opts });
    },

    // ══════════════════════════════════════════════════════════
    // 15. ONBOARDING: SLIDE TRANSITION
    // ══════════════════════════════════════════════════════════
    slideTransition(fromEl, toEl, direction = "forward", onMidpoint = null) {
        const outY = direction === "forward" ? -50 : 50;
        const inY  = direction === "forward" ? 50 : -50;
        const tl = gsap.timeline();

        if (fromEl && !fromEl.classList.contains("hidden")) {
            tl.to(fromEl, { y: outY, opacity: 0, duration: 0.38, ease: "power3.in" });
            tl.call(() => {
                fromEl.classList.add("hidden");
                gsap.set(fromEl, { clearProps: "all" });
                if (onMidpoint) onMidpoint();
            });
        } else if (onMidpoint) {
            onMidpoint();
        }

        tl.call(() => {
            toEl.classList.remove("hidden");
            gsap.set(toEl, { y: inY, opacity: 0 });
        });
        tl.to(toEl, { y: 0, opacity: 1, duration: 0.55, ease: "power4.out" }, "+=0.04");

        // Stagger interactive children
        tl.fromTo(
            toEl.querySelectorAll(".option-card, .chip-item, .ranking-item, .ob-cta-btn, .ob-ghost-btn"),
            { y: 12, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.35, ease: "power3.out", stagger: 0.06 },
            "-=0.3"
        );

        return tl;
    },

    // ══════════════════════════════════════════════════════════
    // 16. ONBOARDING: OPTION COMPRESS
    // ══════════════════════════════════════════════════════════
    selectOptionAnimation(el) {
        return new Promise((resolve) => {
            gsap.timeline({ onComplete: resolve })
                .to(el, { scale: 0.95, duration: 0.10, ease: "power2.in" })
                .to(el, { scale: 1.00, duration: 0.25, ease: "back.out(2)" });
        });
    },

    // ══════════════════════════════════════════════════════════
    // 17. ONBOARDING: PROGRESS BAR
    // ══════════════════════════════════════════════════════════
    animateProgressBar(el, pct) {
        gsap.to(el, { width: pct + "%", duration: 1.0, ease: "expo.out" });
    },

    // ══════════════════════════════════════════════════════════
    // 18. SHAKE VALIDATION
    // ══════════════════════════════════════════════════════════
    shake(el) {
        gsap.to(el, { x: -7, duration: 0.06, yoyo: true, repeat: 5, ease: "none", onComplete: () => gsap.set(el, { x: 0 }) });
    },

    // ══════════════════════════════════════════════════════════
    // 19. ONBOARDING: RESULT REVEAL — hero typography
    // ══════════════════════════════════════════════════════════
    revealResult({ iconEl, levelEl, taglineEl, barsEl, descEl, enterBtn }) {
        const tl = gsap.timeline();

        // Eyebrow
        const eyebrow = document.getElementById("result-eyebrow");
        if (eyebrow) tl.fromTo(eyebrow, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: "expo.out" });

        // Icon pop
        if (iconEl) tl.fromTo(iconEl, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.7, ease: "back.out(2.2)" }, "-=0.1");

        // HERO: level name scale 0.8 → 1, 2s, expo.out
        if (levelEl) tl.fromTo(levelEl, { scale: 0.8, opacity: 0, y: 20 }, { scale: 1, opacity: 1, y: 0, duration: 2.0, ease: "expo.out" }, "-=0.2");

        // Tagline
        if (taglineEl) tl.fromTo(taglineEl, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, ease: "expo.out" }, "-=1.4");

        // Score bars
        if (barsEl) {
            tl.call(() => {
                barsEl.querySelectorAll(".score-bar").forEach((bar) => {
                    const target = parseFloat(bar.dataset.target || 0);
                    const delay = parseFloat(bar.dataset.delay || 0);
                    gsap.fromTo(bar, { width: "0%" }, { width: target + "%", duration: 1.1, ease: "expo.out", delay });
                });
            }, null, "-=0.8");
        }

        // Description card
        if (descEl) tl.fromTo(descEl, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, ease: "expo.out" }, "-=0.4");

        // Enter button
        if (enterBtn) tl.fromTo(enterBtn, { opacity: 0, y: 10, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(1.4)" }, "-=0.3");

        return tl;
    },

    // ══════════════════════════════════════════════════════════
    // 20. CHAT WELCOME REVEAL
    // ══════════════════════════════════════════════════════════
    revealChatWelcome(container) {
        if (!container) return;
        const tl = gsap.timeline();
        tl.fromTo(container.querySelector(".cw-greeting"), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, 0.1);
        tl.fromTo(container.querySelector(".cw-wave"), { rotate: 0 }, { rotate: 20, duration: 0.3, yoyo: true, repeat: 2, ease: "power2.inOut" }, 0.3);
        tl.fromTo(container.querySelector(".cw-idea-card"), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, 0.3);
        tl.fromTo(container.querySelectorAll(".cw-chip"), { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, stagger: 0.06, ease: "expo.out" }, 0.5);
    },

    // ══════════════════════════════════════════════════════════
    // 21. SIMULATION METRIC FLASH
    // ══════════════════════════════════════════════════════════
    flashMetricPill(el) {
        el.classList.add("flash");
        gsap.fromTo(el, { scale: 1.08 }, { scale: 1, duration: 0.5, ease: "elastic.out(1, 0.5)" });
        setTimeout(() => el.classList.remove("flash"), 600);
    },

    // ══════════════════════════════════════════════════════════
    // 22. SIMULATION LIVE BAR UPDATE
    // ══════════════════════════════════════════════════════════
    animateLiveBar(fillEl, valueEl, targetPct, label) {
        gsap.to(fillEl, { width: targetPct + "%", duration: 0.8, ease: "expo.out" });
        if (valueEl) {
            gsap.to(valueEl, { innerText: Math.round(targetPct), duration: 0.6, snap: { innerText: 1 }, ease: "power2.out",
                onUpdate: function() { valueEl.textContent = Math.round(parseFloat(valueEl.textContent)) + (label || ""); }
            });
        }
    },
};
