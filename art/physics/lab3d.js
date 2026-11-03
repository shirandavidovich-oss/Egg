// ======================================================================
//  THE SPRING LAB IN 3D: a little circus stage, a real metal spring that ends in a hook
//  in the top of the creature's head, a glass tank that fills with water, oil or honey.
//  Drawing only: the physics stays in spring.js. Units are metres; the spring's anchor is y = 0
//  and everything hangs down from it. Needs THREE (lib/three.min.js, loaded on demand).
// ======================================================================
const Lab3D = (() => {
  "use strict";
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const smooth = (x) => x * x * (3 - 2 * x);
  const lerp = (a, b, t) => a + (b - a) * t;

  // the look of a spring follows its stiffness: soft = many thin silver coils, stiff = few thick dark ones
  function springLook(k) {
    const t = clamp((k - 30) / 370, 0, 1);
    return { t, coils: Math.round(15 - 6 * t), R: 0.052 - 0.01 * t, r: 0.0032 + 0.0062 * t };
  }

  function canvasTex(w, h, paint) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    paint(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
    return t;
  }

  function create(canvas, opts = {}) {
    const T = THREE, font = opts.font || "Rubik, Arial, sans-serif";
    const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.NoToneMapping;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    const scene = new T.Scene();
    const BG = 0xf1dfcf;
    scene.background = new T.Color(BG);
    scene.fog = new T.Fog(BG, 7, 16);
    const camera = new T.PerspectiveCamera(32, 1, 0.05, 40);
    const disposables = [];
    const keep = (x) => (disposables.push(x), x);

    // ---------- light: warm circus lamps, soft reflections for the metal ----------
    {
      const env = new T.Scene();
      const g = new T.SphereGeometry(5, 32, 16), col = [];
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i) / 5, c = new T.Color().setHSL(0.08, 0.5, 0.45 + 0.5 * Math.max(0, y));
        if (y < -0.1) c.setHSL(0.06, 0.35, 0.3);
        col.push(c.r, c.g, c.b);
      }
      g.setAttribute("color", new T.Float32BufferAttribute(col, 3));
      env.add(new T.Mesh(g, new T.MeshBasicMaterial({ side: T.BackSide, vertexColors: true })));
      const lamp = new T.Mesh(new T.PlaneGeometry(3, 1.2), new T.MeshBasicMaterial({ color: 0xffffff }));
      lamp.position.set(1.5, 3.5, 2); lamp.lookAt(0, 0, 0); env.add(lamp);
      const lamp2 = lamp.clone(); lamp2.position.set(-3, 1.5, -1); lamp2.lookAt(0, 0, 0); env.add(lamp2);
      const pm = new T.PMREMGenerator(renderer);
      const rt = pm.fromScene(env, 0.03);
      scene.environment = rt.texture; keep(rt); pm.dispose(); g.dispose();
    }
    scene.add(new T.HemisphereLight(0xfff3e4, 0x8a6a58, 0.55));
    const key = new T.DirectionalLight(0xfff0dc, 0.95);
    key.position.set(1.4, 3.6, 2.6); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -1.3, right: 1.3, top: 1.3, bottom: -1.3, near: 0.5, far: 9 });
    key.shadow.bias = -0.0005; key.shadow.normalBias = 0.02;
    scene.add(key, key.target);
    const fill = new T.DirectionalLight(0xd9ccff, 0.35); fill.position.set(-2, 1.2, -1.5); scene.add(fill);

    // ---------- the circus around: a striped tent, a string of bulbs ----------
    const room = new T.Group(); scene.add(room);        // moves with the floor
    {
      const stripes = keep(canvasTex(1024, 64, (g, w, h) => {
        const cols = ["#ecaaa1", "#f7e8d2", "#a9cad8", "#f7e8d2"];
        for (let i = 0; i < 32; i++) { g.fillStyle = cols[i % 4]; g.fillRect(i * w / 32, 0, w / 32 + 1, h); }
      }));
      stripes.wrapS = T.RepeatWrapping;
      const wall = new T.Mesh(new T.CylinderGeometry(4.6, 4.6, 7, 64, 1, true),
        new T.MeshStandardMaterial({ map: stripes, side: T.BackSide, roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.25, emissiveMap: stripes }));
      wall.position.y = 3.3; room.add(wall);
      const roof = new T.Mesh(new T.ConeGeometry(4.6, 2.6, 64, 1, true),
        new T.MeshStandardMaterial({ map: stripes, side: T.BackSide, roughness: 1, emissive: 0xffeedd, emissiveIntensity: 0.18, emissiveMap: stripes }));
      roof.position.y = 8.1; room.add(roof);
      const ground = new T.Mesh(new T.CircleGeometry(4.6, 64), new T.MeshStandardMaterial({ color: 0xd8b48e, roughness: 1 }));
      ground.rotation.x = -Math.PI / 2; ground.position.y = -0.1; ground.receiveShadow = true; room.add(ground);
      // bulbs on a sagging wire across the back
      const bulbMat = new T.MeshBasicMaterial({ color: 0xffe08a }), bulbGeo = new T.SphereGeometry(0.035, 10, 8);
      for (let r = 0; r < 2; r++) for (let i = 0; i <= 14; i++) {
        const a = -1.25 + 2.5 * i / 14, sag = 0.35 * (1 - Math.pow(2 * i / 14 - 1, 2));
        const b = new T.Mesh(bulbGeo, bulbMat);
        b.position.set(Math.sin(a) * 4.2, 2.7 + r * 0.9 - sag, -Math.cos(a) * 4.2); room.add(b);
      }
    }

    // ---------- the stage: a round painted pedestal ----------
    const stage = new T.Group(); room.add(stage);
    {
      const top = keep(canvasTex(512, 512, (g, w) => {
        const c = w / 2;
        for (let r = c; r > 0; r -= 6) { g.fillStyle = (r / 6) % 2 ? "#c99766" : "#c3905f"; g.beginPath(); g.arc(c, c, r, 0, 7); g.fill(); }
        g.fillStyle = "#e9c46a"; g.beginPath();
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 40 : 95; g.lineTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr); }
        g.fill(); g.strokeStyle = "rgba(90,50,20,0.35)"; g.lineWidth = 6; g.stroke();
        g.strokeStyle = "#f4e3c8"; g.lineWidth = 14; g.beginPath(); g.arc(c, c, c - 18, 0, 7); g.stroke();
      }));
      const side = keep(canvasTex(1024, 64, (g, w, h) => {
        for (let i = 0; i < 24; i++) { g.fillStyle = i % 2 ? "#f6e6cc" : "#d9534f"; g.fillRect(i * w / 24, 0, w / 24 + 1, h); }
      }));
      const ped = new T.Mesh(new T.CylinderGeometry(0.85, 0.9, 0.16, 64), [
        new T.MeshStandardMaterial({ map: side, roughness: 0.6 }),
        new T.MeshStandardMaterial({ map: top, roughness: 0.55 }),
        new T.MeshStandardMaterial({ color: 0x8a5a3a })]);
      ped.position.y = -0.08; ped.receiveShadow = true; ped.castShadow = true; stage.add(ped);
      const trim = new T.Mesh(new T.TorusGeometry(0.85, 0.014, 8, 80), new T.MeshStandardMaterial({ color: 0xe0b44a, metalness: 0.8, roughness: 0.3 }));
      trim.rotation.x = Math.PI / 2; stage.add(trim);
    }

    // ---------- the stand: a candy striped post and a red arm ----------
    const POST_X = -0.44;
    const candy = keep(canvasTex(64, 256, (g, w, h) => {
      g.fillStyle = "#f8eedd"; g.fillRect(0, 0, w, h); g.fillStyle = "#d9534f";
      for (let y = -w; y < h + w; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y - 32); g.lineTo(w, y - 8); g.lineTo(0, y + 24); g.fill(); }
    }));
    candy.wrapT = T.RepeatWrapping;
    const post = new T.Mesh(new T.CylinderGeometry(0.026, 0.03, 1, 20), new T.MeshStandardMaterial({ map: candy, roughness: 0.45 }));
    post.castShadow = true; scene.add(post);
    const red = new T.MeshStandardMaterial({ color: 0xc8423b, roughness: 0.4 });
    const gold = new T.MeshStandardMaterial({ color: 0xe4b64c, metalness: 0.85, roughness: 0.28 });
    const arm = new T.Mesh(new T.BoxGeometry(-POST_X + 0.1, 0.05, 0.05), red);
    arm.position.set(POST_X / 2 + 0.05, 0.055, 0); arm.castShadow = true; scene.add(arm);
    const capA = new T.Mesh(new T.SphereGeometry(0.04, 16, 12), gold); capA.position.set(POST_X, 0.06, 0); scene.add(capA);
    const capB = new T.Mesh(new T.SphereGeometry(0.03, 16, 12), gold); capB.position.set(0.11, 0.055, 0); scene.add(capB);
    const plate = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.02, 20), gold); plate.position.y = 0.022; scene.add(plate);

    // ---------- the spring: a real tube along a helix, rebuilt every frame ----------
    const spring = (() => {
      const RAD = 8, LEAD_SEG = 10;
      let look = springLook(120), N = 0, seg = 0, geo = null;
      const mat = new T.MeshStandardMaterial({ color: 0xb8c2d0, metalness: 0.92, roughness: 0.26 });
      const mesh = new T.Mesh(new T.BufferGeometry(), mat); mesh.castShadow = true; scene.add(mesh);
      const P = [], Tn = [];
      function rebuild() {
        N = look.coils; seg = N * 22 + 2 * LEAD_SEG;
        if (geo) geo.dispose();
        geo = new T.BufferGeometry();
        const nv = (seg + 1) * (RAD + 1);
        geo.setAttribute("position", new T.BufferAttribute(new Float32Array(nv * 3), 3).setUsage(T.DynamicDrawUsage));
        geo.setAttribute("normal", new T.BufferAttribute(new Float32Array(nv * 3), 3).setUsage(T.DynamicDrawUsage));
        const idx = [];
        for (let i = 0; i < seg; i++) for (let j = 0; j < RAD; j++) {
          const a = i * (RAD + 1) + j, b = a + RAD + 1;
          idx.push(a, b, a + 1, b, b + 1, a + 1);
        }
        geo.setIndex(idx);
        mesh.geometry = geo;
        P.length = 0; Tn.length = 0;
        for (let i = 0; i <= seg; i++) { P.push([0, 0, 0]); Tn.push([0, 0, 0]); }
      }
      function setK(k) {
        const nl = springLook(k), changed = nl.coils !== look.coils || !geo;
        look = nl;
        const c1 = new T.Color(0xc7d0dc), c2 = new T.Color(0x3b4049);
        mat.color.copy(c1).lerp(c2, look.t);
        mat.roughness = 0.22 + 0.14 * look.t;
        if (changed) rebuild();
      }
      // topY > bottomY; the wire runs from the anchor to the hook, curving onto the axis at both ends
      function update(topY, bottomY, wobble = 0) {
        const L = Math.max(0.02, topY - bottomY), lead = Math.min(0.03, L * 0.14), body = L - 2 * lead;
        const R = look.R * (1 + wobble), r = look.r, coilSeg = seg - 2 * LEAD_SEG;
        for (let i = 0; i <= seg; i++) {
          let y, rad, ang;
          if (i <= LEAD_SEG) { const j = i / LEAD_SEG; y = topY - lead * j; rad = R * smooth(j); ang = 0; }
          else if (i >= seg - LEAD_SEG) { const j = (i - (seg - LEAD_SEG)) / LEAD_SEG; y = bottomY + lead * (1 - j); rad = R * (1 - smooth(j)); ang = 0; }
          else { const k = (i - LEAD_SEG) / coilSeg; y = topY - lead - body * k; rad = R; ang = 2 * Math.PI * N * k; }
          const p = P[i]; p[0] = Math.cos(ang) * rad; p[1] = y; p[2] = Math.sin(ang) * rad;
        }
        for (let i = 0; i <= seg; i++) {
          const a = P[Math.max(0, i - 1)], b = P[Math.min(seg, i + 1)], t = Tn[i];
          t[0] = b[0] - a[0]; t[1] = b[1] - a[1]; t[2] = b[2] - a[2];
          const l = Math.hypot(t[0], t[1], t[2]) || 1; t[0] /= l; t[1] /= l; t[2] /= l;
        }
        const pos = geo.attributes.position.array, nor = geo.attributes.normal.array;
        // parallel transport frame
        let nx = 1, ny = 0, nz = 0;
        for (let i = 0; i <= seg; i++) {
          const t = Tn[i], d = nx * t[0] + ny * t[1] + nz * t[2];
          nx -= t[0] * d; ny -= t[1] * d; nz -= t[2] * d;
          let l = Math.hypot(nx, ny, nz);
          if (l < 1e-5) { nx = 0; ny = 0; nz = 1; const d2 = nz * t[2]; nz -= t[2] * d2; nx -= t[0] * d2; ny -= t[1] * d2; l = Math.hypot(nx, ny, nz) || 1; }
          nx /= l; ny /= l; nz /= l;
          const bx = t[1] * nz - t[2] * ny, by = t[2] * nx - t[0] * nz, bz = t[0] * ny - t[1] * nx, p = P[i];
          for (let j = 0; j <= RAD; j++) {
            const th = 2 * Math.PI * j / RAD, c = Math.cos(th), s = Math.sin(th);
            const ox = c * nx + s * bx, oy = c * ny + s * by, oz = c * nz + s * bz, o = (i * (RAD + 1) + j) * 3;
            pos[o] = p[0] + ox * r; pos[o + 1] = p[1] + oy * r; pos[o + 2] = p[2] + oz * r;
            nor[o] = ox; nor[o + 1] = oy; nor[o + 2] = oz;
          }
        }
        geo.attributes.position.needsUpdate = true; geo.attributes.normal.needsUpdate = true;
        geo.computeBoundingSphere();
      }
      return { mesh, setK, update, get look() { return look; } };
    })();

    // ---------- the hook: it goes into the top of the head ----------
    const hook = new T.Group(); scene.add(hook);
    {
      const ring = new T.Mesh(new T.TorusGeometry(0.013, 0.0035, 8, 20, Math.PI * 1.5), gold);
      ring.rotation.z = Math.PI * 0.75; ring.position.y = -0.012; hook.add(ring);
      const stem = new T.Mesh(new T.CylinderGeometry(0.0035, 0.0035, 0.014, 8), gold); stem.position.y = -0.002; hook.add(stem);
      const cap = new T.Mesh(new T.CylinderGeometry(0.016, 0.02, 0.008, 16), gold); cap.position.y = -0.028; hook.add(cap);
      hook.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    }

    // ---------- the creature: a thick painted toy cut out of its own drawing ----------
    const creature = new T.Group(); scene.add(creature);
    const body = new T.Group(); creature.add(body);
    let cre = { w: 0.3, h: 0.4, top: 0, mats: [], tex: null, layers: [], ready: false };
    function probe(img) {
      const w = 96, h = Math.max(1, Math.round(w * img.naturalHeight / img.naturalWidth));
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const g = c.getContext("2d"); g.drawImage(img, 0, 0, w, h);
      let d; try { d = g.getImageData(0, 0, w, h).data; } catch (e) { return { top: 0.03, bottom: 0.97 }; }
      let top = 0, bottom = 1;
      outer: for (let y = 0; y < h; y++) for (let x = Math.round(w * 0.38); x < w * 0.62; x++) if (d[(y * w + x) * 4 + 3] > 110) { top = y / h; break outer; }
      outer2: for (let y = h - 1; y >= 0; y--) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 110) { bottom = (y + 1) / h; break outer2; }
      return { top, bottom };
    }
    function setCreature(img, height_m) {
      for (const l of cre.layers) { body.remove(l); l.geometry.dispose(); }
      for (const m of cre.mats) m.dispose();
      if (cre.tex) cre.tex.dispose();
      if (cre.sideTex) cre.sideTex.dispose();
      const pr = probe(img), aspect = img.naturalWidth / img.naturalHeight;
      const h = height_m / Math.max(0.3, pr.bottom - pr.top), w = h * aspect;   // the drawn body is height_m tall
      const tex = new T.Texture(img); tex.encoding = T.sRGBEncoding; tex.anisotropy = 4; tex.needsUpdate = true;
      // the sides of the toy: the silhouette filled with the creature's own main colour (not its dark outline)
      const sc = document.createElement("canvas"), sw = Math.min(512, img.naturalWidth), sh = Math.round(sw / aspect);
      sc.width = sw; sc.height = sh;
      const sg = sc.getContext("2d"); sg.drawImage(img, 0, 0, sw, sh);
      let rr = 0, gg = 0, bb = 0, nn = 0;
      try {
        const d = sg.getImageData(0, 0, sw, sh).data;
        for (let i = 0; i < d.length; i += 16) { if (d[i + 3] < 200) continue; const l = (d[i] + d[i + 1] + d[i + 2]) / 765; if (l < 0.3 || l > 0.95) continue; rr += d[i]; gg += d[i + 1]; bb += d[i + 2]; nn++; }
      } catch (e) { }
      const avg = nn ? [rr / nn, gg / nn, bb / nn] : [200, 200, 200];
      sg.globalCompositeOperation = "source-in"; sg.fillStyle = `rgb(${avg.map((v) => Math.round(v * 0.78)).join(",")})`; sg.fillRect(0, 0, sw, sh);
      const sideTex = new T.CanvasTexture(sc); sideTex.encoding = T.sRGBEncoding;
      const front = new T.MeshStandardMaterial({ map: tex, alphaTest: 0.5, roughness: 0.7, metalness: 0, side: T.DoubleSide, envMapIntensity: 0.35 });
      const edge = new T.MeshStandardMaterial({ map: sideTex, alphaTest: 0.5, roughness: 0.8, metalness: 0, side: T.DoubleSide, envMapIntensity: 0.3 });
      const n = 11, D = 0.2 * Math.min(w, h * 0.8), geo = new T.PlaneGeometry(w, h);
      const layers = [];
      for (let i = 0; i < n; i++) {
        const q = 2 * i / (n - 1) - 1, isFace = Math.abs(q) > 0.95, m = new T.Mesh(geo, isFace ? front : edge);
        const s = isFace ? 1 : 0.978;          // the faces cover the sides, so the drawing's outline stays
        m.scale.set(s, s, 1);
        m.position.set(0, -(h / 2 - pr.top * h) * s, q * D / 2);     // the top of the head sits at the hook
        if (i === (n - 1) / 2) m.castShadow = true;
        body.add(m); layers.push(m);
      }
      cre.sideTex = sideTex;
      cre = { w, h, top: pr.top, bodyH: height_m, mats: [front, edge], tex, sideTex, layers, ready: true, D };
    }

    // ---------- the measuring tape on the post ----------
    let tape = null, tapeFor = "";
    function buildTape(L0, sMax) {
      const id = L0 + ":" + sMax.toFixed(2);
      if (id === tapeFor) return; tapeFor = id;
      if (tape) { scene.remove(tape); tape.geometry.dispose(); tape.material.map.dispose(); tape.material.dispose(); }
      const len = sMax + 0.04, PX = 1400, hpx = Math.round(len * PX);
      const map = canvasTex(110, Math.min(4096, hpx), (g, w, h) => {
        const k = h / len;
        g.fillStyle = "#fbf3dc"; g.fillRect(0, 0, w, h);
        g.fillStyle = "#e9c46a"; g.fillRect(0, 0, 10, h);
        g.strokeStyle = "#3a3a40"; g.fillStyle = "#3a3a40"; g.textAlign = "right"; g.textBaseline = "middle"; g.font = "700 34px " + font;
        const stepCm = len > 0.9 ? 10 : 5;
        for (let cm = 0; cm / 100 <= len - 0.01; cm++) {
          const y = cm / 100 * k + 4, major = cm % stepCm === 0, mid = cm % 5 === 0;
          g.lineWidth = major ? 4 : 2; g.beginPath(); g.moveTo(10, y); g.lineTo(10 + (major ? 38 : mid ? 26 : 14), y); g.stroke();
          if (major) g.fillText(String(cm), w - 6, y + 2);
        }
      });
      tape = new T.Mesh(new T.PlaneGeometry(0.055, len), new T.MeshStandardMaterial({ map, roughness: 0.7 }));
      tape.position.set(POST_X + 0.05, -L0 - len / 2 + 0.004, 0.035);
      tape.userData.part = "tape"; scene.add(tape);
    }
    // the red pointer: where the hook is on the tape, with a thin line to the hook
    const pointer = new T.Mesh(new T.ConeGeometry(0.014, 0.034, 3), new T.MeshStandardMaterial({ color: 0xe2574c, roughness: 0.4 }));
    pointer.rotation.z = Math.PI / 2; scene.add(pointer);
    const pLineGeo = new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]);
    const pLine = new T.Line(pLineGeo, new T.LineDashedMaterial({ color: 0xe2574c, dashSize: 0.012, gapSize: 0.01, transparent: true, opacity: 0.8 }));
    scene.add(pLine);

    // ---------- the equilibrium: a violet ring at the hook's resting height ----------
    const eqRing = new T.Mesh(new T.TorusGeometry(0.1, 0.0045, 8, 56), new T.MeshBasicMaterial({ color: 0x8a60e8, transparent: true, opacity: 0.75 }));
    eqRing.rotation.x = Math.PI / 2; eqRing.userData.part = "eq"; scene.add(eqRing);
    const eqLineGeo = new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]);
    const eqLine = new T.Line(eqLineGeo, new T.LineDashedMaterial({ color: 0x8a60e8, dashSize: 0.015, gapSize: 0.012, transparent: true, opacity: 0.7 }));
    scene.add(eqLine);

    // ---------- labels: little sprites that always face you ----------
    function label(opts2) {
      const c = document.createElement("canvas"), g = c.getContext("2d");
      const tex = new T.CanvasTexture(c); tex.encoding = T.sRGBEncoding;
      const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
      sp.renderOrder = 20; scene.add(sp);
      let last = null;
      sp.userData.set = (text, hM = 0.042) => {
        if (text === last) return; last = text;
        const px = 64, f = "700 " + Math.round(px * 0.62) + "px " + font;
        g.font = f; const tw = g.measureText(text).width;
        c.width = Math.ceil(tw + px * 0.7); c.height = px;
        g.font = f; g.textBaseline = "middle"; g.textAlign = "center"; g.direction = opts2.rtl ? "rtl" : "ltr";
        g.fillStyle = opts2.bg; g.strokeStyle = opts2.edge || "#fff"; g.lineWidth = 5;
        const r = px / 2 - 3; g.beginPath(); g.roundRect ? g.roundRect(3, 3, c.width - 6, c.height - 6, r) : g.rect(3, 3, c.width - 6, c.height - 6); g.fill(); g.stroke();
        g.fillStyle = opts2.fg; g.fillText(text, c.width / 2, c.height / 2 + 2);
        tex.needsUpdate = true;
        sp.scale.set(hM * c.width / c.height, hM, 1);
      };
      return sp;
    }
    const tagS = label({ bg: "#ffffff", fg: "#c2392f", edge: "#e2574c" });
    const tagEq = label({ bg: "rgba(255,255,255,0.92)", fg: "#6e48c9", edge: "#8a60e8", rtl: true });
    const tagK = label({ bg: "rgba(255,255,255,0.94)", fg: "#20232a", edge: "#3a3a40" });

    // ---------- force arrows ----------
    function arrow(color) {
      const g = new T.Group(), m = new T.MeshStandardMaterial({ color, roughness: 0.45, envMapIntensity: 0.4 });
      const shaft = new T.Mesh(new T.CylinderGeometry(0.011, 0.011, 1, 12), m), head = new T.Mesh(new T.ConeGeometry(0.028, 0.06, 16), m);
      g.add(shaft, head); scene.add(g);
      g.userData.set = (x, y, z, len) => {
        const dir = Math.sign(len) || 1, L = Math.max(0.04, Math.abs(len));
        g.position.set(x, y, z);
        shaft.scale.y = Math.max(0.001, L - 0.055); shaft.position.y = dir * (L - 0.055) / 2;
        head.position.y = dir * (L - 0.03); head.rotation.z = dir > 0 ? 0 : Math.PI;
      };
      return g;
    }
    const arUp = arrow(0x25a06f), arDown = arrow(0x2785c7);
    const tagUp = label({ bg: "#25a06f", fg: "#fff" }), tagDown = label({ bg: "#2785c7", fg: "#fff" });

    // ---------- the tank: glass and a liquid that fills from the bottom ----------
    const tank = new T.Group(); scene.add(tank);
    const glass = new T.Mesh(new T.CylinderGeometry(0.3, 0.3, 1, 48, 1, true), new T.MeshStandardMaterial({ color: 0xdff2ff, transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.1, side: T.DoubleSide, depthWrite: false }));
    const rim = new T.Mesh(new T.TorusGeometry(0.3, 0.008, 8, 64), new T.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, roughness: 0.1 }));
    rim.rotation.x = Math.PI / 2;
    const liquidMat = new T.MeshStandardMaterial({ color: 0x3db8e0, transparent: true, opacity: 0.35, roughness: 0.15, depthWrite: false, side: T.DoubleSide });
    const liquid = new T.Mesh(new T.CylinderGeometry(0.29, 0.29, 1, 48), liquidMat);
    liquid.renderOrder = 2; glass.renderOrder = 3;
    tank.add(glass, rim, liquid);
    const bubbles = [];
    {
      const bm = new T.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, roughness: 0.1 }), bg = new T.SphereGeometry(1, 8, 6);
      for (let i = 0; i < 26; i++) { const b = new T.Mesh(bg, bm); b.visible = false; b.renderOrder = 4; scene.add(b); bubbles.push({ m: b, on: false, vy: 0 }); }
    }

    // ---------- colourful bits: the magic when something changes ----------
    const bits = [];
    {
      const cols = [0xff6b9a, 0xffc93c, 0x5ad1ff, 0x8a60e8, 0x5bd98a, 0xff8a3d];
      const g = new T.TetrahedronGeometry(0.014);
      for (let i = 0; i < 36; i++) {
        const m = new T.Mesh(g, new T.MeshStandardMaterial({ color: cols[i % cols.length], emissive: cols[i % cols.length], emissiveIntensity: 0.5, roughness: 0.4 }));
        m.visible = false; scene.add(m); bits.push({ m, life: 0, v: new T.Vector3(), spin: new T.Vector3() });
      }
    }
    function burst(x, y, z, n = 18, power = 1) {
      let k = 0;
      for (const b of bits) {
        if (b.life > 0) continue;
        b.life = 0.9 + Math.random() * 0.5; b.m.visible = true; b.m.position.set(x, y, z);
        const a = Math.random() * Math.PI * 2, up = Math.random();
        b.v.set(Math.cos(a) * (0.4 + Math.random() * 0.6), 0.5 + up * 1.1, Math.sin(a) * (0.4 + Math.random() * 0.6)).multiplyScalar(power);
        b.spin.set(Math.random() * 10, Math.random() * 10, Math.random() * 10);
        if (++k >= n) break;
      }
    }

    // ---------- camera: frames the whole rig, tilting the phone peeks around it ----------
    let W = 1, H = 1, padT = 0, padB = 0, yaw = 0.32, yawUser = 0, pitch = 0.1, floorY = -1, camT = new T.Vector3(0, -0.5, 0), camD = 3;
    const tilt = { x: 0, y: 0, rx: null, ry: null, sx: 0, sy: 0 };
    function feedGravity(x, y, z) {
      const m = Math.hypot(x, y, z) || 1; x /= m; y /= m;
      if (tilt.rx === null) { tilt.rx = x; tilt.ry = y; }
      tilt.rx += (x - tilt.rx) * 0.004; tilt.ry += (y - tilt.ry) * 0.004;   // the resting angle drifts to wherever the phone is held
      tilt.x = clamp(x - tilt.rx, -0.5, 0.5); tilt.y = clamp(y - tilt.ry, -0.5, 0.5);
    }
    const prevGravity = window.eggGravity;
    window.eggGravity = (x, y, z) => { if (prevGravity) prevGravity(x, y, z); feedGravity(x, y, z); };
    const onMotion = (e) => { const a = e.accelerationIncludingGravity; if (a && a.x != null && !window.__nativeGravitySeen) feedGravity(a.x, a.y, a.z); };
    addEventListener("devicemotion", onMotion);

    function resize(w, h, dpr, top = 0, bottom = 0) {
      W = Math.max(1, w); H = Math.max(1, h); padT = top; padB = bottom;
      renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
    }
    function frameCamera(dt, need) {
      const Hv = Math.max(80, H - padT - padB);
      camera.aspect = W / Hv;
      camera.setViewOffset(W, Hv, 0, -padT, W, H);
      const tf = Math.tan(camera.fov * Math.PI / 360);
      const spanH = need.top - need.bottom, spanW = 1.12;
      const d = Math.max(spanH / 2 / tf, spanW / 2 / (tf * camera.aspect)) * 1.04 + 0.25;
      const k = Math.min(1, dt * 4);
      camD += (d - camD) * k;
      camT.y += ((need.top + need.bottom) / 2 - camT.y) * k;
      camT.x += (0.0 - camT.x) * k;
      tilt.sx += (tilt.x - tilt.sx) * Math.min(1, dt * 6); tilt.sy += (tilt.y - tilt.sy) * Math.min(1, dt * 6);
      const t = performance.now() / 1000;
      const yw = yaw + yawUser + tilt.sx * 0.9 + Math.sin(t * 0.35) * 0.025, pt = pitch + tilt.sy * 0.35 + Math.sin(t * 0.27) * 0.01;
      camera.position.set(camT.x + Math.sin(yw) * Math.cos(pt) * camD, camT.y + Math.sin(pt) * camD, Math.cos(yw) * Math.cos(pt) * camD);
      camera.lookAt(camT);
      camera.updateProjectionMatrix();
    }

    // ---------- picking and dragging ----------
    const ray = new T.Raycaster(), ndc = new T.Vector2();
    function setRay(cx, cy) {
      const r = canvas.getBoundingClientRect();
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
    }
    function pick(cx, cy) {
      setRay(cx, cy);
      const targets = [...cre.layers, spring.mesh, eqRing];
      if (tape) targets.push(tape);
      const hit = ray.intersectObjects(targets, false)[0];
      if (!hit) return null;
      if (cre.layers.includes(hit.object)) return "creature";
      if (hit.object === spring.mesh) return "spring";
      return hit.object.userData.part || null;
    }
    // the height (y) the finger points at, on an upright plane through the spring that faces the camera
    const plane = new T.Plane(), pv = new T.Vector3(), hitP = new T.Vector3();
    function pointerY(cx, cy) {
      setRay(cx, cy);
      camera.getWorldDirection(pv); pv.y = 0; if (pv.lengthSq() < 1e-6) pv.set(0, 0, -1); pv.normalize();
      plane.setFromNormalAndCoplanarPoint(pv, new T.Vector3(0, 0, 0));
      return ray.ray.intersectPlane(plane, hitP) ? hitP.y : null;
    }
    function toScreen(x, y, z) {
      const v = new T.Vector3(x, y, z).project(camera), r = canvas.getBoundingClientRect();
      return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
    }

    // ---------- medium ----------
    let med = { level: 0, target: 0, rgb: [61, 184, 224], opacity: 0.35, zeta: 0 };
    function setMedium(md) {
      const air = !md || md.id === "air";
      med.target = air ? 0 : 1;
      if (!air) { med.rgb = md.rgb; med.zeta = md.zeta; med.opacity = md.id === "honey" ? 0.62 : md.id === "oil" ? 0.5 : 0.34; }
    }

    // ---------- every frame ----------
    let wob = 0, lastS = 0, prevHook = null;
    function frame(st, dt) {
      dt = clamp(dt || 0, 0, 0.1);                       // a frame time can arrive slightly in the past
      const L0 = st.L0, s = st.s, hookY = -(L0 + s), eqY = -(L0 + st.eq);
      const lowest = -(L0 + st.eq + st.uMax) - (cre.ready ? cre.bodyH * 1.02 : 0.4);
      floorY += ((lowest - 0.05) - floorY) * Math.min(1, dt * 4);
      room.position.y = floorY;
      post.scale.y = 0.08 - floorY; post.position.set(POST_X, (0.08 + floorY) / 2, 0);
      candy.repeat.set(1, post.scale.y * 3);

      // spring and hook
      wob += (0 - wob) * Math.min(1, dt * 5);
      spring.update(0.012, hookY + 0.003, wob);
      hook.position.set(0, hookY, 0);

      // creature: hangs from the hook; a heavier mass makes it rounder, fast changes squash it a little
      const a = st.a || 0, sq = st.reduceMotion ? 1 : 1 + clamp(-a / 120, -0.06, 0.06), fat = st.fat || 1;
      creature.position.set(0, hookY - 0.024, 0);
      body.scale.set((2 - sq) * fat, sq, 1 + (fat - 1) * 0.6);
      const sway = st.reduceMotion ? 0 : Math.sin(performance.now() / 900) * 0.04;
      creature.rotation.y = sway; creature.rotation.z = clamp(st.v * 0.05, -0.05, 0.05);

      // tape, pointer, equilibrium
      buildTape(L0, st.eq + st.uMax + (cre.ready ? 0 : 0));
      pointer.position.set(POST_X + 0.095, hookY, 0.035);
      pLineGeo.setFromPoints([new T.Vector3(POST_X + 0.11, hookY, 0.035), new T.Vector3(-0.02, hookY, 0)]); pLine.computeLineDistances();
      tagS.userData.set((s * 100).toFixed(1) + " cm", 0.05); tagS.position.set(POST_X + 0.2, hookY + 0.036, 0.05);
      eqRing.position.set(0, eqY, 0);
      eqLineGeo.setFromPoints([new T.Vector3(POST_X + 0.08, eqY, 0.035), new T.Vector3(-0.1, eqY, 0)]); eqLine.computeLineDistances();
      tagEq.userData.set("שיווי משקל", 0.044); tagEq.position.set(POST_X + 0.22, eqY - 0.036, 0.05);
      tagK.userData.set("k = " + st.k + " N/m", 0.05); tagK.position.set(0.17, (0.012 + hookY) / 2 + 0.03, 0);

      // forces: weight down, spring up, from a point beside the body (same scale, so they can be compared)
      const show = st.forces !== false, half = cre.ready ? cre.w * 0.5 * fat : 0.15;
      arUp.visible = arDown.visible = tagUp.visible = tagDown.visible = show;
      if (show) {
        const Wt = st.m * st.g, Fs = st.k * s, kpx = 0.24 / Math.max(Wt, Fs * 0.6, 1);
        const ax = Math.min(half + 0.07, 0.42), ay = hookY - (cre.ready ? cre.bodyH * 0.5 : 0.2);
        arDown.userData.set(ax, ay, 0.04, -Wt * kpx);
        tagDown.userData.set("mg  " + Wt.toFixed(1) + " N", 0.046); tagDown.position.set(ax, ay - Math.max(0.04, Wt * kpx) - 0.04, 0.04);
        arUp.visible = tagUp.visible = Math.abs(Fs) > 0.05;
        arUp.userData.set(ax, ay, 0.04, Fs * kpx);
        tagUp.userData.set("kΔx  " + Math.abs(Fs).toFixed(1) + " N", 0.046); tagUp.position.set(ax, ay + Math.max(0.04, Math.abs(Fs) * kpx) + 0.04, 0.04);
      }

      // the tank and its liquid
      med.level += (med.target - med.level) * Math.min(1, dt * (med.target ? 1.6 : 2.4));
      const tankTop = -L0 * 0.45, tankBot = floorY + 0.002, tankH = tankTop - tankBot;
      tank.visible = med.level > 0.01 || med.target > 0;
      const gv = clamp(med.level * 3, 0, 1);
      glass.scale.set(1, tankH, 1); glass.position.y = tankBot + tankH / 2; glass.material.opacity = 0.16 * gv;
      rim.position.y = tankTop; rim.material.opacity = 0.6 * gv;
      const lh = Math.max(0.001, (tankH - 0.02) * smooth(clamp(med.level, 0, 1)));
      const wav = st.reduceMotion ? 0 : Math.sin(performance.now() / 500) * 0.004;
      liquid.scale.set(1, lh + wav, 1); liquid.position.y = tankBot + (lh + wav) / 2;
      liquidMat.color.setRGB(med.rgb[0] / 255, med.rgb[1] / 255, med.rgb[2] / 255).convertSRGBToLinear();
      liquidMat.opacity = med.opacity * clamp(med.level * 1.5, 0, 1);
      // bubbles when the body moves through the liquid
      const surf = tankBot + lh;
      if (med.level > 0.6 && Math.abs(st.v) > 0.12 && Math.random() < Math.min(0.9, Math.abs(st.v) * 1.2)) {
        const b = bubbles.find((x) => !x.on);
        if (b) { b.on = true; b.m.visible = true; const rr = 0.004 + Math.random() * 0.006; b.m.scale.setScalar(rr); b.vy = (0.25 + Math.random() * 0.2) / (1 + med.zeta * 2); b.m.position.set((Math.random() - 0.5) * half * 1.6, hookY - Math.random() * (cre.ready ? cre.bodyH : 0.3), (Math.random() - 0.5) * 0.12); }
      }
      for (const b of bubbles) if (b.on) { b.m.position.y += b.vy * dt; b.m.position.x += Math.sin(performance.now() / 200 + b.vy * 50) * 0.0006; if (b.m.position.y > surf || med.level < 0.5) { b.on = false; b.m.visible = false; } }

      // colourful bits
      for (const b of bits) if (b.life > 0) {
        b.life -= dt; b.v.y -= 2.2 * dt; b.m.position.addScaledVector(b.v, dt);
        b.m.rotation.x += b.spin.x * dt; b.m.rotation.y += b.spin.y * dt;
        b.m.scale.setScalar(clamp(b.life * 1.6, 0, 1));
        if (b.life <= 0) b.m.visible = false;
      }

      key.position.set(1.4, floorY + 4.2, 2.6); key.target.position.set(0, floorY + 0.4, 0);
      frameCamera(dt, { top: 0.14, bottom: floorY - 0.02 });
      renderer.render(scene, camera);
      lastS = s;
    }

    function dispose() {
      window.eggGravity = prevGravity; removeEventListener("devicemotion", onMotion);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        for (const m of ms) { if (m.map) m.map.dispose(); m.dispose(); }
      });
      for (const d of disposables) d.dispose && d.dispose();
      if (cre.tex) cre.tex.dispose();
      renderer.dispose();
    }

    return {
      resize, frame, pick, pointerY, toScreen, setCreature, setMedium, burst, dispose,
      setSpring(k, pop) { spring.setK(k); if (pop) { wob = 0.5; burst(0, -0.15, 0.05, 16, 0.8); } },
      orbit(dx) { yawUser = clamp(yawUser + dx, -0.75, 0.75); },
      get yawUser() { return yawUser; }, set yawUser(v) { yawUser = v; },
      hookScreen(st) { return toScreen(0, -(st.L0 + st.s) - (cre.ready ? cre.bodyH * 0.5 : 0.2), 0); },
      renderer, camera, get debug() { return { layers: cre.layers.length, ready: cre.ready, lp: cre.layers[0] && cre.layers[0].getWorldPosition(new T.Vector3()).toArray(), W, H, padT, padB, floorY, camD, camT: camT.toArray(), cam: camera.position.toArray() }; }
    };
  }

  const supported = () => { try { const c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); } catch (e) { return false; } };
  // loads THREE once (from the app, or the repo the first time); calls back true or false
  let loading = null;
  function ensure(cb) {
    if (window.THREE) return cb(true);
    if (!supported()) return cb(false);
    if (!loading) loading = new Promise((res) => {
      const s = document.createElement("script"); s.src = "lib/three.min.js"; s.async = true;
      s.onload = () => res(!!window.THREE); s.onerror = () => { loading = null; res(false); };
      document.head.appendChild(s);
      setTimeout(() => res(!!window.THREE), 20000);
    });
    loading.then(cb);
  }
  return { create, ensure, springLook };
})();
if (typeof module !== "undefined") module.exports = Lab3D;
