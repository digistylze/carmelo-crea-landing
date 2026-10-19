// ---------- Sliders #2 (Atelier Nova) : l'étape suivante naît dans une fenêtre au centre et envahit le cadre ----------
// Mécanisme du catalogue : la photo courante grossit (1 -> 1,8), la suivante s'ouvre (clip-path depuis le centre) puis
// s'agrandit jusqu'au cadre ; le titre sort lettre à lettre par le haut pendant que le suivant monte. Adapté : cadre 4/5
// au lieu du plein écran, titre = étape du chantier, lecture automatique (pause hors écran, au survol, au focus), clic ou
// « Étape suivante » pour avancer, tirets pour aller à une étape. Mouvement réduit : fondu, sans lecture automatique.
SECTIONS.push({
  id: "avantapres",
  init(ctx) {
    const { gsap } = ctx;
    const root = document.getElementById("s-avantapres");
    if (!root) return;
    const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
    const slider = $(".ap-slider"), stage = $(".ap-stage");
    const items = $$(".ap-src img").map(im => ({ src: im.src, alt: im.alt, word: im.dataset.word, proj: im.dataset.proj, detail: im.dataset.detail }));
    const wCur = $(".ap-word__cur"), wNxt = $(".ap-word__nxt");
    const name = $(".ap-proj__name"), detail = $(".ap-proj__detail"), countEl = $(".ap-count__cur");
    const dots = $$(".ap-dots button");
    const N = items.length, DWELL = 3.4, PREVIEW = .34;
    let cur = 0, nxt = 1, busy = false;

    const chars = (el, txt) => { el.innerHTML = [...txt].map(c => `<i>${c === " " ? "&nbsp;" : c}</i>`).join(""); return [...el.children]; };
    const box = () => ({ w: slider.clientWidth, h: slider.clientHeight });

    // état : photo courante plein cadre + étape suivante en petite fenêtre fermée au centre
    function render() {
      const a = items[cur], b = items[nxt];
      slider.innerHTML = `<div class="ap-cur"><img src="${a.src}" alt=""></div><div class="ap-nxt"><div class="ap-nxt__img"><img src="${b.src}" alt=""></div></div>`;
      const { w, h } = box();
      gsap.set(slider.querySelector(".ap-nxt__img"), { width: w * PREVIEW, height: h * PREVIEW, clipPath: "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)" });
      chars(wCur, a.word); chars(wNxt, b.word);
      gsap.set(wNxt, { visibility: "hidden" });
      slider.setAttribute("aria-label", a.alt);
      name.textContent = a.proj; detail.textContent = a.detail;
      countEl.textContent = String(cur + 1).padStart(2, "0");
      dots.forEach((d, i) => (i === cur ? d.setAttribute("aria-current", "step") : d.removeAttribute("aria-current")));
    }
    const revealPreview = () => gsap.to(slider.querySelector(".ap-nxt__img"), { clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)", duration: .7, ease: "power3.out" });

    function go(to) {
      if (busy || to === cur) return;
      if (to !== nxt) { nxt = to; render(); gsap.set(slider.querySelector(".ap-nxt__img"), { clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" }); }
      busy = true;
      timer.pause();
      const curImg = slider.querySelector(".ap-cur img"), wrap = slider.querySelector(".ap-nxt__img");
      const done = () => { cur = nxt; nxt = (cur + 1) % N; render(); busy = false; if (!ctx.reduced) revealPreview(); restart(); };
      if (ctx.reduced) { done(); return; }
      const out = [...wCur.children], inn = [...wNxt.children];
      const { w, h } = box();
      gsap.set(wNxt, { visibility: "visible" });
      gsap.set(inn, { yPercent: 110 });
      gsap.timeline({ onComplete: done })
        .to(curImg, { scale: 1.8, duration: 1.5, ease: "power3.out" }, 0)
        .to(out, { yPercent: -110, stagger: .04, duration: .38, ease: "power3.out" }, 0)
        .to(inn, { yPercent: 0, stagger: .04, duration: .45, ease: "power3.out" }, .22)
        .to(wrap, { clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)", duration: .7, ease: "power3.out" }, .18)
        .to(wrap, { width: w, height: h, duration: 1.6, ease: "power3.out" }, .18)
        .to([name, detail], { autoAlpha: 0, duration: .25, ease: "power1.in" }, .1)
        .add(() => { name.textContent = items[nxt].proj; detail.textContent = items[nxt].detail; }, .36)
        .to([name, detail], { autoAlpha: 1, duration: .5, ease: "power2.out" }, .4);
    }

    // lecture automatique : à l'écran, sans survol (souris) ni focus clavier, jamais en mouvement réduit
    const st = { vis: false, hover: false, focus: false };
    const timer = gsap.delayedCall(DWELL, () => go(nxt)).pause();
    const sync = () => timer.paused(!(st.vis && !st.hover && !st.focus && !busy && !ctx.reduced));
    function restart() { timer.restart(true); sync(); }

    slider.addEventListener("click", () => go(nxt));
    $(".ap-step").addEventListener("click", () => go(nxt));
    dots.forEach((d, i) => d.addEventListener("click", () => go(i)));
    stage.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") { st.hover = true; sync(); } });
    stage.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") { st.hover = false; sync(); } });
    root.addEventListener("focusin", e => { st.focus = e.target.matches(":focus-visible"); sync(); });
    root.addEventListener("focusout", e => { if (!root.contains(e.relatedTarget)) { st.focus = false; sync(); } });
    ctx.whenVisible(stage, () => { st.vis = true; sync(); }, () => { st.vis = false; sync(); }, "-10% 0px");

    // la fenêtre d'aperçu suit la taille du cadre
    new ResizeObserver(() => {
      if (busy) return;
      const { w, h } = box(), wrap = slider.querySelector(".ap-nxt__img");
      if (wrap) gsap.set(wrap, { width: w * PREVIEW, height: h * PREVIEW });
    }).observe(slider);

    render();
    if (!ctx.reduced) revealPreview();
    restart();
  },
});
