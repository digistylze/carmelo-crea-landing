// ---------- Grid Animations #4 (grid-to-preview) ----------
// Mécanisme du catalogue : une grille de vignettes pilote un grand aperçu ; la nouvelle image arrive sous une croix couleur
// du fond (le clip-path en croix du catalogue, ici deux joints) qui la découpe en 4 tuiles puis se referme, pendant que
// l'aperçu se resserre à peine. Adapté (dosé bas) : 6 réalisations (dont un avant/après), joints de 14 px au lieu de 5vw,
// lecture automatique douce (3,5 s, la bande de la vignette active avance), pause au survol et au focus clavier.
SECTIONS.push({
  id: "realisations",
  init(ctx) {
    const { gsap } = ctx;
    const root = document.getElementById("s-realisations");
    if (!root) return;
    const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
    const thumbs = $$(".rz-thumb"), imgs = $$(".rz-img"), fills = $$(".rz-band i");
    const prev = $(".rz-prev"), cutV = $(".rz-cut--v"), cutH = $(".rz-cut--h"), thumbsBox = $(".rz-thumbs");
    const cap = $(".rz-cap"), capTxt = $(".rz-cap__txt"), capNum = $(".rz-cap__n");
    const DWELL = 3.5;
    const st = { visible: false, hover: false, focus: false };
    let cur = 0, tl = null, fill = null;

    gsap.set(imgs, { autoAlpha: 0 });
    gsap.set(imgs[0], { autoAlpha: 1 });
    gsap.set(cutV, { scaleX: 0 });
    gsap.set(cutH, { scaleY: 0 });

    const sync = () => fill && fill.paused(!(st.visible && !st.hover && !st.focus));

    // la bande de la vignette active sert de minuterie à la lecture automatique
    const startFill = () => {
      if (fill) fill.kill();
      gsap.set(fills, { scaleX: 0 });
      if (ctx.reduced) { gsap.set(fills[cur], { scaleX: 1 }); fill = null; return; }
      fill = gsap.fromTo(fills[cur], { scaleX: 0 }, {
        scaleX: 1, duration: DWELL, ease: "none", paused: true,
        onComplete: () => go((cur + 1) % imgs.length, false),
      });
      sync();
    };

    function go(i, byUser) {
      if (i === cur) return startFill();
      if (tl) tl.progress(1).kill();
      const from = imgs[cur], to = imgs[i];
      cur = i;
      thumbs.forEach((b, k) => b.setAttribute("aria-pressed", String(k === i)));
      cap.setAttribute("aria-live", byUser ? "polite" : "off");
      const setCap = () => { capTxt.textContent = thumbs[i].dataset.detail; capNum.textContent = `${i + 1} / ${imgs.length}`; };
      startFill();
      if (ctx.reduced) { setCap(); gsap.set(from, { autoAlpha: 0 }); gsap.set(to, { autoAlpha: 1 }); return; }
      gsap.set(imgs, { zIndex: 0 });
      gsap.set(from, { zIndex: 1 });
      gsap.set(to, { zIndex: 2 });
      // ≈ 0,8 s : les joints coupent l'image en 4 tuiles, la suivante apparaît dessous, les joints se referment
      tl = gsap.timeline({ defaults: { ease: "power2.inOut" } })
        .to(cutV, { scaleX: 1, duration: .28, ease: "power2.out" }, 0)
        .to(cutH, { scaleY: 1, duration: .28, ease: "power2.out" }, 0)
        .to(prev, { scale: .985, duration: .3 }, 0)
        .fromTo(to, { autoAlpha: 0 }, { autoAlpha: 1, duration: .3, ease: "power1.inOut" }, .16)
        .call(setCap, null, .3)                                  // la légende change avec l'image
        .set(from, { autoAlpha: 0 }, .46)
        .to(cutV, { scaleX: 0, duration: .42 }, .38)
        .to(cutH, { scaleY: 0, duration: .42 }, .38)
        .to(prev, { scale: 1, duration: .42 }, .38);
    }

    thumbs.forEach((b, k) => b.addEventListener("click", () => go(k, true)));

    // pause au survol (souris) de l'aperçu ou des vignettes, et au focus clavier des vignettes
    [thumbsBox, prev].forEach(z => {
      z.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") { st.hover = true; sync(); } });
      z.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") { st.hover = false; sync(); } });
    });
    thumbsBox.addEventListener("focusin", e => { st.focus = e.target.matches(":focus-visible"); sync(); });
    thumbsBox.addEventListener("focusout", e => { if (!thumbsBox.contains(e.relatedTarget)) { st.focus = false; sync(); } });

    // lecture seulement quand l'aperçu est à l'écran ; reduced motion : pas de lecture automatique
    if (!ctx.reduced) ctx.whenVisible(prev, () => { st.visible = true; sync(); }, () => { st.visible = false; sync(); }, "-15% 0px");
    startFill();
  },
});
