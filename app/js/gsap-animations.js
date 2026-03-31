/**
 * ═══════════════════════════════════════════════════════════════
 *  ORION — GSAP Animation Engine  (js/gsap-animations.js)
 *  Loaded as a regular script (no module) so GSAP globals are
 *  available synchronously before app.js module executes.
 * ═══════════════════════════════════════════════════════════════
 */

/* ── Register GSAP plugins ───────────────────────────────────── */
gsap.registerPlugin(ScrollTrigger);

/* ══════════════════════════════════════════════════════════════
   1. GLOBAL EASE + DEFAULTS
   ══════════════════════════════════════════════════════════════ */
gsap.defaults({ ease: 'expo.out', duration: 0.7 });

/* ══════════════════════════════════════════════════════════════
   2. CSS CUSTOM PROPERTY MOUSE TRACKING
   (powers the ambient background radial gradient)
   ══════════════════════════════════════════════════════════════ */
(function initMouseTrack() {
    let rafId = null;
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;

    document.addEventListener('mousemove', (e) => {
        mx = e.clientX;
        my = e.clientY;
        if (!rafId) {
            rafId = requestAnimationFrame(() => {
                document.documentElement.style.setProperty('--mouse-x', mx + 'px');
                document.documentElement.style.setProperty('--mouse-y', my + 'px');
                rafId = null;
            });
        }
    });
})();

/* ══════════════════════════════════════════════════════════════
   3. MAGNETIC MICRO-INTERACTION
   Subtle magnetic pull on elements with class="magnetic"
   ══════════════════════════════════════════════════════════════ */
(function initMagnetic() {
    function attachMagnetic(el) {
        const STRENGTH = 0.35;   // 0 = snap-back, 1 = full follow
        const MAX_DIST = 80;     // px radius to activate

        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top  + rect.height / 2;
            const dx = e.clientX - cx;
            const dy = e.clientY - cy;
            const dist = Math.hypot(dx, dy);

            if (dist < MAX_DIST) {
                gsap.to(el, {
                    x: dx * STRENGTH,
                    y: dy * STRENGTH,
                    duration: 0.4,
                    ease: 'power2.out',
                    overwrite: 'auto',
                });
            }
        });

        el.addEventListener('mouseleave', () => {
            gsap.to(el, {
                x: 0, y: 0,
                duration: 0.6,
                ease: 'elastic.out(1.2, 0.5)',
                overwrite: 'auto',
            });
        });
    }

    // Attach to all existing magnetic elements
    function bindAll() {
        document.querySelectorAll('.magnetic').forEach(attachMagnetic);
    }

    // Re-run when new magnetic elements appear (e.g. dynamic workspace items)
    const magneticObserver = new MutationObserver((mutations) => {
        mutations.forEach((m) => {
            m.addedNodes.forEach((node) => {
                if (node.nodeType !== 1) return;
                if (node.classList && node.classList.contains('magnetic')) attachMagnetic(node);
                node.querySelectorAll && node.querySelectorAll('.magnetic').forEach(attachMagnetic);
            });
        });
    });

    document.addEventListener('DOMContentLoaded', () => {
        bindAll();
        magneticObserver.observe(document.body, { childList: true, subtree: true });
    });
})();

/* ══════════════════════════════════════════════════════════════
   4. BUTTON GSAP SCALE PHYSICS
   (supplements CSS transition with spring press feel)
   ══════════════════════════════════════════════════════════════ */
(function initButtonPhysics() {
    document.addEventListener('pointerdown', (e) => {
        const btn = e.target.closest('button, .btn');
        if (!btn) return;
        gsap.to(btn, { scale: 0.93, duration: 0.12, ease: 'power2.in', overwrite: 'auto' });
    });
    document.addEventListener('pointerup', (e) => {
        const btn = e.target.closest('button, .btn');
        if (!btn) return;
        gsap.to(btn, { scale: 1, duration: 0.5, ease: 'elastic.out(1.3, 0.6)', overwrite: 'auto' });
    });
    document.addEventListener('pointerleave', (e) => {
        const btn = e.target.closest('button, .btn');
        if (!btn) return;
        gsap.to(btn, { scale: 1, duration: 0.35, ease: 'expo.out', overwrite: 'auto' });
    }, true);
})();

