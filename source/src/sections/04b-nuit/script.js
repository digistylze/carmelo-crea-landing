// ---------- Scroll Animation #25 (Background Shift) : la nuit en trois phases ----------
// Desktop : la scène est épinglée ; au défilement, la couche « nuit » puis la couche « aube » glissent sur le crépuscule (comme les
// couches du catalogue), l'horloge de l'écran avance de « réveil - 8 h 45 » à l'heure de réveil, la phase et les icônes suivent.
// Mobile : pas d'épinglage, chaque phase fait glisser sa couche quand elle arrive. L'heure de réveil réglée ici (ctx.wake) est
// reprise par l'écran du configurateur 3D (événement cc:wake).
SECTIONS.push({
  id: "nuit",
  init(ctx) {
    const { gsap, ScrollTrigger } = ctx;
    const root = document.getElementById("s-nuit");
    if (!root) return;
    const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
    const layers = $$(".nuit__layer"), phases = $$(".nuit__ph"), steps = $$(".nuit__steps li"), icons = $$(".nuit__icons li");
    const timeEl = $(".nuit__time"), nowEl = $(".nuit__now"), wakeEl = $(".nuit__wake");
    const NAMES = ["Endormissement", "Sommeil profond", "Réveil"];
    const ACTIVE = [["lumiere", "senteur", "son"], [], ["lumiere", "senteur", "son"]];   // ce qui agit dans chaque phase
    const SPAN = 525;                                   // de « réveil - 8 h 45 » au réveil
    ctx.wake = 7 * 60;
    const fmt = m => { m = ((Math.round(m) % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };

    let shown = -1, minute = -SPAN;
    const setPhase = (i, instant) => {
      if (i === shown) return;
      const prev = shown; shown = i;
      nowEl.textContent = NAMES[i];
      steps.forEach((s, k) => s.classList.toggle("is-on", k === i));
      icons.forEach(li => li.classList.toggle("is-on", ACTIVE[i].includes(li.dataset.k)));
      if (innerWidth >= 1000) {
        phases.forEach((p, k) => p.classList.toggle("is-on", k === i));
        if (!instant && !ctx.reduced && prev >= 0) gsap.fromTo(phases[i].children, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .6, stagger: .06, ease: "power3.out", overwrite: true });
      }
    };
    const setMinute = m => { minute = m; timeEl.textContent = fmt(ctx.wake + m); };
    // horaires des phases, recalculés à chaque réglage du réveil
    const ranges = () => $$(".nuit__range").forEach(r => { r.textContent = `de ${fmt(ctx.wake + +r.dataset.from)} à ${fmt(ctx.wake + +r.dataset.to)}`; });
    const setWake = m => {
      ctx.wake = ((m % 1440) + 1440) % 1440;
      wakeEl.textContent = fmt(ctx.wake);
      ranges(); setMinute(minute);
      document.dispatchEvent(new CustomEvent("cc:wake", { detail: ctx.wake }));
    };
    $$(".nuit__adj").forEach(b => b.addEventListener("click", () => setWake(ctx.wake + +b.dataset.step)));
    setWake(ctx.wake); setPhase(0, true); setMinute(-SPAN);

    const mm = gsap.matchMedia();
    // desktop : 1,6 écran de défilement pour toute la nuit ; les couches glissent par la droite aux changements de phase
    mm.add("(min-width: 1000px)", () => {
      gsap.set(layers.slice(1), { xPercent: 101 });
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: $(".nuit__pin"), pin: true, start: "top top", end: () => "+=" + innerHeight * 1.6, scrub: ctx.reduced ? true : .6,
          onUpdate: self => {
            // chaque phase a sa part du défilement ; l'horloge parcourt ses heures à elle (30 min, la nuit, 30 min)
            const p = self.progress, i = p < .34 ? 0 : p < .78 ? 1 : 2, B = [0, .34, .78, 1], M = [-SPAN, -495, -30, 0];
            const k = (p - B[i]) / (B[i + 1] - B[i]);
            setMinute(M[i] + (M[i + 1] - M[i]) * k);
            setPhase(i);
          },
        },
      });
      tl.to(layers[1], { xPercent: 0, duration: .14, ease: "power2.inOut" }, .27)
        .to(layers[2], { xPercent: 0, duration: .14, ease: "power2.inOut" }, .71)
        .set({}, {}, 1);
      return () => { phases.forEach(p => { p.classList.remove("is-on"); gsap.set(p.children, { clearProps: "all" }); }); shown = -1; };
    });
    // mobile : chaque phase fait glisser sa couche à son arrivée, l'écran affiche l'heure de début de la phase
    mm.add("(max-width: 999px)", () => {
      gsap.set(layers.slice(1), { xPercent: 101 });
      phases.forEach((ph, i) => ScrollTrigger.create({
        trigger: ph, start: "top 70%", end: "bottom 30%",
        onToggle: self => {
          if (!self.isActive) return;
          setPhase(i); setMinute(+ph.querySelector(".nuit__range").dataset.from);
          layers.forEach((l, k) => { if (k) gsap.to(l, { xPercent: k <= i ? 0 : 101, duration: ctx.reduced ? 0 : .9, ease: "power3.inOut", overwrite: true }); });
        },
      }));
    });
  },
});
