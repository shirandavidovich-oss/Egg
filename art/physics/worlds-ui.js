// ======================================================================
//  "עולמות המכניקה": the worlds map, a world, and a situation screen.
//  Physics: WorldPhys (worlds-engine.js). Missions and checks: WorldScenes.
//  Shell, coins, meters, sheets and arrows from ui.js (kit). The creature is
//  the body in the machines; what it does comes from the simulator.
// ======================================================================
(() => {
  "use strict";
  const K = window.eggPhysics && window.eggPhysics.kit;
  if (!K) return;
  const { G, P, SCREENS, $, esc, fmt, FONT, reduceMotion, clamp, show, setTitle, sheet, isSheetOpen, reward, forceArrow, activeSpecies, phys, nameOf, artOf } = K;
  const S = WorldScenes, WP = WorldPhys, D = S.DATA;
  const st = () => K.worldsState();
  const isDone = (id) => st().done.includes(id);
  const sceneN = (sc) => sc.missions.filter((m) => isDone(m.id)).length;
  const num = (s) => { const t = String(s).trim().replace(/[−–]/g, "-").replace(",", "."); return t === "" ? NaN : Number(t); };
  const SUP = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
  const nice = (x, d = 2) => {
    if (x === null || x === undefined) return "–";
    if (typeof x === "string") return x;
    if (!Number.isFinite(x)) return "–";
    const a = Math.abs(x);
    if (a !== 0 && (a >= 1e5 || a < 1e-3)) { const e = Math.floor(Math.log10(a)), m = x / Math.pow(10, e); return fmt(m, 2) + "×10" + String(e).split("").map((c) => SUP[c]).join(""); }
    return fmt(x, d);
  };
  const UNIT = { baseSI: "", Rx: "", Ry: "", magnitude: "", angle: "°", x: "m", displacement: "m", distance: "m", tMeeting: "s", xMeeting: "m", v: "m/s", dx: "m", stoppingTime: "s", y: "m", tPeak: "s", maxY: "m", tLand: "s",
    range: "m", N: "N", friction: "N", a: "m/s²", staticLimit: "N", T: "N", F: "N", E: "J", initialE: "J", heat: "J", endV: "m/s", remainingE: "J", aC: "m/s²", Fc: "N", period: "s", safeSpeed: "m/s",
    idealV: "m/s", idealKmh: "km/h", NTop: "N", minV: "m/s", J: "N·s", Favg: "N", deltaP: "kg·m/s", v1: "m/s", v2: "m/s", pBefore: "kg·m/s", pAfter: "kg·m/s", lostK: "J", pTotal: "kg·m/s", g: "m/s²",
    vOrbit: "m/s", vEscape: "m/s", energyAtBottom: "J", compression: "m" };
  const WORLD_LINK = { W05: { screen: "ramps", title: "הרפתקאות על המדרון", sub: "הפרק המלא: 18 מצבים ו-90 משימות" }, W06: { screen: "lab", title: "קפיץ־קפוץ", sub: "מעבדת הקפיץ המלאה" } };
  const WORLD_ICON = { W01: "ruler", W02: "arrows", W03: "belt", W04: "arc", W05: "ramp", W06: "spring", W07: "energy", W08: "carousel", W09: "carts", W10: "orbit", W11: "wave", W12: "tower" };

  // ---------------- pictograms ----------------
  const ICONS = (() => {
    const s = `fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"`, a = `fill="none" stroke="#8A60E8" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"`;
    return {
      ruler: `<rect ${s} x="6" y="20" width="40" height="12" rx="2"/><path ${a} d="M12 20v5M18 20v3M24 20v5M30 20v3M36 20v5M42 20v3"/>`,
      arrows: `<path ${s} d="M8 42L24 14"/><path ${s} d="M24 14l18 10"/><path ${a} d="M8 42L42 24"/><path ${a} d="M36 22l6 2-3 5"/>`,
      belt: `<rect ${s} x="4" y="30" width="44" height="10" rx="5"/><circle ${s} cx="9" cy="35" r="3"/><circle ${s} cx="43" cy="35" r="3"/><path ${a} d="M18 22h16M30 18l4 4-4 4"/>`,
      meet: `<path ${s} d="M4 38h44"/><circle ${s} cx="12" cy="31" r="5"/><circle ${s} cx="40" cy="31" r="5"/><path ${a} d="M20 20h6M24 17l3 3-3 3M32 20h-6"/>`,
      brake: `<path ${s} d="M4 40h44"/><rect ${s} x="10" y="24" width="20" height="12" rx="3"/><path ${a} d="M34 30h10M40 26l4 4-4 4"/>`,
      drop: `<path ${s} d="M6 44h40"/><circle ${a} cx="26" cy="14" r="5"/><path ${s} stroke-dasharray="2 4" d="M26 22v18"/>`,
      arc: `<path ${s} d="M4 44h44"/><path ${a} stroke-dasharray="3 4" d="M8 42q16-36 34 0"/>`,
      ramp: `<path ${s} d="M4 44h44M6 44L46 18v26"/><rect ${a} x="24" y="22" width="9" height="9" transform="rotate(-33 28 26)"/>`,
      pulley: `<path ${s} d="M4 44h30M6 44L32 26v18"/><circle ${s} cx="36" cy="22" r="4"/><path ${a} d="M40 22v14"/><rect ${s} x="36" y="36" width="8" height="8"/>`,
      spring: `<path ${s} d="M6 10v34"/><path ${a} d="M6 27l4-6 4 12 4-12 4 12 4-12 4 6"/><rect ${s} x="32" y="18" width="14" height="18" rx="3"/>`,
      energy: `<path ${s} d="M4 44h44"/><path ${s} d="M6 14q10 0 16 30"/><path ${a} stroke-width="4" d="M26 44h16"/>`,
      carousel: `<circle ${s} cx="26" cy="26" r="18"/><circle ${a} cx="44" cy="26" r="4"/><path ${s} d="M26 26h14"/>`,
      bank: `<path ${s} d="M4 44h44"/><path ${s} d="M6 44l40-18"/><rect ${a} x="22" y="28" width="10" height="7" transform="rotate(-24 27 31)"/>`,
      loop: `<path ${s} d="M4 44h44"/><circle ${a} cx="26" cy="24" r="16"/><circle ${s} cx="26" cy="40" r="3"/>`,
      cushion: `<path ${s} d="M4 42h44"/><rect ${s} x="8" y="28" width="16" height="12" rx="3"/><path ${a} d="M40 14v28M34 18q6 10 0 20"/>`,
      carts: `<path ${s} d="M4 42h44"/><rect ${s} x="6" y="28" width="16" height="12" rx="3"/><rect ${a} x="30" y="28" width="16" height="12" rx="3"/>`,
      recoil: `<path ${s} d="M4 42h44"/><rect ${s} x="8" y="28" width="12" height="12" rx="3"/><rect ${s} x="32" y="28" width="12" height="12" rx="3"/><path ${a} d="M20 34l4-3 4 6 4-3"/>`,
      orbit: `<circle ${s} cx="26" cy="26" r="8"/><ellipse ${a} cx="26" cy="26" rx="21" ry="13"/><circle ${s} cx="47" cy="26" r="3"/>`,
      wave: `<path ${a} d="M4 26q6-16 12 0t12 0 12 0 12 0"/><path ${s} d="M4 42h44"/>`,
      slide: `<path ${s} d="M4 44h44M6 18L26 38h20"/><path ${a} d="M38 38l3-5 3 5 3-5"/>`,
      tower: `<path ${s} d="M16 46V12l10-6 10 6v34z"/><path ${a} d="M22 20h8M22 28h8M22 36h8"/>`
    };
  })();
  const pict = (k) => `<svg viewBox="0 0 52 52" aria-hidden="true">${ICONS[k] || ICONS.ramp}</svg>`;

  // ======================================================================
  //  THE WORLDS MAP
  // ======================================================================
  SCREENS.worlds = () => {
    setTitle("עולמות המכניקה", "12 עולמות · 84 מכונות ניסוי");
    const done = st().done;
    K.$("#screen").innerHTML = `
      <div class="stack wmap">
        <div class="card">
          <div class="meter-label"><span>התקדמות כללית בפיזיקה</span><span class="ltr">${K.pct(K.overallCoverage())}</span></div>
          <span class="meter teal"><i data-w="${K.overallCoverage()}"></i></span>
          <p class="fine" style="margin:8px 0 0">כל עולם מזין נושא מהמפה: תנועה, כוחות, אנרגיה, תנע, כבידה ועוד. מטבעות רק בפעם הראשונה.</p>
        </div>
        <ol class="wpath">${D.worlds.map((w, i) => {
          const f = S.worldDone(w.id, done), n = S.SCENES.filter((s) => s.w === w.id && sceneN(s) === 4).length;
          return `<li><button class="card wtile ${i % 2 ? "alt" : ""} ${f >= 1 ? "full" : ""}" type="button" data-w="${w.id}">
            <span class="wicon">${pict(WORLD_ICON[w.id])}</span>
            <span class="rtxt"><small class="ltr">${w.id}${w.track !== "ליבה" ? ` · ${esc(w.track)}` : ""}</small><b>${esc(w.title)}</b><small>${esc(w.subtitle)}</small>
              <span class="meter thin violet"><i data-w="${f}"></i></span><small>${n}/7 מכונות הושלמו</small></span></button></li>`; }).join("")}</ol>
        <p class="fine">המצבים והמשימות מקוריים, בנויים לפי סדר נושאי המכניקה. "גן התנודות" הוא העשרה.</p>
      </div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => { for (const i of document.querySelectorAll("#screen [data-w] .meter i, #screen .card > .meter i")) i.style.width = Math.max(2, +i.dataset.w * 100) + "%"; }));
    for (const b of document.querySelectorAll("#screen [data-w].wtile")) b.addEventListener("click", () => { G.sfx.pop(); show("world", { id: b.dataset.w }); });
  };

  SCREENS.world = ({ id }) => {
    const w = D.worlds.find((x) => x.id === id) || D.worlds[0];
    setTitle(w.title, `${w.id} · ${w.subtitle}`);
    const scenes = S.SCENES.filter((s) => s.w === w.id), link = WORLD_LINK[w.id];
    const topic = scenes[0].topic, cov = K.familyCoverage(topic);
    K.$("#screen").innerHTML = `
      <div class="stack">
        <div class="card">
          <div class="meter-label"><span>העולם הזה</span><span class="ltr">${K.pct(S.worldDone(w.id, st().done))}</span></div>
          <span class="meter violet"><i data-w="${S.worldDone(w.id, st().done)}"></i></span>
          <div class="meter-label" style="margin-top:10px"><span>הנושא במפה</span><span class="ltr">${K.pct(cov)}</span></div>
          <span class="meter violet"><i data-w="${cov}"></i></span>
        </div>
        ${link ? `<button class="card rtile tut" type="button" id="wlink"><span class="ricon">${pict(WORLD_ICON[w.id])}</span><span class="rtxt"><b>${esc(link.title)}</b><small>${esc(link.sub)}</small></span></button>` : ""}
        <div class="rgrid">${scenes.map((sc) => `<button class="card rtile ${sceneN(sc) === 4 ? "full" : ""}" type="button" data-sc="${sc.id}">
          <span class="ricon">${pict(sc.icon)}</span>
          <span class="rtxt"><small class="ltr">${sc.id.slice(4)} · ${esc(sc.label)}</small><b>${esc(sc.title)}</b><small>${esc(sc.objective)}</small>
            <span class="dots">${sc.missions.map((m) => `<i class="${isDone(m.id) ? "on" : ""}"></i>`).join("")}</span></span></button>`).join("")}</div>
      </div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => { for (const i of document.querySelectorAll("#screen [data-w]")) i.style.width = Math.max(2, +i.dataset.w * 100) + "%"; }));
    $("#wlink")?.addEventListener("click", () => { G.sfx.pop(); show(link.screen, { topic: link.screen === "lab" ? "springs" : "newton" }); });
    for (const b of document.querySelectorAll("#screen [data-sc]")) b.addEventListener("click", () => { G.sfx.pop(); show("wscene", { id: b.dataset.sc }); });
  };

  // ======================================================================
  //  ONE SITUATION
  // ======================================================================
  SCREENS.wscene = ({ id }) => {
    const sc = S.byId(id) || S.SCENES[0], world = D.worlds.find((w) => w.id === sc.w);
    setTitle(sc.title, `${world.title} · ${sc.label}`);
    let sp = activeSpecies();
    const R0 = st(); R0.params = R0.params || {};
    const L = S.newLab(sc, { P: R0.params[sc.id] });
    let paused = false, slow = false, view = "forces", graphOpen = false, graphKey = null, raf = 0, lastT = performance.now(), evalT = 0, sayT = 0, alive = true, W = 0, H = 0, DPR = 1, frameN = 0;
    const hist = [];
    const later = (fn, ms) => setTimeout(() => { if (alive) fn(); }, ms);
    const ui = { mi: Math.max(0, sc.missions.findIndex((m) => !isDone(m.id))), attempts: {}, xtask: null, replay: false, predShown: false };
    const curM = () => sc.missions[ui.mi];

    K.$("#screen").innerHTML = `
      <div class="lab-screen rscene wscene">
        <div class="mbar four" id="mbar">${sc.missions.map((m, i) => `<button type="button" data-i="${i}">${["תחזית", "ניסוי", "הסבר", "העברה"][i]}</button>`).join("")}</div>
        <div class="card task mission" id="task" aria-live="polite"></div>
        <div class="lab" id="lab">
          <canvas id="labCanvas" aria-label="${esc(sc.title)}"></canvas>
          <div class="bubble say" id="say" hidden></div>
          <div class="toast card" id="toast" hidden></div>
          <div class="lab-tools">
            <span class="story-chip">${esc(sc.label)}</span>
            <span class="transport">
              <button class="tbtn" id="tPlay" type="button" aria-label="הפעלה">▶</button>
              <button class="tbtn" id="tStep" type="button" aria-label="צעד">⏭</button>
              <button class="tbtn" id="tReset" type="button" aria-label="איפוס">⟲</button>
              <button class="tbtn" id="tSlow" type="button" aria-label="הילוך איטי" aria-pressed="false">🐢</button>
            </span>
          </div>
        </div>
        <div class="seg viewseg"><button type="button" data-v="forces" aria-pressed="true">ניסוי</button><button type="button" data-v="none" aria-pressed="false">בלי חצים</button><button type="button" data-v="graph" aria-pressed="false">גרפים</button><button type="button" data-v="explain" aria-pressed="false">הסבר</button></div>
        <div class="card graphcard" id="graph" hidden><div class="seg gseg" id="gseg"></div><canvas id="gCanvas"></canvas><p class="fine" id="gNote"></p></div>
        <div class="card" id="explain" hidden></div>
        <div class="readouts wreadouts" id="readouts"></div>
        <p class="sr" id="srText" aria-live="polite"></p>
        <div class="card controls" id="controls"></div>
      </div>`;
    const cv = $("#labCanvas"), ctx = cv.getContext("2d"), box = $("#lab"), gcv = $("#gCanvas"), gctx = gcv.getContext("2d");
    const resize = () => { const r = box.getBoundingClientRect(); DPR = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); const g = gcv.getBoundingClientRect(); gcv.width = Math.round(g.width * DPR); gcv.height = Math.round(g.height * DPR); };
    resize(); const ro = new ResizeObserver(resize); ro.observe(box); ro.observe(gcv);
    const img = new Image(); img.src = artOf(sp);
    const say = (t, s = 2.4) => { const el = $("#say"); el.textContent = t; el.hidden = false; sayT = s; };

    // ---------------- controls ----------------
    function paintControls() {
      $("#controls").innerHTML = Object.entries(sc.knobs).map(([k, [he, lo, hi, step]]) => `
        <div class="slider-row"><label for="k_${k}"><span>${esc(he)}</span><span class="val" id="kv_${k}"></span></label>
          <div class="srow"><button class="step" type="button" data-step="${k}" data-d="-1" aria-label="להקטין">−</button><input id="k_${k}" data-k="${k}" type="range" min="${lo}" max="${hi}" step="${step}"><button class="step" type="button" data-step="${k}" data-d="1" aria-label="להגדיל">+</button></div></div>`).join("")
        + `<p class="fine" id="pnote"></p>`;
      for (const inp of $("#controls").querySelectorAll("input[type=range]")) { inp.value = L.P[inp.dataset.k]; inp.addEventListener("input", () => setK(inp.dataset.k, +inp.value)); inp.addEventListener("change", save); }
      for (const b of $("#controls").querySelectorAll("[data-step]")) b.addEventListener("click", () => { const [, lo, hi, step] = sc.knobs[b.dataset.step]; setK(b.dataset.step, clamp(+(L.P[b.dataset.step] + step * +b.dataset.d).toFixed(6), lo, hi)); save(); G.sfx.tick && G.sfx.tick(); });
      paintValues();
    }
    function paintValues() {
      for (const [k, kn] of Object.entries(sc.knobs)) { const el = $("#kv_" + k); if (el) el.textContent = nice(L.P[k], kn[3] < 0.01 ? 3 : kn[3] < 1 ? 2 : 0); const inp = $("#k_" + k); if (inp && +inp.value !== L.P[k]) inp.value = L.P[k]; }
      const e = S.evalP(sc, L.P); $("#pnote").textContent = e.invalid ? "הערכים מחוץ לתחום של המודל. שנה ערך." : "";
    }
    function setK(k, v) { S.setParam(L, k, v); hist.length = 0; paused = false; paintValues(); paintReadouts(); paintTransport(); evaluate(true); }
    let saveT = 0; function save() { clearTimeout(saveT); saveT = setTimeout(() => { R0.params[sc.id] = { ...L.P }; P.save(); }, 300); }

    // ---------------- transport ----------------
    function paintTransport() { $("#tPlay").textContent = L.running && !paused ? "⏸" : "▶"; $("#tSlow").setAttribute("aria-pressed", slow); }
    function start() { if (!S.startRun(L)) { say("הערכים מחוץ לתחום של המודל.", 2); return false; } hist.length = 0; paused = false; G.sfx.whoosh && G.sfx.whoosh(); return true; }
    $("#tPlay").addEventListener("click", () => { G.audio.unlock(); if (L.running) paused = !paused; else start(); paintTransport(); });
    $("#tStep").addEventListener("click", () => { if (!L.running) { if (!start()) return; } paused = true; S.stepRun(L, 1 / 30); sample(); paintTransport(); });
    $("#tReset").addEventListener("click", () => { S.idle(L); hist.length = 0; paused = false; paintTransport(); G.sfx.pop(); });
    $("#tSlow").addEventListener("click", () => { slow = !slow; paintTransport(); G.sfx.pop(); if (slow) say("הילוך איטי: רק השעון של המסך מאט.", 2); });
    for (const b of document.querySelectorAll(".viewseg [data-v]")) b.addEventListener("click", () => {
      const v = b.dataset.v; G.sfx.pop();
      if (v === "graph") { graphOpen = !graphOpen; $("#graph").hidden = !graphOpen; b.setAttribute("aria-pressed", graphOpen); if (graphOpen) { resize(); paintGseg(); } return; }
      if (v === "explain") { const el = $("#explain"), open = el.hidden; el.hidden = !open; b.setAttribute("aria-pressed", open); if (open) paintExplain(); return; }
      view = v; for (const x of document.querySelectorAll('.viewseg [data-v="forces"], .viewseg [data-v="none"]')) x.setAttribute("aria-pressed", x.dataset.v === view);
    });
    function paintExplain() {
      $("#explain").innerHTML = `<h3 style="margin:0 0 6px">${esc(sc.title)}</h3><p style="margin:0 0 8px">${esc(sc.story)}</p>
        <p class="fine">המודל: ${esc(sc.label)}. ${esc(MODEL_NOTE[sc.family] || "")}</p>`;
    }

    // ---------------- missions ----------------
    function paintBar() { for (const b of document.querySelectorAll("#mbar [data-i]")) { const i = +b.dataset.i; b.classList.toggle("done", isDone(sc.missions[i].id)); if (i === ui.mi) b.setAttribute("aria-selected", "true"); else b.removeAttribute("aria-selected"); } }
    for (const b of document.querySelectorAll("#mbar [data-i]")) b.addEventListener("click", () => { select(+b.dataset.i); G.sfx.pop(); });
    function select(i) { ui.mi = i; ui.replay = false; ui.xtask = null; ui.predShown = false; S.activate(L, curM()); paintBar(); paintMission(); }
    const head = (m, extra = "") => `<div class="mhead"><small>${["תחזית", "ניסוי", "הסבר", "העברה"][ui.mi]}${isDone(m.id) ? " · ✓ הושלמה" : ""}</small><p>${esc(extra || m.text)}</p></div>`;
    function paintMission() {
      const m = curM(), el = $("#task"); let h = "";
      if (isDone(m.id) && !ui.replay) h = head(m, m.kind === "goal" ? sc.objective : m.kind === "choice" ? m.q : m.text) + `<p class="learn">✓ ${esc(LEARN(m))}</p><div class="mrow"><button class="btn quiet" type="button" id="again">שוב (בלי מטבעות)</button>${nextBtn()}</div>`;
      else if (m.kind === "predict") h = predictHtml(m);
      else if (m.kind === "goal") h = head(m, sc.objective) + `<p class="target">🎯 ${esc(m.goal.text)}</p><details class="mhint"><summary class="linkish">איך?</summary><p>${esc(m.goal.kind === "pair" ? "שתי הרצות: אחת לפני השינוי ואחת אחריו. נספרות רק הרצות שאחריהן כל השאר נשאר זהה." : "שנה ערכים בבקרים ואז ▶. נספרת רק הרצה שבה שינית לפחות ערך אחד מההתחלה.")}</p></details>`;
      else if (m.kind === "choice") h = head(m, m.q) + (S.explainOpen(L) ? `<div class="options">${m.opts.map((o, i) => `<button type="button" data-ch="${i}">${esc(o)}</button>`).join("")}</div><p class="why" id="why" hidden></p>` : `<p class="gate">👉 קודם הרץ את המכונה פעם אחת (▶).</p>`);
      else if (m.kind === "transfer") h = transferHtml(m);
      el.innerHTML = h; bind(m);
    }
    const nextBtn = () => { const n = sc.missions.findIndex((x, i) => i !== ui.mi && !isDone(x.id)); if (n >= 0) return `<button class="btn primary" type="button" id="nextM">ל${["תחזית", "ניסוי", "הסבר", "העברה"][n]}</button>`; const ws = S.SCENES.filter((s) => s.w === sc.w), nx = ws.find((s) => sceneN(s) < 4 && s.id !== sc.id); return nx ? `<button class="btn primary" type="button" id="nextS">למכונה הבאה</button>` : `<button class="btn primary" type="button" id="toWorld">לעולם</button>`; };
    function predictHtml(m) {
      const pr = L.pred[m.id];
      if (!pr) { const q = S.predQuestion(L, m); return head(m, q.q) + `<p class="fine">בחר לפני שאתה מריץ. אחר כך ▶ באותם ערכים.</p><div class="options">${q.opts.map((o, i) => `<button type="button" data-pr="${i}">${esc(o)}</button>`).join("")}</div>`; }
      const r = S.predictionResult(L, m);
      if (r && !r.ready && r.changed) return head(m, pr.q.q) + `<p class="locked">🔒 ${esc(pr.q.opts[pr.pick])}</p><p class="bad">שינית ערכים: הניבוי היה על הערכים הקודמים.</p><div class="mrow"><button class="btn secondary" type="button" id="unlockP">ניבוי חדש</button></div>`;
      if (r && r.ready && !r.ok) return head(m, pr.q.q) + `<p class="locked">🔒 ${esc(pr.q.opts[pr.pick])}</p><p class="bad">הניסוי הראה: ${esc(pr.q.opts[r.truth])}.</p><p class="why">${esc(LEARN(m))}</p><div class="mrow"><button class="btn secondary" type="button" id="unlockP">ניבוי חדש</button></div>`;
      return head(m, pr.q.q) + `<p class="locked">🔒 התחזית שלך: ${esc(pr.q.opts[pr.pick])}</p><p class="gate">👉 עכשיו ▶ (בלי לשנות ערכים).</p>`;
    }
    function transferHtml(m) {
      const x = L.xfer[m.id];
      if (x) return head(m) + `<p class="ok">✓ החישוב נכון. הערכים החדשים כבר בבקרים.</p><p class="gate">👉 ▶ כדי לבדוק בניסוי.</p>`;
      if (!S.explainOpen(L)) return head(m) + `<p class="gate">👉 קודם הרץ את המכונה פעם אחת (▶).</p>`;
      ui.xtask = ui.xtask || S.transferTask(L, m);
      const t = ui.xtask;
      return head(m, t.text) + `<div class="numgrid"><label><span>${esc(t.field.he)}</span><span class="inp"><input data-f="x" inputmode="decimal" dir="ltr" autocomplete="off"><em class="ltr">${esc(t.field.unit)}</em></span></label></div>
        <div class="mrow"><button class="btn primary" type="button" id="checkX">בדוק</button></div><p class="why" id="why" hidden></p>`;
    }
    function bind(m) {
      const el = $("#task");
      el.querySelector("#again")?.addEventListener("click", () => { ui.replay = true; delete L.pred[m.id]; delete L.xfer[m.id]; ui.xtask = null; L.since[m.id] = undefined; S.activate(L, m); paintMission(); });
      el.querySelector("#nextM")?.addEventListener("click", () => select(sc.missions.findIndex((x, i) => i !== ui.mi && !isDone(x.id))));
      el.querySelector("#nextS")?.addEventListener("click", () => { const nx = S.SCENES.filter((s) => s.w === sc.w).find((s) => sceneN(s) < 4 && s.id !== sc.id); show("wscene", { id: nx.id }, false); });
      el.querySelector("#toWorld")?.addEventListener("click", () => show("world", { id: sc.w }, false));
      for (const b of el.querySelectorAll("[data-pr]")) b.addEventListener("click", () => { S.lockPrediction(L, m, +b.dataset.pr); ui.predShown = false; G.sfx.pop(); say("נעול. עכשיו ▶", 1.4); paintMission(); });
      el.querySelector("#unlockP")?.addEventListener("click", () => { delete L.pred[m.id]; paintMission(); });
      for (const b of el.querySelectorAll("[data-ch]")) b.addEventListener("click", () => {
        if (el.dataset.answered) return; const ok = +b.dataset.ch === m.right; b.classList.add(ok ? "right" : "wrong"); const why = el.querySelector("#why"); why.hidden = false;
        if (ok) { el.dataset.answered = "1"; why.textContent = "נכון!"; later(() => complete(m), 700); }
        else { ui.attempts[m.id] = (ui.attempts[m.id] || 0) + 1; why.textContent = ui.attempts[m.id] >= 2 ? "רמז: " + LEARN(m) : "לא בדיוק. חזור לניסוי ונסה שוב."; G.sfx.hmph && G.sfx.hmph(0.4); later(() => b.classList.remove("wrong"), 900); }
      });
      el.querySelector("#checkX")?.addEventListener("click", () => {
        const v = num(el.querySelector("[data-f]").value), why = el.querySelector("#why"); why.hidden = false;
        if (!Number.isFinite(v)) { why.textContent = "כתוב מספר (אפשר עם מינוס)."; return; }
        const r = S.checkTransfer(L, m, v, ui.xtask);
        if (r.ok) { S.armTransfer(L, m, ui.xtask); hist.length = 0; paintControls(); paintReadouts(); G.sfx.sparkle && G.sfx.sparkle(1); paintMission(); }
        else { ui.attempts[m.id] = (ui.attempts[m.id] || 0) + 1; el.querySelector("[data-f]").classList.add("bad"); G.sfx.hmph && G.sfx.hmph(0.4);
          const sign = Math.abs(Math.abs(v) - Math.abs(r.truth)) <= Math.max(0.02, 0.02 * Math.abs(r.truth));
          why.textContent = sign ? "הגודל נכון, הסימן לא." : ui.attempts[m.id] >= 2 ? "רמז: " + LEARN(m) : "עוד לא. נסה להציב בנוסחה של המודל (בכפתור 'הסבר')."; }
      });
      el.querySelector("[data-f]")?.addEventListener("keydown", (e) => { if (e.key === "Enter") el.querySelector("#checkX")?.click(); });
    }
    function evaluate(force) {
      const m = curM(); if (isDone(m.id) && !ui.replay) return;
      if (m.kind === "goal" && S.goalReached(L, m)) return complete(m);
      if (m.kind === "predict" && L.pred[m.id]) { const r = S.predictionResult(L, m); if (r && r.ready && r.ok) return complete(m); if (r && (r.ready || r.changed) && !ui.predShown) { ui.predShown = true; paintMission(); if (r.ready) { G.sfx.hmph && G.sfx.hmph(0.5); say("הממ, לא מה שחשבנו.", 1.8); } } return; }
      if (m.kind === "transfer" && L.xfer[m.id] && S.transferConfirmed(L, m)) return complete(m);
      if (force || ((m.kind === "choice" || m.kind === "transfer") && S.explainOpen(L) !== ui.lastOpen)) { ui.lastOpen = S.explainOpen(L); paintMission(); }
    }
    function complete(m) {
      const first = !isDone(m.id); ui.replay = false;
      if (first) { st().done.push(m.id); P.save(); }
      const r = cv.getBoundingClientRect(), from = { x: r.left + r.width / 2, y: r.top + r.height * 0.4 };
      if (first) reward("world:" + m.id, m.coins, from);
      G.sfx.harp && G.sfx.harp(); G.buzz && G.buzz(30);
      toast(m, first); paintBar();
      if (first && sceneN(sc) === 4) later(() => reward("worldscene:" + sc.id, 10, from), 900);
      const n = sc.missions.findIndex((x) => !isDone(x.id));
      if (first && n >= 0) later(() => select(n), 1300); else paintMission();
    }
    function toast(m, first) {
      const t = $("#toast");
      t.innerHTML = `<b>${first ? `<span class="coin"></span> +${m.coins} · ` : ""}${["תחזית נכונה", "הגעת ליעד", "הסבר נכון", "העברת את זה הלאה"][ui.mi]}</b><p>${esc(LEARN(m))}</p>
        <div class="tmeters"><span>הנושא</span><span class="meter thin violet"><i style="width:${Math.max(2, K.familyCoverage(sc.topic) * 100)}%"></i></span><span>כללי</span><span class="meter thin teal"><i style="width:${Math.max(2, K.overallCoverage() * 100)}%"></i></span></div>`;
      t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 6000); t.onclick = () => { t.hidden = true; };
    }
    const LEARN = (m) => m.kind === "choice" ? m.opts[m.right] : (LEARN_FAMILY[sc.family] || sc.objective);

    // ---------------- readouts ----------------
    function paintReadouts() {
      const e = S.evalP(sc, L.P);
      if (e.invalid) { $("#readouts").innerHTML = `<div class="readout"><small>המודל</small><b>מחוץ לתחום</b></div>`; return; }
      $("#readouts").innerHTML = Object.entries(sc.readouts).map(([k, he]) => `<div class="readout"><small>${esc(he)}</small><b>${esc(nice(e[k]))}${typeof e[k] === "number" && UNIT[k] ? " " + UNIT[k] : ""}</b></div>`).join("");
      const t = Object.entries(sc.readouts).map(([k, he]) => `${he}: ${nice(e[k])} ${UNIT[k] || ""}`).join(". ");
      if ($("#srText").textContent !== t) $("#srText").textContent = t;
    }

    // ---------------- graphs from the simulator's own samples ----------------
    const GLABEL = { x: "x (m)", y: "y (m)", v: "v (m/s)", a: "a (m/s²)", F: "F (N)", s: "s (m)", r: "r (m)", K: "K (J)", U: "U (J)", E: "E (J)", x1: "x₁ (m)", x2: "x₂ (m)", v1: "v₁ (m/s)", v2: "v₂ (m/s)", p: "p (kg·m/s)", vy: "v_y (m/s)", gap: "מרחק (m)" };
    function sample() { if (!L.sim) return; const s = L.sim.st, row = { t: L.sim.t }; for (const k in GLABEL) if (typeof s[k] === "number" && Number.isFinite(s[k])) row[k] = s[k]; hist.push(row); if (hist.length > 2500) hist.splice(0, hist.length - 2500); }
    function keysAvail() { const ks = new Set(); for (const r of hist.slice(-5)) for (const k in r) if (k !== "t") ks.add(k); return [...ks]; }
    function paintGseg() {
      const ks = keysAvail(); if (!ks.length) { $("#gseg").innerHTML = ""; return; }
      if (!ks.includes(graphKey)) graphKey = ks.includes("v") ? "v" : ks[0];
      $("#gseg").innerHTML = ks.map((k) => `<button type="button" data-g="${k}" aria-pressed="${k === graphKey}">${esc(GLABEL[k])}</button>`).join("");
      for (const b of $("#gseg").querySelectorAll("[data-g]")) b.addEventListener("click", () => { graphKey = b.dataset.g; paintGseg(); });
    }
    function paintGraph() {
      if (!graphOpen) return;
      const w = gcv.width / DPR, h = gcv.height / DPR; gctx.setTransform(DPR, 0, 0, DPR, 0, 0); gctx.clearRect(0, 0, w, h);
      if ($("#gseg").children.length !== keysAvail().length) paintGseg();
      const pts = hist.filter((q) => q[graphKey] !== undefined);
      if (pts.length < 2) { gctx.fillStyle = "#606671"; gctx.font = "600 13px " + FONT; gctx.textAlign = "center"; gctx.direction = "rtl"; gctx.fillText("הרץ ניסוי כדי לראות גרף", w / 2, h / 2); gctx.direction = "ltr"; return; }
      let x0 = pts[0].t, x1 = pts[pts.length - 1].t, y0 = 0, y1 = 0; for (const q of pts) { y0 = Math.min(y0, q[graphKey]); y1 = Math.max(y1, q[graphKey]); }
      if (x1 - x0 < 1e-9) x1 = x0 + 1; if (y1 - y0 < 1e-9) { y1 += 1; y0 -= 1; } const pad = (y1 - y0) * 0.1; y0 -= pad; y1 += pad;
      const L0 = 46, gx = (v) => L0 + (v - x0) / (x1 - x0) * (w - L0 - 8), gy = (v) => 10 + (y1 - v) / (y1 - y0) * (h - 32);
      gctx.strokeStyle = "#DFE1E4"; gctx.lineWidth = 1; gctx.beginPath(); gctx.moveTo(L0, 10); gctx.lineTo(L0, h - 22); gctx.lineTo(w - 8, h - 22); gctx.stroke();
      if (y0 < 0 && y1 > 0) { gctx.strokeStyle = "#B9BCC2"; gctx.setLineDash([3, 3]); gctx.beginPath(); gctx.moveTo(L0, gy(0)); gctx.lineTo(w - 8, gy(0)); gctx.stroke(); gctx.setLineDash([]); }
      gctx.fillStyle = "#606671"; gctx.font = "600 11px " + FONT; gctx.direction = "ltr"; gctx.textAlign = "right"; gctx.textBaseline = "middle";
      gctx.fillText(nice(y1 - pad, 1), L0 - 4, gy(y1 - pad)); gctx.fillText(nice(y0 + pad, 1), L0 - 4, gy(y0 + pad));
      gctx.textAlign = "center"; gctx.textBaseline = "top"; gctx.fillText(fmt(x0, 1), L0, h - 18); gctx.fillText(fmt(x1, 1) + "  t (s)", w - 34, h - 18);
      gctx.strokeStyle = "#8A60E8"; gctx.lineWidth = 2.2; gctx.beginPath(); pts.forEach((q, i) => (i ? gctx.lineTo(gx(q.t), gy(q[graphKey])) : gctx.moveTo(gx(q.t), gy(q[graphKey])))); gctx.stroke();
      // events on the time axis
      gctx.strokeStyle = "#E39B28"; gctx.setLineDash([4, 3]); for (const e of (L.sim ? L.sim.events : [])) if (e.t >= x0 && e.t <= x1) { gctx.beginPath(); gctx.moveTo(gx(e.t), 10); gctx.lineTo(gx(e.t), h - 22); gctx.stroke(); } gctx.setLineDash([]);
      $("#gNote").textContent = (L.sim && L.sim.scale ? `זמן הסימולציה מואץ ×${nice(L.sim.scale, 0)} בשביל המסך. ` : "") + "קווים מקווקווים: אירועים (עצירה, נחיתה, מפגש, פגיעה).";
    }

    // ======================================================================
    //  DRAWING: one machine per family
    // ======================================================================
    let cam = null;
    const sx = (x) => cam.ox + x * cam.S, sy = (y) => cam.oy - y * cam.S;
    function fit(x0, x1, y0, y1) { const S_ = Math.min((W - 24) / (x1 - x0), (H - 70) / (y1 - y0)); cam = { S: S_, ox: W / 2 - S_ * (x0 + x1) / 2, oy: (H - 56) / 2 + S_ * (y0 + y1) / 2 + 6 }; }
    const line = (x0, y0, x1, y1, w = 2, c = "#2e2e33") => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); };
    const label = (x, y, t, c = "#606671", al = "center", f = "600 12px ") => { ctx.save(); ctx.font = f + FONT; ctx.fillStyle = c; ctx.textAlign = al; ctx.textBaseline = "middle"; ctx.direction = "ltr"; ctx.fillText(t, x, y); ctx.restore(); };
    const ground = (y = 0) => { line(0, sy(y), W, sy(y), 2.2); };
    const arrowS = (x, y, vx, vy, c, lab, val) => forceArrow(ctx, x, y, vx, vy, c, lab, val !== undefined ? { value: val } : {});
    // the creature as the body: feet at (px, py) in screen pixels, height hpx, rotated
    function critter(px, py, hpx, rot = 0, flip = false) {
      if (!(img.complete && img.naturalWidth)) { ctx.fillStyle = "#F7D9B5"; ctx.beginPath(); ctx.arc(px, py - hpx / 2, hpx / 2, 0, Math.PI * 2); ctx.fill(); return; }
      const w = hpx * img.naturalWidth / img.naturalHeight; ctx.save(); ctx.translate(px, py); ctx.rotate(rot); if (flip) ctx.scale(-1, 1); ctx.drawImage(img, -w / 2, -hpx, w, hpx); ctx.restore();
    }
    function cart(px, py, wpx, hpx, txt, fill = "#F5F1E8") {
      ctx.fillStyle = fill; ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(px - wpx / 2, py - hpx, wpx, hpx, 6) : ctx.rect(px - wpx / 2, py - hpx, wpx, hpx); ctx.fill(); ctx.stroke();
      for (const d of [-0.3, 0.3]) { ctx.beginPath(); ctx.arc(px + d * wpx, py, 5, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.stroke(); }
      if (txt) label(px, py - hpx / 2, txt, "#20232A", "center", "700 12px ");
    }
    function banner(t, c = "#606671") { ctx.save(); ctx.font = "700 14px " + FONT; ctx.direction = "rtl"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; const tw = ctx.measureText(t).width + 22, y = H - 102; ctx.fillStyle = "rgba(255,255,255,0.95)"; ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(W / 2 - tw / 2, y, tw, 28, 12) : ctx.rect(W / 2 - tw / 2, y, tw, 28); ctx.fill(); ctx.stroke(); ctx.fillStyle = c; ctx.fillText(t, W / 2, y + 14); ctx.restore(); }
    const has = (t) => L.sim && L.sim.events.some((e) => e.type === t);
    const P_ = () => (L.sim && L.cur ? L.cur.P : L.P);
    const SIM = () => L.sim || (L._preview && L._previewP === JSON.stringify(L.P) ? L._preview : (L._previewP = JSON.stringify(L.P), L._preview = (() => { const e = S.evalP(sc, L.P); if (e.invalid) return null; const s = WP.makeSim(sc.family, { ...L.P }, { brake: !!sc.setup.brake, gap: sc.setup.gap, v: L.P.v, vf: L.P.vf }); return s; })()));
    const forces = () => view !== "none";

    const DRAW = {
      units(s, p) {
        const gap = sc.setup.gap, Lm = p.value * p.factor, span = Math.max(gap, Math.min(Lm, gap * 2.2));
        fit(-0.6 * gap, span + 0.6 * gap, -0.5 * gap, 0.9 * gap);
        const top = 0; ctx.fillStyle = "rgba(107,107,112,0.10)"; ctx.fillRect(0, sy(top), sx(0), H); ctx.fillRect(sx(gap), sy(top), W - sx(gap), H);
        line(0, sy(top), sx(0), sy(top), 2.4); line(sx(gap), sy(top), W, sy(top), 2.4); line(sx(0), sy(top), sx(0), H, 2); line(sx(gap), sy(top), sx(gap), H, 2);
        const tilt = Lm + 1e-9 < gap && s.st.x > Lm ? 0.6 : 0;
        ctx.save(); ctx.translate(sx(0), sy(top)); ctx.rotate(tilt); ctx.fillStyle = "#B58A55"; ctx.fillRect(0, -6, Math.min(Lm, span + gap) * cam.S, 8); ctx.restore();
        label((sx(0) + sx(gap)) / 2, sy(top) + 26, `${sc.setup.unitText}: ${nice(gap)} ${sc.setup.unitSI}`, "#20232A");
        label(sx(0) + Math.min(Lm, span) * cam.S / 2, sy(top) - 18, `${p.value} × ${p.factor} = ${nice(Lm, 3)} ${sc.setup.unitSI}`, Math.abs(Lm - gap) <= 0.01 * gap ? "#137556" : "#B8741A");
        const x = s.st.x, fall = s.st.fell; critter(sx(Math.min(x, gap + 0.2 * gap)), sy(top) + (fall ? Math.min(H, (x - Lm) * 6 * cam.S) : -6), 0.45 * Math.min(cam.S * gap, 120));
        if (fall) banner("הקרש קצר מדי!", "#E2574C"); else if (L.cur && L.cur.done !== undefined && s.done && Lm > gap * 1.01) banner("ארוך מדי: לא נכנס בין הקצוות", "#B8741A");
      },
      vectors(s, p) {
        const R = WP.evaluate("vectors", p), m = Math.max(4, Math.abs(p.ax) + Math.abs(p.bx) + 1, Math.abs(p.ay) + Math.abs(p.by) + 1, Math.abs(R.Rx) + 1, Math.abs(R.Ry) + 1);
        fit(-m, m, -m, m);
        ctx.strokeStyle = "#EEF0F3"; ctx.lineWidth = 1; for (let i = -Math.ceil(m); i <= m; i++) { line(sx(i), sy(-m), sx(i), sy(m), 1, "#EEF0F3"); line(sx(-m), sy(i), sx(m), sy(i), 1, "#EEF0F3"); }
        line(sx(-m), sy(0), sx(m), sy(0), 1.4, "#B9BCC2"); line(sx(0), sy(-m), sx(0), sy(m), 1.4, "#B9BCC2");
        const k = cam.S, O = { x: sx(0), y: sy(0) };
        if (sc.id === "W01-S02") { const a = 135 * Math.PI / 180; label(sx(Math.cos(a) * m * 0.8), sy(Math.sin(a) * m * 0.8), "🛠 שולחן", "#20232A"); }
        if (sc.id === "W01-S07") { ctx.fillStyle = "#E39B28"; ctx.beginPath(); ctx.arc(sx(1), sy(-1), 6, 0, Math.PI * 2); ctx.fill(); }
        arrowS(O.x, O.y, p.ax * k, -p.ay * k, "#2785C7", "A");
        ctx.save(); ctx.globalAlpha = 0.45; arrowS(O.x + p.ax * k, O.y - p.ay * k, p.bx * k, -p.by * k, "#E0702F"); ctx.restore();
        arrowS(O.x, O.y, p.bx * k, -p.by * k, "#E0702F", "B");
        arrowS(O.x, O.y, R.Rx * k, -R.Ry * k, "#8A60E8", "R");
        critter(sx(s.st.x), sy(s.st.y) + 12, 34);
      },
      uniform(s, p) {
        const xs = [p.x0, p.x0 + p.v * p.t, 0, sc.setup.target || 0]; const lo = Math.min(...xs) - 3, hi = Math.max(...xs) + 3;
        fit(lo, hi, -2, 3); ground(0);
        ctx.fillStyle = "#ECEEF1"; ctx.fillRect(sx(lo), sy(0), (hi - lo) * cam.S, 10);
        for (let i = Math.ceil(lo); i <= hi; i++) { line(sx(i), sy(0), sx(i), sy(0) + (i % 5 ? 5 : 10), 1.2); if (i % 5 === 0) label(sx(i), sy(0) + 20, String(i)); }
        line(sx(0), sy(0) - 40, sx(0), sy(0) + 8, 2, "#20232A"); label(sx(0), sy(0) - 48, "0", "#20232A");
        if (sc.setup.target !== undefined) { line(sx(sc.setup.target), sy(0) - 34, sx(sc.setup.target), sy(0), 3, "#E2574C"); label(sx(sc.setup.target), sy(0) - 42, "🎯", "#E2574C"); }
        const x = s.st.x; critter(sx(x), sy(0), Math.min(70, cam.S * 1.6), 0, p.v < 0);
        if (forces() && Math.abs(x - p.x0) > 0.05) { ctx.save(); ctx.setLineDash([4, 4]); line(sx(p.x0), sy(0) - 70, sx(p.x0), sy(0), 1.2, "#9A9AA0"); ctx.restore(); arrowS(sx(p.x0), sy(0) - 70, (x - p.x0) * cam.S, 0, "#8A60E8", "Δx"); }
        if (forces()) arrowS(sx(x), sy(0) - Math.min(70, cam.S * 1.6) - 14, p.v * 8, 0, "#20232A", "v");
      },
      meeting(s, p) {
        const xs = [p.x1, p.x2, s.st.x1, s.st.x2]; const lo = Math.min(...xs, 0) - 3, hi = Math.max(...xs, 16) + 3;
        fit(lo, hi, -2, 3); ground(0); for (let i = Math.ceil(lo / 5) * 5; i <= hi; i += 5) label(sx(i), sy(0) + 18, String(i));
        if (sc.id === "W03-S05") { ctx.fillStyle = "rgba(226,87,76,0.35)"; ctx.fillRect(sx(14), sy(0) - 4, 2 * cam.S, 8); }
        if (sc.id === "W03-S01") { ctx.fillStyle = "rgba(37,181,139,0.25)"; ctx.fillRect(sx(10), sy(0) - 4, 4 * cam.S, 8); label(sx(12), sy(0) - 14, "תחנה", "#137556"); }
        critter(sx(s.st.x1), sy(0), Math.min(64, cam.S * 2), 0, false);
        cart(sx(s.st.x2), sy(0) - 4, Math.min(46, cam.S * 1.6), Math.min(30, cam.S), "ב׳", "#FFF3D6");
        if (L.sim && L.sim.met) { ctx.strokeStyle = "#E39B28"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sx(L.sim.met.x), sy(0) - 30, 22, 0, Math.PI * 2); ctx.stroke(); label(sx(L.sim.met.x), sy(0) - 62, `מפגש: ${nice(L.sim.met.t)} s, ${nice(L.sim.met.x)} m`, "#B8741A"); }
        if (forces()) { arrowS(sx(s.st.x1), sy(0) - 80, p.v1 * 6, 0, "#20232A", "v₁"); arrowS(sx(s.st.x2), sy(0) - 60, p.v2 * 6, 0, "#20232A", "v₂"); }
        if (s.done && !L.sim.met && L.sim.t > 0) banner("אין מפגש", "#606671");
      },
      acceleration(s, p) {
        const xs = [0, s.st.x, WP.evaluate("acceleration", p).dx, sc.id === "W12-S01" ? 12 : 0]; const lo = Math.min(...xs) - 3, hi = Math.max(...xs) + 4;
        fit(lo, hi, -2, 3); ground(0); for (let i = Math.ceil(lo / 5) * 5; i <= hi; i += 5) label(sx(i), sy(0) + 18, String(i));
        if (sc.id === "W12-S01") { ctx.fillStyle = "rgba(37,181,139,0.25)"; ctx.fillRect(sx(10), sy(0) - 4, 2 * cam.S, 8); line(sx(12.4), sy(0) - 50, sx(12.4), sy(0), 6, "#E2574C"); label(sx(12.4), sy(0) - 58, "מחסום", "#E2574C"); }
        const x = s.st.x; cart(sx(x), sy(0) - 4, 56, 30, ""); critter(sx(x), sy(0) - 30, 40);
        if (sc.setup.brake && L.sim && L.sim.stopped) banner("עצרה ונשארה: בלם לא דוחף אחורה");
        if (forces()) { arrowS(sx(x), sy(0) - 92, s.st.v * 7, 0, "#20232A", "v"); if (s.st.a) arrowS(sx(x), sy(0) - 120, s.st.a * 14, 0, "#8A60E8", "a"); }
      },
      vertical(s, p) {
        const e = WP.evaluate("vertical", { ...p, t: 0 }), top = Math.max(e.maxY, p.h) + 1.5;
        fit(-top * 0.6, top * 0.6, -0.5, top); ground(0);
        if (p.h > 0) { ctx.fillStyle = "rgba(107,107,112,0.12)"; ctx.fillRect(sx(-top * 0.5), sy(p.h), (top * 0.35) * cam.S, p.h * cam.S); line(sx(-top * 0.5), sy(p.h), sx(-top * 0.15), sy(p.h), 2); }
        for (let y = 0; y <= top; y += top > 20 ? 5 : top > 8 ? 2 : 1) { line(sx(top * 0.45), sy(y), sx(top * 0.45) + 6, sy(y), 1.2); label(sx(top * 0.45) + 18, sy(y), String(y)); }
        if (has("peak") || s.st.landed) { ctx.save(); ctx.setLineDash([3, 4]); line(sx(-top * 0.3), sy(e.maxY), sx(top * 0.3), sy(e.maxY), 1.4, "#20232A"); ctx.restore(); label(sx(top * 0.3) + 4, sy(e.maxY) - 10, "שיא " + nice(e.maxY) + " m", "#20232A", "left"); }
        critter(sx(0), sy(s.st.y), Math.min(60, cam.S * 1.5));
        if (forces()) { arrowS(sx(0) + 40, sy(s.st.y) - 20, 0, -s.st.v * 5, "#20232A", "v"); arrowS(sx(0) - 40, sy(s.st.y) - 20, 0, p.g * 5, "#2785C7", "g"); }
        label(14, 20, "g = " + nice(p.g) + " m/s²", "#2785C7", "left");
        if (s.st.landed) banner("נחת אחרי " + nice(e.tLand) + " s");
      },
      projectile(s, p) {
        const e = WP.evaluate("projectile", { ...p, t: 0 }), tgt = sc.setup.goal && sc.id === "W04-S04" ? [18, 19] : sc.id === "W12-S06" ? [25, 26] : null;
        const xm = Math.max(e.range, tgt ? tgt[1] : 0) + 2, ym = Math.max(e.maxY, p.h) + 2; fit(-2, xm, -0.5, Math.max(ym, xm * 0.35)); ground(0);
        if (p.h > 0) { ctx.fillStyle = "rgba(107,107,112,0.12)"; ctx.fillRect(sx(-2), sy(p.h), 2 * cam.S, p.h * cam.S); line(sx(-2), sy(p.h), sx(0), sy(p.h), 2); }
        if (tgt) { ctx.fillStyle = "rgba(226,87,76,0.3)"; ctx.fillRect(sx(tgt[0]), sy(0) - 5, (tgt[1] - tgt[0]) * cam.S, 10); label(sx((tgt[0] + tgt[1]) / 2), sy(0) - 16, "🎯", "#E2574C"); }
        for (let x = 0; x <= xm; x += xm > 30 ? 10 : 5) label(sx(x), sy(0) + 16, String(x));
        // the path so far (from the same formulas the simulator steps)
        ctx.save(); ctx.setLineDash([4, 5]); ctx.strokeStyle = "#E39B28"; ctx.lineWidth = 2; ctx.beginPath();
        const tt = L.sim ? L.sim.t : 0, vy0 = p.v0 * Math.sin(p.angle * Math.PI / 180); for (let i = 0; i <= 60; i++) { const t = tt * i / 60; const X = e.vx * t, Y = p.h + vy0 * t - 0.5 * p.g * t * t; i ? ctx.lineTo(sx(X), sy(Math.max(0, Y))) : ctx.moveTo(sx(X), sy(Y)); } ctx.stroke(); ctx.restore();
        critter(sx(s.st.x), sy(s.st.y), Math.min(46, cam.S * 1.4));
        if (forces() && !s.st.landed) { arrowS(sx(s.st.x), sy(s.st.y) - 24, s.st.vx * 5, 0, "#2785C7", "vx"); arrowS(sx(s.st.x), sy(s.st.y) - 24, 0, -s.st.vy * 5, "#E0702F", "vy"); }
        if (s.st.landed) banner(`נחת: ${nice(e.range)} m אחרי ${nice(e.tLand)} s`);
      },
      incline(s, p) {
        const th = p.angle * Math.PI / 180, c = Math.cos(th), sn = Math.sin(th), Lr = 6, tr = s.tr || null, pos = tr ? tr.s : 3;
        fit(-0.6, Lr * c + 0.6, -0.3, Lr * sn + 1.2); ground(0);
        ctx.fillStyle = "rgba(107,107,112,0.08)"; ctx.beginPath(); ctx.moveTo(sx(0), sy(0)); ctx.lineTo(sx(Lr * c), sy(0)); ctx.lineTo(sx(Lr * c), sy(Lr * sn)); ctx.closePath(); ctx.fill();
        line(sx(0), sy(0), sx(Lr * c), sy(Lr * sn), 6, "#B58A55"); line(sx(Lr * c), sy(0), sx(Lr * c), sy(Lr * sn), 2);
        const fx = pos * c, fy = pos * sn, hpx = Math.min(70, cam.S * 0.75); critter(sx(fx), sy(fy), hpx, -th);
        if (forces() && tr) { const R = tr.resolve(), C = { x: sx(fx) - sn * hpx * 0.45, y: sy(fy) - c * hpx * 0.45 }, k = 90 / (p.m * p.g);
          arrowS(C.x, C.y, 0, p.m * p.g * k, "#2785C7", "mg", p.m * p.g); if (R.N) arrowS(C.x, C.y, -sn * R.N * k, -c * R.N * k, "#8969C6", "N", R.N);
          if (Math.abs(R.f) > 1e-3) arrowS(C.x, C.y, c * R.f * k, -sn * R.f * k, "#CC5794", R.mode === "static" ? "f_s" : "f_k", Math.abs(R.f));
          if (p.F) arrowS(C.x, C.y, c * p.F * k, -sn * p.F * k, "#E0702F", "F", p.F); }
        if (tr && tr.resolve().mode === "wall") banner("הגענו לקצה המסלול (לא חיכוך)");
      },
      pulley(s, p) {
        const th = p.angle * Math.PI / 180, c = Math.cos(th), sn = Math.sin(th), Lh = 2.6, base = 1.5, tr = s.tr, d = 1.3 + (tr ? tr.s : 0);
        const pt = (q) => [q * c, base + q * sn], top = pt(Lh); fit(-0.4, top[0] + 0.9, -0.1, top[1] + 0.7); ground(0);
        ctx.fillStyle = "rgba(107,107,112,0.08)"; ctx.fillRect(sx(-0.2), sy(base), (top[0] + 0.2) * cam.S, base * cam.S);
        line(sx(0), sy(base), sx(top[0]), sy(top[1]), 6, "#B58A55");
        const pul = [top[0] + 0.12, top[1] + 0.1]; ctx.fillStyle = "#fff"; ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(sx(pul[0]), sy(pul[1]), 0.1 * cam.S, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        const f = pt(d), hpx = Math.min(64, cam.S * 0.6), By = pul[1] - 0.6 - (tr ? tr.s : 0);
        line(sx(f[0]) - sn * hpx * 0.4, sy(f[1]) - c * hpx * 0.4, sx(pul[0] - 0.02), sy(pul[1] + 0.1), 1.8, "#3a3a40"); line(sx(pul[0] + 0.1), sy(pul[1]), sx(pul[0] + 0.1), sy(By), 1.8, "#3a3a40");
        critter(sx(f[0]), sy(f[1]), hpx, -th); cart(sx(pul[0] + 0.1), sy(By - 0.34), 0.34 * cam.S, 0.34 * cam.S, nice(p.mB, 1) + " kg", "#FFF3D6");
        if (tr && forces()) { const R = tr.resolve(), T = tr.tension(), k = 90 / (p.mA * p.g), C = { x: sx(f[0]) - sn * hpx * 0.45, y: sy(f[1]) - c * hpx * 0.45 };
          arrowS(C.x, C.y, c * T * k, -sn * T * k, "#3A9E6E", "T", T); if (Math.abs(R.f) > 1e-3) arrowS(C.x, C.y, c * R.f * k, -sn * R.f * k, "#CC5794", "f", Math.abs(R.f)); }
      },
      spring(s, p) {
        const xm = Math.max(0.9, Math.abs(p.x) + 0.3); fit(-1.2, xm + 0.4, -0.3, 0.9); ground(0);
        line(sx(-1.1), sy(0), sx(-1.1), sy(0.8), 6, "#2e2e33");
        const x = s.st.x !== undefined ? s.st.x : p.x, end = x - 0.15; ctx.strokeStyle = "#6A7F2A"; ctx.lineWidth = 2.6; ctx.beginPath();
        for (let i = 0; i <= 20; i++) { const X = -1.1 + (end + 1.1) * i / 20, Y = 0.25 + (i % 2 ? 0.08 : -0.08) * (i && i < 20 ? 1 : 0); i ? ctx.lineTo(sx(X), sy(Y)) : ctx.moveTo(sx(X), sy(Y)); } ctx.stroke();
        ctx.save(); ctx.setLineDash([3, 4]); line(sx(0), sy(0) + 4, sx(0), sy(0.75), 1.2, "#9A9AA0"); ctx.restore(); label(sx(0), sy(0.8), "x = 0", "#606671");
        critter(sx(x + 0.1), sy(0), Math.min(80, cam.S * 0.55));
        if (forces()) { const F = -p.k * x; arrowS(sx(x + 0.1), sy(0.3), F * 2.2, 0, "#6A7F2A", "F = −kx", Math.abs(F)); }
        label(sx(x + 0.1), sy(0) + 16, "x = " + nice(x) + " m", "#20232A");
      },
      energy(s, p) {
        const tr = s.tr; if (!tr) return; const segs = s.segs, pts = [[0, p.h]]; for (const g_ of segs) { const a = g_.angleDeg * Math.PI / 180, q = pts[pts.length - 1]; pts.push([q[0] + g_.length * Math.cos(a), q[1] - g_.length * Math.sin(a)]); }
        fit(-0.5, pts[pts.length - 1][0] + 0.5, -0.4, Math.max(p.h, 1.5) + 1.2); ground(0);
        for (let i = 0; i < segs.length; i++) line(sx(pts[i][0]), sy(pts[i][1]), sx(pts[i + 1][0]), sy(pts[i + 1][1]), segs[i].muK > 0 ? 9 : 5, segs[i].muK > 0 ? "#E39B28" : "#B58A55");
        const si = s.stripStart, sEnd = s.stripEnd; label(sx((pts[segs.length - 2][0] + pts[segs.length - 1][0]) / 2), sy(0) + 18, `רצועה: μ = ${nice(p.mu)}, ${nice(p.d)} m`, "#B8741A");
        let d = tr.s, i = 0; while (i < segs.length - 1 && d > segs[i].length) { d -= segs[i].length; i++; }
        const a = -segs[i].angleDeg * Math.PI / 180, fx = pts[i][0] + d * Math.cos(a), fy = pts[i][1] + d * Math.sin(a); critter(sx(fx), sy(fy), Math.min(60, cam.S * 0.7), -a);
        const e = tr.energy(), tot = Math.max(1e-6, e.K + e.U + e.Q), bh = Math.min(90, H * 0.25), bars = [["U", e.U, "#2785C7"], ["K", e.K, "#42A47A"], ["חום", e.Q, "#E2574C"]];
        bars.forEach(([lab, v, col], j) => { const x = 14 + j * 34, y = 40 + bh; ctx.fillStyle = "#ECEEF1"; ctx.fillRect(x, 40, 22, bh); ctx.fillStyle = col; ctx.fillRect(x, y - bh * v / tot, 22, bh * v / tot); label(x + 11, y + 10, lab, "#20232A"); label(x + 11, 30, nice(v, 1), col); });
        if (s.done && tr.v === 0 && tr.s < sEnd) banner("נעצר על הרצועה אחרי " + nice(tr.s - si) + " m");
        else if (s.passed) banner("עבר את הרצועה ב-" + nice(tr.v) + " m/s");
      },
      circle(s, p) {
        const plate = p.r * 1.6; fit(-plate * 1.1, plate * 1.1, -plate * 1.1, plate * 1.1);
        ctx.fillStyle = "rgba(107,107,112,0.07)"; ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx(0), sy(0), plate * cam.S, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.save(); ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(sx(0), sy(0), p.r * cam.S, 0, Math.PI * 2); ctx.strokeStyle = "#9A9AA0"; ctx.stroke(); ctx.restore();
        ctx.fillStyle = "#2e2e33"; ctx.beginPath(); ctx.arc(sx(0), sy(0), 4, 0, Math.PI * 2); ctx.fill();
        const x = s.st.x, y = s.st.y; critter(sx(x), sy(y) + 18, Math.min(48, cam.S * 0.6));
        if (forces() && s.st.on && !has("slip")) { const Fc = p.m * p.v * p.v / p.r, k = 70 / Math.max(Fc, p.mu * p.m * p.g, 1e-6), d = Math.hypot(x, y) || 1; arrowS(sx(x), sy(y), -x / d * Fc * k, y / d * Fc * k, "#CC5794", "f_s", Fc); }
        if (has("slip")) banner("החיכוך לא מספיק: מחליק בקו ישר", "#E2574C");
        label(14, 20, `v²/r = ${nice(p.v * p.v / p.r)}  ·  μg = ${nice(p.mu * p.g)}`, "#20232A", "left");
      },
      bank(s, p) {
        const th = p.angle * Math.PI / 180, Lb = 4; fit(-0.6, Lb * Math.cos(th) + 1.2, -0.4, Lb * Math.sin(th) + 1.2); ground(0);
        ctx.fillStyle = "rgba(107,107,112,0.08)"; ctx.beginPath(); ctx.moveTo(sx(0), sy(0)); ctx.lineTo(sx(Lb * Math.cos(th)), sy(0)); ctx.lineTo(sx(Lb * Math.cos(th)), sy(Lb * Math.sin(th))); ctx.closePath(); ctx.fill();
        line(sx(0), sy(0), sx(Lb * Math.cos(th)), sy(Lb * Math.sin(th)), 6, "#7D7F86");
        const q = 2 + (s.st.up || 0) * 1.6, fx = q * Math.cos(th), fy = q * Math.sin(th); critter(sx(fx), sy(fy), Math.min(64, cam.S * 0.7), -th);
        label(W - 12, 20, "← מרכז העיקול", "#606671", "right");
        const e = WP.evaluate("bank", p); label(14, 20, `v = ${nice(p.v)} · v אידיאלית = ${nice(e.idealV)} m/s`, "#20232A", "left");
        if (Math.abs(s.st.drift) > 1e-6 && L.sim) banner(s.st.drift > 0 ? "מהר מדי: נסחף למעלה בעיקול" : "לאט מדי: מחליק פנימה ולמטה", "#B8741A");
      },
      loop(s, p) {
        const r = p.r; fit(-r * 1.6, r * 2.8, -0.3, 2 * r + 0.6); ground(0);
        ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sx(0), sy(r), r * cam.S, 0, Math.PI * 2); ctx.stroke();
        const x = s.st.x, y = s.st.y, hpx = Math.min(44, cam.S * 0.5); critter(sx(x), sy(y), hpx, s.st.onTrack ? -(s.st.th || 0) : 0);
        if (forces() && s.st.onTrack && s.st.N > 1e-6) { const N = s.st.N, k = Math.min(60 / (p.m * p.g), 110 / N); arrowS(sx(x), sy(y), (-x / r) * N * k, -((r - y) / r) * N * k, "#8969C6", "N", N); }
        label(14, 20, `v בפסגה (אם נשאר במגע) = ${nice(p.vTop)} · מינימום √(gr) = ${nice(Math.sqrt(p.g * r))}`, "#20232A", "left");
        if (has("lost_contact")) banner("איבד מגע: עף בקשת חופשית", "#E2574C"); else if (has("full_loop")) banner("הקפה שלמה!", "#137556");
      },
      impulse(s, p) {
        fit(-6, 2.5, -0.5, 2); ground(0);
        ctx.fillStyle = "#F5E6CC"; ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 2; const cx = sx(1.0); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cx, sy(1.2), 0.4 * cam.S, 1.2 * cam.S, 10) : ctx.rect(cx, sy(1.2), 0.4 * cam.S, 1.2 * cam.S); ctx.fill(); ctx.stroke();
        line(sx(1.4), sy(0), sx(1.4), sy(1.6), 6); label(sx(1.2), sy(1.45), "כרית", "#606671");
        const x = Math.min(0.6, s.st.x); cart(sx(x), sy(0) - 4, 60, 32, ""); critter(sx(x), sy(0) - 32, 40);
        if (forces()) { arrowS(sx(x), sy(0) - 96, s.st.v * 8, 0, "#20232A", "v"); if (s.st.F) arrowS(sx(x) + 30, sy(0) - 20, Math.sign(s.st.F) * Math.min(120, 30 + Math.abs(s.st.F)), 0, "#E0702F", "F", Math.abs(s.st.F)); }
        label(14, 20, `Δt = ${nice(p.dt)} s · J = ${nice(p.m * (p.v1 - p.v0))} N·s`, "#20232A", "left");
      },
      collision(s, p) {
        fit(-5, 5, -0.5, 2); ground(0);
        const w = 0.4 * cam.S; cart(sx(s.st.x1), sy(0) - 4, w, 30, nice(p.m1, 1) + " kg"); critter(sx(s.st.x1), sy(0) - 34, 36);
        cart(sx(s.st.x2), sy(0) - 4, w, 30, nice(p.m2, 1) + " kg", "#FFF3D6");
        if (forces()) { arrowS(sx(s.st.x1), sy(0) - 84, s.st.v1 * 8, 0, "#20232A", "v₁"); arrowS(sx(s.st.x2), sy(0) - 52, s.st.v2 * 8, 0, "#20232A", "v₂"); }
        label(14, 20, `p = ${nice(s.st.p !== undefined ? s.st.p : p.m1 * p.u1 + p.m2 * p.u2)} kg·m/s · K = ${nice(s.st.K !== undefined ? s.st.K : 0.5 * p.m1 * p.u1 ** 2 + 0.5 * p.m2 * p.u2 ** 2)} J · e = ${nice(p.e)}`, "#20232A", "left");
        if (has("hit")) { const e = L.sim.events.find((q) => q.type === "hit"); if (L.sim.t - e.t < 0.3) banner("בום!", "#E39B28"); }
      },
      recoil(s, p) {
        fit(-6, 6, -0.5, 2); ground(0);
        cart(sx(s.st.x1), sy(0) - 4, 0.45 * cam.S, 30, nice(p.m1, 1) + " kg"); critter(sx(s.st.x1), sy(0) - 34, 36);
        cart(sx(s.st.x2), sy(0) - 4, 0.45 * cam.S, 30, nice(p.m2, 1) + " kg", "#FFF3D6");
        if (!has("push")) { ctx.strokeStyle = "#6A7F2A"; ctx.lineWidth = 2.4; ctx.beginPath(); for (let i = 0; i <= 8; i++) { const X = sx(s.st.x1) + 0.22 * cam.S + i * (sx(s.st.x2) - sx(s.st.x1) - 0.44 * cam.S) / 8; const Y = sy(0) - 18 + (i % 2 ? -6 : 6); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke(); }
        if (forces()) { arrowS(sx(s.st.x1), sy(0) - 84, s.st.v1 * 8, 0, "#20232A", "v₁"); arrowS(sx(s.st.x2), sy(0) - 52, s.st.v2 * 8, 0, "#20232A", "v₂"); }
        label(14, 20, "p כולל = " + nice(s.st.p || 0) + " kg·m/s", "#20232A", "left");
      },
      gravity(s, p) {
        const rmax = Math.max(p.r * 1.25, Math.hypot(s.st.x || p.r, s.st.y || 0) * 1.05); fit(-rmax, rmax, -rmax, rmax);
        ctx.fillStyle = "#EEF3FA"; ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx(0), sy(0), 6.0e6 * cam.S, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.save(); ctx.setLineDash([3, 5]); ctx.strokeStyle = "#9A9AA0"; ctx.beginPath(); ctx.arc(sx(0), sy(0), p.r * cam.S, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        if (!L.trail || L.trailRun !== (L.cur && L.cur.id)) { L.trail = []; L.trailRun = L.cur && L.cur.id; }
        if (L.sim && s.st.x !== undefined) { L.trail.push([s.st.x, s.st.y]); if (L.trail.length > 600) L.trail.shift(); }
        ctx.strokeStyle = "#E39B28"; ctx.lineWidth = 2; ctx.beginPath(); L.trail.forEach(([x, y], i) => (i ? ctx.lineTo(sx(x), sy(y)) : ctx.moveTo(sx(x), sy(y)))); ctx.stroke();
        const x = s.st.x !== undefined ? s.st.x : p.r, y = s.st.y || 0; critter(sx(x), sy(y) + 14, 32);
        if (forces()) { const d = Math.hypot(x, y); arrowS(sx(x), sy(y), -x / d * 50, y / d * 50, "#2785C7", "g", undefined); }
        label(14, 20, `r = ${nice(p.r / 1000, 0)} km · g = ${nice(WP.evaluate("gravity", p).g)} m/s²`, "#20232A", "left");
        if (has("crash")) banner("נפל אל הכוכב", "#E2574C"); else if (has("escape")) banner("ברח מהשדה!", "#8A60E8");
      },
      oscillator(s, p) {
        fit(-1.4, 1.4, -0.4, 1); ground(0); line(sx(-1.35), sy(0), sx(-1.35), sy(0.8), 6);
        const x = s.st.x !== undefined ? s.st.x : WP.evaluate("oscillator", p).x, end = x - 0.15; ctx.strokeStyle = "#6A7F2A"; ctx.lineWidth = 2.6; ctx.beginPath();
        for (let i = 0; i <= 22; i++) { const X = -1.35 + (end + 1.35) * i / 22, Y = 0.25 + (i % 2 ? 0.07 : -0.07) * (i && i < 22 ? 1 : 0); i ? ctx.lineTo(sx(X), sy(Y)) : ctx.moveTo(sx(X), sy(Y)); } ctx.stroke();
        for (const d of [-p.A, p.A]) { ctx.save(); ctx.setLineDash([3, 4]); line(sx(d), sy(0) + 4, sx(d), sy(0.7), 1.2, "#9A9AA0"); ctx.restore(); }
        critter(sx(x + 0.1), sy(0), Math.min(70, cam.S * 0.5));
        if (forces() && s.st.v !== undefined) { arrowS(sx(x + 0.1), sy(0.85), s.st.v * 30, 0, "#20232A", "v"); arrowS(sx(x + 0.1), sy(0.55), s.st.a * 4, 0, "#8A60E8", "a"); }
        label(14, 20, `T = 2π√(m/k) = ${nice(WP.evaluate("oscillator", p).period)} s`, "#20232A", "left");
      },
      capstone(s, p) {
        const th = p.angle * Math.PI / 180, top = p.d * Math.sin(th), run = p.d * Math.cos(th); fit(-0.4, run + 2.2, -0.3, top + 1);
        ground(0); line(sx(0), sy(top), sx(run), sy(0), 7, "#E39B28"); line(sx(run), sy(0), sx(run + 2), sy(0), 5, "#B58A55");
        line(sx(run + 2), sy(0), sx(run + 2), sy(0.6), 6);
        const comp = s.st.phase === "spring" ? s.st.x : 0, sEnd = run + 0.6, sNat = run + 2 - 0.6 - 0.8; ctx.strokeStyle = "#6A7F2A"; ctx.lineWidth = 2.6; ctx.beginPath();
        const a0 = run + 2, a1 = run + 0.6 + 0.0 + comp; for (let i = 0; i <= 14; i++) { const X = a0 + (a1 - a0) * i / 14, Y = 0.22 + (i % 2 ? 0.07 : -0.07) * (i && i < 14 ? 1 : 0); i ? ctx.lineTo(sx(X), sy(Y)) : ctx.moveTo(sx(X), sy(Y)); } ctx.stroke();
        let fx, fy, rot = 0; if (s.st.phase === "ramp" || !L.sim) { const q = s.st.s || 0; fx = q * Math.cos(th); fy = top - q * Math.sin(th); rot = th; } else if (s.st.phase === "flat") { fx = run + (L.sim.u || 0); fy = 0; } else { fx = run + 0.6 + comp; fy = 0; }
        critter(sx(fx), sy(fy), Math.min(56, cam.S * 0.6), rot);
        label(14, 20, `μ על המדרון = ${nice(p.mu)} · k = ${nice(p.k, 0)} N/m`, "#20232A", "left");
        if (has("stays") || has("stopped_on_ramp")) banner("נעצר על המדרון", "#B8741A"); else if (s.st.xMax > 0) banner("כיווץ מרבי: " + nice(s.st.xMax * 100, 1) + " cm", "#137556");
      }
    };
    function draw() {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.direction = "ltr";
      const s = SIM(); if (!s) { label(W / 2, H / 2, "הערכים מחוץ לתחום של המודל", "#E2574C"); return; }
      try { DRAW[sc.family](s, P_()); } catch (e) { label(W / 2, H / 2, "…", "#606671"); }
      if (L.sim) label(W - 12, H - 66, "t = " + fmt(L.sim.t, 2) + " s", "#606671", "right");
    }

    // ---------------- loop ----------------
    function frame(now) {
      const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
      if (L.running && !paused && !isSheetOpen()) { let rem = dt * (slow ? 0.25 : 1); while (rem > 1e-9 && L.running) { const h = Math.min(rem, 1 / 120); S.stepRun(L, h); rem -= h; } sample(); if (!L.running) { paintTransport(); evaluate(false); } }
      draw();
      if ((frameN++ & 3) === 0) paintGraph();
      if ((evalT += dt) > 0.3) { evalT = 0; evaluate(false); }
      if (sayT > 0) { sayT -= dt; if (sayT <= 0) $("#say").hidden = true; }
      raf = requestAnimationFrame(frame);
    }
    paintControls(); paintReadouts(); paintTransport(); paintBar(); select(ui.mi);
    raf = requestAnimationFrame(frame);
    later(() => say(sc.story, 3.2), 300);
    window.__wscene = () => ({ L, ui, sc, hist });
    K.onCleanup(() => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); K.closeInfo(); document.querySelector(".sheet-back")?.remove(); R0.params[sc.id] = { ...L.P }; P.save(); clearTimeout(toast.t); });
  };

  const MODEL_NOTE = {
    units: "ערך × מקדם יחידה = ערך ב-SI.", vectors: "מחברים רכיבים: Rx = Ax + Bx, Ry = Ay + By; |R| = √(Rx² + Ry²).", uniform: "x = x₀ + v·t. העתק עם סימן, דרך תמיד חיובית.",
    meeting: "x₁ = x₂ ⇒ t = (x₂ − x₁)/(v₁ − v₂), רק אם t ≥ 0.", acceleration: "v = v₀ + a·t, Δx = v₀t + ½at². בלם נעצר ב-v = 0 ולא נוסע אחורה.", vertical: "y = h + v₀t − ½gt², בלי גרר. הקרקע עוצרת.",
    projectile: "x = v₀cosα·t, y = h + v₀sinα·t − ½gt², בלי גרר ורוח.", incline: "ציר לאורך המדרון. חיכוך סטטי רק כמה שצריך; קינטי נגד המהירות.", pulley: "חבל מתוח, גלגלת אידאלית. mB·g − T = mB·a.",
    spring: "F = −kx, E = ½kx², רצפה חלקה.", energy: "ירידה חלקה מגובה h ואז רצועה מחוספסת: חום = μmgd, ולא יותר מהאנרגיה שיש.", circle: "משטח אופקי: f_s למרכז, עד μmg. מעבר לזה החלקה.",
    bank: "בלי חיכוך: tanθ = v²/(rg) נותן מהירות אידיאלית.", loop: "בפסגה: N + mg = mv²/r, ו-N ≥ 0. בלי מגע, מעוף חופשי.", impulse: "J = Δp = F_avg·Δt.",
    collision: "תנע נשמר; אנרגיה קינטית רק ב-e = 1.", recoil: "מתחילים במנוחה: m₁v₁ + m₂v₂ = 0.", gravity: "g = GM/r², v מסלול = √(GM/r), v בריחה = √2·v מסלול. r ממרכז הכוכב.",
    oscillator: "x = A·cos(ωt + φ), ω = √(k/m). בלי דעיכה (העשרה).", capstone: "חיכוך רק על המדרון, קפיץ על רצפה חלקה: ½kx² = האנרגיה בתחתית."
  };
  const LEARN_FAMILY = MODEL_NOTE;
})();
