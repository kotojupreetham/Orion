// js/animations/scroll-3d.js
// ScrollTrigger depth — items tilt backward and fade into Z-space as they scroll up

export function bindScrollDepth(scrollerEl, itemSelector) {
    if (!scrollerEl) return;

    gsap.registerPlugin(ScrollTrigger);

    // Kill any existing triggers on this scroller to avoid duplicates
    ScrollTrigger.getAll().forEach(st => {
        if (st.scroller === scrollerEl) st.kill();
    });

    const items = scrollerEl.querySelectorAll(itemSelector);
    if (items.length === 0) return;

    items.forEach((el) => {
        // As item reaches top — rotate backward and sink into deep Z
        gsap.fromTo(el,
            { rotateX: 0, z: 0, opacity: 1 },
            {
                rotateX: 40, z: -280, opacity: 0.15,
                ease: "none",
                scrollTrigger: {
                    scroller: scrollerEl,
                    trigger: el,
                    start: "top 25%",
                    end: "top -5%",
                    scrub: 0.4,
                }
            }
        );

        // As item enters from bottom — emerge from depth
        gsap.fromTo(el,
            { rotateX: -25, z: -180, opacity: 0.3 },
            {
                rotateX: 0, z: 0, opacity: 1,
                ease: "none",
                scrollTrigger: {
                    scroller: scrollerEl,
                    trigger: el,
                    start: "top 115%",
                    end: "top 85%",
                    scrub: 0.4,
                }
            }
        );
    });
}
