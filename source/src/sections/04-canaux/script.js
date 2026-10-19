// ---------- Scroll Animation #29 : la photo collée à droite se découpe vers la suivante quand le canal suivant arrive ----------
// Adapté : le fond de la section prend la teinte du canal (data-tone), le nom du canal change dans la pastille de la photo.
SECTIONS.push({
  id: "canaux",
  init(ctx) {
    const { gsap } = ctx;
    const sec = document.querySelector("#s-canaux");
    if (!sec) return;
    const items = [...sec.querySelectorAll(".cx__item")];
    const tones = items.map(it => it.dataset.tone);
    const names = items.map(it => it.querySelector("h3").textContent.replace(/^La structure en /, ""));
    const wraps = [...sec.querySelectorAll(".cx__img")];
    const imgs = wraps.map(w => w.querySelector("img"));
    const tag = sec.querySelector(".cx__tag span");
    const FULL = "inset(0% 0% 0% 0%)", GONE = "inset(0% 0% 100% 0%)";
    // reduced motion : la photo change d'un coup quand le canal suivant est centré, sans glissement
    const ease = ctx.reduced ? "steps(1)" : "none";
    wraps.forEach((w, i) => (w.style.zIndex = wraps.length - i)); // la première photo au-dessus
    const mm = gsap.matchMedia();

    let shown = 0;
    const setTag = i => {
      if (i === shown) return;
      const dir = i > shown ? 1 : -1;
      shown = i;
      if (ctx.reduced) { tag.textContent = names[i]; return; }
      gsap.timeline()
        .to(tag, { yPercent: -110 * dir, duration: .25, ease: "power2.in" })
        .add(() => { tag.textContent = names[i]; })
        .fromTo(tag, { yPercent: 110 * dir }, { yPercent: 0, duration: .45, ease: "power3.out" });
    };

    // desktop : une découpe par canal, du centre d'un bloc au centre du suivant ; le fond suit la lumière du canal
    mm.add("(min-width: 900px)", () => {
      gsap.set(wraps, { clipPath: FULL });
      gsap.set(imgs, { objectPosition: "50% 0%" });
      sec.style.backgroundColor = tones[0];
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: items[0], start: "center center", endTrigger: items[items.length - 1], end: "center center", scrub: true,
          onUpdate: self => setTag(Math.round(self.progress * (items.length - 1))),
        },
      });
      wraps.forEach((w, i) => {
        if (!wraps[i + 1]) return;
        tl.add(gsap.timeline()
          .to(sec, { backgroundColor: tones[i + 1], duration: 1.5, ease: ctx.reduced ? ease : "power2.inOut" }, 0)
          .to(w, { clipPath: GONE, duration: 1.5, ease }, 0)
          .to(imgs[i], { objectPosition: "50% 60%", duration: 1.5, ease }, 0)
          .to(imgs[i + 1], { objectPosition: "50% 40%", duration: 1.5, ease }, 0));
      });
      return () => { sec.style.backgroundColor = ""; };
    });

    // mobile : chaque photo se révèle une fois à son passage, par le même découpage ; le fond prend la teinte du canal à l'écran
    mm.add("(max-width: 899px)", () => {
      items.forEach((it, i) => {
        ctx.ScrollTrigger.create({
          trigger: it, start: "top 60%", end: "bottom 60%",
          onToggle: self => { if (self.isActive) gsap.to(sec, { backgroundColor: tones[i], duration: ctx.reduced ? 0 : .8, overwrite: true }); },
        });
      });
      if (ctx.reduced) return;
      sec.querySelectorAll(".cx__ph img").forEach(img => {
        gsap.fromTo(img, { clipPath: GONE, objectPosition: "50% 70%" }, {
          clipPath: FULL, objectPosition: "50% 35%", duration: 1.3, ease: "power3.out",
          scrollTrigger: { trigger: img.parentNode, start: "top 85%", once: true },
        });
      });
    });
  },
});
