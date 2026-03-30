// js/animations/gyro-mouse.js
// Global Mouse Tracking — The Gyroscope
// Maps cursor position to rotateX/Y of a target container via gsap.quickTo

export function initGyroscope(targetEl) {
    if (!targetEl) return;

    const qRotX = gsap.quickTo(targetEl, "rotateX", { duration: 0.6, ease: "power3" });
    const qRotY = gsap.quickTo(targetEl, "rotateY", { duration: 0.6, ease: "power3" });

    window.addEventListener("mousemove", (e) => {
        const nx = (e.clientX / window.innerWidth) * 2 - 1;   // -1 to 1
        const ny = (e.clientY / window.innerHeight) * 2 - 1;  // -1 to 1

        // Update CSS custom properties for the dynamic radial-gradient lighting
        document.documentElement.style.setProperty("--mouse-x", e.clientX + "px");
        document.documentElement.style.setProperty("--mouse-y", e.clientY + "px");

        // Inverse mapping: mouse left → UI tilts right
        qRotY(nx * 8);
        qRotX(ny * -6);
    });
}
