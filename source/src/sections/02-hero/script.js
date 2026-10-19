/* Hero · 3D Animation #11 (objet 3D en studio, caméra qui passe d'une vue à l'autre) + compteur à rouleaux (Hero #8), même
   moteur que la charpente de Constantin Besomi. Le lit « L'Éveil des sens » est modélisé ici : structure à baldaquin en pin
   cembro (d'après l'esquisse du site), tête de lit capitonnée, matelas, couette en maille, oreillers, caisson d'aromathérapie,
   plafond étoilé et bandeau lumineux. Préchargement : un tour complet ; le compteur va de 0 à 100 et la lumière passe par les
   quatre canaux. À la fin du tour, la caméra cadre le lit à droite et le texte du hero se pose. QA : ?pre=<secondes>. */
SECTIONS.push({
  id: "hero",
  init(ctx) {
    const { gsap, IMG } = ctx;
    const THREE = ctx.THREE;
    const root = document.getElementById("s-hero");
    if (!root) return;
    const $ = s => root.querySelector(s);
    const stage = $(".hero__stage"), canvas = $(".hero__canvas"), loader = $(".hero__loader");
    const bar = $(".hero__bar i"), skip = $(".hero__skip"), canalEl = $(".hero__canal > span"), noteCanal = $(".hero__note-canal");
    const copy = $(".hero__copy");
    const qs = new URLSearchParams(location.search);
    const freezeAt = qs.has("pre") ? parseFloat(qs.get("pre")) : null;
    const TURN = 5.6;                                   // durée du tour complet, en secondes
    const CANAUX = [
      { name: "Chromothérapie", color: new THREE.Color("#8E7BFF") },
      { name: "Aromathérapie", color: new THREE.Color("#F0A458") },
      { name: "Sonothérapie", color: new THREE.Color("#6E96F0") },
      { name: "Hydrothérapie", color: new THREE.Color("#4FCBC3") },
    ];

    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    scrollTo(0, 0);
    ctx.lenis.stop();

    // ------------------------------------------------------------------ texte du hero (posé à la fin du tour)
    const split = new SplitText(root.querySelectorAll(".hero__line"), { type: "lines", mask: "lines" });
    let introOver = false;
    function revealHero(instant) {
      if (introOver) return;
      introOver = true;
      root.classList.remove("is-pre");
      ctx.lenis.start();
      ctx.introDone();
      const fade = [$(".hero__eyebrow"), $(".hero__lead"), $(".hero__actions"), $(".hero__proof"), $(".hero__note")];
      if (instant || ctx.reduced) { loader.remove(); return; }
      gsap.timeline()
        .to(loader, { autoAlpha: 0, duration: .5, ease: "power2.out", onComplete: () => loader.remove() }, 0)
        .from(split.lines, { yPercent: 110, duration: 1.1, stagger: .1, ease: "power4.out" }, .3)
        .from(fade, { y: 22, autoAlpha: 0, duration: .9, stagger: .08, ease: "power3.out" }, .55);
    }

    // ------------------------------------------------------------------ compteur à rouleaux (Hero #8)
    const digits = $(".hero__digits");
    const cols = [0, 1, 2].map(() => {
      const c = document.createElement("span"); c.className = "hero__col";
      c.innerHTML = "<span>" + "0123456789".split("").map(n => `<span>${n}</span>`).join("") + "</span>";
      digits.appendChild(c); return c;
    });
    let shownPct = -1;
    const setPct = p => {
      if (p === shownPct) return; shownPct = p;
      const ds = [Math.floor(p / 100), Math.floor(p / 10) % 10, p % 10];
      cols[0].classList.toggle("is-hidden", p < 100);
      cols[1].classList.toggle("is-hidden", p < 10);
      ds.forEach((d, i) => (cols[i].firstChild.style.transform = `translateY(${-d}em)`));
      bar.style.transform = `scaleX(${p / 100})`;
    };
    setPct(0);
    let shownCanal = 0;
    const setCanalName = i => {
      if (i === shownCanal) return;
      shownCanal = i;
      const n = CANAUX[i].name;
      noteCanal.textContent = n;
      gsap.timeline().to(canalEl, { yPercent: -100, duration: .25, ease: "power2.in" })
        .add(() => { canalEl.textContent = n; })
        .fromTo(canalEl, { yPercent: 100 }, { yPercent: 0, duration: .4, ease: "power3.out" });
    };

    // ------------------------------------------------------------------ WebGL
    let renderer;
    try {
      if (!THREE) throw new Error("three absent");
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
      if (!renderer.getContext()) throw new Error("contexte WebGL absent");
    } catch (e) { renderer = null; }
    if (!renderer) {
      root.classList.add("no-gl");
      setPct(100);
      revealHero(true);
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, .1, 60);

    // éclairage : chambre sombre (environnement doux pour les reflets du bois), lumière chaude de face, contre-jour froid,
    // et la lumière du canal, diffusée par le bandeau du plafond du baldaquin
    (function env() {
      const e = new THREE.Scene();
      const box = new THREE.BoxGeometry();
      const room = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ side: THREE.BackSide, color: new THREE.Color(.035, .038, .045) }));
      room.scale.set(30, 16, 30); room.position.y = 6; e.add(room);
      const panel = (x, y, z, sx, sy, sz, r, g, b) => {
        const m = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) }));
        m.position.set(x, y, z); m.scale.set(sx, sy, sz); e.add(m);
      };
      panel(-7, 9, 7, 6, .3, 5, 2.4, 2.1, 1.8);    // boîte à lumière chaude, en haut à gauche
      panel(9, 5, -6, .3, 5, 6, .5, .6, .9);       // contre-jour froid
      panel(0, 4, 13, 10, 5, .3, .5, .46, .42);    // face, très faible
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(e, .04).texture;
      pmrem.dispose();
    })();
    scene.add(new THREE.HemisphereLight(0x9aa4ba, 0x16120e, .35));
    const key = new THREE.DirectionalLight(0xffe6c8, 2.3);
    key.position.set(-3.6, 5.6, 4.6);
    key.target.position.set(0, .6, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3.4, bottom: -2.2, near: 1, far: 16 });
    key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 5; key.shadow.blurSamples = 14;
    scene.add(key, key.target);
    const rim = new THREE.DirectionalLight(0x9fb2ff, .7);
    rim.position.set(4, 3.5, -4.5);
    scene.add(rim);
    const glowA = new THREE.PointLight(0xffffff, 9, 0, 2), glowB = new THREE.PointLight(0xffffff, 9, 0, 2);
    glowA.position.set(-.45, 2.05, -.4); glowB.position.set(.45, 2.05, .4);

    // ------------------------------------------------------------------ textures
    const manager = new THREE.LoadingManager();
    const texLoader = new THREE.TextureLoader(manager);
    const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const tex = (uri, srgb) => {
      const t = texLoader.load(uri);
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso;
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    const cembroMap = tex(IMG["tex-cembro"], true), cembroN = tex(IMG["tex-cembro-n"]);
    // textures dessinées dans un canvas : relief de la tête de lit capitonnée, maille de la couette, dégradés du sol
    function normalTex(size, height, repeatX, repeatY) {
      const c = document.createElement("canvas"); c.width = c.height = size;
      const g = c.getContext("2d"), img = g.createImageData(size, size), h = new Float32Array(size * size);
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) h[y * size + x] = height(x / size, y / size);
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const at = (i, j) => h[((j + size) % size) * size + ((i + size) % size)];
        const dx = (at(x + 1, y) - at(x - 1, y)) * size * .02, dy = (at(x, y + 1) - at(x, y - 1)) * size * .02;
        const l = Math.hypot(dx, dy, 1), k = (y * size + x) * 4;
        img.data[k] = (-dx / l * .5 + .5) * 255; img.data[k + 1] = (dy / l * .5 + .5) * 255; img.data[k + 2] = (1 / l * .5 + .5) * 255; img.data[k + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeatX, repeatY); t.anisotropy = aniso;
      return t;
    }
    // capitonnage : coussins en losange, plis sur les diagonales, boutons aux sommets (un motif = un losange)
    const tuftN = normalTex(256, (u, v) => Math.pow(Math.abs(Math.sin(Math.PI * (u + v)) * Math.sin(Math.PI * (u - v))), .55), 8, 4);
    // maille : côtes verticales et rangs décalés
    const knitN = normalTex(128, (u, v) => {
      const col = Math.floor(u * 16), r = Math.abs(Math.sin(Math.PI * u * 16));
      return r * (.65 + .35 * Math.abs(Math.sin(Math.PI * (v * 32 + (col % 2) * .5))));
    }, 7, 7);
    function radial(stops) {
      const c = document.createElement("canvas"); c.width = c.height = 256;
      const g = c.getContext("2d"), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      stops.forEach(([o, col]) => gr.addColorStop(o, col));
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(c);
    }

    // ------------------------------------------------------------------ matériaux
    const wood = new THREE.MeshStandardMaterial({ map: cembroMap, normalMap: cembroN, normalScale: new THREE.Vector2(.55, .55), roughness: .46, metalness: 0, envMapIntensity: .7 });
    const fabric = (color, o = {}) => new THREE.MeshPhysicalMaterial(Object.assign({ color, roughness: .9, metalness: 0, sheen: 1, sheenRoughness: .65, sheenColor: new THREE.Color(0xfff4e8), envMapIntensity: .5 }, o));
    const headMat = fabric(0xcbc1b3, { normalMap: tuftN, normalScale: new THREE.Vector2(1.5, 1.5) });
    const sheetMat = fabric(0xeeeae3, { sheen: .6 });
    const pillowMat = fabric(0xf3f0ea, { sheen: .5 });
    const duvetMat = fabric(0x8d857b, { normalMap: knitN, normalScale: new THREE.Vector2(.45, .45), sheenColor: new THREE.Color(0xd9d0c3) });
    const foldMat = fabric(0xd9d2c6, { normalMap: knitN, normalScale: new THREE.Vector2(.6, .6) });
    const juteMat = fabric(0xa98c62, { normalMap: knitN, normalScale: new THREE.Vector2(1.2, 1.2), sheen: .3 });
    const buttonMat = new THREE.MeshStandardMaterial({ color: 0xb1a594, roughness: .35, metalness: .15 });
    const plinthMat = new THREE.MeshStandardMaterial({ color: 0x1b1916, roughness: .7 });
    const ceilMat = new THREE.MeshStandardMaterial({ color: 0x131826, roughness: .85 });
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });

    // ------------------------------------------------------------------ géométrie
    const V3 = THREE.Vector3;
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    // UV « au fil du bois » (repris de la charpente) : v suit l'axe de la pièce, u la largeur de chaque face
    function grainUV(geo, axis, sAlong, sAcross) {
      const pos = geo.attributes.position, nor = geo.attributes.normal;
      const uv = new Float32Array(pos.count * 2);
      const p = new V3(), n = new V3(), t = new V3(), ref = new V3(), t2 = new V3();
      const ou = rnd() * 7, ov = rnd() * 7;
      for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i); n.fromBufferAttribute(nor, i);
        let along, across;
        if (Math.abs(n.dot(axis)) > .72) {
          ref.set(0, 1, 0); if (Math.abs(axis.y) > .7) ref.set(1, 0, 0);
          t.crossVectors(axis, ref).normalize(); t2.crossVectors(axis, t);
          along = p.dot(t2) * .35; across = p.dot(t) * .35;
        } else { t.crossVectors(n, axis).normalize(); along = p.dot(axis); across = p.dot(t); }
        uv[i * 2] = across * sAcross + ou; uv[i * 2 + 1] = along * sAlong + ov;
      }
      geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      return geo;
    }
    // boîte arrondie : chaque sommet d'une boîte subdivisée est ramené sur la boîte intérieure puis repoussé de r
    function roundedBox(w, h, d, r, seg = 6) {
      const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg), p = g.attributes.position, v = new V3(), c = new V3();
      const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        c.set(Math.max(-hx, Math.min(hx, v.x)), Math.max(-hy, Math.min(hy, v.y)), Math.max(-hz, Math.min(hz, v.z)));
        v.sub(c).normalize().multiplyScalar(r).add(c);
        p.setXYZ(i, v.x, v.y, v.z);
      }
      g.computeVertexNormals();
      return g;
    }
    const model = new THREE.Group();
    scene.add(model);
    const add = (geo, mat, x = 0, y = 0, z = 0, parent = model) => {
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
    };
    const AX = new V3(1, 0, 0), AY = new V3(0, 1, 0), AZ = new V3(0, 0, 1);
    const plank = (w, h, d, axis) => grainUV(new THREE.BoxGeometry(w, h, d, 1, 1, 1), axis, .9, 2.2);

    // socle en retrait, cadre de lit en pin cembro (côtés, pied), sommier caché par le matelas
    add(new THREE.BoxGeometry(1.66, .08, 1.94), plinthMat, 0, .04, -.03);
    for (const s of [-1, 1]) add(plank(.06, .3, 2.16, AZ), wood, s * .93, .23, -.03);
    add(plank(1.92, .34, .06, AX), wood, 0, .25, 1.05);
    add(plank(1.8, .03, 2.08, AZ), wood, 0, .345, -.03);
    // matelas, couette (descend sur les côtés, retournée en haut), oreillers
    add(roundedBox(1.78, .22, 2.0, .05), sheetMat, 0, .47, -.04);
    const duvet = add(roundedBox(1.94, .3, 1.38, .06, 8), duvetMat, 0, .475, .3);
    (function wrinkle(g) {          // quelques ondulations sur le dessus de la couette
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        if (y > .1) p.setY(i, y + .012 * Math.sin(x * 7 + z * 2.3) + .008 * Math.sin(z * 11 - x * 3));
      }
      g.computeVertexNormals();
    })(duvet.geometry);
    add(roundedBox(1.95, .06, .26, .028), foldMat, 0, .63, -.27);
    for (const s of [-1, 1]) {
      const g = roundedBox(.74, .18, .46, .08, 8), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {           // oreiller bombé au centre, aplati aux coins
        const x = p.getX(i) / .37, z = p.getZ(i) / .23, k = Math.max(0, 1 - .55 * (x * x + z * z));
        p.setY(i, p.getY(i) * (.55 + .45 * k));
      }
      g.computeVertexNormals();
      // posés sur le matelas, adossés à la tête de lit (le haut contre le capitonné), légèrement tournés l'un vers l'autre
      const m = add(g, pillowMat, s * .41, .7, -.8); m.rotation.set(.3, -s * .05, s * .02);
    }
    // tête de lit capitonnée : panneau, boutons aux sommets des losanges, chapeau en pin cembro
    const HB = { w: 1.92, h: 1.12, y: .86, z: -1.1 };
    add(roundedBox(HB.w, HB.h, .12, .035), headMat, 0, HB.y, HB.z);
    const btnGeo = new THREE.SphereGeometry(.014, 10, 8);
    for (let i = 1; i < 16; i++) for (let j = 1; j < 8; j++) {
      if ((i + j) % 2) continue;                    // sommets du losange : coins et centres des motifs
      add(btnGeo, buttonMat, -HB.w / 2 + i * HB.w / 16, HB.y - HB.h / 2 + j * HB.h / 8, HB.z + .062);
    }
    add(plank(2.06, .05, .2, AX), wood, 0, HB.y + HB.h / 2 + .025, HB.z);
    // caisson d'aromathérapie posé sur la tête de lit : bois, façade en jute
    add(plank(.34, .14, .16, AX), wood, .58, HB.y + HB.h / 2 + .12, HB.z);
    add(new THREE.BoxGeometry(.26, .09, .01), juteMat, .58, HB.y + HB.h / 2 + .12, HB.z + .081);
    // baldaquin (d'après l'esquisse) : 4 montants, longerons et traverses qui dépassent, plafond étoilé et bandeau lumineux
    const PX = .995, PZ0 = -1.15, PZ1 = 1.08, TOP = 2.3;
    for (const s of [-1, 1]) for (const z of [PZ0, PZ1]) add(plank(.07, TOP, .07, AY), wood, s * PX, TOP / 2, z);
    for (const s of [-1, 1]) add(plank(.07, .09, 2.56, AZ), wood, s * PX, TOP + .045, (PZ0 + PZ1) / 2);
    for (const z of [PZ0, PZ1]) add(plank(2.34, .07, .07, AX), wood, 0, TOP - .035, z);
    add(new THREE.BoxGeometry(1.92, .03, 2.18), ceilMat, 0, TOP - .055, (PZ0 + PZ1) / 2).castShadow = false;
    const led = new THREE.Group(); model.add(led);
    const L = { w: 1.82, d: 2.08, y: TOP - .075, z: (PZ0 + PZ1) / 2 };
    for (const s of [-1, 1]) {
      const a = new THREE.Mesh(new THREE.BoxGeometry(L.w, .012, .02), ledMat); a.position.set(0, L.y, L.z + s * L.d / 2); led.add(a);
      const b = new THREE.Mesh(new THREE.BoxGeometry(.02, .012, L.d), ledMat); b.position.set(s * L.w / 2, L.y, L.z); led.add(b);
    }
    model.add(glowA, glowB);
    // halo sous le plafond : la lumière du bandeau qui baigne le baldaquin (plan additif, teinté comme le canal)
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .7, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, alphaMap: radial([[0, "#fff"], [.55, "#777"], [1, "#000"]]) });
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.15).rotateX(Math.PI / 2), haloMat);
    halo.position.set(0, TOP - .08, (PZ0 + PZ1) / 2);
    model.add(halo);
    // étoiles : fibres optiques sous le plafond, scintillement dans le shader
    const NS = 120, sp = new Float32Array(NS * 3), sd = new Float32Array(NS);
    for (let i = 0; i < NS; i++) { sp[i * 3] = (rnd() - .5) * 1.7; sp[i * 3 + 1] = TOP - .072; sp[i * 3 + 2] = L.z + (rnd() - .5) * 1.95; sd[i] = rnd(); }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    starGeo.setAttribute("aSeed", new THREE.BufferAttribute(sd, 1));
    const starMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPx: { value: renderer.getPixelRatio() } },
      vertexShader: `attribute float aSeed; uniform float uTime; uniform float uPx; varying float vA;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
          vA = .45 + .55 * sin(uTime * (1.1 + aSeed * 1.7) + aSeed * 40.0);
          gl_PointSize = (2.0 + aSeed * 2.6) * uPx * (6.5 / -mv.z); }`,
      fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0.0, d);
          gl_FragColor = vec4(vec3(1.0, .97, .9), a * vA); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    model.add(new THREE.Points(starGeo, starMat));
    const MODEL_W = 2.62, MODEL_H = 2.46, CENTER_Y = 1.18;

    // ------------------------------------------------------------------ sol : il se fond dans le fond de la page, ombre douce sous le lit
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x13161d, roughness: .62, metalness: 0, transparent: true, alphaMap: radial([[0, "#fff"], [.35, "#bbb"], [1, "#000"]]) }));
    floor.receiveShadow = true;
    scene.add(floor);
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 2.9).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .6, depthWrite: false, alphaMap: radial([[0, "#fff"], [.55, "#888"], [1, "#000"]]) }));
    blob.position.y = .003;
    model.add(blob);

    // ------------------------------------------------------------------ fumée d'aromathérapie : une brume qui gagne toute la scène
    // et des volutes qui montent du caisson posé sur la tête de lit ; elle n'apparaît que sous la lumière du canal aromathérapie
    const smokeTex = (() => {
      const c = document.createElement("canvas"); c.width = c.height = 128;
      const g = c.getContext("2d");
      for (let n = 0; n < 28; n++) {                  // une bouffée = des disques flous superposés
        const x = 64 + (rnd() - .5) * 44, y = 64 + (rnd() - .5) * 44, r = 12 + rnd() * 30;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, `rgba(255,255,255,${(.08 + rnd() * .1).toFixed(3)})`); gr.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      }
      g.globalCompositeOperation = "destination-in";  // bords fondus : jamais de bord carré visible
      const m = g.createRadialGradient(64, 64, 20, 64, 64, 64); m.addColorStop(0, "#fff"); m.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = m; g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    })();
    const smoke = { level: 0, target: 0, haze: [], wisps: [] }, smokeCol = new THREE.Color();
    const puff = (parent, size) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, opacity: 0, depthWrite: false }));
      sp.scale.setScalar(size); sp.material.rotation = rnd() * 6.28; sp.visible = false; parent.add(sp); return sp;
    };
    for (let n = 0; n < 26; n++) {
      const sp = puff(scene, 1.6 + rnd() * 2.1);
      sp.position.set((rnd() - .5) * 4.8, .15 + rnd() * 1.8, (rnd() - .5) * 3.6);
      smoke.haze.push({ sp, vx: (rnd() - .5) * .08, vr: (rnd() - .5) * .1, a: .14 + rnd() * .12, y0: sp.position.y, ph: rnd() * 6.28 });
    }
    for (let n = 0; n < 14; n++) smoke.wisps.push({ sp: puff(model, .3), t: n / 14, life: 5 + rnd() * 3, dx: (rnd() - .5) * .6, dz: .15 + rnd() * .45, a: .28 + rnd() * .14 });
    const SRC = { x: .58, y: .86 + 1.12 / 2 + .2, z: -1.1 };   // haut du caisson d'aromathérapie
    function updateSmoke(dt, now) {
      smoke.level += (smoke.target - smoke.level) * Math.min(1, dt * 1.1);
      const L = smoke.level, on = L > .004;
      smokeCol.setRGB(1, 1, 1).lerp(lightCol, .45);
      for (const h of smoke.haze) {
        h.sp.visible = on; if (!on) continue;
        h.sp.position.x += h.vx * dt; if (Math.abs(h.sp.position.x) > 2.5) h.vx = -h.vx;
        h.sp.position.y = h.y0 + Math.sin(now / 3200 + h.ph) * .06;
        h.sp.material.rotation += h.vr * dt;
        h.sp.material.opacity = h.a * L; h.sp.material.color.copy(smokeCol);
      }
      for (const w of smoke.wisps) {
        w.sp.visible = on; if (!on) continue;
        w.t = (w.t + dt / w.life) % 1;
        const t = w.t;
        w.sp.position.set(SRC.x + w.dx * t, SRC.y + t * 1.05, SRC.z + w.dz * t);
        w.sp.scale.setScalar(.22 + t * 1.15);
        w.sp.material.rotation += dt * .35;
        w.sp.material.opacity = w.a * L * Math.sin(Math.PI * t); w.sp.material.color.copy(smokeCol);
      }
    }

    // ------------------------------------------------------------------ lumière des canaux
    const lightCol = new THREE.Color();
    function setLight(t) {                             // t : position continue dans le cycle des 4 canaux
      const i = Math.floor(t) % 4, f = t - Math.floor(t), j = (i + 1) % 4;
      const k = gsap.utils.clamp(0, 1, (f - .78) / .22);  // la couleur tient, puis passe à la suivante
      lightCol.copy(CANAUX[i].color).lerp(CANAUX[j].color, k * k * (3 - 2 * k));
      ledMat.color.copy(lightCol).multiplyScalar(1.6);
      haloMat.color.copy(lightCol).multiplyScalar(.5);
      glowA.color.copy(lightCol); glowB.color.copy(lightCol);
      const kk = k * k * (3 - 2 * k);
      smoke.target = (i === 1 ? 1 - kk : 0) + (j === 1 ? kk : 0);
      setCanalName(k > .5 ? j : i);
    }

    // ------------------------------------------------------------------ caméra : le lit est cadré dans un rectangle de l'écran
    const view = { cx: .5, cy: .5, w: .46, h: .6, zoom: 1 };
    const tgt = new V3(0, CENTER_Y, 0);
    let W = 1, Hh = 1;
    const introRect = () => (innerWidth > 900 ? { cx: .5, cy: .47, w: .44, h: .66 } : { cx: .5, cy: .5, w: .74, h: .44 });
    function heroRect() {
      if (innerWidth > 1200) return { cx: .71, cy: .57, w: .46, h: .74 };
      if (innerWidth > 900) return { cx: .745, cy: .58, w: .4, h: .7 };   // 900-1200 px : le texte prend plus de place
      const r0 = root.getBoundingClientRect().top, rel = el => (el.getBoundingClientRect().bottom - r0) / Hh;
      const top = rel($(".hero__actions")) + .02, bottom = ($(".hero__proof").getBoundingClientRect().top - r0) / Hh - .01;
      const bot = bottom - .055;                      // place pour l'icône « glisser pour tourner » sous le lit
      return { cx: .5, cy: (top + bot) / 2, w: 1.02, h: Math.max(.2, bot - top) };
    }
    function applyCamera() {
      camera.aspect = W / Hh;
      const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const hv = Math.max(MODEL_H / view.h, MODEL_W / (view.w * camera.aspect)) / view.zoom;
      const dist = hv / (2 * t) + 1.1, elev = .085;   // caméra sous le plafond du baldaquin : on voit les étoiles
      camera.position.set(0, tgt.y + dist * Math.sin(elev), dist * Math.cos(elev));
      camera.lookAt(tgt);
      camera.setViewOffset(W, Hh, W * (.5 - view.cx), Hh * (.5 - view.cy), W, Hh);
      camera.updateProjectionMatrix();
    }
    let viewTween = null;
    function resize() {
      W = stage.clientWidth; Hh = stage.clientHeight;
      renderer.setSize(W, Hh, false);
      if (introOver && !(viewTween && viewTween.isActive())) Object.assign(view, heroRect());
      applyCamera();
      if (introOver) placeHint();
    }

    // ------------------------------------------------------------------ boucle de rendu
    const BASE_YAW = -.62;                             // vue de trois quarts : le pied et le côté du lit
    const state = { yaw: 0, sway: 0, mx: 0, my: 0, tmx: 0, tmy: 0, scroll: 0, light: 0 };
    const drag = { on: false, yaw: 0, pitch: 0, v: 0, x: 0, y: 0, moved: 0 };   // manipulation à la souris / au doigt
    let visible = true, t0 = performance.now(), idleT0 = 0;
    function render() {
      if (!visible) return;
      const now = performance.now(), dt = Math.min(.05, (now - (render.last || now)) / 1000);
      render.last = now;
      starMat.uniforms.uTime.value = (now - t0) / 1000;
      if (!ctx.reduced) updateSmoke(dt, now);
      if (introOver && !ctx.reduced) {
        // au repos : le lit respire, suit un peu la souris, la lumière passe lentement d'un canal à l'autre
        if (!drag.on) { drag.yaw += drag.v; drag.v *= .94; }  // élan après le lâcher
        const follow = drag.on ? 0 : 1;                       // la souris n'oriente plus le lit pendant qu'on le tient
        state.mx += (state.tmx * follow - state.mx) * .05; state.my += (state.tmy * follow - state.my) * .05;
        state.sway = Math.sin((now - idleT0) / 4600) * .09;
        setLight(((now - idleT0) / 1000 / 7.5) % 4);
      }
      model.rotation.y = BASE_YAW + state.yaw + state.sway + state.mx * .14 + state.scroll * .6 + drag.yaw;
      model.rotation.x = state.my * .02 + drag.pitch;
      renderer.render(scene, camera);
    }

    // ------------------------------------------------------------------ le tour complet
    const intro = gsap.timeline({ paused: true });
    intro.to(canvas, { opacity: 1, duration: .9, ease: "power2.out" }, 0)
      .fromTo(view, { zoom: .9 }, { zoom: 1, duration: TURN, ease: "power1.inOut", onUpdate: applyCamera }, 0)
      .to(state, {
        yaw: Math.PI * 2, duration: TURN, ease: "power1.inOut",
        onUpdate() {
          const p = state.yaw / (Math.PI * 2);
          setPct(Math.round(p * 100));
          setLight(Math.min(3.75, p * 4));        // le dernier canal (hydrothérapie) tient jusqu'à la fin du tour
        },
      }, 0);

    function finishIntro() {
      // recadrage : le lit glisse à droite, le texte du hero se pose à gauche
      state.yaw = 0;
      idleT0 = performance.now() - 3 * 7.5 * 1000;     // la lumière repart du dernier canal du tour (hydrothérapie)
      setPct(100);
      viewTween = gsap.to(view, { ...heroRect(), zoom: 1, duration: 1.3, ease: "power3.inOut", onUpdate: applyCamera, onComplete: () => placeHint() });
      if (innerWidth > 900) gsap.to(root, { "--bx": "70%", duration: 1.3, ease: "power3.inOut" });
      revealHero(false);
      setupScroll();
      enableInteraction();
    }
    intro.eventCallback("onComplete", finishIntro);

    // passer l'intro : bouton, molette, glisser, touches
    const hurry = () => { if (!introOver && intro.isActive()) gsap.to(intro, { timeScale: 7, duration: .4, ease: "power2.in" }); };
    skip.addEventListener("click", hurry);
    addEventListener("wheel", hurry, { passive: true, once: true });
    addEventListener("touchmove", hurry, { passive: true, once: true });
    addEventListener("keydown", e => { if (["ArrowDown", "PageDown", " ", "End", "Enter", "Escape"].includes(e.key)) hurry(); }, { once: true });

    function setupScroll() {
      ctx.ScrollTrigger.create({ trigger: root, start: "top top", end: "bottom top", scrub: true, onUpdate: s => { state.scroll = s.progress; } });
      gsap.to(copy, { yPercent: -14, autoAlpha: .2, ease: "none", scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: true } });
    }

    addEventListener("pointermove", e => {
      if (e.pointerType !== "mouse") return;
      state.tmx = (e.clientX / innerWidth) * 2 - 1;
      state.tmy = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });

    // ------------------------------------------------------------------ manipulation du lit (une fois le hero posé)
    // glisser : le lit tourne (avec élan) et s'incline un peu ; un clic sur le lit passe à la lumière du canal suivant.
    // Sur écran tactile, seul le geste horizontal tourne le lit : le geste vertical fait défiler la page (touch-action: pan-y).
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    const meshes = []; model.traverse(o => { if (o.isMesh && o !== blob && o !== halo) meshes.push(o); });
    const onBed = e => {
      const r = canvas.getBoundingClientRect();
      ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return ray.intersectObjects(meshes, false).length > 0;
    };
    const hint = $(".hero__hint");
    gsap.set(hint, { xPercent: -50, yPercent: -50 });
    const FRONT = new V3(0, 0, 1.15), proj = new V3();   // le sol juste devant le pied du lit
    function placeHint() {                             // sous le lit, quel que soit le cadrage
      proj.copy(FRONT).project(camera);
      hint.style.left = `${(proj.x + 1) / 2 * W}px`;
      hint.style.top = `${(1 - proj.y) / 2 * Hh + (W > 900 ? 30 : 20)}px`;
    }
    let hinted = false;
    const used = () => { if (hinted) return; hinted = true; gsap.to(hint, { autoAlpha: 0, duration: .5 }); };
    function enableInteraction() {
      root.classList.add("is-interactive");
      placeHint();
      if (!ctx.reduced) gsap.fromTo(hint, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: .8, delay: 1.4, ease: "power3.out", onStart: placeHint });
      else gsap.set(hint, { autoAlpha: 1 });
      canvas.addEventListener("pointerdown", e => {
        if (!onBed(e)) return;
        drag.on = true; drag.v = 0; drag.moved = 0; drag.x = e.clientX; drag.y = e.clientY;
        canvas.setPointerCapture(e.pointerId);
        root.classList.add("is-grabbing");
      });
      canvas.addEventListener("pointermove", e => {
        if (!drag.on) {                                 // survol : main ouverte seulement sur le lit
          if (e.pointerType === "mouse") canvas.style.cursor = onBed(e) ? "grab" : "";
          return;
        }
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
        drag.v = dx * .009; drag.yaw += drag.v;
        drag.pitch = Math.max(-.12, Math.min(.22, drag.pitch + dy * .003));
        if (drag.moved > 6) used();
      });
      const release = e => {
        if (!drag.on) return;
        drag.on = false;
        root.classList.remove("is-grabbing");
        if (drag.moved < 6) {                           // simple clic : canal suivant
          const t = ((performance.now() - idleT0) / 1000 / 7.5) % 4;
          idleT0 = performance.now() - (Math.floor(t) + 1) * 7.5 * 1000 + 1;
          used();
        }
        gsap.to(drag, { pitch: 0, duration: 1.6, ease: "power3.out" });   // l'inclinaison revient doucement
      };
      canvas.addEventListener("pointerup", release);
      canvas.addEventListener("pointercancel", release);
    }
    ctx.whenVisible(root, () => { visible = true; }, () => { visible = false; }, "0px");
    addEventListener("resize", () => { clearTimeout(resize.t); resize.t = setTimeout(resize, 120); });

    manager.onLoad = () => {
      Object.assign(view, introRect());
      resize();
      setLight(0);
      try { renderer.compile(scene, camera); } catch (e) {}
      gsap.ticker.add(render);
      if (ctx.reduced) {
        canvas.style.opacity = 1;
        Object.assign(view, heroRect(), { zoom: 1 }); applyCamera();
        root.style.setProperty("--bx", innerWidth > 900 ? "70%" : "50%");
        setPct(100); revealHero(true); idleT0 = performance.now();
        enableInteraction();
        return;
      }
      if (freezeAt !== null) {
        if (freezeAt >= TURN) { intro.progress(1); return; }   // onComplete -> hero
        intro.seek(freezeAt, false).pause(); return;
      }
      intro.play(0);
    };
  },
});