/* ══════════════════════════════════════════════════════════════
   5. LOADING SCREEN → HIDE
   Called by app.js when Firebase auth is ready.
   ══════════════════════════════════════════════════════════════ */
window.OrionAnim = window.OrionAnim || {};

window.OrionAnim.hideLoader = function (onComplete) {
    const screen = document.getElementById('loading-screen');
    if (!screen) { onComplete && onComplete(); return; }

    gsap.to(screen, {
        opacity: 0,
        scale: 1.04,
        duration: 0.55,
        ease: 'expo.in',
        onComplete() {
            screen.style.display = 'none';
            onComplete && onComplete();
        },
    });
};

/* ══════════════════════════════════════════════════════════════
   6. LOGIN SCREEN — EPIC BOOT SEQUENCE
   Mask-up staggered reveal for each text block.
   ══════════════════════════════════════════════════════════════ */
window.OrionAnim.showLogin = function () {
    const screen = document.getElementById('login-screen');
    screen.classList.remove('hidden');

    // Pre-set all elements invisible
    gsap.set('#login-card', { opacity: 0, y: 32 });
    gsap.set('.login-orb', { scale: 0.4, opacity: 0 });
    gsap.set('.login-orb-ring', { opacity: 0 });
    gsap.set('.login-logo, .login-logo-sub, .login-headline, .login-sub, .login-cta-hint, #login-btn', { opacity: 0, y: 16 });
    gsap.set(screen, { opacity: 0 });

    const tl = gsap.timeline();

    // 1. Fade screen in
    tl.to(screen, { opacity: 1, duration: 0.5, ease: 'expo.out' });

    // 2. Card rises up
    tl.to('#login-card', { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' }, '-=0.2');

    // 3. Orb pops in
    tl.to('.login-orb', { scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(2)' }, '-=0.4');

    // 4. Rings fade in
    tl.to('.login-orb-ring', { opacity: 1, duration: 0.4 }, '-=0.2');

    // 5. Text stagger up
    tl.to('.login-logo', { opacity: 1, y: 0, duration: 0.55, ease: 'expo.out' }, '-=0.1');
    tl.to('.login-logo-sub', { opacity: 1, y: 0, duration: 0.45, ease: 'expo.out' }, '-=0.35');
    tl.to('.login-headline', { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' }, '-=0.3');
    tl.to('.login-sub', { opacity: 1, y: 0, duration: 0.45, ease: 'expo.out' }, '-=0.3');
    tl.to('.login-cta-hint', { opacity: 1, y: 0, duration: 0.4, ease: 'expo.out' }, '-=0.25');
    tl.to('#login-btn', { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.4)' }, '-=0.2');

    // 6. Theme button
    tl.fromTo('#login-theme-btn',
        { opacity: 0, y: -8 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'expo.out' },
        0.3
    );
};

/* ══════════════════════════════════════════════════════════════
   7. APP SCREEN — BOOT REVEAL
   Full cinematic entrance of the IDE shell.
   ══════════════════════════════════════════════════════════════ */
window.OrionAnim.showApp = function () {
    const app = document.getElementById('app-screen');
    app.classList.remove('hidden');
    app.classList.add('active');

    // Pre-set logo invisible so it doesn't flash before GSAP fires
    gsap.set('#app-logo', { opacity: 0, y: 10 });

    const tl = gsap.timeline();

    // 1. Background fades in slowly
    tl.fromTo(app,
        { opacity: 0 },
        { opacity: 1, duration: 1.0, ease: 'expo.out' }
    );

    // 2. Toolbar slides down
    tl.fromTo('.toolbar',
        { y: -48, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out' },
        '-=0.6'
    );

    // 3. Logo text reveal — clean fade-up, no yPercent to avoid flex misalignment
    tl.fromTo('#app-logo',
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out' },
        '-=0.55'
    );

    // 4. Sidebar slides in from left
    tl.fromTo('#sidebar',
        { x: -40, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.9, ease: 'expo.out' },
        '-=0.7'
    );

    // 5. Main editor fades up
    tl.fromTo('#ide-editor',
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, ease: 'expo.out' },
        '-=0.65'
    );

    // 6. Right panel slides from right
    tl.fromTo('#right-panel',
        { x: 40, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.9, ease: 'expo.out' },
        '-=0.8'
    );

    // 7. Status bar rises from bottom
    tl.fromTo('.status-bar',
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out' },
        '-=0.5'
    );

    // 8. Empty state text stagger
    tl.fromTo('#empty-state .gsap-reveal',
        { y: 20, opacity: 0 },
        {
            y: 0, opacity: 1,
            duration: 0.8,
            ease: 'expo.out',
            stagger: 0.09,
        },
        '-=0.4'
    );

    // 9. Toolbar buttons stagger in
    tl.fromTo('.toolbar-btn, .toolbar-icon-btn, .theme-toggle, .toolbar-avatar',
        { opacity: 0, scale: 0.85 },
        {
            opacity: 1, scale: 1,
            duration: 0.5,
            ease: 'back.out(1.4)',
            stagger: 0.06,
        },
        '-=0.6'
    );
};

/* ══════════════════════════════════════════════════════════════
   8. WORKSPACE SELECTION — CENTER PANEL CROSSFADE
   Animates out the current content, then fades new content in.
   ══════════════════════════════════════════════════════════════ */
window.OrionAnim.crossfadeCenter = function (onSwap) {
    const wrap = document.getElementById('center-content-wrap');

    const tl = gsap.timeline();

    // Out: scale down + fade
    tl.to(wrap, {
        scale: 0.97,
        opacity: 0,
        duration: 0.22,
        ease: 'expo.in',
    });

    // Swap DOM content at the invisible moment
    tl.call(() => { onSwap && onSwap(); });

    // In: scale up + fade (spring feel)
    tl.fromTo(wrap,
        { scale: 0.97, opacity: 0 },
        {
            scale: 1,
            opacity: 1,
            duration: 0.55,
            ease: 'expo.out',
        }
    );

    // Stagger any .gsap-reveal children inside
    tl.fromTo('#center-content-wrap .gsap-reveal',
        { y: 14, opacity: 0 },
        {
            y: 0, opacity: 1,
            duration: 0.5,
            ease: 'expo.out',
            stagger: 0.07,
        },
        '-=0.4'
    );

    return tl;
};

/* ══════════════════════════════════════════════════════════════
   9. THEME TOGGLE ANIMATION
   Scale down → swap theme attr → spring scale back.
   ══════════════════════════════════════════════════════════════ */
window.OrionAnim.toggleTheme = function () {
    const root = document.documentElement;
    const currentTheme = root.getAttribute('data-theme') || 'dark';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

    const tl = gsap.timeline();

    // 1. Scale the whole app down
    tl.to('#app-screen, #login-screen', {
        scale: 0.96,
        opacity: 0.85,
        duration: 0.18,
        ease: 'power3.in',
        overwrite: 'auto',
    });

    // 2. Swap theme at the compressed moment
    tl.call(() => {
        root.setAttribute('data-theme', nextTheme);
        localStorage.setItem('orion-theme', nextTheme);

        // Update icon(s)
        const icons = document.querySelectorAll('#theme-icon, #login-theme-icon');
        icons.forEach(ic => { ic.textContent = nextTheme === 'dark' ? '☽' : '☀'; });
    });

    // 3. Spring back up
    tl.to('#app-screen, #login-screen', {
        scale: 1,
        opacity: 1,
        duration: 0.65,
        ease: 'back.out(1.5)',
        overwrite: 'auto',
    });

    // 4. Flash-pulse the accent borders to signal change
    tl.fromTo('.toolbar, #sidebar, .ide-editor',
        { outlineColor: 'transparent' },
        {
            outlineColor: 'transparent',
            duration: 0.4,
        },
        '-=0.5'
    );
};

/* ══════════════════════════════════════════════════════════════
   10. ONBOARDING MODAL ANIMATION
   ══════════════════════════════════════════════════════════════ */
window.OrionAnim.showOnboarding = function () {
    const overlay = document.getElementById('onboarding-overlay');
    const inner   = overlay.querySelector('.onboarding-modal-inner');
    overlay.classList.remove('hidden');

    gsap.fromTo(overlay,
        { opacity: 0 },
        { opacity: 1, duration: 0.35, ease: 'expo.out' }
    );
    gsap.fromTo(inner,
        { scale: 0.88, y: 30, opacity: 0 },
        { scale: 1, y: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.4)' }
    );
};

window.OrionAnim.hideOnboarding = function (onComplete) {
    const overlay = document.getElementById('onboarding-overlay');
    const inner   = overlay.querySelector('.onboarding-modal-inner');

    const tl = gsap.timeline({ onComplete() {
        overlay.classList.add('hidden');
        onComplete && onComplete();
    }});
    tl.to(inner,   { scale: 0.9, y: 20, opacity: 0, duration: 0.3, ease: 'expo.in' });
    tl.to(overlay, { opacity: 0, duration: 0.25, ease: 'expo.in' }, '-=0.1');
};

/* ══════════════════════════════════════════════════════════════
   11. MESSAGE APPEAR ANIMATION
   Called when a new message bubble is added to the chat.
   ══════════════════════════════════════════════════════════════ */
window.OrionAnim.animateMessage = function (el) {
    gsap.fromTo(el,
        { y: 14, opacity: 0, scale: 0.97 },
        { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'expo.out' }
    );
};

/* ══════════════════════════════════════════════════════════════
   12. EVAL BOX STAGGER IN
   ══════════════════════════════════════════════════════════════ */
window.OrionAnim.revealEvalBoxes = function () {
    gsap.fromTo('.eval-box',
        { y: 24, opacity: 0 },
        {
            y: 0, opacity: 1,
            duration: 0.65,
            ease: 'expo.out',
            stagger: 0.1,
        }
    );
};

/* ══════════════════════════════════════════════════════════════
   13. SIDEBAR WORKSPACE ITEM APPEAR
   ══════════════════════════════════════════════════════════════ */
window.OrionAnim.animateWorkspaceItem = function (el, index) {
    gsap.fromTo(el,
        { x: -16, opacity: 0 },
        {
            x: 0, opacity: 1,
            duration: 0.4,
            ease: 'expo.out',
            delay: index * 0.04,
        }
    );
};

/* ══════════════════════════════════════════════════════════════
   14. GENERIC REVEAL UTILITY
   Pass any element or selector; plays a clean fade-up.
   ══════════════════════════════════════════════════════════════ */
window.OrionAnim.reveal = function (target, options = {}) {
    const defaults = {
        y: 18, opacity: 0,
        to: { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out' },
    };
    const cfg = Object.assign({}, defaults, options);
    gsap.fromTo(target,
        { y: cfg.y, opacity: cfg.opacity },
        cfg.to
    );
};

/* ══════════════════════════════════════════════════════════════
   15. SCORECARD BAR FILL ANIMATION
   Animates the metric bar widths with elastic easing.
   ══════════════════════════════════════════════════════════════ */
window.OrionAnim.animateMetricBars = function () {
    document.querySelectorAll('.metric-bar-fill').forEach((bar) => {
        const target = bar.dataset.target || '0';
        gsap.fromTo(bar,
            { width: '0%' },
            {
                width: target + '%',
                duration: 1.3,
                ease: 'expo.out',
                delay: parseFloat(bar.dataset.delay || 0),
            }
        );
    });
};

console.log('%c[OrionAnim] GSAP engine ready ✦', 'color:#4f8ef7; font-weight:700;');

/* ══════════════════════════════════════════════════════════════
   16. ORION MODAL SYSTEM
   Animated replacements for prompt() / confirm() / alert()

   API (all return Promises):
     OrionModal.prompt(title, body, placeholder)  → string | null
     OrionModal.confirm(title, body)               → boolean
     OrionModal.alert(title, body, type)           → void
   ══════════════════════════════════════════════════════════════ */

window.OrionModal = (function () {

    const overlay  = () => document.getElementById('orion-modal-overlay');
    const modal    = () => document.getElementById('orion-modal');
    const iconWrap = () => document.getElementById('om-icon-wrap');
    const iconEl   = () => document.getElementById('om-icon');
    const titleEl  = () => document.getElementById('om-title');
    const bodyEl   = () => document.getElementById('om-body');
    const inputWrap= () => document.getElementById('om-input-wrap');
    const textarea = () => document.getElementById('om-textarea');
    const charHint = () => document.getElementById('om-char-hint');
    const actions  = () => document.getElementById('om-actions');

    // ── Open animation ───────────────────────────────────────
    function animateIn() {
        const ov = overlay();
        const md = modal();
        ov.classList.add('om-visible');

        gsap.killTweensOf([ov, md]);
        gsap.set(md, { scale: 0.88, y: 24, opacity: 0 });
        gsap.set(ov, { opacity: 0 });

        const tl = gsap.timeline();
        tl.to(ov, { opacity: 1, duration: 0.3, ease: 'expo.out' });
        tl.to(md, { scale: 1, y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.6)' }, '-=0.15');

        // Stagger inner elements
        tl.fromTo(
            [iconWrap(), titleEl(), bodyEl(), inputWrap(), actions()].filter(Boolean),
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.35, ease: 'expo.out', stagger: 0.06 },
            '-=0.25'
        );

        return tl;
    }

    // ── Close animation ──────────────────────────────────────
    function animateOut(onComplete) {
        const ov = overlay();
        const md = modal();

        gsap.killTweensOf([ov, md]);

        const tl = gsap.timeline({ onComplete() {
            ov.classList.remove('om-visible');
            gsap.set(ov, { opacity: 0 });
            onComplete && onComplete();
        }});

        tl.to(md, { scale: 0.92, y: 16, opacity: 0, duration: 0.28, ease: 'expo.in' });
        tl.to(ov, { opacity: 0, duration: 0.22, ease: 'expo.in' }, '-=0.1');
    }

    // ── Shake on validation fail ──────────────────────────────
    function shake() {
        gsap.to(modal(), {
            x: -7, duration: 0.06, yoyo: true, repeat: 5, ease: 'none',
            onComplete: () => gsap.set(modal(), { x: 0 }),
        });
    }

    // ── Reset modal state ─────────────────────────────────────
    function reset() {
        titleEl().textContent  = '';
        bodyEl().textContent   = '';
        iconEl().textContent   = '✦';
        iconWrap().className   = 'om-icon-wrap';
        inputWrap().classList.add('hidden');
        textarea().value       = '';
        actions().innerHTML    = '';
    }

    // ── Create a button ───────────────────────────────────────
    function makeBtn(label, cls, onClick) {
        const btn = document.createElement('button');
        btn.className   = `om-btn ${cls}`;
        btn.textContent = label;
        btn.addEventListener('click', onClick);
        // Spring press via GSAP
        btn.addEventListener('pointerdown', () => gsap.to(btn, { scale: 0.93, duration: 0.1, ease: 'power2.in' }));
        btn.addEventListener('pointerup',   () => gsap.to(btn, { scale: 1, duration: 0.4, ease: 'elastic.out(1.3, 0.6)' }));
        return btn;
    }

    // ════════════════════════════════════════════════════════
    // PUBLIC API
    // ════════════════════════════════════════════════════════

    /**
     * OrionModal.prompt(title, body, placeholder, minChars)
     * Returns Promise<string | null>
     */
    function prompt(title, body, placeholder = 'Type here…', minChars = 10) {
        return new Promise((resolve) => {
            reset();

            titleEl().textContent = title;
            bodyEl().textContent  = body;
            iconEl().textContent  = '✦';

            // Show textarea
            inputWrap().classList.remove('hidden');
            textarea().placeholder = placeholder;
            charHint().textContent = `${minChars} characters minimum`;
            charHint().classList.remove('ready');

            // Submit btn starts disabled
            const submitBtn = makeBtn('Continue →', 'om-btn-primary', () => {
                const val = textarea().value.trim();
                if (val.length < minChars) { shake(); return; }
                animateOut(() => resolve(val));
            });
            submitBtn.disabled = true;

            const cancelBtn = makeBtn('Cancel', 'om-btn-ghost', () => {
                animateOut(() => resolve(null));
            });

            // Live char count
            textarea().addEventListener('input', () => {
                const len = textarea().value.trim().length;
                const remaining = minChars - len;
                if (remaining > 0) {
                    charHint().textContent = `${remaining} characters remaining`;
                    charHint().classList.remove('ready');
                    submitBtn.disabled = true;
                } else {
                    charHint().textContent = '✓ Ready to continue';
                    charHint().classList.add('ready');
                    submitBtn.disabled = false;
                }
            });

            // Enter key (Ctrl/Cmd+Enter to submit)
            textarea().addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    submitBtn.click();
                }
                if (e.key === 'Escape') cancelBtn.click();
            });

            actions().append(cancelBtn, submitBtn);
            animateIn();

            // Auto-focus textarea after animation
            setTimeout(() => textarea().focus(), 350);
        });
    }

    /**
     * OrionModal.confirm(title, body)
     * Returns Promise<boolean>
     */
    function confirm(title, body) {
        return new Promise((resolve) => {
            reset();

            titleEl().textContent  = title;
            bodyEl().textContent   = body;
            iconEl().textContent   = '⚠';
            iconWrap().classList.add('om-danger');

            const confirmBtn = makeBtn('Delete', 'om-btn-danger', () => {
                animateOut(() => resolve(true));
            });
            const cancelBtn = makeBtn('Cancel', 'om-btn-ghost', () => {
                animateOut(() => resolve(false));
            });

            // Escape key
            const onKey = (e) => {
                if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); cancelBtn.click(); }
                if (e.key === 'Enter')  { document.removeEventListener('keydown', onKey); confirmBtn.click(); }
            };
            document.addEventListener('keydown', onKey);

            actions().append(cancelBtn, confirmBtn);
            animateIn();
        });
    }

    /**
     * OrionModal.alert(title, body, type)
     * type: 'info' | 'warning' | 'danger'
     * Returns Promise<void>
     */
    function alert(title, body, type = 'info') {
        return new Promise((resolve) => {
            reset();

            titleEl().textContent = title;
            bodyEl().textContent  = body;

            const icons = { info: 'ℹ', warning: '⚠', danger: '✕' };
            const cls   = { info: '', warning: 'om-warning', danger: 'om-danger' };
            iconEl().textContent  = icons[type] || 'ℹ';
            if (cls[type]) iconWrap().classList.add(cls[type]);

            const okBtn = makeBtn('Got it', 'om-btn-primary', () => {
                animateOut(() => resolve());
            });

            const onKey = (e) => {
                if (e.key === 'Escape' || e.key === 'Enter') {
                    document.removeEventListener('keydown', onKey);
                    okBtn.click();
                }
            };
            document.addEventListener('keydown', onKey);

            actions().append(okBtn);
            animateIn();
        });
    }

    return { prompt, confirm, alert };

})();