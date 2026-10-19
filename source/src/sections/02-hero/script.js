/* Hero · 3D Animation #11 (objet 3D en studio, caméra qui passe d'une vue à l'autre) + compteur à rouleaux (Hero #8), même
   moteur que la charpente de Constantin Besomi. Le lit « L'Éveil des sens » est modélisé ici d'après les rendus de Carmelo Crea :
   portique en pin cembro blanchi, gris délavé (tour de tête avec niche, tableau et tablette, ciel de lit en caisson suspendu, socle aux pieds
   découpés), tête de lit capitonnée en deux panneaux, voilages, jeté de lit, caisson d'aromathérapie, plafond étoilé. Préchargement : un tour complet ; le compteur va de 0 à 100 et la lumière passe par les
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
    let renderer, resolveBed;
    ctx.bed = new Promise(r => (resolveBed = r));   // le configurateur 3D clone ce lit (null sans WebGL)
    try {
      if (!THREE) throw new Error("three absent");
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
      if (!renderer.getContext()) throw new Error("contexte WebGL absent");
    } catch (e) { renderer = null; }
    if (!renderer) {
      root.classList.add("no-gl");
      resolveBed(null);
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
    key.position.set(-3.4, 3.9, 6.4);
    key.target.position.set(0, .6, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -3.2, right: 3.2, top: 3.2, bottom: -3.2, near: 1, far: 18 });
    key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 5; key.shadow.blurSamples = 14;
    scene.add(key, key.target);
    const rim = new THREE.DirectionalLight(0x9fb2ff, .7);
    rim.position.set(4, 3.5, -4.5);
    scene.add(rim);
    const glowA = new THREE.PointLight(0xffffff, 9, 0, 2), glowB = new THREE.PointLight(0xffffff, 9, 0, 2);
    glowA.position.set(0, 1.95, -1.07); glowB.position.set(0, 2.02, .25);   // dans la niche, sous le ciel de lit

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
    const cembroMap = tex(IMG["tex-bois-gris"], true), cembroN = tex(IMG["tex-cembro-n"]);   // pin cembro blanchi, gris délavé comme sur les rendus
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
    const tuftN = normalTex(256, (u, v) => Math.pow(Math.abs(Math.sin(Math.PI * (u + v)) * Math.sin(Math.PI * (u - v))), .55), 4, 2);
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
    const wood = new THREE.MeshStandardMaterial({ map: cembroMap, normalMap: cembroN, normalScale: new THREE.Vector2(.55, .55), roughness: .6, metalness: 0, envMapIntensity: .55 });
    const fabric = (color, o = {}) => new THREE.MeshPhysicalMaterial(Object.assign({ color, roughness: .9, metalness: 0, sheen: 1, sheenRoughness: .65, sheenColor: new THREE.Color(0xfff4e8), envMapIntensity: .5 }, o));
    const headMat = fabric(0xcbc1b3, { normalMap: tuftN, normalScale: new THREE.Vector2(1.5, 1.5) });
    const sheetMat = fabric(0xeeeae3, { sheen: .6 });
    const pillowMat = fabric(0xf3f0ea, { sheen: .5 });
    const duvetMat = fabric(0x77716a, { normalMap: knitN, normalScale: new THREE.Vector2(.7, .7), sheen: .35, sheenColor: new THREE.Color(0x8a8178), side: THREE.DoubleSide });
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
    // le lit est rangé en pièces (socle, literie, tour de tête, ciel de lit) que le configurateur affiche ou masque
    const PARTS = { base: new THREE.Group(), bedding: new THREE.Group(), tower: new THREE.Group(), canopy: new THREE.Group() };
    Object.values(PARTS).forEach(g => model.add(g));
    let cur = model;
    const add = (geo, mat, x = 0, y = 0, z = 0, parent = cur) => {
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
    };
    const AX = new V3(1, 0, 0), AY = new V3(0, 1, 0), AZ = new V3(0, 0, 1);
    const plank = (w, h, d, axis) => grainUV(new THREE.BoxGeometry(w, h, d, 1, 1, 1), axis, .9, 2.2);

    // ------------------------------------------------------------------ le lit, d'après les rendus de Carmelo Crea : un portique en
    // planches épaisses. Tour de tête profonde (niche avec tableau, tablette, tête de lit capitonnée en deux panneaux), ciel de lit
    // en caisson suspendu par des tiges (plafond étoilé, bandeau lumineux), socle aux pieds découpés, voilages, jeté de lit.
    const X = 1, T = .09, ZB = -1.42, ZF = -.96, ZE = 1.24, CB = 2.12, TOP = 2.5;   // demi-largeur, épaisseur, dos et face de la tour, pied, bas et haut du ciel de lit
    const XB = .96, HB0 = .42, ZP = 1.16, SH = 1.1;                                  // socle : demi-largeur, hauteur, face intérieure du pied ; tablette
    // panneau du socle : encoche à coins arrondis en bas, il ne reste que deux pieds (comme sur les rendus)
    function notched(len, h, t, leg = .17, nh = .085, r = .045) {
      const s = new THREE.Shape(), L = len / 2;
      s.moveTo(-L, 0); s.lineTo(-L + leg, 0); s.lineTo(-L + leg, nh - r); s.quadraticCurveTo(-L + leg, nh, -L + leg + r, nh);
      s.lineTo(L - leg - r, nh); s.quadraticCurveTo(L - leg, nh, L - leg, nh - r); s.lineTo(L - leg, 0); s.lineTo(L, 0);
      s.lineTo(L, h); s.lineTo(-L, h); s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: t - .008, bevelEnabled: true, bevelSize: .004, bevelThickness: .004, bevelSegments: 1, curveSegments: 8 });
      g.translate(0, 0, -(t - .008) / 2);
      return g;
    }
    cur = PARTS.base;
    for (const s of [-1, 1]) {
      const g = notched(ZP - ZF, HB0, .07); g.rotateY(Math.PI / 2);
      add(grainUV(g, AZ, .9, 2.2), wood, s * (XB - .035), 0, (ZF + ZP) / 2);
    }
    add(grainUV(notched(2 * XB, HB0, .07), AX, .9, 2.2), wood, 0, 0, ZP + .035);
    add(new THREE.BoxGeometry(2 * XB - .14, .03, ZP - ZF), plinthMat, 0, .285, (ZF + ZP) / 2);
    cur = PARTS.bedding;
    // matelas, oreillers (deux grands adossés à la tête de lit, deux plus petits devant)
    add(roundedBox(1.76, .26, 2.06, .05), sheetMat, 0, .43, .11);
    const pillow = (w, h, d) => {
      const g = roundedBox(w, h, d, .08, 8), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {           // oreiller bombé au centre, aplati aux coins
        const x = p.getX(i) / (w / 2), z = p.getZ(i) / (d / 2), k = Math.max(0, 1 - .55 * (x * x + z * z));
        p.setY(i, p.getY(i) * (.55 + .45 * k));
      }
      g.computeVertexNormals();
      return g;
    };
    for (const s of [-1, 1]) {
      // le haut contre le capitonné, légèrement tournés l'un vers l'autre
      add(pillow(.8, .2, .5), pillowMat, s * .42, .8, -.79).rotation.set(.62, -s * .04, s * .02);
      add(pillow(.7, .17, .44), pillowMat, s * .4, .68, -.57).rotation.set(.28, -s * .07, s * .03);
    }
    // jeté de lit en maille : posé sur la moitié du lit côté pied, il retombe d'un côté presque jusqu'au sol, plis dans la chute
    (function throwBlanket() {
      const top = .588, z0 = -.12, z1 = 1.13;
      const prof = hang => [[0, top], [.84, top], [.895, .562], [.93, .49], [.966, .436], [.985, .4], [.992, .4 - hang]];
      const table = pts => { const acc = [0]; for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return { pts, acc, len: acc[acc.length - 1] }; };
      const at = (P, s) => {
        let i = 1; while (i < P.acc.length - 1 && P.acc[i] < s) i++;
        const k = Math.min(1, (s - P.acc[i - 1]) / (P.acc[i] - P.acc[i - 1])), a = P.pts[i - 1], b = P.pts[i];
        return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
      };
      const SIDE = { "-1": table(prof(.1)), "1": table(prof(.3)) };     // long du côté droit (celui que montre le hero), court à gauche
      const g = new THREE.PlaneGeometry(1, 1, 120, 56), p = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        const u = p.getX(i) + .5, v = p.getY(i) + .5;
        const s = -SIDE[-1].len + u * (SIDE[-1].len + SIDE[1].len), z = z0 + v * (z1 - z0), side = s < 0 ? -1 : 1;
        let [x, y] = at(SIDE[side], Math.abs(s));
        x *= side;
        const drop = Math.max(0, .4 - y), fold = Math.min(1, (drop / .25) ** 2);   // plis nuls au bord, pleins en bas de la chute
        x += side * fold * (.012 + .006 * Math.sin(z * 3.1)) * (.5 + .5 * Math.sin(z * 13 + 1.3 * side));   // plis verticaux, toujours vers l'extérieur (jamais dans le bois)
        y -= fold * .012 * (.5 + .5 * Math.sin(z * 4.3 + 1));                                    // ourlet irrégulier
        if (y > .55) y += .009 * Math.sin(x * 7 + z * 2.3) + .006 * Math.sin(z * 11 - x * 3);    // ondulations sur le dessus
        p.setXYZ(i, x, y, z);
        uv.setXY(i, s * 2.4, z * 2.4);
      }
      g.computeVertexNormals();
      add(g, duvetMat).receiveShadow = false;   // l'ombre du matelas sur la chute crénelait le bord (aliasing de la carte d'ombre)
    })();

    cur = PARTS.tower;
    // tour de tête : deux joues pleine hauteur, fond, bloc de tête dont le dessus fait tablette
    for (const s of [-1, 1]) add(plank(T, CB, ZF - ZB, AY), wood, s * (X - T / 2), CB / 2, (ZB + ZF) / 2);
    add(plank(2 * (X - T), CB, .04, AY), wood, 0, CB / 2, ZB + .02);
    add(plank(2 * (X - T), SH - .3, .36, AX), wood, 0, .3 + (SH - .3) / 2, -1.2);
    add(plank(2 * (X - T), .035, .42, AX), wood, 0, SH + .0175, -1.19);
    // tête de lit capitonnée : deux panneaux, boutons aux sommets des losanges
    const HP = { w: .85, h: .5, y: .85, z: -.97 }, btnGeo = new THREE.SphereGeometry(.014, 10, 8);
    for (const s of [-1, 1]) {
      const cx = s * (HP.w / 2 + .008);
      add(roundedBox(HP.w, HP.h, .1, .03), headMat, cx, HP.y, HP.z);
      for (let i = 1; i < 8; i++) for (let j = 1; j < 4; j++) {
        if ((i + j) % 2) continue;
        add(btnGeo, buttonMat, cx - HP.w / 2 + i * HP.w / 8, HP.y - HP.h / 2 + j * HP.h / 4, HP.z + .052);
      }
    }
    // tableau de la niche : giclures noires sur toile claire, comme sur les rendus
    const art = (() => {
      const c = document.createElement("canvas"); c.width = 640; c.height = 420;
      const g = c.getContext("2d");
      g.fillStyle = "#e9e5de"; g.fillRect(0, 0, 640, 420); g.lineCap = "round";
      for (let n = 0; n < 260; n++) {
        const x = rnd() * 640, y = rnd() * 420, d = () => (rnd() - .5);
        g.strokeStyle = rnd() < .82 ? `rgba(16,16,18,${(.6 + rnd() * .4).toFixed(2)})` : `rgba(118,114,108,${(.5 + rnd() * .4).toFixed(2)})`;
        g.lineWidth = .6 + Math.pow(rnd(), 3) * 7;
        g.beginPath(); g.moveTo(x, y);
        g.bezierCurveTo(x + d() * 260, y + d() * 200, x + d() * 260, y + d() * 200, x + d() * 180, y + d() * 140);
        g.stroke();
      }
      g.fillStyle = "rgba(16,16,18,.85)";
      for (let n = 0; n < 160; n++) { g.beginPath(); g.arc(rnd() * 640, rnd() * 420, .5 + Math.pow(rnd(), 4) * 6, 0, 7); g.fill(); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t;
    })();
    add(new THREE.PlaneGeometry(1.02, .67), new THREE.MeshStandardMaterial({ map: art, roughness: .8 }), 0, 1.66, ZB + .045).castShadow = false;
    // sur la tablette : le caisson d'aromathérapie (bois, façade en jute) à gauche, des livres à droite
    add(plank(.34, .14, .17, AX), wood, -.52, SH + .035 + .07, -1.17);
    add(new THREE.BoxGeometry(.26, .09, .01), juteMat, -.52, SH + .035 + .07, -1.17 + .086);
    const bookMats = [0x1b1c20, 0xd9d3c9, 0x34302b, 0x121316, 0x8b857c].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: .8 }));
    for (let n = 0, bx = .46; n < 7; n++) {
      const w = .022 + rnd() * .024, h = .16 + rnd() * .09;
      add(new THREE.BoxGeometry(w, h, .15), bookMats[n % 5], bx + w / 2, SH + .035 + h / 2, -1.2);
      bx += w + .003;
    }

    cur = PARTS.canopy;
    // ciel de lit : caisson sur toute la longueur, plafond en retrait, suspendu par quatre tiges qui se perdent dans le noir
    const CH = TOP - CB, CZ = (ZB + ZE) / 2, CL = ZE - ZB, CEIL = CB + .21;
    for (const s of [-1, 1]) add(plank(T, CH, CL, AZ), wood, s * (X - T / 2), CB + CH / 2, CZ);
    for (const z of [ZB + T / 2, ZE - T / 2]) add(plank(2 * (X - T), CH, T, AX), wood, 0, CB + CH / 2, z);
    add(plank(2 * X, .04, CL, AZ), wood, 0, TOP + .02, CZ);
    add(new THREE.BoxGeometry(2 * (X - T), .02, CL - 2 * T), ceilMat, 0, CEIL + .01, CZ).castShadow = false;
    const fade = (() => {
      const c = document.createElement("canvas"); c.width = 2; c.height = 64;
      const g = c.getContext("2d"), gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, "#000"); gr.addColorStop(1, "#fff");
      g.fillStyle = gr; g.fillRect(0, 0, 2, 64); return new THREE.CanvasTexture(c);
    })();
    const rodMat = new THREE.MeshStandardMaterial({ color: 0x2a2c31, roughness: .35, metalness: .7, transparent: true, alphaMap: fade });
    for (const x of [-.8, .8]) for (const z of [ZB + .3, ZE - .3]) add(new THREE.CylinderGeometry(.008, .008, 1.4, 6, 1, true), rodMat, x, TOP + .74, z).castShadow = false;
    const led = new THREE.Group(); PARTS.canopy.add(led);
    const L = { w: 2 * (X - T) - .05, d: CL - 2 * T - .05, y: CEIL - .012, z: CZ };
    for (const s of [-1, 1]) {
      const a = new THREE.Mesh(new THREE.BoxGeometry(L.w, .012, .02), ledMat); a.position.set(0, L.y, L.z + s * L.d / 2); led.add(a);
      const b = new THREE.Mesh(new THREE.BoxGeometry(.02, .012, L.d), ledMat); b.position.set(s * L.w / 2, L.y, L.z); led.add(b);
    }
    model.add(glowA, glowB);
    // halo sous le plafond : la lumière du bandeau qui baigne le ciel de lit (plan additif, teinté comme le canal)
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .7, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, alphaMap: radial([[0, "#fff"], [.55, "#777"], [1, "#000"]]) });
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 2.3).rotateX(Math.PI / 2), haloMat);
    halo.position.set(0, CEIL - .015, CZ + .2);
    PARTS.canopy.add(halo);
    // voilages accrochés sous le ciel de lit : un rideau plus dense du côté gauche, des voiles fronces aux angles
    const veil = (color, opacity) => new THREE.MeshStandardMaterial({ color, roughness: 1, envMapIntensity: .25, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false });
    const sheer = veil(0xf2ede6, .14), dense = veil(0x8e8983, .5);
    // Physique des voilages : chaque rideau est une toile (intégration de Verlet, contraintes de distance) accrochée à sa
    // tringle et simulée dans le repère du monde. Quand le lit tourne (tour de chargement, glisser, souris, défilement), la
    // tringle bouge et le tissu suit avec retard, s'écarte dans les virages, se balance puis retombe ; un souffle le fait respirer.
    const cloths = [];
    function shade(g) {                                // ombrage des plis adouci : un voile, pas des lames (normale du rideau = +x)
      g.computeVertexNormals();
      const a = g.attributes.normal.array;
      for (let i = 0; i < a.length; i += 3) {
        const x = a[i] * .35 + .65, y = a[i + 1] * .35, z = a[i + 2] * .35, l = Math.hypot(x, y, z);
        a[i] = x / l; a[i + 1] = y / l; a[i + 2] = z / l;
      }
    }
    function curtain(x, z0, len, folds, amp, mat) {
      const h = CEIL - .46, nx = folds * 6 + 1, ny = 13;
      const g = new THREE.PlaneGeometry(len, h, nx - 1, ny - 1), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {              // forme de repos (plis) dans le repère du lit ; rangée 0 = la tringle
        const px = p.getX(i), py = p.getY(i), u = px / len + .5, v = py / h + .5;
        p.setXYZ(i, x + amp * Math.sin(u * folds * Math.PI * 2) * (1.25 - .25 * v), .46 + h / 2 + py, z0 + len / 2 - px);
      }
      shade(g);
      const m = new THREE.Mesh(g, mat); m.renderOrder = 2; m.frustumCulled = false; m.userData.cloth = true; PARTS.canopy.add(m);
      const R = Float32Array.from(p.array), n = p.count, C = [];
      const link = (i, j) => C.push(i, j, Math.hypot(R[j * 3] - R[i * 3], R[j * 3 + 1] - R[i * 3 + 1], R[j * 3 + 2] - R[i * 3 + 2]));
      for (let r = 0; r < ny; r++) for (let c = 0; c < nx; c++) {
        const i = r * nx + c;
        if (c + 1 < nx) link(i, i + 1);
        if (r + 1 < ny) link(i, i + nx);
        if (c + 1 < nx && r + 1 < ny) { link(i, i + nx + 1); link(i + 1, i + nx); }
        if (c + 2 < nx) link(i, i + 2);                 // raideur : les plis gardent leur forme
        if (r + 2 < ny) link(i, i + 2 * nx);
      }
      cloths.push({ g, n, nx, ny, R, C: Float32Array.from(C), P: new Float32Array(n * 3), O: new Float32Array(n * 3),
        pin: new Float32Array(nx * 3), pin0: new Float32Array(nx * 3), side: Math.sign(x), air: mat === sheer ? .982 : .99, ph: rnd() * 6.28, init: false });
    }
    const MW = new THREE.Matrix4(), MI = new THREE.Matrix4(), cv = new V3(), NRM = new V3(), H2 = 1 / 3600;
    let clothAcc = 0;
    function updateCloth(dt, time, reset) {
      model.updateMatrixWorld();
      MW.copy(model.matrixWorld); MI.copy(MW).invert();
      NRM.set(MW.elements[0], MW.elements[1], MW.elements[2]).normalize();   // axe x du lit : la normale des voilages
      clothAcc = Math.min(clothAcc + dt, 4 / 60);
      const steps = Math.floor(clothAcc * 60 + 1e-6); clothAcc -= steps / 60;
      for (const c of cloths) {
        const { n, nx, ny, R, C, P, O, pin, pin0 } = c;
        pin0.set(pin);
        for (let k = 0; k < nx; k++) cv.fromArray(R, k * 3).applyMatrix4(MW).toArray(pin, k * 3);
        if (!c.init || reset) {                        // premier rendu, ou retour après une pause : le tissu repart au repos
          for (let i = 0; i < n; i++) { cv.fromArray(R, i * 3).applyMatrix4(MW); cv.toArray(P, i * 3); cv.toArray(O, i * 3); }
          pin0.set(pin); c.init = true;
        }
        for (let s = 0; s < steps; s++) {
          const t = (s + 1) / steps;                   // la tringle avance par petits pas entre deux images
          for (let k = 0; k < nx * 3; k++) P[k] = pin0[k] + (pin[k] - pin0[k]) * t;
          for (let i = nx; i < n; i++) {
            const j = i * 3, r = Math.floor(i / nx) / (ny - 1);
            const w = .3 * r * Math.sin(time * .9 + c.ph + r * 2.2 + (i % nx) * .07) * H2;   // souffle, plus marqué en bas
            let vx = P[j] - O[j], vy = P[j + 1] - O[j + 1], vz = P[j + 2] - O[j + 2];
            // résistance de l'air : linéaire + quadratique (un voile lancé vite traîne derrière au lieu de s'envoler), vitesse plafonnée
            const sp = Math.hypot(vx, vy, vz), k = c.air / (1 + 4 * sp) * (sp > .04 ? .04 / sp : 1);
            vx *= k; vy *= k; vz *= k;
            O[j] = P[j]; O[j + 1] = P[j + 1]; O[j + 2] = P[j + 2];
            P[j] += vx + NRM.x * w; P[j + 1] += vy - 9.8 * H2 + NRM.y * w; P[j + 2] += vz + NRM.z * w;
          }
          for (let it = 0; it < 3; it++) for (let q = 0; q < C.length; q += 3) {
            const a = C[q], b = C[q + 1], wa = a < nx ? 0 : 1, wb = b < nx ? 0 : 1;
            if (!(wa + wb)) continue;
            const i = a * 3, j = b * 3, dx = P[j] - P[i], dy = P[j + 1] - P[i + 1], dz = P[j + 2] - P[i + 2];
            const d = Math.hypot(dx, dy, dz) || 1e-6, f = (d - C[q + 2]) / d / (wa + wb);
            P[i] += dx * f * wa; P[i + 1] += dy * f * wa; P[i + 2] += dz * f * wa;
            P[j] -= dx * f * wb; P[j + 1] -= dy * f * wb; P[j + 2] -= dz * f * wb;
          }
          // le tissu ne traverse ni le matelas ni les joues de la tour (tests dans le repère du lit)
          for (let i = nx; i < n; i++) {
            cv.fromArray(P, i * 3).applyMatrix4(MI);
            let hit = false;
            if (cv.y < .62 && Math.abs(cv.x) < .905) { cv.x = c.side * .905; hit = true; }
            if (cv.z < ZF + .012 && Math.abs(cv.x) > X - T - .01) { cv.z = ZF + .012; hit = true; }
            if (cv.y > CB - .03) {                     // le haut du voile reste dans le caisson : il pivote sous le bord du ciel de lit
              const ax = Math.abs(cv.x), cx = Math.min(.965, Math.max(.915, ax));
              if (cx !== ax) { cv.x = c.side * cx; hit = true; }
            }
            if (hit) cv.applyMatrix4(MW).toArray(P, i * 3);
          }
        }
        const a = c.g.attributes.position.array;
        for (let i = 0; i < n; i++) cv.fromArray(P, i * 3).applyMatrix4(MI).toArray(a, i * 3);
        c.g.attributes.position.needsUpdate = true;
        shade(c.g); c.g.attributes.normal.needsUpdate = true;
      }
    }
    const XC = X - T + .025;
    curtain(-XC, ZF + .02, 1.3, 15, .011, dense);
    curtain(-XC, ZE - T - .55, .5, 7, .014, sheer);
    curtain(XC, ZF + .02, .42, 6, .014, sheer);
    curtain(XC, ZE - T - .5, .45, 6, .014, sheer);
    // étoiles : fibres optiques dans le plafond du ciel de lit, scintillement dans le shader
    const NS = 130, sp = new Float32Array(NS * 3), sd = new Float32Array(NS);
    for (let i = 0; i < NS; i++) { sp[i * 3] = (rnd() - .5) * 1.6; sp[i * 3 + 1] = CEIL - .006; sp[i * 3 + 2] = ZF + .06 + rnd() * (ZE - T - .12 - ZF); sd[i] = rnd(); }
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
    PARTS.canopy.add(new THREE.Points(starGeo, starMat));
    cur = model;
    const MODEL_W = 2.86, MODEL_H = 2.58, CENTER_Y = 1.24;

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
    // et des volutes qui montent du caisson posé sur la tablette ; elle n'apparaît que sous la lumière du canal aromathérapie
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
    const SRC = { x: -.52, y: SH + .035 + .16, z: -1.17 };   // haut du caisson d'aromathérapie
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
        w.sp.position.set(SRC.x + w.dx * t, SRC.y + t * .8, SRC.z + w.dz * t);
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
      if (innerWidth > 1200) return { cx: .71, cy: .55, w: .46, h: .7 };     // le lit est plus haut qu'avant : place pour l'icône dessous
      if (innerWidth > 900) return { cx: .745, cy: .56, w: .4, h: .66 };   // 900-1200 px : le texte prend plus de place
      const r0 = root.getBoundingClientRect().top, rel = el => (el.getBoundingClientRect().bottom - r0) / Hh;
      const top = rel($(".hero__actions")) + .02, bottom = ($(".hero__proof").getBoundingClientRect().top - r0) / Hh - .01;
      const bot = bottom - .055;                      // place pour l'icône « glisser pour tourner » sous le lit
      return { cx: .5, cy: (top + bot) / 2, w: 1.12, h: Math.max(.2, bot - top) };
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
      const now = performance.now(), gap = now - (render.last || now), dt = Math.min(.05, gap / 1000);
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
      if (!ctx.reduced) updateCloth(dt, now / 1000, gap > 250);   // après une pause (hero hors écran) les voilages repartent au repos
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
    // les voilages laissent passer le clic : on attrape le lit à travers eux
    const meshes = []; model.traverse(o => { if (o.isMesh && o !== blob && o !== halo && !o.userData.cloth) meshes.push(o); });
    const onBed = e => {
      const r = canvas.getBoundingClientRect();
      ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return ray.intersectObjects(meshes, false).length > 0;
    };
    const hint = $(".hero__hint");
    gsap.set(hint, { xPercent: -50, yPercent: -50 });
    const FRONT = new V3(0, 0, 1.4), proj = new V3();   // le sol juste devant le pied du lit
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
        drag.v = Math.max(-.06, Math.min(.06, drag.v));   // élan après lâcher plafonné : le lit tourne, il ne s'emballe pas
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
      resolveBed({ parts: PARTS, mats: { wood, led: ledMat, halo: haloMat, star: starMat }, plank, roundedBox, grainUV, AX, AY, AZ,
        dims: { X, T, ZB, ZF, ZE, CB, TOP, SH, CEIL } });
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
