// js/animations/magnetic.js
// Magnetic Elements — buttons pull toward cursor, snap back elastically

export function initMagnetics(rootEl) {
    const selector = rootEl || document;
    const magnets = selector.querySelectorAll(".magnetic");

    magnets.forEach((el) => {
        const qx = gsap.quickTo(el, "x", { duration: 0.35, ease: "power3" });
        const qy = gsap.quickTo(el, "y", { duration: 0.35, ease: "power3" });

        el.addEventListener("mousemove", (e) => {
            const r = el.getBoundingClientRect();
            const dx = e.clientX - r.left - r.width / 2;
            const dy = e.clientY - r.top - r.height / 2;
            qx(dx * 0.25);
            qy(dy * 0.25);
        });

        el.addEventListener("mouseleave", () => {
            gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });
        });

        el.addEventListener("mousedown", () => {
            gsap.to(el, { scale: 0.92, duration: 0.1 });
        });
        el.addEventListener("mouseup", () => {
            gsap.to(el, { scale: 1, duration: 0.5, ease: "elastic.out(1, 0.35)" });
        });
    });
}
