// ======================================================================
//  "הרפתקאות על המדרון": the 18-situation inclined-plane chapter.
//  Screens: ramps (the map of situations) and rscene (one situation).
//  Physics: RampPhys (ramp-engine.js). Situations and missions: RampScenes.
//  Shell, coins, meters, sheets and force arrows come from ui.js (kit), so
//  the economy, the two progress meters and the look stay the same.
//  What moves on screen is the simulation state; reactions are only words.
// ======================================================================
(() => {
  "use strict";
  const K = window.eggPhysics && window.eggPhysics.kit;
  if (!K) return;
  const { G, P, SCREENS, $, esc, fmt, FONT, reduceMotion, clamp, show, setTitle, sheet, isSheetOpen, reward, forceArrow, activeSpecies, phys, nameOf, artOf, creatureImg } = K;
  const S = RampScenes, RP = RampPhys;
  const COL = { g: "#2785C7", N: "#8969C6", f: "#CC5794", F: "#E0702F", T: "#3A9E6E", Q: "#B8741A", k: "#6A7F2A", par: "#E39B28", perp: "#42A47A", v: "#20232A" };
  const MISSION_COINS = 5, SCENE_BONUS = 15;
  const TYPE_HE = { experiment: "ניסוי", prediction: "תחזית", manipulation: "שינוי מכוון", force_diagram: "כוחות", calculation: "חישוב" };
  const KIND_HE = { auto: "ניסוי", choice: "הסבר", numeric: "חישוב", fbd: "תרשים כוחות", predict: "תחזית" };
  const st = () => K.rampState();
  const isDone = (id) => st().completed.includes(id);
  const sceneDone = (sc) => sc.missions.filter((m) => isDone(m.id)).length;
  const num = (s) => { const t = String(s).trim().replace(/[−–]/g, "-").replace(",", "."); return t === "" ? NaN : Number(t); };

  // ---------------- pictograms for the tiles (pencil line, one accent) ----------------
  const ICONS = (() => {
    const s = `fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"`, a = `fill="none" stroke="#8A60E8" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"`;
    const ramp = `<path ${s} d="M4 44h44M6 44L46 18v26"/>`;
    return {
      ramp: `${ramp}<rect ${s} x="24" y="22" width="9" height="9" transform="rotate(-33 28 26)"/><path ${a} d="M18 22l-6 4"/>`,
      gauge: `${ramp}<path ${a} d="M14 12h22"/><path ${s} d="M14 12h12"/><path ${s} d="M14 9v6M36 9v6"/>`,
      swatch: `${ramp}<path ${a} d="M14 38l8-5M24 32l8-5M34 25l8-5"/>`,
      launch: `${ramp}<circle ${s} cx="18" cy="35" r="3"/><path ${a} d="M22 30l10-6M28 22l4 2-2 4"/>`,
      rope: `${ramp}<rect ${s} x="16" y="28" width="8" height="8" transform="rotate(-33 20 32)"/><path ${a} d="M24 28l16-10"/><circle ${s} cx="42" cy="16" r="3"/>`,
      angle: `${ramp}<rect ${s} x="16" y="28" width="8" height="8" transform="rotate(-33 20 32)"/><path ${a} d="M24 28l12-18"/><path ${s} stroke-dasharray="2 3" d="M24 28l14-9"/>`,
      press: `${ramp}<rect ${s} x="22" y="25" width="8" height="8" transform="rotate(-33 26 29)"/><path ${a} d="M20 14l4 7M17 15l6-3"/>`,
      motor: `${ramp}<rect ${s} x="38" y="8" width="10" height="8" rx="2"/><path ${a} d="M20 30l18-14"/><circle ${s} cx="19" cy="31" r="3"/>`,
      track: `<path ${s} d="M4 44h44"/><path ${a} d="M4 12l14 16h14l14-8"/>`,
      pulley: `${ramp}<circle ${s} cx="46" cy="16" r="4"/><path ${a} d="M50 16v16"/><rect ${s} x="46" y="32" width="8" height="8"/>`,
      peaks: `<path ${s} d="M4 44l22-30 22 30z"/><circle ${s} cx="26" cy="11" r="3"/><rect ${a} x="10" y="28" width="7" height="7"/><rect ${s} x="34" y="26" width="7" height="7"/>`,
      pair: `${ramp}<rect ${s} x="14" y="32" width="7" height="7" transform="rotate(-33 18 35)"/><rect ${a} x="30" y="22" width="7" height="7" transform="rotate(-33 33 25)"/><path ${s} d="M21 31l9-6"/>`,
      scale: `<path ${s} d="M4 44h44"/><rect ${s} x="12" y="34" width="28" height="6" rx="2"/><circle ${a} cx="26" cy="26" r="7"/><path ${s} d="M26 22v4"/>`,
      brake: `${ramp}<path ${a} stroke-width="4" d="M14 39l10-6"/><circle ${s} cx="32" cy="27" r="3"/>`,
      energy: `<path ${s} d="M4 44h44"/><path ${a} d="M10 40V24"/><path ${s} d="M22 40V14M34 40V30"/><path ${s} stroke-dasharray="2 3" d="M40 40V20"/>`,
      spring: `${ramp}<path ${a} d="M8 42l3-4 3 1 3-4 3 1 3-4"/>`,
      envelope: `<rect ${s} x="8" y="14" width="36" height="24" rx="3"/><path ${s} d="M8 16l18 13 18-13"/><path ${a} d="M24 34h4"/>`,
      exam: `<rect ${s} x="12" y="6" width="28" height="38" rx="3"/><path ${s} d="M18 16h16M18 23h16M18 30h10"/><path ${a} d="M30 34l3 3 7-8"/>`
    };
  })();
  const pict = (k) => `<svg viewBox="0 0 52 52" aria-hidden="true">${ICONS[k] || ICONS.ramp}</svg>`;

  // ======================================================================
  //  THE MAP OF SITUATIONS
  // ======================================================================
  SCREENS.ramps = () => {
    setTitle("הרפתקאות על המדרון", "מישור משופע וחיכוך · 18 מצבים");
    const done = st().completed, cov = K.familyCoverage("newton");
    const tutDone = [1, 2, 3, 4, 5, 6, 7].filter((n) => K.done().includes("newton.s" + n)).length;
    const groups = [1, 2, 3, 4, 5].map((t) => ({ t, list: S.SCENES.filter((s) => s.tier === t) }));
    const cov2 = S.coverage(done, K.done());
    K.$("#screen").innerHTML = `
      <div class="stack rmap">
        <div class="card">
          <div class="meter-label"><span>מישור משופע וחיכוך</span><span class="ltr">${K.pct(cov)}</span></div>
          <span class="meter violet"><i data-w="${cov}"></i></span>
          <div class="meter-label" style="margin-top:10px"><span>התקדמות כללית בפיזיקה</span><span class="ltr">${K.pct(K.overallCoverage())}</span></div>
          <span class="meter teal"><i data-w="${K.overallCoverage()}"></i></span>
          <details class="skills"><summary class="linkish">לפי מיומנות</summary>
            <div class="skill-list">${Object.entries(S.SKILLS).map(([k, he]) => `<div><span>${esc(he)}</span><span class="meter thin violet"><i data-w="${cov2.per[k]}"></i></span></div>`).join("")}</div></details>
        </div>
        <button class="card rtile tut" type="button" id="tut">
          <span class="ricon">${pict("ramp")}</span>
          <span class="rtxt"><b>ההדרכה: מי מושך אותי?!</b><small>7 השלבים המקוריים · ${tutDone}/7</small></span>
        </button>
        ${groups.map((gp) => `
          <h3 class="rgroup">${esc(S.TIERS[gp.t])}${S.unlocked(gp.t, done) ? "" : ` <span class="tag">🔒 ${esc(S.UNLOCK_HE[gp.t])}</span>`}</h3>
          <div class="rgrid">${gp.list.map((sc) => {
            const n = sceneDone(sc), open = S.unlocked(sc.tier, done);
            return `<button class="card rtile ${open ? "" : "locked"} ${n === 5 ? "full" : ""}" type="button" data-sc="${sc.id}" ${open ? "" : 'aria-disabled="true"'}>
              <span class="ricon">${pict(sc.icon)}</span>
              <span class="rtxt"><small class="ltr">${sc.id}</small><b>${esc(sc.title)}</b><small>${esc(sc.desc)}</small>
                <span class="dots" aria-label="${n} מתוך 5">${sc.missions.map((m) => `<i class="${isDone(m.id) ? "on" : ""}"></i>`).join("")}</span></span>
            </button>`; }).join("")}</div>`).join("")}
        <p class="fine">המשימות מקוריות, בנויות לפי תחומי התוכן והמיומנויות של בגרות 5 יח״ל (דינמיקה). "קפיץ בקצה הרמפה" הוא העשרה.</p>
      </div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => { for (const i of document.querySelectorAll("#screen [data-w]")) i.style.width = Math.max(2, +i.dataset.w * 100) + "%"; }));
    $("#tut").addEventListener("click", () => { G.sfx.pop(); show("incline", { topic: "newton" }); });
    for (const b of document.querySelectorAll("#screen [data-sc]")) b.addEventListener("click", () => {
      const sc = S.SCENES.find((x) => x.id === b.dataset.sc);
      if (!S.unlocked(sc.tier, st().completed)) { G.sfx.hmph && G.sfx.hmph(0.3); b.classList.remove("shake"); void b.offsetWidth; b.classList.add("shake"); return; }
      G.sfx.pop(); st().last = sc.id; P.save(); show("rscene", { id: sc.id });
    });
  };

  // ======================================================================
  //  ONE SITUATION
  // ======================================================================
  SCREENS.rscene = ({ id }) => {
    const sc = S.SCENES.find((x) => x.id === id) || S.SCENES[0];
    setTitle(sc.title, `${sc.id} · ${S.TIERS[sc.tier]}`);
    let sp = activeSpecies();
    const prof = () => phys(sp);
    const mc = () => prof().mass_kg;
    const R0 = st();
    R0.params = R0.params || {};
    R0.secretN = R0.secretN || 0;
    const secretSeed = () => (R0.seed || "p") + ":" + R0.secretN;
    let L = S.newLab(sc, mc(), { P: R0.params[sc.id], completed: R0.completed }, S.makeSecret(secretSeed()));
    L.secretSeed = secretSeed();
    L.completed = R0.completed;
    S.idle(L);
    const hist = []; let histRun = null;
    let paused = false, slow = false, view = "real", graphOpen = false, graphKind = sc.rig === "track" ? "ax" : sc.spring ? "Fx" : "v";
    let sayT = 0, raf = 0, lastT = performance.now(), evalT = 0, lastGate = null, cam = null, W = 0, H = 0, DPR = 1, tPaint = 0;
    let alive = true;
    const later = (fn, ms) => setTimeout(() => { if (alive) fn(); }, ms);
    const ui = { mi: firstOpen(), then: false, attempts: {}, fbdPick: {}, multi: [], confirmArmed: {} };
    function firstOpen() { const i = sc.missions.findIndex((m) => !isDone(m.id)); return i < 0 ? 0 : i; }
    const curM = () => sc.missions[ui.mi];

    K.$("#screen").innerHTML = `
      <div class="lab-screen rscene">
        <div class="mbar" id="mbar" role="tablist" aria-label="משימות">${sc.missions.map((m, i) => `<button type="button" role="tab" data-i="${i}" aria-label="משימה ${i + 1}">${i + 1}</button>`).join("")}</div>
        <div class="card task mission" id="task" aria-live="polite"></div>
        <div class="lab" id="lab">
          <canvas id="labCanvas" aria-label="${esc(sc.title)}"></canvas>
          <div class="bubble say" id="say" hidden></div>
          <div class="toast card" id="toast" hidden></div>
          <div class="lab-tools">
            <button class="chip" id="charChip" type="button"></button>
            <span class="transport">
              <button class="tbtn" id="tPlay" type="button" aria-label="הפעלה">▶</button>
              <button class="tbtn" id="tReset" type="button" aria-label="חזרה למצב ההתחלה">⟲</button>
              <button class="tbtn" id="tSlow" type="button" aria-label="הילוך איטי" aria-pressed="false">🐢</button>
            </span>
          </div>
        </div>
        <div class="seg viewseg" role="group" aria-label="תצוגה">
          <button type="button" data-v="real" aria-pressed="true">כוחות</button><button type="button" data-v="comp" aria-pressed="false">רכיבי mg</button>
          <button type="button" data-v="none" aria-pressed="false">בלי חצים</button><button type="button" data-v="graph" aria-pressed="false">גרפים</button>
        </div>
        <div class="card graphcard" id="graph" hidden>
          <div class="seg gseg" id="gseg"></div>
          <canvas id="gCanvas" aria-label="גרף"></canvas>
          <p class="fine" id="gNote"></p>
        </div>
        <div class="readouts" id="readouts"></div>
        <p class="sr" id="srText" aria-live="polite"></p>
        <div class="card controls" id="controls"></div>
        <div class="card meas" id="meas" hidden></div>
      </div>`;
    const cv = $("#labCanvas"), ctx = cv.getContext("2d"), box = $("#lab"), gcv = $("#gCanvas"), gctx = gcv.getContext("2d");
    const resize = () => {
      const r = box.getBoundingClientRect(); DPR = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      const gr = gcv.getBoundingClientRect(); gcv.width = Math.round(gr.width * DPR); gcv.height = Math.round(gr.height * DPR);
    };
    resize(); const ro = new ResizeObserver(resize); ro.observe(box); ro.observe(gcv);
    const img = new Image(); let imgSp = null; const loadImg = () => { if (imgSp !== sp) { imgSp = sp; img.src = artOf(sp); } }; loadImg();

    // ---------------- controls ----------------
    const controlsList = () => (sc.controlsFor ? sc.controlsFor(L.P) : sc.controls);
    function paintControls() {
      const cs = controlsList();
      const parts = [];
      if (sc.phases) parts.push(`<div class="seg" role="group" aria-label="תצורה">${Object.entries(sc.phases).map(([k, he]) => `<button type="button" data-ph="${k}" aria-pressed="${L.P.phase === k}">${k === "A" ? "א" : k === "B" ? "ב" : "ג"}: ${esc(he)}</button>`).join("")}</div>`);
      for (const c of cs) {
        const max = S.maxOf(c, mc());
        parts.push(`<div class="slider-row"><label for="c_${c.k}"><span>${esc(c.he)}</span><span class="val" id="v_${c.k}"></span></label>
          <div class="srow"><button class="step" type="button" data-step="${c.k}" data-d="-1" aria-label="להקטין">−</button><input id="c_${c.k}" data-k="${c.k}" type="range" min="${c.min}" max="${max}" step="${c.step}"><button class="step" type="button" data-step="${c.k}" data-d="1" aria-label="להגדיל">+</button></div></div>`);
      }
      if (sc.mats) { const keys = Array.isArray(sc.mats) ? sc.mats : Object.keys(S.MATS); parts.push(`<div><div class="meter-label"><span>${esc(sc.matLabel || "חומר המשטח")}</span><span class="ltr" id="muVal"></span></div><div class="surfaces">${keys.map((k) => `<button type="button" data-mat="${k}">${esc(S.MATS[k].he)}</button>`).join("")}</div></div>`); }
      if (sc.pairMats) parts.push(`<div><div class="meter-label"><span>חומר מתחת לדמות</span></div><div class="surfaces">${Object.keys(S.MATS).map((k) => `<button type="button" data-matA="${k}">${esc(S.MATS[k].he)}</button>`).join("")}</div></div>
        <div><div class="meter-label"><span>חומר מתחת לקופסה</span></div><div class="surfaces">${Object.keys(S.MATS).map((k) => `<button type="button" data-matB="${k}">${esc(S.MATS[k].he)}</button>`).join("")}</div></div>`);
      const btns = [];
      if (sc.brakeBtn) btns.push(`<button class="btn primary" id="brakeBtn" type="button" style="flex:1">🛑 בלם!</button>`);
      if (sc.swapBtn) btns.push(`<button class="btn secondary" id="swapBtn" type="button" style="flex:1">⇅ החלף סדר</button>`);
      if (sc.measure) btns.push(`<button class="btn secondary" id="measBtn" type="button" style="flex:1">📌 רשום מדידה</button>`);
      if (sc.secret) btns.push(`<button class="btn quiet" id="secretBtn" type="button">מעטפה חדשה</button>`);
      if (sc.backpack || controlsList().some((c) => c.k === "load")) btns.push(`<button class="btn quiet" id="dblBtn" type="button">×2 מסה</button>`);
      if (btns.length) parts.push(`<div class="btnrow">${btns.join("")}</div>`);
      $("#controls").innerHTML = parts.join("");
      for (const inp of $("#controls").querySelectorAll("input[type=range]")) {
        inp.value = L.P[inp.dataset.k];
        inp.addEventListener("input", () => setP(inp.dataset.k, +inp.value, true));
        inp.addEventListener("change", saveParams);
      }
      for (const b of $("#controls").querySelectorAll("[data-step]")) b.addEventListener("click", () => {
        const c = controlsList().find((x) => x.k === b.dataset.step), v = clamp(+(L.P[c.k] + c.step * +b.dataset.d).toFixed(4), c.min, S.maxOf(c, mc()));
        setP(c.k, v); saveParams(); G.sfx.tick && G.sfx.tick();
      });
      for (const b of $("#controls").querySelectorAll("[data-mat]")) b.addEventListener("click", () => { setP("mat", b.dataset.mat); G.sfx.pop(); saveParams(); say(`${S.MATS[b.dataset.mat].he}: μs ${fmt(S.MATS[b.dataset.mat].s, 2)}, μk ${fmt(S.MATS[b.dataset.mat].k, 2)}`, 2.6); });
      for (const b of $("#controls").querySelectorAll("[data-matA]")) b.addEventListener("click", () => { setP("matA", b.dataset.mata || b.getAttribute("data-matA")); G.sfx.pop(); saveParams(); });
      for (const b of $("#controls").querySelectorAll("[data-matB]")) b.addEventListener("click", () => { setP("matB", b.dataset.matb || b.getAttribute("data-matB")); G.sfx.pop(); saveParams(); });
      for (const b of $("#controls").querySelectorAll("[data-ph]")) b.addEventListener("click", () => { setP("phase", b.dataset.ph); paintControls(); G.sfx.pop(); saveParams(); });
      $("#brakeBtn")?.addEventListener("click", () => {
        if (!L.running || !L.sim.p || !L.sim.p.brake) { say("קודם תן לי לנסוע!", 1.6); return; }
        if (L.sim.p.brake.on) return;
        L.sim.p.brake.on = true; G.sfx.thudSoft && G.sfx.thudSoft(); G.buzz && G.buzz(30); say("צייייק!", 1.2);
      });
      $("#swapBtn")?.addEventListener("click", () => { setP("swap", L.P.swap ? 0 : 1); G.sfx.whoosh && G.sfx.whoosh(); saveParams(); });
      $("#measBtn")?.addEventListener("click", () => { const r = S.addMeasure(L); if (r) { G.sfx.pop(); paintMeas(); evaluate(true); } });
      $("#secretBtn")?.addEventListener("click", () => { R0.secretN++; P.save(); L.secret = S.makeSecret(secretSeed()); L.secretSeed = secretSeed(); L.runs = []; S.idle(L); hist.length = 0; paintMeas(); G.sfx.whoosh && G.sfx.whoosh(); say("מעטפה חדשה. μ אחר, ניסוי חדש.", 2.4); });
      $("#dblBtn")?.addEventListener("click", () => { const c = controlsList().find((x) => x.k === "load"); setP("load", clamp(Math.round((L.P.load ? 0 : mc()) * 2) / 2, 0, S.maxOf(c, mc()))); saveParams(); G.sfx.pop(); });
      paintControlValues();
    }
    function paintControlValues() {
      for (const c of controlsList()) {
        const el = $("#v_" + c.k); if (!el) continue;
        el.textContent = `${fmt(L.P[c.k], c.d)}${c.unit ? " " + c.unit : ""}`;
        const inp = $("#c_" + c.k); if (inp && +inp.value !== L.P[c.k]) inp.value = L.P[c.k];
      }
      for (const b of $("#controls").querySelectorAll("[data-mat]")) b.setAttribute("aria-pressed", b.dataset.mat === L.P.mat);
      for (const b of $("#controls").querySelectorAll("[data-matA]")) b.setAttribute("aria-pressed", b.getAttribute("data-matA") === L.P.matA);
      for (const b of $("#controls").querySelectorAll("[data-matB]")) b.setAttribute("aria-pressed", b.getAttribute("data-matB") === L.P.matB);
      for (const b of $("#controls").querySelectorAll("[data-ph]")) b.setAttribute("aria-pressed", b.dataset.ph === L.P.phase);
      if ($("#muVal") && L.P.mat) $("#muVal").textContent = `μs ${fmt(S.MATS[L.P.mat].s, 2)} · μk ${fmt(S.MATS[L.P.mat].k, 2)}`;
      if ($("#dblBtn")) $("#dblBtn").textContent = L.P.load ? "בלי תרמיל" : "×2 מסה";
    }
    function setP(k, v, quiet) {
      const was = L.running && !S.isLive(L);
      S.setParam(L, k, v);
      if (was) { paused = false; }
      if (!S.isLive(L)) { hist.length = 0; histRun = null; }
      paintControlValues(); paintTransport();
    }
    let saveTimer = 0;
    function saveParams() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { R0.params[sc.id] = { ...L.P }; P.save(); }, 300); }

    // ---------------- transport ----------------
    function paintTransport() {
      const live = S.isLive(L);
      $("#tPlay").textContent = (live ? !paused : (L.running && !paused)) ? "⏸" : "▶";
      $("#tPlay").setAttribute("aria-label", (L.running && !paused) ? "השהיה" : "הפעלה");
      $("#tSlow").setAttribute("aria-pressed", slow);
    }
    $("#tPlay").addEventListener("click", () => {
      G.audio.unlock();
      if (S.isLive(L)) { paused = !paused; }
      else if (L.running) paused = !paused;
      else { S.startRun(L); paused = false; hist.length = 0; histRun = L.cur.id; G.sfx.whoosh && G.sfx.whoosh(); if (sc.launch) say("וווווופ!", 1); }
      paintTransport();
    });
    $("#tReset").addEventListener("click", () => { S.idle(L); paused = false; hist.length = 0; histRun = null; G.sfx.pop(); paintTransport(); say("חזרה להתחלה.", 1.2); });
    $("#tSlow").addEventListener("click", () => { slow = !slow; G.sfx.pop(); paintTransport(); if (slow) say("הילוך איטי: רק השעון של המסך מאט. הפיזיקה אותה פיזיקה.", 2.6); });
    for (const b of document.querySelectorAll(".viewseg [data-v]")) b.addEventListener("click", () => {
      const v = b.dataset.v;
      if (v === "graph") { graphOpen = !graphOpen; $("#graph").hidden = !graphOpen; b.setAttribute("aria-pressed", graphOpen); if (graphOpen) { resize(); paintGraphSeg(); $("#graph").scrollIntoView({ behavior: "smooth", block: "nearest" }); evaluate(true); } }
      else { view = v; for (const x of document.querySelectorAll(".viewseg [data-v]")) if (x.dataset.v !== "graph") x.setAttribute("aria-pressed", x.dataset.v === view); if (v === "comp") say("רכיבי mg: פירוק של כוח אחד, לא כוחות נוספים.", 2.6); }
      G.sfx.pop();
    });
    $("#charChip").addEventListener("click", () => {
      const owned = P.owned();
      const el = sheet(`<h3>הגוף בניסוי</h3><p>המסה של הדמות היא המסה בניסוי (ועוד תרמיל, אם יש). החיכוך בא מהמשטח.</p>
        <div class="pick-list">${owned.map((c) => `<button type="button" data-id="${c.instance_id}" aria-pressed="${c.species === sp}">${creatureImg(c.species)}<span>${esc(nameOf(c.species))}</span><small>${fmt(phys(c.species).mass_kg, 1)} kg</small></button>`).join("")}</div>
        ${owned.length < 2 ? `<p class="fine" style="margin-top:12px">דמות נוספת מגיעה מהחלפה עם חבר. אז רואים מה מסה אחרת משנה.</p>` : ""}
        <div class="actions"><button class="btn quiet" type="button" data-close>סגור</button></div>`);
      for (const b of el.querySelectorAll("[data-id]")) b.addEventListener("click", () => {
        const c = owned.find((x) => x.instance_id === b.dataset.id); el.closest(".sheet-back").remove();
        if (c && c.species !== sp) { P.setActive(c.instance_id); G.setCreature(c.species); sp = c.species; loadImg(); L.mc = mc(); S.idle(L); hist.length = 0; paintChip(); paintControls(); say(`עכשיו ${nameOf(sp)} על המדרון: ${fmt(mc(), 1)} kg.`, 2.4); }
      });
    });
    function paintChip() { $("#charChip").innerHTML = `<img src="${artOf(sp)}" alt=""><span><bdi>${esc(nameOf(sp))}</bdi> · <span class="ltr">${fmt(S.mOf(L), 1)} kg</span></span>`; }

    // ---------------- missions ----------------
    function paintBar() {
      for (const b of document.querySelectorAll("#mbar [data-i]")) {
        const i = +b.dataset.i, m = sc.missions[i];
        b.classList.toggle("done", isDone(m.id));
        if (i === ui.mi) b.setAttribute("aria-selected", "true"); else b.removeAttribute("aria-selected");
      }
    }
    for (const b of document.querySelectorAll("#mbar [data-i]")) b.addEventListener("click", () => { selectMission(+b.dataset.i); G.sfx.pop(); });
    function selectMission(i) {
      ui.mi = i; ui.then = false; ui.multi = []; ui.fbdPick = {}; lastGate = null;
      const m = curM(); if (m.phase && L.P.phase !== m.phase) { setP("phase", m.phase); paintControls(); }
      if (m.graph && !graphOpen) graphKind = m.graph;
      S.activate(L, m);
      paintBar(); paintMission();
    }
    const head = (m) => `<div class="mhead"><small>משימה ${ui.mi + 1} · ${esc(KIND_HE[m.kind])}${isDone(m.id) ? " · ✓ הושלמה" : ""}</small><p>${esc(S.textOf(L, m))}</p></div>`;
    const hintBtn = (h) => h ? `<details class="mhint"><summary class="linkish">איך?</summary><p>${esc(h)}</p></details>` : "";
    function paintMission() {
      const m = curM(), el = $("#task");
      const gate = S.gateOk(L, m); lastGate = gate;
      let body = "";
      if (isDone(m.id) && !ui.replay) body = `<p class="learn">✓ ${esc(m.learn)}</p><div class="mrow"><button class="btn quiet" type="button" id="again">לעשות שוב (בלי מטבעות)</button>${nextBtn()}</div>`;
      else if (ui.then) body = thenHtml(m.then);
      else if (m.kind === "auto") body = `${hintBtn(m.hint)}<p class="status" id="mstatus">${esc(S.isLive(L) ? "שנה את הבקרים: המדרון מגיב מיד." : "שנה, ואז ▶.")}</p>`;
      else if (!gate) body = `<p class="gate">👉 ${esc(m.gateHint || "")}</p>`;
      else if (m.kind === "choice") body = choiceHtml(m.q, m.options);
      else if (m.kind === "numeric") body = numericHtml(m);
      else if (m.kind === "fbd") body = fbdHtml(m);
      else if (m.kind === "predict") body = predictHtml(m);
      el.innerHTML = head(m) + body;
      bindMission(m);
    }
    const nextBtn = () => { const n = sc.missions.findIndex((x, i) => i !== ui.mi && !isDone(x.id)); return n >= 0 ? `<button class="btn primary" type="button" id="nextM">למשימה ${n + 1}</button>` : `<button class="btn primary" type="button" id="toMap">למפת המדרונות</button>`; };
    const choiceHtml = (q, opts) => `<p class="q">${esc(q)}</p><div class="options">${opts.map((a, i) => `<button type="button" data-ch="${i}">${esc(a)}</button>`).join("")}</div><p class="why" id="why" hidden></p>`;
    function thenHtml(t) { if (t.kind === "numeric") return numericHtml(t); return choiceHtml(t.q, t.options); }
    function numericHtml(m) {
      const armed = m.confirm && L.confirm && L.confirm[m.id] !== undefined;
      if (armed) return `<p class="ok">✓ החישוב נכון.</p><p class="gate">👉 ${esc(m.confirm.hint)}</p>`;
      return `<div class="numgrid">${m.fields.map((f) => `<label><span>${esc(f.he)}</span><span class="inp"><input data-f="${f.k}" inputmode="decimal" dir="ltr" autocomplete="off" aria-label="${esc(f.he)}"><em class="ltr">${esc(f.unit)}</em></span></label>`).join("")}</div>
        ${m.graph ? `<p class="fine">פתח "גרפים" כדי לקרוא מהגרף.</p>` : ""}
        <div class="mrow"><button class="btn primary" type="button" id="checkN">בדוק</button></div><p class="why" id="why" hidden></p>`;
    }
    function fbdHtml(m) {
      return `<div class="fbd">${m.rows.map((r, i) => `<div class="frow"><span class="flabel">${esc(r.label)}</span><div class="fopts">${r.opts.map((o) => `<button type="button" data-row="${i}" data-o="${o}" aria-pressed="${ui.fbdPick[i] === o}" title="${esc(S.DIRS[o])}">${dirGlyph(o)}<small>${esc(S.DIRS[o])}</small></button>`).join("")}</div></div>`).join("")}</div>
        <div class="mrow"><button class="btn primary" type="button" id="checkF">בדוק</button></div><p class="why" id="why" hidden></p>`;
    }
    function predictHtml(m) {
      const pr = L.pred[m.id];
      if (!pr) {
        if (m.multi) return `<div class="multi">${m.multi.map((row, r) => `<div class="frow"><span class="flabel">${esc(row.he)}</span><div class="seg">${m.options.map((o, i) => `<button type="button" data-mr="${r}" data-mo="${i}" aria-pressed="${ui.multi[r] === i}">${esc(o)}</button>`).join("")}</div></div>`).join("")}</div>
          <div class="mrow"><button class="btn primary" type="button" id="lockM">🔒 נעל תחזית</button></div>`;
        return `<p class="q">התחזית שלך, לפני הניסוי:</p><div class="options">${m.options.map((a, i) => `<button type="button" data-pr="${i}">${esc(a)}</button>`).join("")}</div>`;
      }
      const shown = Array.isArray(pr.pick) ? pr.pick.map((x, i) => `${m.multi[i].he}: ${m.options[x]}`).join(" · ") : m.options[pr.pick];
      const res = S.predictionResult(L, m);
      if (res && res.ready && !res.ok) {
        const truth = Array.isArray(res.truth) ? res.truth.map((x, i) => `${m.multi[i].he}: ${m.options[x]}`).join(" · ") : m.options[res.truth];
        return `<p class="locked">🔒 ${esc(shown)}</p><p class="bad">הניסוי הראה: ${esc(truth)}.</p><p class="why">${esc(m.learn)}</p><div class="mrow"><button class="btn secondary" type="button" id="unlockP">תחזית חדשה</button></div>`;
      }
      return `<p class="locked">🔒 התחזית שלך: ${esc(shown)}</p><p class="gate">👉 ${esc(m.needHint)}</p>`;
    }
    function bindMission(m) {
      const el = $("#task");
      el.querySelector("#again")?.addEventListener("click", () => { ui.replay = true; delete L.pred[m.id]; if (L.confirm) delete L.confirm[m.id]; (L.since || {})[m.id] = undefined; S.activate(L, m); paintMission(); });
      el.querySelector("#nextM")?.addEventListener("click", () => { const n = sc.missions.findIndex((x, i) => i !== ui.mi && !isDone(x.id)); ui.replay = false; selectMission(n); });
      el.querySelector("#toMap")?.addEventListener("click", () => show("ramps", {}, false));
      // choices (a mission's question, or the follow-up after an experiment)
      for (const b of el.querySelectorAll("[data-ch]")) b.addEventListener("click", () => {
        if (el.dataset.answered) return;
        const q = ui.then ? m.then : m, r = S.checkChoice(L, q, +b.dataset.ch);
        b.classList.add(r.ok ? "right" : "wrong");
        const why = el.querySelector("#why"); why.hidden = false;
        if (r.ok) { el.dataset.answered = "1"; why.textContent = "נכון!"; later(() => complete(m), 700); }
        else { wrongOnce(m); why.textContent = "לא בדיוק. " + (attempts(m) >= 2 ? m.learn : "חשוב על מה שראית בניסוי ונסה שוב."); G.sfx.hmph && G.sfx.hmph(0.4); later(() => b.classList.remove("wrong"), 900); }
      });
      // numbers
      el.querySelector("#checkN")?.addEventListener("click", () => {
        const q = ui.then && m.then && m.then.kind === "numeric" ? m.then : m;
        const vals = {}; for (const i of el.querySelectorAll("[data-f]")) vals[i.dataset.f] = num(i.value);
        if (Object.values(vals).some((v) => !Number.isFinite(v))) { const why = el.querySelector("#why"); why.hidden = false; why.textContent = "כתוב מספר בכל שדה (אפשר עם מינוס)."; return; }
        const r = S.checkNumeric(L, q, vals);
        el.querySelectorAll("[data-f]").forEach((inp, i) => inp.classList.toggle("bad", !r.res[i].ok));
        const why = el.querySelector("#why"); why.hidden = false;
        if (r.ok) {
          G.sfx.sparkle && G.sfx.sparkle(1);
          if (q.confirm) { S.armConfirm(L, q); why.textContent = "נכון. עכשיו הניסוי."; later(paintMission, 600); }
          else { why.textContent = "נכון!"; later(() => complete(m), 600); }
        } else {
          wrongOnce(m); G.sfx.hmph && G.sfx.hmph(0.4);
          const signOnly = r.res.some((x, i) => !x.ok && Math.abs(Math.abs(vals[q.fields[i].k]) - Math.abs(x.truth)) <= Math.max(0.02, 0.02 * Math.abs(x.truth)));
          why.textContent = signOnly ? "הגודל נכון, הסימן לא. בדוק את כיוון הציר (+ במעלה)." : attempts(m) >= 2 ? "רמז: " + m.learn : "עוד לא. בדוק יחידות והצבה, ונסה שוב.";
        }
      });
      for (const inp of el.querySelectorAll("[data-f]")) inp.addEventListener("keydown", (e) => { if (e.key === "Enter") el.querySelector("#checkN")?.click(); });
      // force diagram
      for (const b of el.querySelectorAll("[data-row]")) b.addEventListener("click", () => {
        ui.fbdPick[+b.dataset.row] = b.dataset.o;
        for (const x of el.querySelectorAll(`[data-row="${b.dataset.row}"]`)) x.setAttribute("aria-pressed", x === b);
        G.sfx.tick && G.sfx.tick();
      });
      el.querySelector("#checkF")?.addEventListener("click", () => {
        const picks = m.rows.map((_, i) => ui.fbdPick[i]);
        if (picks.some((x) => !x)) { const why = el.querySelector("#why"); why.hidden = false; why.textContent = "בחר כיוון לכל שורה."; return; }
        const r = S.checkFbd(L, m, picks);
        el.querySelectorAll(".frow").forEach((row, i) => row.classList.toggle("bad", !r.res[i].ok));
        const why = el.querySelector("#why"); why.hidden = false;
        if (r.ok) { why.textContent = "נכון!"; G.sfx.sparkle && G.sfx.sparkle(1); if (m.then) { later(() => { ui.then = true; paintMission(); }, 600); } else later(() => complete(m), 600); }
        else { wrongOnce(m); G.sfx.hmph && G.sfx.hmph(0.4); why.textContent = attempts(m) >= 2 ? "השורות המסומנות עוד לא נכונות. " + m.learn : "השורות המסומנות עוד לא נכונות. נגד מה החיכוך? לאן המשטח דוחף?"; }
      });
      // predictions are locked before the run
      for (const b of el.querySelectorAll("[data-pr]")) b.addEventListener("click", () => { S.lockPrediction(L, m, +b.dataset.pr); G.sfx.pop(); say("נעול. עכשיו הניסוי!", 1.6); paintMission(); });
      for (const b of el.querySelectorAll("[data-mr]")) b.addEventListener("click", () => { ui.multi[+b.dataset.mr] = +b.dataset.mo; for (const x of el.querySelectorAll(`[data-mr="${b.dataset.mr}"]`)) x.setAttribute("aria-pressed", x === b); });
      el.querySelector("#lockM")?.addEventListener("click", () => { if (m.multi.some((_, i) => ui.multi[i] === undefined)) { say("בחר לכל קטע.", 1.4); return; } S.lockPrediction(L, m, ui.multi.slice()); G.sfx.pop(); paintMission(); });
      el.querySelector("#unlockP")?.addEventListener("click", () => { delete L.pred[m.id]; ui.multi = []; paintMission(); });
    }
    const attempts = (m) => ui.attempts[m.id] || 0;
    const wrongOnce = (m) => { ui.attempts[m.id] = attempts(m) + 1; };
    // checked a few times a second: experiments, locked predictions, confirmations, gates
    function evaluate(force) {
      const m = curM(); if (isDone(m.id) && !ui.replay) return;
      if (ui.then) return;
      if (m.kind === "auto" && S.autoCheck(L, m)) { if (m.then) { ui.then = true; paintMission(); say("רגע, שאלה!", 1.4); } else complete(m); return; }
      if (m.kind === "predict" && L.pred[m.id]) {
        const r = S.predictionResult(L, m);
        if (r && r.ready) { if (r.ok) complete(m); else if (!ui.predShown) { ui.predShown = true; paintMission(); G.sfx.hmph && G.sfx.hmph(0.5); say("הממ, לא מה שחשבנו.", 1.8); } return; }
        ui.predShown = false;
      }
      if (m.kind === "numeric" && m.confirm && L.confirm && L.confirm[m.id] !== undefined) { const r = S.confirmResult(L, m); if (r && r.ok) complete(m); return; }
      const g = S.gateOk(L, m);
      if (force || g !== lastGate) paintMission();
    }
    function complete(m) {
      const first = !isDone(m.id);
      ui.replay = false; ui.then = false;
      if (first) { st().completed.push(m.id); L.completed = st().completed; P.save(); }
      const r = cv.getBoundingClientRect(), from = { x: r.left + r.width / 2, y: r.top + r.height * 0.4 };
      if (first) reward("ramp:" + m.id, MISSION_COINS, from);
      G.sfx.harp && G.sfx.harp(); G.buzz && G.buzz(30);
      toast(m, first);
      say(["יש!", "גילינו!", "אני גאה בנו.", "פיזיקה!"][Math.floor(Math.random() * 4)], 1.6);
      paintBar();
      const allDone = sc.missions.every((x) => isDone(x.id));
      if (first && allDone) later(() => sceneComplete(), 1600);
      const n = sc.missions.findIndex((x) => !isDone(x.id));
      if (n >= 0 && first) later(() => selectMission(n), 1400); else paintMission();
    }
    function toast(m, first) {
      const t = $("#toast");
      t.innerHTML = `<b>${first ? `<span class="coin"></span> +${MISSION_COINS} · ` : ""}גילית</b><p>${esc(m.learn)}</p>
        <div class="tmeters"><span>${esc("מישור משופע")}</span><span class="meter thin violet"><i style="width:${Math.max(2, K.familyCoverage("newton") * 100)}%"></i></span><span>כללי</span><span class="meter thin teal"><i style="width:${Math.max(2, K.overallCoverage() * 100)}%"></i></span></div>`;
      t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 6500);
      t.onclick = () => { t.hidden = true; };
    }
    function sceneComplete() {
      const r = cv.getBoundingClientRect();
      reward("ramp:" + sc.id, SCENE_BONUS, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
      const fam = K.familyCoverage("newton"), all = K.overallCoverage();
      const nextSc = S.SCENES.find((x) => sceneDone(x) < 5 && S.unlocked(x.tier, st().completed));
      sheet(`<div class="gain"><span class="coin"></span> +${SCENE_BONUS}</div><h3>${esc(sc.title)}: כל 5 המשימות!</h3>
        <p class="insight">${esc(sc.desc)}</p>
        <div style="display:grid;gap:12px;margin-top:10px">
          <div><div class="meter-label"><span>מישור משופע וחיכוך</span><span class="ltr">${K.pct(fam)}</span></div><span class="meter violet"><i data-w="${fam}"></i></span></div>
          <div><div class="meter-label"><span>התקדמות כללית בפיזיקה</span><span class="ltr">${K.pct(all)}</span></div><span class="meter teal"><i data-w="${all}"></i></span></div>
        </div>
        <div class="actions"><button class="btn secondary" type="button" data-close>להישאר ולשחק</button>${nextSc ? `<button class="btn primary" type="button" id="goNext">ל${esc(nextSc.title)}</button>` : ""}</div>`);
      document.querySelector("#goNext")?.addEventListener("click", () => { document.querySelector(".sheet-back")?.remove(); show("rscene", { id: nextSc.id }, false); });
    }

    // ---------------- direction glyphs (for the force-diagram buttons) ----------------
    function dirGlyph(o) {
      const th = (L.P.th !== undefined ? L.P.th : L.P.thA || 30) * Math.PI / 180, c = Math.cos(th), s = Math.sin(th);
      const V = { down: [0, 1], up: [0, -1], out: [-s, -c], into: [s, c], upslope: [c, -s], downslope: [-c, s], against: [-1, 0], with: [1, 0], tpulley: [c, -s] }[o];
      if (!V) return `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M13 27L27 13" stroke="currentColor" stroke-width="2.4"/></svg>`;
      const x2 = 20 + V[0] * 13, y2 = 20 + V[1] * 13, x1 = 20 - V[0] * 9, y1 = 20 - V[1] * 9, a = Math.atan2(V[1], V[0]);
      const h = (d) => `${x2 - 7 * Math.cos(a + d)},${y2 - 7 * Math.sin(a + d)}`;
      const slope = ["out", "into", "upslope", "downslope"].includes(o) ? `<path d="M${20 - c * 16} ${20 + s * 16}L${20 + c * 16} ${20 - s * 16}" stroke="#C9CCD2" stroke-width="2"/>` : "";
      return `<svg viewBox="0 0 40 40" aria-hidden="true">${slope}<path d="M${x1} ${y1}L${x2} ${y2}" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M${x2} ${y2}L${h(0.5)}L${h(-0.5)}z" fill="currentColor"/></svg>`;
    }

    // ---------------- measurements table ----------------
    function paintMeas() {
      const el = $("#meas");
      if (sc.secret) {
        const ms = S.runs(L).filter((r) => r.meas);
        el.hidden = false;
        el.innerHTML = `<div class="meter-label"><span>✉️ המעבדה הסודית · μk במעטפה</span><span class="ltr">${ms.length} מדידות</span></div>
          <table class="cmp ltr"><tr><th>θ</th><th>sinθ</th><th>cosθ</th><th>|a| ±2%</th></tr>${ms.slice(-6).map((r) => `<tr><td>${fmt(r.P.th, 0)}°</td><td>${fmt(Math.sin(r.P.th * Math.PI / 180), 3)}</td><td>${fmt(Math.cos(r.P.th * Math.PI / 180), 3)}</td><td>${fmt(Math.abs(r.meas.a), 2)} ± ${fmt(Math.abs(r.meas.a) * 0.02, 2)}</td></tr>`).join("")}</table>
          <p class="fine">הרעש הוא חלק מהניסוי: כל מדידה נותנת תחום. μk = (sinθ − |a|/g) / cosθ, g = 10.</p>
          ${isDone("S17-M05") ? `<p class="learn">המעטפה: μk = ${fmt(L.secret.muK, 2)}</p>` : ""}`;
        return;
      }
      if (!sc.measure) return;
      const ms = L.meas || [];
      el.hidden = !ms.length;
      if (sc.id === "S18") el.innerHTML = `<div class="meter-label"><span>📌 מדידות (תצורה ג)</span></div><table class="cmp ltr"><tr><th>F (N)</th><th>מצב</th><th>f (N, + במעלה)</th></tr>${ms.filter((r) => r.phase === "C").slice(-6).map((r) => `<tr><td>${fmt(r.F, 1)}</td><td>${r.mode === "static" ? "מנוחה" : "תנועה"}</td><td>${fmt(r.f, 2)}</td></tr>`).join("")}</table>`;
      else el.innerHTML = `<div class="meter-label"><span>📌 מדידות</span></div><table class="cmp ltr"><tr><th>F</th><th>β</th><th>N</th><th>a</th></tr>${ms.slice(-6).map((r) => `<tr><td>${fmt(r.F, 1)}</td><td>${fmt(r.beta, 0)}°</td><td>${r.lost ? "0 (ניתוק)" : fmt(r.N, 1)}</td><td>${r.mode === "static" ? "0 (מנוחה)" : fmt(r.a, 2)}</td></tr>`).join("")}</table>`;
    }

    // ======================================================================
    //  DRAWING
    // ======================================================================
    const vis = () => clamp(prof().height_m * 1.6, 0.42, 0.85);
    const sx = (x) => cam.ox + x * cam.S, sy = (y) => cam.oy - y * cam.S;
    function fit(x0, x1, y0, y1, follow) {
      let S_ = Math.min(W / (x1 - x0), (H - 50) / (y1 - y0));
      let ox = W / 2 - S_ * (x0 + x1) / 2, oy = (H - 40) / 2 + S_ * (y0 + y1) / 2 + 4;
      if (follow) { const Sf = Math.min(W / 5.2, (H - 50) / 3.2); if (Sf > S_) { S_ = Sf; ox = W / 2 - S_ * follow.x; oy = H * 0.58 + S_ * follow.y; } }
      cam = { S: S_, ox, oy };
    }
    function pencilLine(x0, y0, x1, y1, w = 2, col = "#2e2e33") { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
    function hatchPoly(pts, alpha = 0.18) {
      ctx.save(); ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(sx(x), sy(y)) : ctx.moveTo(sx(x), sy(y)))); ctx.closePath();
      ctx.fillStyle = "rgba(107,107,112,0.06)"; ctx.fill(); ctx.clip();
      ctx.strokeStyle = `rgba(58,58,64,${alpha})`; ctx.lineWidth = 1; for (let i = -900; i < 1400; i += 11) { ctx.beginPath(); ctx.moveTo(i, H); ctx.lineTo(i + H, 0); ctx.stroke(); }
      ctx.restore();
    }
    function plank(a, b, tint, w) {
      ctx.strokeStyle = tint; ctx.lineWidth = Math.max(5, w || cam.S * 0.05); ctx.beginPath(); ctx.moveTo(sx(a[0]), sy(a[1])); ctx.lineTo(sx(b[0]), sy(b[1])); ctx.stroke();
      pencilLine(sx(a[0]), sy(a[1]), sx(b[0]), sy(b[1]), 1.6);
    }
    // the creature: feet at (x, y) on a surface of angle ang (rad, CCW from +x in world)
    function creature(x, y, ang, strain, scaleY = 1) {
      if (!(img.complete && img.naturalWidth)) return;
      const hv = vis() * cam.S, w = hv * img.naturalWidth / img.naturalHeight;
      const jx = strain && !reduceMotion ? (Math.random() - 0.5) * 1.2 : 0;
      ctx.save(); ctx.translate(sx(x) + jx, sy(y)); ctx.rotate(-ang); ctx.scale(1, scaleY); ctx.drawImage(img, -w / 2, -hv, w, hv); ctx.restore();
    }
    function drawBox(x, y, ang, kg, label) {
      const sz = 0.34 * cam.S;
      ctx.save(); ctx.translate(sx(x), sy(y)); ctx.rotate(-ang);
      ctx.fillStyle = "#F5F1E8"; ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(-sz / 2, -sz, sz, sz); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#20232A"; ctx.font = "700 12px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.direction = "ltr";
      ctx.fillText(label || fmt(kg, 1) + " kg", 0, -sz / 2); ctx.restore();
    }
    // world vector → screen arrow
    const arr = (o, v, k, color, label, opts = {}) => forceArrow(ctx, o.x, o.y, v[0] * k, -v[1] * k, color, label, opts);
    const kScale = () => Math.min(95 / (mc() * 10), 4.2) * (cam.S / 90);
    function banner(text, color = "#E2574C") {
      ctx.save(); ctx.font = "700 14px " + FONT; ctx.direction = "rtl"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const tw = ctx.measureText(text).width + 24; ctx.fillStyle = "rgba(255,255,255,0.95)"; ctx.strokeStyle = color; ctx.lineWidth = 2;
      const by = H - 104; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(W / 2 - tw / 2, by, tw, 30, 12) : ctx.rect(W / 2 - tw / 2, by, tw, 30); ctx.fill(); ctx.stroke();
      ctx.fillStyle = color; ctx.fillText(text, W / 2, by + 15); ctx.restore(); ctx.direction = "ltr";
    }
    function labelAt(x, y, text, color = "#606671", align = "center") { ctx.save(); ctx.font = "600 12px " + FONT; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = "middle"; ctx.direction = "ltr"; ctx.fillText(text, x, y); ctx.restore(); }

    // ---------- ramp (one body; S01–S08, S13–S17, S18 a/c) ----------
    function drawRamp(sim, R) {
      const p = sim.p, th = p.angleDeg * Math.PI / 180, c = Math.cos(th), s = Math.sin(th), Lr = sim.hi, long = Lr > 6;
      const pt = (d) => [d * c, d * s];
      const body = pt(sim.s);
      fit(-0.7, Lr * c + 0.7, -0.25, Lr * s + 1.1, long ? { x: body[0], y: body[1] + 0.3 } : null);
      // ground and support
      pencilLine(0, sy(0), W, sy(0), 2.2);
      hatchPoly([[0, 0], [Lr * c, 0], [Lr * c, Lr * s]]);
      pencilLine(sx(Lr * c), sy(0), sx(Lr * c), sy(Lr * s), 2);
      // the surface strip
      const tint = sc.surface === "secret" ? "#9C8FB8" : L.P.mat ? S.MATS[L.P.mat].tint : (S.MATS[sc.surface] || S.MATS.wood).tint;
      plank([0, 0], pt(Lr), tint);
      if (sc.brakeBtn && p.brake && p.brake.on && sim.s < Lr) { ctx.save(); ctx.globalAlpha = 0.85; plank(pt(Math.max(p.sMin || 0, sim.s - 0.4)), pt(Math.min(Lr, sim.s + 0.4)), "#E2574C", cam.S * 0.07); ctx.restore(); }
      // θ arc
      ctx.strokeStyle = "#E39B28"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx(0), sy(0), 40, -th, 0); ctx.stroke();
      labelAt(sx(0) + 58, sy(0) - 12, "θ = " + fmt(p.angleDeg, Number.isInteger(p.angleDeg) ? 0 : 1) + "°", "#B8741A", "left");
      // end stops, finish, rock, spring
      if (sc.finish) { const [fx, fy] = pt(0.02); ctx.fillStyle = "#20232A"; for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) if ((i + j) % 2 === 0) ctx.fillRect(sx(fx) - 8 + j * 6, sy(fy) - 34 + i * 6, 6, 6); pencilLine(sx(fx) - 8, sy(fy), sx(fx) - 8, sy(fy) - 36, 1.6); labelAt(sx(fx) + 4, sy(fy) - 44, "סיום", "#20232A"); }
      if (sc.obstacle) { const [rx, ry] = pt(p.sMin); ctx.fillStyle = "#8C8C92"; ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(sx(rx) - 0.12 * cam.S * c, sy(ry) - 0.14 * cam.S, 0.2 * cam.S, 0.15 * cam.S, -th, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); labelAt(sx(rx), sy(ry) - 0.38 * cam.S, "סלע", "#20232A"); }
      if (p.spring) {
        const x = R.x || 0, a0 = pt(0), a1 = pt(p.spring.at - x), n = 9, nx = -s, ny = c, amp = 0.07;
        pencilLine(sx(a0[0]) - 2, sy(a0[1]) + 4, sx(a0[0]) - 2 - nx * 0.4 * cam.S, sy(a0[1]) - ny * 0.4 * cam.S, 4, "#2e2e33");
        ctx.strokeStyle = COL.k; ctx.lineWidth = 2.6; ctx.beginPath();
        for (let i = 0; i <= n * 2; i++) { const f = i / (n * 2), bx = a0[0] + (a1[0] - a0[0]) * f, by = a0[1] + (a1[1] - a0[1]) * f, o = i === 0 || i === n * 2 ? 0 : (i % 2 ? amp : -amp); const X = bx + nx * (0.13 + o), Y = by + ny * (0.13 + o); i ? ctx.lineTo(sx(X), sy(Y)) : ctx.moveTo(sx(X), sy(Y)); }
        ctx.stroke();
        // ruler for the compression
        const r0 = pt(p.spring.at), r1 = pt(p.spring.at - x);
        ctx.save(); ctx.setLineDash([4, 4]); pencilLine(sx(r0[0] + nx * 0.3), sy(r0[1] + ny * 0.3), sx(r0[0] - nx * 0.05), sy(r0[1] - ny * 0.05), 1.2, "#606671"); ctx.restore();
        if (x > 0.002) labelAt(sx((r0[0] + r1[0]) / 2 + nx * 0.42), sy((r0[1] + r1[1]) / 2 + ny * 0.42), "x = " + fmt(x * 100, 1) + " cm", COL.k);
      }
      // peak markers (the experiment's own record and the player's prediction)
      const run = L.cur || L.runs[L.runs.length - 1];
      if (run && run.tPeak !== null && run.sPeak !== null && (sc.launch || sc.motor)) { const [px, py] = pt(run.sPeak); ctx.save(); ctx.setLineDash([3, 4]); pencilLine(sx(px - s * 0.05), sy(py + c * 0.05), sx(px - s * 0.6), sy(py + c * 0.6), 1.6, "#20232A"); ctx.restore(); labelAt(sx(px - s * 0.7), sy(py + c * 0.7), "שיא", "#20232A"); }
      // apparatus: motor, rope, angled rope, press
      const hv = vis(), feet = body, com = [body[0] - s * hv * 0.45, body[1] + c * hv * 0.45];
      const COM = { x: sx(com[0]), y: sy(com[1]) };
      if (sc.motor) {
        const top = pt(Lr), on = R.on !== false && R.F > 0;
        ctx.fillStyle = on ? "#FFE7CC" : "#ECEEF1"; ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 2; const mx = sx(top[0]) + 4, my = sy(top[1]) - 18;
        if (!long || Math.abs(sim.s - Lr) < 5) { ctx.beginPath(); ctx.rect(mx - 14, my - 10, 28, 20); ctx.fill(); ctx.stroke(); labelAt(mx, my - 20, on ? "מנוע" : "כבוי", on ? "#B8741A" : "#606671"); }
        if (on) { ctx.save(); ctx.strokeStyle = "#3a3a40"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(COM.x, COM.y); const far = pt(Math.min(Lr, sim.s + 8)); ctx.lineTo(sx(far[0] - s * hv * 0.45), sy(far[1] + c * hv * 0.45)); ctx.stroke(); ctx.restore(); }
      }
      if (sc.rope === "parallel" && L.P.F > 0) {
        const hand = pt(Math.min(Lr, sim.s + 1.25)), hx = sx(hand[0] - s * hv * 0.45), hy = sy(hand[1] + c * hv * 0.45);
        pencilLine(COM.x, COM.y, hx, hy, 1.8, "#3a3a40"); hand_(hx, hy);
      }
      if (sc.rope === "angled" && L.P.F > 0 && !sim.lost) {
        const b = (L.P.beta || 0) * Math.PI / 180, u = [c, s], n = [-s, c], dir = [u[0] * Math.cos(b) + n[0] * Math.sin(b), u[1] * Math.cos(b) + n[1] * Math.sin(b)];
        const hx = COM.x + dir[0] * 1.15 * cam.S, hy = COM.y - dir[1] * 1.15 * cam.S;
        pencilLine(COM.x, COM.y, hx, hy, 1.8, "#3a3a40"); hand_(hx, hy); grip = { x: hx, y: hy, cx: COM.x, cy: COM.y, u, n };
        ctx.save(); ctx.setLineDash([3, 4]); pencilLine(COM.x, COM.y, COM.x + u[0] * 0.8 * cam.S, COM.y - u[1] * 0.8 * cam.S, 1.2, "#9a9aa0"); ctx.restore();
        labelAt(COM.x + (u[0] + dir[0]) * 0.45 * cam.S, COM.y - (u[1] + dir[1]) * 0.45 * cam.S - 8, "β " + fmt(L.P.beta, 0) + "°", "#B8741A");
      }
      if (sc.press && L.P.Q > 0) {
        const n = [-s, c], top = [feet[0] + n[0] * (hv + 0.05), feet[1] + n[1] * (hv + 0.05)], len = 0.25 + Math.min(0.5, L.P.Q / (mc() * 10) * 0.25);
        const a = [top[0] + n[0] * len, top[1] + n[1] * len];
        pencilLine(sx(a[0]), sy(a[1]), sx(top[0]), sy(top[1]), 5, "#B8741A");
        ctx.save(); ctx.translate(sx(top[0]), sy(top[1])); ctx.rotate(-th); ctx.fillStyle = "#F5E6CC"; ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(-14, -6, 28, 8); ctx.fill(); ctx.stroke(); ctx.restore();
      }
      // the body
      const near = R.mode === "static" && R.maxS > 0 && Math.abs(R.f) / R.maxS > 0.85 && sim.s > 0;
      creature(feet[0], feet[1], th, near);
      if (sc.backpack && L.P.load > 0) { ctx.save(); ctx.fillStyle = "#6A5134"; ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 1.6; const bx = sx(feet[0] - s * hv * 0.55 + c * hv * 0.28), by = sy(feet[1] + c * hv * 0.55 + s * hv * 0.28); ctx.beginPath(); ctx.ellipse(bx, by, 11, 14, -th, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); labelAt(bx, by - 24, "+" + fmt(L.P.load, 1) + " kg", "#6A5134"); }
      // forces
      if (view !== "none" && !sim.lost) forcesSingle(COM, R, th, sim);
      if (sim.lost) banner("הדמות מתרוממת: N = 0. כאן נדרש מודל מעוף דו־ממדי, המסילה לא תקפה.");
      else if (R.mode === "wall") banner(sim.atEnd() === "bottom" && sc.obstacle ? "נעצר בסלע (לא חיכוך)" : "הגענו לקצה המסלול (לא חיכוך)", "#606671");
      if (sc.gauge && R.mode === "static" && R.maxS > 0) gauge(Math.abs(R.f), R.maxS);
      if (sc.energy) energyBars(sim.energy());
      if (sc.motor) timeline(sim);
      if (sc.secret) envelope();
      if (Math.abs(sim.v) > 0.02) labelAt(COM.x, COM.y - hv * cam.S * 0.75, "v = " + fmt(sim.v, 2) + " m/s", "#20232A");
    }
    let grip = null;
    function hand_(x, y) { ctx.save(); ctx.fillStyle = "#F7D9B5"; ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); }
    function forcesSingle(C, R, th, sim) {
      const c = Math.cos(th), s = Math.sin(th), u = [c, s], n = [-s, c], m = S.mOf(L), Wt = m * 10 * (sim.p.g ? sim.p.g / 10 : 1), k = kScale();
      const real = view === "real";
      arr(C, [0, -Wt], k, COL.g, "mg", { dash: !real, thin: !real, value: real ? Wt : undefined });
      arr(C, [n[0] * R.N, n[1] * R.N], k, COL.N, "N", { alpha: real ? 1 : 0.3, side: -1, value: real ? R.N : undefined });
      if (Math.abs(R.f) > 1e-3 && (R.mode === "static" || R.mode === "kinetic")) arr(C, [u[0] * R.f, u[1] * R.f], k, COL.f, R.mode === "static" ? "f_s" : "f_k", { alpha: real ? 1 : 0.3, side: 1, value: real ? Math.abs(R.f) : undefined });
      if (R.F > 0 && R.on !== false) { const b = (sim.p.beta || 0) * Math.PI / 180, d = [u[0] * Math.cos(b) + n[0] * Math.sin(b), u[1] * Math.cos(b) + n[1] * Math.sin(b)]; arr(C, [d[0] * R.F, d[1] * R.F], k, COL.F, "F", { alpha: real ? 1 : 0.3, side: -1, value: real ? R.F : undefined }); }
      if (R.Q > 0) arr(C, [-n[0] * R.Q, -n[1] * R.Q], k, COL.Q, "Q", { alpha: real ? 1 : 0.3, side: 1, value: real ? R.Q : undefined, dx: 18 });
      if (R.spring > 0) arr(C, [u[0] * R.spring, u[1] * R.spring], k, COL.k, "kx", { alpha: real ? 1 : 0.3, side: -1, value: real ? R.spring : undefined });
      if (!real) {
        arr(C, [-u[0] * Wt * s, -u[1] * Wt * s], k, COL.par, "mg sinθ", { side: 1, value: Wt * s });
        arr(C, [-n[0] * Wt * c, -n[1] * Wt * c], k, COL.perp, "mg cosθ", { side: -1, value: Wt * c });
      }
    }
    function gauge(f, max) {
      const r = Math.min(1, f / max), gx = 12, gy = H - 150, gw = 130;
      ctx.save(); ctx.fillStyle = "#606671"; ctx.font = "600 12px " + FONT; ctx.direction = "rtl"; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("חיכוך סטטי מתוך המרבי", gx, gy); ctx.direction = "ltr";
      ctx.fillStyle = "#ECEEF1"; ctx.fillRect(gx, gy + 18, gw, 9); ctx.fillStyle = r > 0.85 ? "#E2574C" : COL.f; ctx.fillRect(gx, gy + 18, gw * r, 9);
      ctx.fillStyle = "#20232A"; ctx.font = "700 12px " + FONT; ctx.fillText(fmt(f, 2) + " / " + fmt(max, 2) + " N", gx, gy + 31); ctx.restore();
    }
    function energyBars(e) {
      const tot = Math.max(1e-6, e.K + e.U + e.Es + e.Q), bw = 22, bh = Math.min(110, H * 0.3), x0 = 14, y0 = 52 + bh;
      const bars = [["U", e.U + e.Es, COL.g], ["K", e.K, COL.perp], ["חום", e.Q, "#E2574C"]];
      ctx.save(); bars.forEach(([lab, v, col], i) => {
        const h = bh * v / tot, x = x0 + i * (bw + 16);
        ctx.fillStyle = "#ECEEF1"; ctx.fillRect(x, y0 - bh, bw, bh); ctx.fillStyle = col; ctx.fillRect(x, y0 - h, bw, h);
        labelAt(x + bw / 2, y0 + 10, lab, "#20232A"); labelAt(x + bw / 2, y0 - bh - 9, fmt(v, 1) + " J", col);
      }); ctx.restore();
    }
    function timeline(sim) {
      const t = sim.t, tOff = sim.p.forceOffAt, span = Math.max(tOff * 2, t + 0.5), x0 = 70, x1 = Math.min(W * 0.45, 230), y = 22;
      ctx.save(); pencilLine(x0, y, x1, y, 2, "#C9CCD2");
      const xo = x0 + (x1 - x0) * tOff / span, xt = x0 + (x1 - x0) * Math.min(1, t / span);
      ctx.strokeStyle = "#E0702F"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(Math.min(xo, xt), y); ctx.stroke();
      pencilLine(xo, y - 7, xo, y + 7, 2, "#20232A"); labelAt(xo, y + 15, "כיבוי " + fmt(tOff, 1) + " s", "#20232A");
      ctx.fillStyle = "#20232A"; ctx.beginPath(); ctx.arc(xt, y, 4, 0, Math.PI * 2); ctx.fill(); labelAt(x0 - 6, y, "t = " + fmt(t, 1) + " s", "#20232A", "right"); ctx.restore();
    }
    function envelope() {
      const x = 14, y = 16; ctx.save(); ctx.fillStyle = "#FFF8E8"; ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(x, y, 56, 38); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 28, y + 20); ctx.lineTo(x + 56, y); ctx.stroke(); ctx.restore();
      labelAt(x + 28, y + 50, isDone("S17-M05") ? "μk = " + fmt(L.secret.muK, 2) : "μk = ?", "#8A60E8");
    }

    // ---------- track (S09) ----------
    function drawTrack(sim, R) {
      const segs = sim.p.segments, pts = [[0, 0]];
      for (const sg of segs) { const a = sg.angleDeg * Math.PI / 180, l = pts[pts.length - 1]; pts.push([l[0] + sg.length * Math.cos(a), l[1] - sg.length * Math.sin(a)]); }
      const minY = Math.min(...pts.map((p) => p[1])); pts.forEach((p) => (p[1] -= minY));
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      fit(Math.min(...xs) - 0.5, Math.max(...xs) + 0.5, -0.2, Math.max(...ys) + 1.0);
      pencilLine(0, sy(0), W, sy(0), 2.2);
      hatchPoly([[pts[0][0], 0], ...pts, [pts[pts.length - 1][0], 0]], 0.12);
      const cur = R.seg;
      segs.forEach((sg, i) => { plank(pts[i], pts[i + 1], i === 1 ? S.MATS[L.P.mat].tint : "#B58A55"); if (i === cur && Math.abs(sim.v) > 0.01) { ctx.save(); ctx.globalAlpha = 0.25; plank(pts[i], pts[i + 1], "#8A60E8", cam.S * 0.11); ctx.restore(); } labelAt(sx((pts[i][0] + pts[i + 1][0]) / 2), sy((pts[i][1] + pts[i + 1][1]) / 2) + 18, `${i + 1}: μk ${fmt(sg.muK, 2)}`, "#606671"); });
      for (let i = 1; i < pts.length - 1; i++) { ctx.fillStyle = "#fff"; ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(sx(pts[i][0]), sy(pts[i][1]), 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      // position along the path
      let d = sim.s, i = 0; while (i < segs.length - 1 && d > segs[i].length) { d -= segs[i].length; i++; }
      const a = -segs[i].angleDeg * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a), fx = pts[i][0] + d * ux, fy = pts[i][1] + d * uy;
      creature(fx, fy, a, false);
      const hv = vis(), C = { x: sx(fx - uy * hv * 0.45), y: sy(fy + ux * hv * 0.45) }, n = [-uy, ux], m = S.mOf(L), k = kScale();
      if (view !== "none") {
        arr(C, [0, -m * 10], k, COL.g, "mg", { value: view === "real" ? m * 10 : undefined });
        arr(C, [n[0] * R.N, n[1] * R.N], k, COL.N, "N", { side: -1, value: view === "real" ? R.N : undefined });
        if (Math.abs(R.f) > 1e-3 && R.mode !== "wall") arr(C, [ux * R.f, uy * R.f], k, COL.f, R.mode === "static" ? "f_s" : "f_k", { side: 1, value: view === "real" ? Math.abs(R.f) : undefined });
      }
      if (R.mode === "wall" || (sim.stopped && sim.stopped.barrier)) banner(sim.s >= sim.hi - 1e-6 ? "הגיעה לקצה הקטע השלישי!" : "נעצרה בתחילת המסלול", "#606671");
      else if (!L.running && L.runs.length && L.runs[L.runs.length - 1].settled && L.runs[L.runs.length - 1].barrier !== "top") banner("נעצרה בדרך: החיכוך עצר אותה", "#606671");
      labelAt(W - 12, 18, "חיבורים מעוגלים, בלי איבוד בפנייה", "#606671", "right");
      if (Math.abs(sim.v) > 0.02) labelAt(C.x, C.y - hv * cam.S * 0.75, "v = " + fmt(sim.v, 2) + " m/s", "#20232A");
    }

    // ---------- hanging pulley (S10, S18 b) ----------
    function drawHang(sim, R) {
      const p = sim.p, th = p.angleDeg * Math.PI / 180, c = Math.cos(th), s = Math.sin(th), Lh = 2.6, base = 1.5, s0 = 1.3;
      const pt = (d) => [d * c, base + d * s];
      const top = pt(Lh), pul = [top[0] + 0.12 * -s + 0.1, top[1] + 0.12 * c];
      fit(-0.5, top[0] + 0.9, -0.1, Math.max(top[1], pul[1]) + 0.8);
      pencilLine(0, sy(0), W, sy(0), 2.2);
      hatchPoly([[-0.2, 0], [-0.2, base], [0, base], [top[0], top[1]], [top[0], 0]], 0.12);
      pencilLine(sx(top[0]), sy(0), sx(top[0]), sy(top[1]), 2);
      plank(pt(0), top, (S.MATS.wood).tint);
      ctx.fillStyle = "#fff"; ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(sx(pul[0]), sy(pul[1]), 0.1 * cam.S, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      const dA = s0 + sim.s, feet = pt(dA), hv = vis(), att = [feet[0] - s * hv * 0.4, feet[1] + c * hv * 0.4];
      const ropeTop = [pul[0], pul[1] + 0.1], Bt = [pul[0] + 0.1, pul[1] - 0.55 - sim.s];
      pencilLine(sx(att[0]), sy(att[1]), sx(pul[0] - 0.02), sy(pul[1] + 0.1), 1.8, "#3a3a40");
      pencilLine(sx(pul[0] + 0.1), sy(pul[1]), sx(Bt[0]), sy(Bt[1]), 1.8, "#3a3a40");
      creature(feet[0], feet[1], th, false);
      drawBox(Bt[0], Bt[1] - 0.34, 0, p.mB);
      const C = { x: sx(feet[0] - s * hv * 0.45), y: sy(feet[1] + c * hv * 0.45) }, CB = { x: sx(Bt[0]), y: sy(Bt[1] - 0.17) }, k = kScale(), T = sim.tension(), u = [c, s], n = [-s, c];
      if (view !== "none") {
        arr(C, [0, -p.mA * 10], k, COL.g, "mg", { value: view === "real" ? p.mA * 10 : undefined });
        arr(C, [n[0] * R.N, n[1] * R.N], k, COL.N, "N", { side: -1, value: view === "real" ? R.N : undefined });
        arr(C, [u[0] * T, u[1] * T], k, COL.T, "T", { side: 1, value: view === "real" ? T : undefined, dy: -14 });
        if (Math.abs(R.f) > 1e-3 && R.mode !== "wall") arr(C, [u[0] * R.f, u[1] * R.f], k, COL.f, R.mode === "static" ? "f_s" : "f_k", { side: 1, value: view === "real" ? Math.abs(R.f) : undefined, dy: 14 });
        arr(CB, [0, -p.mB * 10], k, COL.g, "m_B g", { value: view === "real" ? p.mB * 10 : undefined, side: 1 });
        arr(CB, [0, T], k, COL.T, "T", { value: view === "real" ? T : undefined, side: -1 });
      }
      if (R.mode === "wall") banner("הגענו לקצה המסלול (לא חיכוך)", "#606671");
      if (Math.abs(sim.v) > 0.02) labelAt(W / 2, H - 56, "|v| = " + fmt(Math.abs(sim.v), 2) + " m/s · |a| = " + fmt(Math.abs(R.a), 2) + " m/s²", "#20232A");
    }

    // ---------- two ramps and a pulley on the peak (S11) ----------
    function drawDouble(sim, R) {
      const p = sim.p, tA = p.angleA * Math.PI / 180, tB = p.angleB * Math.PI / 180, len = 2.6, Hp = len * Math.max(Math.sin(tA), Math.sin(tB)) + 0.1;
      const peak = [0, Hp], pA = (d) => [-d * Math.cos(tA), Hp - d * Math.sin(tA)], pB = (d) => [d * Math.cos(tB), Hp - d * Math.sin(tB)];
      const eA = pA(len), eB = pB(len);
      fit(eA[0] - 0.5, eB[0] + 0.5, -0.2, Hp + 0.9);
      pencilLine(0, sy(0), W, sy(0), 2.2);
      hatchPoly([[eA[0], 0], eA, peak, eB, [eB[0], 0]], 0.12);
      pencilLine(sx(eA[0]), sy(0), sx(eA[0]), sy(eA[1]), 2); pencilLine(sx(eB[0]), sy(0), sx(eB[0]), sy(eB[1]), 2);
      plank(eA, peak, S.MATS.wood.tint); plank(peak, eB, S.MATS.wood.tint);
      ctx.fillStyle = "#fff"; ctx.strokeStyle = "#2e2e33"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(sx(0), sy(Hp + 0.1), 0.1 * cam.S, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      const dA = 1.3 - sim.s, dB = 1.3 + sim.s, fA = pA(dA), fB = pB(dB), hv = vis();
      const nA = [-Math.sin(tA), Math.cos(tA)], nB = [Math.sin(tB), Math.cos(tB)], uA = [Math.cos(tA), Math.sin(tA)], uB = [-Math.cos(tB), Math.sin(tB)];
      const attA = [fA[0] + nA[0] * hv * 0.4, fA[1] + nA[1] * hv * 0.4], attB = [fB[0] + nB[0] * 0.17, fB[1] + nB[1] * 0.17];
      pencilLine(sx(attA[0]), sy(attA[1]), sx(-0.05), sy(Hp + 0.2), 1.8, "#3a3a40"); pencilLine(sx(0.05), sy(Hp + 0.2), sx(attB[0]), sy(attB[1]), 1.8, "#3a3a40");
      creature(fA[0], fA[1], tA, false);
      drawBox(fB[0], fB[1], -tB, p.mB);
      const sp = sim.split(), k = kScale(), CA = { x: sx(fA[0] + nA[0] * hv * 0.45), y: sy(fA[1] + nA[1] * hv * 0.45) }, CB = { x: sx(attB[0]), y: sy(attB[1]) };
      if (view !== "none") {
        arr(CA, [0, -p.mA * 10], k, COL.g, "mg", { value: view === "real" ? p.mA * 10 : undefined });
        arr(CA, [nA[0] * R.NA, nA[1] * R.NA], k, COL.N, "N", { side: -1, value: view === "real" ? R.NA : undefined });
        arr(CA, [uA[0] * sp.T, uA[1] * sp.T], k, COL.T, "T", { side: 1, dy: -14, value: view === "real" ? sp.T : undefined });
        if (Math.abs(sp.fA) > 1e-3) arr(CA, [uA[0] * sp.fA, uA[1] * sp.fA], k, COL.f, "f", { side: 1, dy: 14, value: view === "real" ? Math.abs(sp.fA) : undefined });
        arr(CB, [0, -p.mB * 10], k, COL.g, "m_B g", { value: view === "real" ? p.mB * 10 : undefined });
        arr(CB, [nB[0] * R.NB, nB[1] * R.NB], k, COL.N, "N_B", { side: 1, value: view === "real" ? R.NB : undefined });
        arr(CB, [uB[0] * sp.T, uB[1] * sp.T], k, COL.T, "T", { side: -1, dy: -14, value: view === "real" ? sp.T : undefined });
        if (Math.abs(sp.fB) > 1e-3) arr(CB, [-uB[0] * sp.fB, -uB[1] * sp.fB], k, COL.f, "f_B", { side: -1, dy: 14, value: view === "real" ? Math.abs(sp.fB) : undefined });
      }
      labelAt(sx(eA[0] * 0.55) , sy(0) - 14, "θA " + fmt(p.angleA, 0) + "°", "#B8741A"); labelAt(sx(eB[0] * 0.55), sy(0) - 14, "θB " + fmt(p.angleB, 0) + "°", "#B8741A");
      if (R.mode === "static") labelAt(W / 2, H - 70, "מנוחה: החיכוך הסטטי מחולק בין שני הצדדים לפי המקסימום של כל צד (הנחת מודל)", "#606671");
      if (R.mode === "wall") banner("הגענו לקצה (לא חיכוך)", "#606671");
    }

    // ---------- two bodies on one ramp (S12) ----------
    function drawLinked(sim) {
      const th = sim.p.angleDeg * Math.PI / 180, c = Math.cos(th), s = Math.sin(th), Lr = sim.L + 0.3;
      const pt = (x) => { const d = Lr - x; return [d * c, d * s]; };
      fit(-0.5, Lr * c + 0.5, -0.2, Lr * s + 0.9);
      pencilLine(0, sy(0), W, sy(0), 2.2); hatchPoly([[0, 0], [Lr * c, 0], [Lr * c, Lr * s]]); pencilLine(sx(Lr * c), sy(0), sx(Lr * c), sy(Lr * s), 2);
      const mid = Lr - (sim.xUp + sim.xDn) / 2;
      plank([0, 0], pt(Lr - mid), S.MATS[L.P.swap ? L.P.matA : L.P.matB].tint); plank(pt(Lr - mid), pt(0), S.MATS[L.P.swap ? L.P.matB : L.P.matA].tint);
      const fu = pt(sim.xUp), fd = pt(sim.xDn), hv = vis(), n = [-s, c], u = [c, s];
      const upIsA = !L.P.swap, gap = sim.xDn - sim.xUp;
      const a1 = [fu[0] - u[0] * 0.12 + n[0] * 0.15, fu[1] - u[1] * 0.12 + n[1] * 0.15], a2 = [fd[0] + u[0] * 0.17 + n[0] * 0.15, fd[1] + u[1] * 0.17 + n[1] * 0.15];
      ctx.strokeStyle = "#3a3a40"; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(sx(a1[0]), sy(a1[1]));
      const sag = Math.max(0, sim.rope - gap) * 0.5; ctx.quadraticCurveTo(sx((a1[0] + a2[0]) / 2 - n[0] * sag), sy((a1[1] + a2[1]) / 2 - n[1] * sag), sx(a2[0]), sy(a2[1])); ctx.stroke();
      if (upIsA) { creature(fu[0], fu[1], th, false); drawBox(fd[0], fd[1], th, sim.p.B.m); } else { drawBox(fu[0], fu[1], th, sim.p.B.m); creature(fd[0], fd[1], th, false); }
      const S_ = sim.state(), k = kScale();
      if (view !== "none" && S_.kind !== "slack") {
        const Cu = { x: sx(fu[0] + n[0] * 0.2), y: sy(fu[1] + n[1] * 0.2) }, Cd = { x: sx(fd[0] + n[0] * 0.2), y: sy(fd[1] + n[1] * 0.2) };
        if (S_.T > 1e-3) { arr(Cu, [-u[0] * S_.T, -u[1] * S_.T], k, COL.T, "T", { side: 1, value: view === "real" ? S_.T : undefined }); arr(Cd, [u[0] * S_.T, u[1] * S_.T], k, COL.T, "T", { side: 1, value: view === "real" ? S_.T : undefined }); }
        else if (S_.T < -1e-3) { arr(Cu, [-u[0] * -S_.T, -u[1] * -S_.T], k, COL.N, "מגע", { side: 1 }); }
      }
      banner(S_.kind === "slack" ? "החבל רפוי: חבל לא דוחף" : S_.kind === "contact" ? "הגופים נוגעים: דחיפה במגע" : "החבל מתוח", S_.kind === "taut" ? "#3A9E6E" : "#B8741A");
      if (Math.abs(sim.vUp) > 0.02) labelAt(W / 2, H - 56, "v = " + fmt(sim.vUp, 2) + " · " + fmt(sim.vDn, 2) + " m/s", "#20232A");
    }

    function draw() {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H);
      ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.direction = "ltr"; grip = null;
      const sim = L.sim; if (!sim) return;
      if (sim.xUp !== undefined) { drawLinked(sim); return; }
      const R = sim.resolve();
      if (sim.kind === "piecewise") drawTrack(sim, R);
      else if (sim.kind === "hanging") drawHang(sim, R);
      else if (sim.kind === "double") drawDouble(sim, R);
      else drawRamp(sim, R);
    }

    // dragging the rope handle sets β (S06)
    let dragging = false;
    cv.addEventListener("pointerdown", (e) => {
      if (isSheetOpen() || !grip) return;
      const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      if (Math.hypot(px - grip.x, py - grip.y) < 36) { dragging = true; cv.setPointerCapture(e.pointerId); G.audio.unlock(); }
    });
    cv.addEventListener("pointermove", (e) => {
      if (!dragging || !grip) return;
      const r = cv.getBoundingClientRect(), dx = e.clientX - r.left - grip.cx, dy = -(e.clientY - r.top - grip.cy);
      const along = dx * grip.u[0] + dy * grip.u[1], out = dx * grip.n[0] + dy * grip.n[1];
      setP("beta", clamp(Math.round(Math.atan2(out, along) * 180 / Math.PI), 0, 80));
    });
    const up = () => { if (dragging) { dragging = false; saveParams(); } };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);

    // ---------------- readouts ----------------
    function readouts() {
      const sim = L.sim; if (!sim) return [];
      if (sim.xUp !== undefined) { const S_ = sim.state(); return [["מצב החבל", S_.kind === "taut" ? "מתוח" : S_.kind === "slack" ? "רפוי" : "מגע"], ["תאוצה a", S_.kind === "slack" ? fmt(S_.aUp, 2) + " · " + fmt(S_.aDn, 2) : fmt(S_.a, 2) + " m/s²"], ["מתיחות T", fmt(Math.max(0, S_.T || 0), 2) + " N"], ["מהירות", fmt(sim.vUp, 2) + " m/s"]]; }
      const R = sim.resolve(), fl = R.mode === "static" ? "f_s " : R.mode === "kinetic" ? "f_k " : "";
      const fTxt = R.mode === "lost" ? "אין מגע" : R.mode === "wall" ? "קצה" : fl + fmt(Math.abs(R.f || 0), 2) + " N";
      if (sim.kind === "hanging") return [["תאוצה a", fmt(R.a, 2) + " m/s²"], ["מתיחות T", fmt(sim.tension(), 2) + " N"], ["חיכוך", fTxt], ["מהירות", fmt(sim.v, 2) + " m/s"]];
      if (sim.kind === "double") return [["תאוצה a", fmt(R.a, 2) + " m/s²"], ["מתיחות T", fmt(sim.split().T, 2) + " N"], ["חיכוך", fTxt], ["מהירות", fmt(sim.v, 2) + " m/s"]];
      if (sc.energy) { const e = sim.energy(); return [["גובה", fmt(sim.s * Math.sin(sim.p.angleDeg * Math.PI / 180), 2) + " m"], ["מהירות", fmt(sim.v, 2) + " m/s"], ["חום", fmt(e.Q, 2) + " J"], ["אנרגיה כוללת", fmt(e.K + e.U + e.Es + e.Q, 2) + " J"]]; }
      return [["נורמל N", R.mode === "lost" ? "0" : fmt(R.N, 2) + " N"], ["חיכוך", fTxt], ["תאוצה a", R.mode === "lost" ? "–" : fmt(R.a, 2) + " m/s²"], [sc.spring ? "דחיסה x" : "מהירות", sc.spring ? fmt((R.x || 0) * 100, 1) + " cm" : fmt(sim.v, 2) + " m/s"]];
    }
    function paintReadouts() {
      const rs = readouts();
      $("#readouts").innerHTML = rs.map(([a, b]) => `<div class="readout"><small>${esc(a)}</small><b>${esc(b)}</b></div>`).join("");
      // a text description for screen readers: what the forces are doing
      const sim = L.sim; if (!sim || sim.xUp !== undefined) return;
      const R = sim.resolve(), dir = (x) => (x > 0 ? "במעלה" : "במורד");
      const t = R.mode === "lost" ? "אין מגע עם המשטח." : R.mode === "static" ? `במנוחה. חיכוך סטטי ${fmt(Math.abs(R.f), 1)} ניוטון ${R.f ? dir(R.f) : ""}.` : R.mode === "wall" ? "עומד בקצה המסלול." : `בתנועה ${dir(sim.v || R.a)}. חיכוך קינטי ${fmt(Math.abs(R.f), 1)} ניוטון ${dir(R.f)}, תאוצה ${fmt(R.a, 2)}.`;
      if ($("#srText").textContent !== t) $("#srText").textContent = t;
    }

    // ---------------- graphs (from the same samples that moved the creature) ----------------
    const GKINDS = () => {
      const base = L.sim && L.sim.xUp !== undefined ? [["v", "v(t)"], ["a", "a(t)"], ["T", "T(t)"]] : [["x", "x(t)"], ["v", "v(t)"], ["a", "a(t)"], ["f", "כוחות(t)"], ["E", "אנרגיה(t)"]];
      if (sc.rig === "track") base.unshift(["ax", "a(x)"]);
      if (sc.spring) base.unshift(["Fx", "F(x)"]);
      return base;
    };
    function paintGraphSeg() {
      const ks = GKINDS(); if (!ks.some((k) => k[0] === graphKind)) graphKind = ks[0][0];
      $("#gseg").innerHTML = ks.map(([k, he]) => `<button type="button" data-g="${k}" aria-pressed="${graphKind === k}">${he}</button>`).join("");
      for (const b of $("#gseg").querySelectorAll("[data-g]")) b.addEventListener("click", () => { graphKind = b.dataset.g; paintGraphSeg(); G.sfx.pop(); });
    }
    function sample() {
      const sim = L.sim; if (!sim) return;
      if (L.cur && histRun !== L.cur.id && !S.isLive(L)) { hist.length = 0; histRun = L.cur.id; }
      if (sim.xUp !== undefined) { const S_ = sim.state(); hist.push({ t: sim.t, v: sim.vUp, a: S_.kind === "slack" ? S_.aUp : S_.a, T: Math.max(0, S_.T || 0) }); }
      else {
        const R = sim.resolve(), e = sim.energy ? sim.energy() : { K: 0, U: 0, Es: 0, Q: 0 };
        hist.push({ t: sim.t, x: sim.s, v: sim.v, a: R.a || 0, f: R.f || 0, F: (R.on === false ? 0 : R.Fpar || 0), N: R.N || 0, T: sim.tension ? sim.tension() : 0, K: e.K, U: e.U + e.Es, Q: e.Q, xs: R.x || 0, Fs: R.spring || 0 });
      }
      if (hist.length > 3000) hist.splice(0, hist.length - 3000);
    }
    function paintGraph() {
      if (!graphOpen) return;
      const w = gcv.width / DPR, h = gcv.height / DPR; gctx.setTransform(DPR, 0, 0, DPR, 0, 0); gctx.clearRect(0, 0, w, h);
      if (hist.length < 2) { gctx.fillStyle = "#606671"; gctx.font = "600 13px " + FONT; gctx.textAlign = "center"; gctx.direction = "rtl"; gctx.fillText("הרץ ניסוי כדי לראות גרף", w / 2, h / 2); gctx.direction = "ltr"; $("#gNote").textContent = ""; return; }
      const kind = graphKind;
      let X = (q) => q.t, xl = "t (s)", series;
      if (kind === "ax") { X = (q) => q.x; xl = "x (m)"; series = [["a", "#8A60E8", (q) => q.a]]; }
      else if (kind === "Fx") { X = (q) => q.xs * 100; xl = "x (cm)"; series = [["F = kx", COL.k, (q) => q.Fs]]; }
      else if (kind === "f") series = [["f", COL.f, (q) => q.f], ["F", COL.F, (q) => q.F], ["N", COL.N, (q) => q.N]].concat(sc.rig === "hang" ? [["T", COL.T, (q) => q.T]] : []);
      else if (kind === "E") series = [["U", COL.g, (q) => q.U], ["K", COL.perp, (q) => q.K], ["Q", "#E2574C", (q) => q.Q]];
      else series = [[kind, kind === "x" ? "#20232A" : kind === "v" ? "#258EF6" : kind === "T" ? COL.T : "#8A60E8", (q) => q[kind]]];
      const pts = kind === "Fx" ? hist.filter((q) => q.xs > 0) : hist;
      if (pts.length < 2) { $("#gNote").textContent = "עוד אין מגע עם הקפיץ."; return; }
      let x0 = Infinity, x1 = -Infinity, y0 = 0, y1 = 0;
      for (const q of pts) { const xv = X(q); x0 = Math.min(x0, xv); x1 = Math.max(x1, xv); for (const [, , f] of series) { const v = f(q); if (Number.isFinite(v)) { y0 = Math.min(y0, v); y1 = Math.max(y1, v); } } }
      if (x1 - x0 < 1e-6) x1 = x0 + 1; if (y1 - y0 < 1e-6) { y1 += 1; y0 -= 1; }
      const pad = (y1 - y0) * 0.1; y0 -= pad; y1 += pad;
      const L0 = 40, R0_ = 8, T0 = 10, B0 = 22, gx = (v) => L0 + (v - x0) / (x1 - x0) * (w - L0 - R0_), gy = (v) => T0 + (y1 - v) / (y1 - y0) * (h - T0 - B0);
      gctx.strokeStyle = "#DFE1E4"; gctx.lineWidth = 1; gctx.beginPath(); gctx.moveTo(L0, T0); gctx.lineTo(L0, h - B0); gctx.lineTo(w - R0_, h - B0); gctx.stroke();
      if (y0 < 0 && y1 > 0) { gctx.strokeStyle = "#B9BCC2"; gctx.setLineDash([3, 3]); gctx.beginPath(); gctx.moveTo(L0, gy(0)); gctx.lineTo(w - R0_, gy(0)); gctx.stroke(); gctx.setLineDash([]); }
      gctx.fillStyle = "#606671"; gctx.font = "600 11px " + FONT; gctx.direction = "ltr"; gctx.textAlign = "right"; gctx.textBaseline = "middle";
      gctx.fillText(fmt(y1 - pad, 1), L0 - 4, gy(y1 - pad)); gctx.fillText(fmt(y0 + pad, 1), L0 - 4, gy(y0 + pad)); if (y0 < 0 && y1 > 0) gctx.fillText("0", L0 - 4, gy(0));
      gctx.textAlign = "center"; gctx.textBaseline = "top"; gctx.fillText(fmt(x0, 1), L0, h - B0 + 4); gctx.fillText(fmt(x1, 1) + "  " + xl, w - 40, h - B0 + 4);
      // event marks: engine off, brake, joints
      const evs = (L.sim.events || []).filter((e) => ["joint", "barrier", "v_zero"].includes(e.type));
      if (kind !== "Fx") {
        const marks = [];
        if (L.sim.p && Number.isFinite(L.sim.p.forceOffAt)) marks.push(kind === "ax" ? null : L.sim.p.forceOffAt);
        const cur = L.cur || L.runs[L.runs.length - 1]; if (cur && cur.braked) marks.push(kind === "ax" ? cur.braked.s : cur.braked.t);
        if (kind === "ax") for (const e of evs) if (e.type === "joint") marks.push(e.s);
        gctx.strokeStyle = "#E39B28"; gctx.setLineDash([4, 3]);
        for (const mk of marks) if (mk !== null && mk >= x0 && mk <= x1) { gctx.beginPath(); gctx.moveTo(gx(mk), T0); gctx.lineTo(gx(mk), h - B0); gctx.stroke(); }
        gctx.setLineDash([]);
      }
      series.forEach(([name, col, f], si) => {
        gctx.strokeStyle = col; gctx.lineWidth = 2.2; gctx.beginPath(); let started = false;
        for (const q of pts) { const v = f(q); if (!Number.isFinite(v)) continue; const X_ = gx(X(q)), Y_ = gy(v); started ? gctx.lineTo(X_, Y_) : gctx.moveTo(X_, Y_); started = true; }
        gctx.stroke(); gctx.fillStyle = col; gctx.textAlign = "left"; gctx.textBaseline = "top"; gctx.font = "700 12px " + FONT; gctx.fillText(name, L0 + 6 + si * 34, T0);
      });
      $("#gNote").textContent = slow ? "הילוך איטי: הציר הוא זמן הסימולציה." : kind === "ax" ? "הקווים המקווקווים: מעברים בין קטעים." : L.sim.p && Number.isFinite(L.sim.p.forceOffAt) ? "הקו המקווקו: רגע הכיבוי." : "";
    }

    // ---------------- the loop ----------------
    function say(text, secs = 2.6) { const el = $("#say"); el.textContent = text; el.hidden = false; sayT = secs; }
    let lastMode = null, lineT = 0;
    function frame(now) {
      const dtw = Math.min(0.1, (now - lastT) / 1000); lastT = now;
      if (!isSheetOpen() && !paused && L.running) {
        let rem = dtw * (slow ? 0.25 : 1);
        while (rem > 1e-9) { const h = Math.min(rem, 1 / 120); S.stepRun(L, h); rem -= h; sample(); if (!L.running) break; }
        if (!L.running && !S.isLive(L)) paintTransport();
      }
      // reactions (words only; the physics decides what the body does)
      const sim = L.sim;
      if (sim && sim.resolve) {
        const R = sim.resolve();
        if (R.mode !== lastMode) {
          if (R.mode === "kinetic" && lastMode === "static") say(sim.v < 0 || R.a < 0 ? "אוי, אני מחליק!" : "יאללה למעלה!", 1.6);
          if (R.mode === "lost") { say("אני עף?!", 1.6); G.sfx.whoosh && G.sfx.whoosh(); }
          if (R.mode === "wall" && lastMode === "kinetic") { say("בום. הגענו לקצה.", 1.6); G.sfx.thudSoft && G.sfx.thudSoft(); G.buzz && G.buzz(25); }
          if (R.mode === "static" && lastMode === "kinetic") say("עצרתי.", 1.2);
          lastMode = R.mode;
        }
        if (R.mode === "static" && R.maxS > 0 && Math.abs(R.f) / R.maxS > 0.9 && (lineT -= dtw) <= 0) { say("הרגליים שלי מנהלות משא ומתן עם הרצפה!", 2.2); lineT = 9; }
      }
      draw();
      if ((tPaint++ & 3) === 0) { paintReadouts(); paintGraph(); }
      if ((evalT += dtw) > 0.25) { evalT = 0; evaluate(false); if (sc.secret) paintMeasThrottled(); }
      if (sayT > 0) { sayT -= dtw; if (sayT <= 0) $("#say").hidden = true; }
      raf = requestAnimationFrame(frame);
    }
    let lastMeasN = -1;
    function paintMeasThrottled() { const n = S.runs(L).filter((r) => r.meas).length; if (n !== lastMeasN) { lastMeasN = n; paintMeas(); } }

    paintChip(); paintControls(); paintTransport(); paintBar(); selectMission(ui.mi); paintMeas();
    raf = requestAnimationFrame(frame);
    later(() => say(sc.desc, 2.8), 400);
    window.__ramp = () => ({ L, ui, hist, sc, paused, slow });                 // for tests
    K.onCleanup(() => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); K.closeInfo(); document.querySelector(".sheet-back")?.remove(); R0.params[sc.id] = { ...L.P }; P.save(); clearTimeout(toast.t); });
  };
})();
