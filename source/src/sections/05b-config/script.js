// ---------- Configurateur 3D : le lit du hero (cloné) dans une chambre, avec les applications de la pièce ----------
// Niveaux : garder son lit (sans tête de lit), tête de lit (tour en pin cembro), espace nuit complet (ciel de lit étoilé).
// Pièce : parquet en cirmolo, mur en litho-peinture (paillettes de cristal et de métal), éclairage bio-adapté (couleur qui
// tourne lentement, lavis sur le mur), diffuseur de senteurs (bouffées), enceintes Sonos (ondes), écran de réveil (heure).
// « Voir une nuit en accéléré » : endormissement, sommeil, réveil en 16 s, l'horloge de l'écran suit l'heure de réveil réglée
// dans la section « nuit ». Le panneau marche sans WebGL (envoi de la configuration).
SECTIONS.push({
  id: "config",
  init(ctx) {
    const { gsap, IMG } = ctx, THREE = ctx.THREE;
    const root = document.getElementById("s-config");
    if (!root) return;
    const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];

    // ------------------------------------------------------------------ panneau
    const LITS = ["Garder mon lit", "Tête de lit", "Espace nuit complet"];
    const DEVIS = ["Sans toucher au lit", "Tête de lit", "Espace nuit complet"];
    const NOTES = [
      "L’investissement le plus léger : nous transformons la pièce, votre lit reste en place.",
      "Une tour en pin cembro autour de votre literie : tête de lit capitonnée, niche éclairée et tablette.",
      "Le portique complet : ciel de lit étoilé, voilages, tête de lit et socle en pin cembro.",
    ];
    const APPS = Object.fromEntries($$('input[name="cfg-app"]').map(i => [i.value, i.closest("label").querySelector("strong").textContent]));
    const st = { lit: 0, apps: new Set($$('input[name="cfg-app"]:checked').map(i => i.value)) };
    const wakeTxt = () => { const m = ctx.wake ?? 420; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
    const wakeProse = () => { const m = ctx.wake ?? 420, mm = m % 60; return `${Math.floor(m / 60)} h${mm ? " " + String(mm).padStart(2, "0") : ""}`; };
    const low = t => t.charAt(0).toLowerCase() + t.slice(1);
    const describe = () => `${LITS[st.lit]} ; ${[...st.apps].map(k => low(APPS[k])).join(", ") || "aucune application"}${st.apps.has("ecran") ? ` ; réveil réglé à ${wakeProse()}` : ""}`;
    const sum = () => {
      const n = st.apps.size + (st.lit > 0 ? 1 : 0);
      $(".cfg__count").innerHTML = `<strong>${n}</strong> élément${n > 1 ? "s" : ""} · intervention de 2 à 5 jours selon la configuration`;
      $(".cfg__canvas").setAttribute("aria-label", `Visualisation 3D : ${describe()}`);
    };
    $$('input[name="cfg-lit"]').forEach(r => r.addEventListener("change", () => {
      st.lit = +r.value; $(".cfg__note").textContent = NOTES[st.lit]; sum(); if (room) room.lit(st.lit);
    }));
    $$('input[name="cfg-app"]').forEach(c => c.addEventListener("change", () => {
      c.checked ? st.apps.add(c.value) : st.apps.delete(c.value); sum(); if (room) room.app(c.value, c.checked);
    }));
    $("[data-cfg-send]").addEventListener("click", e => ctx.openDevis(DEVIS[st.lit], e.currentTarget, describe()));
    document.addEventListener("cc:wake", () => { sum(); if (room) room.screen(); });
    sum();

    let room = null;
    const fallback = () => root.classList.add("no-gl");
    if (!THREE || !ctx.bed) { fallback(); return; }
    ctx.bed.then(bed => { if (!bed) { fallback(); return; } try { room = build(bed); } catch (e) { console.error("[config]", e); fallback(); } });

    // ------------------------------------------------------------------ la chambre en 3D
    function build(bed) {
      const canvas = $(".cfg__canvas"), view = $(".cfg__view");
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
      renderer.setClearColor(0x0b0d11, 1);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      const scene = new THREE.Scene(), V3 = THREE.Vector3;
      const camera = new THREE.PerspectiveCamera(34, 1, .1, 40);
      (function env() {                                // reflets doux, comme dans le hero
        const e = new THREE.Scene(), box = new THREE.BoxGeometry();
        const room = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ side: THREE.BackSide, color: new THREE.Color(.04, .042, .05) }));
        room.scale.set(30, 16, 30); room.position.y = 6; e.add(room);
        const panel = (x, y, z, sx, sy, sz, c) => { const m = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: new THREE.Color(...c) })); m.position.set(x, y, z); m.scale.set(sx, sy, sz); e.add(m); };
        panel(6, 8, 7, 6, .3, 5, [2.2, 2, 1.8]); panel(-8, 5, 4, .3, 5, 6, [.5, .55, .7]);
        const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(e, .04).texture; pm.dispose();
      })();
      const { X, ZB, ZF, CB } = bed.dims;
      const WALLZ = ZB - .02, W2 = 2.6, RH = 2.75, DEPTH = 4.8, SHIFT = WALLZ + .02 - ZF;   // SHIFT : lit sans tour, tête contre le mur
      const loader = new THREE.TextureLoader(), aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      const tex = (uri, rx, ry) => { const t = loader.load(uri);   // clés littérales plus bas : build.py n'embarque que les images citées
       t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; };
      const mesh = (geo, mat, x = 0, y = 0, z = 0, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
      const radial = stops => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); };
      const vgrad = () => { const c = document.createElement("canvas"); c.width = 2; c.height = 128; const g = c.getContext("2d"), gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "#fff"); gr.addColorStop(.55, "#444"); gr.addColorStop(1, "#000"); g.fillStyle = gr; g.fillRect(0, 0, 2, 128); return new THREE.CanvasTexture(c); };

      // éclairage : une lampe de chevet neutre (toujours là), une lumière principale douce, la lumière bio-adaptée sur le mur
      const hemi = new THREE.HemisphereLight(0x9aa4ba, 0x1a140e, .32); scene.add(hemi);
      const key = new THREE.DirectionalLight(0xfff1e0, 1.5);
      key.position.set(3.6, 4.6, 5.4); key.target.position.set(0, .7, -.4);
      key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
      Object.assign(key.shadow.camera, { left: -3.4, right: 3.4, top: 3.4, bottom: -3.4, near: 1, far: 18 });
      key.shadow.bias = -.0005; key.shadow.normalBias = .02;
      scene.add(key, key.target);
      const wash = new THREE.SpotLight(0xffffff, 26, 7, .95, .85, 1.6);
      wash.position.set(0, RH - .1, WALLZ + 1.1); wash.target.position.set(0, .9, WALLZ);
      scene.add(wash, wash.target);
      const glow = new THREE.PointLight(0xffffff, 3, 4, 1.8); glow.position.set(0, 1.9, -.2); scene.add(glow);

      // pièce : sol (parquet en cirmolo ou sol neutre), mur du fond (litho-peinture ou peinture), mur de gauche
      const parquet = new THREE.MeshStandardMaterial({ map: tex(IMG["tex-parquet"], 2 * W2 / 1.12, DEPTH / 1.12), roughness: .5, envMapIntensity: .45 });
      const plainFloor = new THREE.MeshStandardMaterial({ color: 0x24262b, roughness: .88 });
      const floor = mesh(new THREE.PlaneGeometry(2 * W2, DEPTH).rotateX(-Math.PI / 2), parquet, 0, 0, WALLZ + DEPTH / 2); floor.castShadow = false;
      const litho = new THREE.MeshStandardMaterial({ map: tex(IMG["tex-litho"], 3.2, 1.7), roughness: .5, metalness: .12, envMapIntensity: 1 });
      const paint = new THREE.MeshStandardMaterial({ color: 0x55575c, roughness: .95 });
      const wall = mesh(new THREE.PlaneGeometry(2 * W2, RH), litho, 0, RH / 2, WALLZ); wall.castShadow = false;
      mesh(new THREE.PlaneGeometry(DEPTH, RH).rotateY(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3c3e43, roughness: .95 }), -W2, RH / 2, WALLZ + DEPTH / 2).castShadow = false;
      // paillettes de l'enduit : elles scintillent et prennent la couleur de la lumière
      const NSP = 1100, spP = new Float32Array(NSP * 3), spS = new Float32Array(NSP);
      for (let i = 0; i < NSP; i++) { spP[i * 3] = (Math.random() - .5) * 2 * W2; spP[i * 3 + 1] = .05 + Math.random() * (RH - .1); spP[i * 3 + 2] = WALLZ + .004; spS[i] = Math.random(); }
      const spGeo = new THREE.BufferGeometry();
      spGeo.setAttribute("position", new THREE.BufferAttribute(spP, 3)); spGeo.setAttribute("aSeed", new THREE.BufferAttribute(spS, 1));
      const sparkle = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uAmt: { value: 1 }, uColor: { value: new THREE.Color(1, 1, 1) }, uPx: { value: renderer.getPixelRatio() } },
        vertexShader: `attribute float aSeed; uniform float uTime, uPx; varying float vA;
          void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
            vA = pow(.5 + .5 * sin(uTime * (1.3 + aSeed * 2.2) + aSeed * 60.0), 6.0);
            gl_PointSize = (1.4 + aSeed * 2.2) * uPx * (5.5 / -mv.z); }`,
        fragmentShader: `uniform vec3 uColor; uniform float uAmt; varying float vA;
          void main(){ float d = length(gl_PointCoord - .5); gl_FragColor = vec4(mix(vec3(1.0), uColor, .55), smoothstep(.5, 0.0, d) * vA * uAmt); }`,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      scene.add(new THREE.Points(spGeo, sparkle));
      // éclairage bio-adapté : bandeau en haut du mur + lavis de lumière qui descend sur l'enduit
      const coveMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
      const cove = new THREE.Mesh(new THREE.BoxGeometry(2 * W2, .018, .03), coveMat); cove.position.set(0, RH - .04, WALLZ + .03); scene.add(cove);
      const washMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .5, alphaMap: vgrad(), depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
      const washPlane = new THREE.Mesh(new THREE.PlaneGeometry(2 * W2, RH), washMat); washPlane.position.set(0, RH / 2, WALLZ + .006); scene.add(washPlane);

      // le lit : pièces clonées du hero ; matériaux de lumière propres au configurateur (le hero les fait varier de son côté)
      const led = bed.mats.led.clone(), halo = bed.mats.halo.clone(), star = bed.mats.star.clone();
      const swap = g => { g.traverse(o => {
        if (o.material === bed.mats.led) o.material = led;
        else if (o.material === bed.mats.halo) o.material = halo;
        else if (o.material === bed.mats.star) o.material = star;
        if (o.userData.cloth) o.geometry = o.geometry.clone();   // voilages figés au repos (la physique reste au hero)
      }); return g; };
      const P = Object.fromEntries(Object.entries(bed.parts).map(([k, g]) => [k, swap(g.clone(true))]));
      Object.values(P).forEach(g => scene.add(g));
      // tête de lit seule : un chapeau en pin cembro sur la tour, un bandeau lumineux sous lui pour la niche
      const cap = new THREE.Group(); scene.add(cap);
      mesh(bed.plank(2 * X, .12, ZF - ZB, bed.AX), bed.mats.wood, 0, CB + .06, (ZB + ZF) / 2, cap);
      const nicheLed = new THREE.Mesh(new THREE.BoxGeometry(2 * X - .24, .012, .02), led); nicheLed.position.set(0, CB - .012, ZB + .08); cap.add(nicheLed);
      // votre lit actuel : un sommier tapissier neutre (sans tête de lit), plaqué au mur
      const own = new THREE.Group(); scene.add(own);
      const fabric = new THREE.MeshStandardMaterial({ color: 0x4b4845, roughness: .95 });
      mesh(bed.roundedBox(1.84, .22, 2.14, .03), fabric, 0, .19, .1 + SHIFT, own);
      for (const sx of [-1, 1]) for (const z of [-.86, 1.06]) mesh(new THREE.CylinderGeometry(.025, .02, .08, 10), new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: .5 }), sx * .82, .04, z + SHIFT, own);

      // chevets en pin cembro, de part et d'autre
      for (const sx of [-1, 1]) mesh(bed.plank(.56, .42, .42, bed.AX), bed.mats.wood, sx * 1.48, .21, WALLZ + .23);
      // enceintes : une sur chaque chevet, ondes sonores quand le son est actif
      const spkMat = new THREE.MeshStandardMaterial({ color: 0x1d1f23, roughness: .65 });
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xf3eee6, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
      const rings = [];
      for (const sx of [-1, 1]) {
        const x = sx * (sx < 0 ? 1.48 : 1.62);
        mesh(bed.roundedBox(.12, .17, .12, .025), spkMat, x, .42 + .085, WALLZ + .2);
        for (let k = 0; k < 3; k++) {
          const r = new THREE.Mesh(new THREE.RingGeometry(.075, .082, 48), ringMat.clone());
          r.position.set(x, .52, WALLZ + .27); scene.add(r); rings.push({ r, t: k / 3 });
        }
      }
      // diffuseur de senteurs : céramique et bouchon en bois sur le chevet de droite, bouffées de brume
      mesh(new THREE.CylinderGeometry(.055, .065, .16, 24), new THREE.MeshStandardMaterial({ color: 0xe9e4dc, roughness: .35 }), 1.36, .42 + .08, WALLZ + .22);
      mesh(new THREE.CylinderGeometry(.03, .03, .03, 16), bed.mats.wood, 1.36, .42 + .175, WALLZ + .22);
      const mistTex = radial([[0, "rgba(255,255,255,.5)"], [.5, "rgba(255,255,255,.18)"], [1, "rgba(255,255,255,0)"]]);
      const puffs = Array.from({ length: 18 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, opacity: 0, depthWrite: false })); s.visible = false; scene.add(s); return { s, t: 1, dx: 0, dz: 0 }; });
      let puffQ = 0;
      const puff = () => { for (let k = 0; k < 6; k++) { const p = puffs[puffQ++ % puffs.length]; p.t = -k * .12; p.dx = (Math.random() - .5) * .25; p.dz = (Math.random() - .5) * .2; } };
      // écran de réveil, au mur à droite du lit
      const scr = document.createElement("canvas"); scr.width = 320; scr.height = 200;
      const scrTex = new THREE.CanvasTexture(scr); scrTex.colorSpace = THREE.SRGBColorSpace;
      const screenG = new THREE.Group(); scene.add(screenG);
      mesh(new THREE.BoxGeometry(.3, .2, .018), new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: .3, metalness: .4 }), 1.5, 1.08, WALLZ + .01, screenG);
      const scrMesh = new THREE.Mesh(new THREE.PlaneGeometry(.27, .17), new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false }));
      scrMesh.position.set(1.5, 1.08, WALLZ + .02); screenG.add(scrMesh);
      const fmt = m => { m = ((Math.round(m) % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
      let clockMin = null, phaseName = "Réveil";
      function drawScreen() {
        const g = scr.getContext("2d");
        g.fillStyle = "#0c0e12"; g.fillRect(0, 0, 320, 200);
        g.fillStyle = "#D4A46C"; g.font = "600 17px Manrope, sans-serif"; g.textBaseline = "top";
        g.fillText(clockMin === null ? "RÉVEIL" : phaseName.toUpperCase(), 22, 22);
        g.fillStyle = "#F3EEE6"; g.font = "500 82px 'Cormorant Garamond', serif"; g.textBaseline = "alphabetic";
        g.fillText(clockMin === null ? wakeTxt() : fmt(clockMin), 20, 128);
        g.fillStyle = "rgba(243,238,230,.55)"; g.font = "600 15px Manrope, sans-serif";
        g.fillText(clockMin === null ? "Lumière · senteur · son" : `Réveil ${wakeTxt()}`, 22, 170);
        scrTex.needsUpdate = true;
      }
      drawScreen();
      if (document.fonts) document.fonts.ready.then(drawScreen);

      // ------------------------------------------------------------------ état : niveau du lit, applications
      const on = k => st.apps.has(k);
      function lit(l) {
        P.base.visible = P.tower.visible = l > 0;
        P.canopy.visible = l === 2;
        cap.visible = l === 1;
        own.visible = l === 0;
        P.bedding.position.z = l === 0 ? SHIFT : 0;
        if (l > 0 && !ctx.reduced) gsap.fromTo([P.tower.position, P.base.position, cap.position, P.canopy.position], { y: -.25 }, { y: 0, duration: .7, ease: "power3.out", overwrite: true });
      }
      function app(k, v) {
        if (k === "parquet") floor.material = v ? parquet : plainFloor;
        if (k === "mur") wall.material = v ? litho : paint;
        if (k === "ecran") screenG.visible = v;
        if (k === "senteurs" && v) puff();
      }
      lit(st.lit);
      ["parquet", "mur", "ecran"].forEach(k => app(k, on(k)));

      // ------------------------------------------------------------------ lumière : cycle lent, ou programme de la nuit
      const PAL = ["#F0A458", "#F2A7A0", "#7C8CF0", "#4FCBC3"].map(c => new THREE.Color(c));
      const light = new THREE.Color(), tmp = new THREE.Color(), NEUTRAL = new THREE.Color("#FFE2BF");
      let lvl = 1, night = null;                        // lvl : intensité (0 nuit noire, 1 soirée), night : programme en cours
      function cycleColor(t) {
        const i = Math.floor(t) % PAL.length, f = t - Math.floor(t), k = gsap.utils.clamp(0, 1, (f - .7) / .3);
        return light.copy(PAL[i]).lerp(PAL[(i + 1) % PAL.length], k * k * (3 - 2 * k));
      }
      function applyLight(col, level) {
        const bio = on("lumiere");
        tmp.copy(bio ? col : NEUTRAL);
        coveMat.color.copy(tmp).multiplyScalar(bio ? 1.5 * Math.max(.15, level) : 0);
        cove.visible = washPlane.visible = bio;
        washMat.color.copy(tmp).multiplyScalar(.3 * level);
        wash.color.copy(tmp); wash.intensity = (bio ? 14 : 7) * level;
        glow.color.copy(tmp); glow.intensity = 3 * level;
        led.color.copy(tmp).multiplyScalar(1.6 * Math.max(.2, level));
        halo.color.copy(tmp).multiplyScalar(.5 * level);
        key.intensity = .06 + 1.3 * Math.min(1, level); hemi.intensity = .06 + .26 * Math.min(1, level);   // la nuit, la chambre s'éteint vraiment
        sparkle.uniforms.uColor.value.copy(tmp);
        sparkle.uniforms.uAmt.value = on("mur") ? (bio ? 1.1 : .5) * (.35 + .65 * level) : 0;
      }

      // nuit en accéléré : 16 s, trois phases, l'horloge va de « réveil - 8 h 45 » à l'heure de réveil
      const play = $(".cfg__play"), clockEl = $(".cfg__clock"), nameEl = $(".cfg__phase-name");
      const PH = [
        { name: "Endormissement", t0: 0, t1: 4, m0: -525, m1: -495 },
        { name: "Sommeil", t0: 4, t1: 11, m0: -495, m1: -30 },
        { name: "Réveil", t0: 11, t1: 16, m0: -30, m1: 0 },
      ];
      const DUSK = new THREE.Color("#F0A458"), DEEP = new THREE.Color("#2B3A8F"), DAWN = new THREE.Color("#F7B49B"), DAY = new THREE.Color("#FFF1DE");
      function nightAt(t) {                            // couleur, niveau, minute de l'horloge, nom de la phase
        const wake = ctx.wake ?? 420, ph = PH.find(p => t < p.t1) || PH[2], k = gsap.utils.clamp(0, 1, (t - ph.t0) / (ph.t1 - ph.t0));
        const m = wake + ph.m0 + (ph.m1 - ph.m0) * k;
        if (ph === PH[0]) return [light.copy(DUSK), 1 - .55 * k, m, ph.name];
        if (ph === PH[1]) return [light.copy(DUSK).lerp(DEEP, Math.min(1, k * 4)), Math.max(.05, .45 - k * 3), m, ph.name];
        return [k < .5 ? light.copy(DEEP).lerp(DAWN, k * 2) : light.copy(DAWN).lerp(DAY, (k - .5) * 2), .06 + 1.1 * k * k, m, ph.name];
      }
      play.addEventListener("click", () => {
        if (night) return;
        night = { t: 0, cues: new Set() };
        play.disabled = true; play.setAttribute("aria-pressed", "true");
        root.classList.add("is-playing");
      });
      const cue = (id, at, fn) => { if (night.t >= at && !night.cues.has(id)) { night.cues.add(id); fn(); } };

      // ------------------------------------------------------------------ caméra : tour limité autour de la chambre
      const orbit = { yaw: .52, pitch: .2, v: 0 }, tgt = new V3(0, 1.05, -.35);
      let W = 1, H = 1, dist = 7;
      function resize() {
        W = view.clientWidth; H = view.clientHeight;
        renderer.setSize(W, H, false);
        camera.aspect = W / H;
        const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        dist = Math.max(4.1 / (2 * t * camera.aspect), 3.6 / (2 * t)) + 1.2;   // la chambre (≈ 4,1 m de large) tient dans le cadre
        camera.updateProjectionMatrix();
      }
      new ResizeObserver(resize).observe(view);
      resize();
      const drag = { on: false, x: 0, moved: 0 };
      canvas.addEventListener("pointerdown", e => { drag.on = true; drag.x = e.clientX; drag.moved = 0; canvas.setPointerCapture(e.pointerId); root.classList.add("is-grabbing"); });
      canvas.addEventListener("pointermove", e => {
        if (!drag.on) return;
        const dx = e.clientX - drag.x; drag.x = e.clientX; drag.moved += Math.abs(dx);
        orbit.v = dx * .006; orbit.yaw += orbit.v;
        if (drag.moved > 6) root.classList.add("is-used");
      });
      const up = () => { drag.on = false; root.classList.remove("is-grabbing"); };
      canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);

      // ------------------------------------------------------------------ boucle (seulement quand la section est à l'écran)
      let visible = false, last = 0, t0 = performance.now();
      ctx.whenVisible(view, () => { visible = true; }, () => { visible = false; }, "80px");
      gsap.ticker.add(() => {
        if (!visible) { last = 0; return; }
        const now = performance.now(), dt = last ? Math.min(.05, (now - last) / 1000) : 0, time = (now - t0) / 1000;
        last = now;
        // caméra
        if (!drag.on) { orbit.yaw += orbit.v; orbit.v *= .92; }
        orbit.yaw = gsap.utils.clamp(-.65, 1, orbit.yaw);
        camera.position.set(tgt.x + dist * Math.sin(orbit.yaw) * Math.cos(orbit.pitch), tgt.y + dist * Math.sin(orbit.pitch), tgt.z + dist * Math.cos(orbit.yaw) * Math.cos(orbit.pitch));
        camera.lookAt(tgt);
        // lumière
        if (night) {
          night.t += ctx.reduced ? dt * 3 : dt;
          const [col, level, m, name] = nightAt(night.t);
          applyLight(col, level);
          if (Math.floor(m) !== clockMin || name !== phaseName) { clockMin = Math.floor(m); phaseName = name; drawScreen(); clockEl.textContent = fmt(m); nameEl.textContent = name; }
          if (on("senteurs")) { cue("p1", .4, puff); cue("p2", 12.2, puff); }
          if (night.t > 17.5) {
            night = null; clockMin = null; drawScreen();
            play.disabled = false; play.setAttribute("aria-pressed", "false"); root.classList.remove("is-playing");
          }
        } else {
          applyLight(cycleColor(time / 6), 1);
          if (on("senteurs") && !ctx.reduced && Math.floor(time / 9) !== Math.floor((time - dt) / 9)) puff();   // une bouffée toutes les 9 s
        }
        // son : les ondes ne partent que pendant l'endormissement et le réveil (ou au repos)
        const sound = on("son") && (!night || night.t < 4 || night.t > 13) && !ctx.reduced;
        for (const w of rings) {
          w.t = (w.t + dt / 2.2) % 1;
          w.r.scale.setScalar(1 + w.t * 3.2);
          w.r.material.opacity = sound ? .45 * (1 - w.t) : 0;
          w.r.visible = sound;
        }
        // brume du diffuseur
        for (const p of puffs) {
          if (p.t >= 1) { p.s.visible = false; continue; }
          p.t += dt / 3.2;
          if (p.t < 0) { p.s.visible = false; continue; }
          p.s.visible = true;
          p.s.position.set(1.36 + p.dx * p.t, .62 + p.t * .9, WALLZ + .22 + p.dz * p.t);
          p.s.scale.setScalar(.08 + p.t * .55);
          p.s.material.opacity = .55 * Math.sin(Math.PI * Math.min(1, p.t));
        }
        sparkle.uniforms.uTime.value = time;
        star.uniforms.uTime.value = time;
        renderer.render(scene, camera);
      });
      return { lit, app, screen: drawScreen };
    }
  },
});
