/**
 * ORION — OrionModal System (prompt/confirm/alert with GSAP)
 */
const overlay = () => document.getElementById("orion-modal-overlay");
const modal = () => document.getElementById("orion-modal");

function animateOpen() {
    const o = overlay(), m = modal();
    gsap.to(o, { opacity: 1, duration: 0.25 });
    o.classList.add("om-visible");
    gsap.fromTo(m, { scale: 0.88, y: 30, opacity: 0 }, { scale: 1, y: 0, opacity: 1, duration: 0.5, ease: "back.out(1.4)" });
}

function animateClose() {
    return new Promise(resolve => {
        const o = overlay(), m = modal();
        gsap.to(m, { scale: 0.92, opacity: 0, duration: 0.2, ease: "power3.in" });
        gsap.to(o, { opacity: 0, duration: 0.25, delay: 0.1, onComplete: () => { o.classList.remove("om-visible"); resolve(); } });
    });
}

export const OrionModal = {
    prompt(title, body, placeholder = "", minChars = 3) {
        return new Promise(resolve => {
            const m = modal();
            m.innerHTML = `
                <div class="om-icon-wrap">💡</div>
                <div class="om-title">${title}</div>
                <div class="om-body">${body}</div>
                <div class="om-input-wrap">
                    <textarea class="om-textarea" placeholder="${placeholder}" rows="3"></textarea>
                    <span class="om-char-hint">${minChars}+ characters</span>
                </div>
                <div class="om-actions">
                    <button class="om-btn om-btn-ghost" id="om-cancel">Cancel</button>
                    <button class="om-btn om-btn-primary" id="om-ok" disabled>Continue</button>
                </div>`;
            animateOpen();
            const ta = m.querySelector(".om-textarea");
            const ok = m.querySelector("#om-ok");
            const hint = m.querySelector(".om-char-hint");
            ta.focus();
            ta.addEventListener("input", () => {
                const len = ta.value.trim().length;
                ok.disabled = len < minChars;
                hint.textContent = len < minChars ? `${minChars - len} more characters` : "✓ Ready";
                hint.classList.toggle("ready", len >= minChars);
            });
            ok.addEventListener("click", async () => { await animateClose(); resolve(ta.value.trim()); });
            m.querySelector("#om-cancel").addEventListener("click", async () => { await animateClose(); resolve(null); });
        });
    },

    confirm(title, body, danger = false) {
        return new Promise(resolve => {
            const m = modal();
            m.innerHTML = `
                <div class="om-icon-wrap ${danger ? 'om-danger' : ''}">${danger ? '⚠️' : '❓'}</div>
                <div class="om-title">${title}</div>
                <div class="om-body">${body}</div>
                <div class="om-actions">
                    <button class="om-btn om-btn-ghost" id="om-cancel">Cancel</button>
                    <button class="om-btn ${danger ? 'om-btn-danger' : 'om-btn-primary'}" id="om-ok">${danger ? 'Delete' : 'Confirm'}</button>
                </div>`;
            animateOpen();
            m.querySelector("#om-ok").addEventListener("click", async () => { await animateClose(); resolve(true); });
            m.querySelector("#om-cancel").addEventListener("click", async () => { await animateClose(); resolve(false); });
        });
    },

    alert(title, body, icon = "ℹ️") {
        return new Promise(resolve => {
            const m = modal();
            m.innerHTML = `
                <div class="om-icon-wrap">${icon}</div>
                <div class="om-title">${title}</div>
                <div class="om-body">${body}</div>
                <div class="om-actions">
                    <button class="om-btn om-btn-primary" id="om-ok">OK</button>
                </div>`;
            animateOpen();
            m.querySelector("#om-ok").addEventListener("click", async () => { await animateClose(); resolve(); });
        });
    }
};
