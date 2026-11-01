// ======================================================================
//  "הרפתקאות על המדרון": 18 situations, 90 missions (from the
//  incline_friction pack, data/scenarios.json). Pure logic, no DOM:
//  how each situation builds its physics, what a run records, and how
//  each mission is checked. Every right answer is computed at run time
//  from the live parameters by RampPhys; nothing is a stored number.
//  Axis on a single ramp: + is UP the slope.
// ======================================================================
const RampScenes = (() => {
  "use strict";
  const RP = (typeof RampPhys !== "undefined") ? RampPhys : require("./ramp-engine.js");
  const DEG = Math.PI / 180, g = 10;
  const sin = (d) => Math.sin(d * DEG), cos = (d) => Math.cos(d * DEG), tan = (d) => Math.tan(d * DEG);

  // ---------- the 12 skills the topic meter is made of ----------
  const SKILLS = {
    components: "רכיבי המשקל", normal: "כוח נורמלי", rest: "מנוחה ושיווי משקל", static: "חיכוך סטטי", kinetic: "חיכוך קינטי",
    newton2: "החוק השני", kinematics: "קינמטיקה", external: "כוחות חיצוניים", systems: "מערכות גופים", energy: "עבודה ואנרגיה",
    graphs: "גרפים", inference: "הסקת מסקנות"
  };
  // the seven stages of the original chapter keep counting, once each (legacy save ids newton.s1..s7)
  const LEGACY = {
    "newton.s1": { skills: ["rest"] }, "newton.s2": { skills: ["normal"] }, "newton.s3": { skills: ["components"] },
    "newton.s4": { skills: ["static"], mission: "S02-M01" }, "newton.s5": { skills: ["kinetic"], mission: "S01-M01" },
    "newton.s6": { skills: ["newton2"], mission: "S01-M03" }, "newton.s7": { skills: ["inference"] }
  };

  const MATS = {
    ice: { he: "קרח", s: 0.10, k: 0.05, tint: "#7FC1DE" },
    wood: { he: "עץ", s: 0.45, k: 0.30, tint: "#B58A55" },
    sand: { he: "נייר זכוכית", s: 0.70, k: 0.55, tint: "#C9A36B" },
    rubber: { he: "גומי", s: 0.90, k: 0.70, tint: "#4F5157" }
  };

  // ---------- directions for force diagrams ----------
  const DIRS = {
    down: "אנכית למטה", up: "אנכית למעלה", out: "ניצב, החוצה מהמשטח", into: "ניצב, לתוך המשטח",
    upslope: "במעלה המדרון", downslope: "במורד המדרון", against: "נגד כיוון התנועה", with: "בכיוון התנועה",
    tpulley: "לאורך החבל, אל הגלגלת", none: "אין כוח כזה"
  };
  const SLOPE_DIRS = ["down", "up", "out", "into", "upslope", "downslope", "none"];

  // ---------- helpers on a lab ----------
  const runs = (L) => L.cur ? L.runs.concat([L.cur]) : L.runs;
  const finished = (L) => L.runs;
  const after = (L, i) => runs(L).filter((r) => r.id >= i);
  const lastRun = (L) => runs(L).slice(-1)[0] || null;
  const mOf = (L, P = L.P) => L.mc + (P.load || 0);
  const near = (a, b, rel = 0.03, abs = 1e-3) => Math.abs(a - b) <= Math.max(abs, rel * Math.abs(b));
  const sameP = (a, b, keys) => keys.every((k) => Math.abs((a[k] || 0) - (b[k] || 0)) < 1e-6);
  const fresh = (L, over = {}) => L.scene.build({ ...L.P, ...over }, L.mc, L);
  const R0 = (L, over) => fresh(L, over).resolve();

  // ======================================================================
  //  what a run remembers (filled every simulation step by track())
  // ======================================================================
  function newRun(L, sim, id) {
    const R = sim.resolve ? sim.resolve() : null;
    const e = sim.energy ? sim.energy() : null;
    return {
      id, P: { ...L.P }, phase: L.P.phase || null, m: mOf(L), t: 0, s0: sim.s !== undefined ? sim.s : sim.xUp, sMax: sim.s, sMin: sim.s, lastT: 0, vMax: 0, moved: false, startDir: 0,
      aFirst: null, aUp: null, aDown: null, segA: {}, joints: [], events: [], static0: R ? R.mode === "static" : false,
      lost: false, barrier: null, settled: false, endMode: null, vEnd: 0, U0: e ? e.U + e.Es : 0, Kend: 0, Qend: 0, Uend: 0,
      vOff: null, sOff: null, tPeak: null, sPeak: null, braked: null, xMax: 0, contact: false, bounced: false,
      taut: 0, slack: false, touch: false, N: R ? R.N : null, fStart: R ? R.f : null, mode0: R ? R.mode : null, meas: null
    };
  }
  function track(run, sim, L) {
    if (sim.kind === undefined && sim.xUp !== undefined) return trackLinked(run, sim);
    if (run.done) return sim.resolve();
    const R = sim.resolve();
    run.t = sim.t;
    run.sMax = Math.max(run.sMax, sim.s); run.sMin = Math.min(run.sMin, sim.s);
    run.vMax = Math.max(run.vMax, Math.abs(sim.v));
    if (!run.moved && Math.abs(sim.s - run.s0) > 1e-4) { run.moved = true; run.startDir = Math.sign(sim.s - run.s0); }
    if (R.mode === "kinetic") {
      if (run.aFirst === null) run.aFirst = R.a;
      if (sim.v > 1e-6) run.aUp = R.a; else if (sim.v < -1e-6) { if (run.aDown === null) run.aDown = R.a; }
      if (R.seg !== undefined && sim.v > 1e-6 && run.segA[R.seg] === undefined) run.segA[R.seg] = R.a;
    }
    if (R.x > run.xMax) run.xMax = R.x;
    if (R.x > 0) run.contact = true;
    if (run.contact && R.x > 0 && sim.v > 1e-4) run.bounced = true;
    for (const ev of sim.events.slice(run.events.length)) {
      run.events.push(ev);
      if (ev.type === "joint") run.joints.push(ev.at);
      if (ev.type === "barrier") { run.barrier = ev.at; if (ev.at === "bottom" && run.tFinish === undefined) { run.tFinish = ev.t; run.vFinish = Math.abs(ev.v); } }
      if (ev.type === "lost_contact") run.lost = true;
      if (ev.type === "v_zero" && run.tPeak === null && run.startDir > 0) { run.tPeak = ev.t; run.sPeak = ev.s; }
    }
    const p = sim.p || {};
    if (Number.isFinite(p.forceOffAt) && run.vOff === null && sim.t >= p.forceOffAt - 1e-9) { run.vOff = sim.v; run.sOff = sim.s; }
    if (p.brake && p.brake.on && !run.braked) run.braked = { t: sim.t, v: sim.v, s: sim.s };
    run.endMode = R.mode; run.vEnd = sim.v;
    if (sim.energy) { const e = sim.energy(); run.Kend = e.K; run.Qend = e.Q; run.Uend = e.U + e.Es; }
    if (R.mode === "kinetic") { run.settled = false; run.restSince = null; }
    else { if (run.restSince == null) run.restSince = sim.t; run.settled = (run.moved || run.lost || sim.t > 1.2) && sim.t - run.restSince >= 0.5 && sim.t > 0.6; }
    if (sim.tension) run.T = sim.tension();
    if (L && L.scene.secret && run.aFirst !== null && !run.meas) run.meas = { a: noisy(run.aFirst, run.id, L.secretSeed || "s"), th: run.P.th };
    return R;
  }
  function trackLinked(run, sim) {
    run.t = sim.t;
    const d = sim.xUp - run.s0; if (Math.abs(d) > 1e-4) { run.moved = true; run.startDir = 1; }
    run.vMax = Math.max(run.vMax, Math.abs(sim.vUp), Math.abs(sim.vDn));
    if (sim.mode === "taut") run.taut += sim.t - run.lastT; run.lastT = sim.t; if (sim.mode === "slack" && !sim.ended) run.slack = true;
    if (sim.events.some((e) => e.type === "touch")) run.touch = true;
    const S = sim.state(); if (S.kind !== "slack" && run.aFirst === null && S.a) run.aFirst = S.a;
    run.T = S.T; run.settled = sim.ended || sim.t > 4;
    return S;
  }

  // ======================================================================
  //  mission builders (keep the 90 definitions short)
  // ======================================================================
  const auto = (o) => ({ kind: "auto", ...o });
  const choice = (o) => ({ kind: "choice", ...o });
  const predict = (o) => ({ kind: "predict", ...o });
  const numeric = (o) => ({ kind: "numeric", ...o });
  const fbd = (o) => ({ kind: "fbd", ...o });

  // ======================================================================
  //  scene builders
  // ======================================================================
  const RAMP_L = 4;
  function single(P, mc, extra = {}) {
    const m = mc + (P.load || 0);
    return RP.makeSingle({ m, angleDeg: P.th, muS: P.muS, muK: Math.min(P.muK, P.muS), g, L: RAMP_L, ...extra });
  }
  const C = {   // reusable controls
    th: (min = 5, max = 60, step = 1) => ({ k: "th", he: "זווית המדרון θ", min, max, step, unit: "°", d: step < 1 ? 1 : 0 }),
    load: (max = 6) => ({ k: "load", he: "תרמיל משקולות", min: 0, max, step: 0.5, unit: "kg", d: 1 }),
    muS: () => ({ k: "muS", he: "μs (סטטי)", min: 0, max: 1, step: 0.01, unit: "", d: 2 }),
    muK: () => ({ k: "muK", he: "μk (קינטי)", min: 0, max: 1, step: 0.01, unit: "", d: 2 }),
    F: (mult = 4) => ({ k: "F", he: "כוח המשיכה F", min: 0, max: (mc) => Math.ceil(mult * mc * g / 5) * 5, step: 0.5, unit: "N", d: 1 }),
    v0: (max = 8) => ({ k: "v0", he: "מהירות שיגור v₀", min: 0.5, max, step: 0.1, unit: "m/s", d: 1 })
  };

  // ======================================================================
  //  THE 18 SITUATIONS
  // ======================================================================
  const SCENES = [];
  const add = (s) => { SCENES.push(s); return s; };

  // ---------------- S01 ----------------
  add({
    id: "S01", tier: 1, title: "הרמפה החלקה", rig: "ramp", icon: "ramp", desc: "גולשים בלי חיכוך. מה משתנה עם הזווית והמסה?",
    defaults: { th: 30, load: 0, muS: 0, muK: 0 }, controls: [C.th(5, 60), C.load()], surface: "ice",
    build: (P, mc) => single(P, mc, { s0: RAMP_L - 0.3 }),
    missions: [
      auto({ type: "experiment", skills: ["kinematics", "components"], text: "שחרר את הדמות ובדוק: לאיזה כיוון היא מאיצה?",
        hint: "לחץ ▶ ותסתכל על חץ התאוצה.",
        check: (L) => runs(L).some((r) => r.moved && r.aFirst < 0 && r.t > 0.3),
        learn: "התאוצה במורד: a = −g·sinθ (+ זה במעלה). אין חיכוך, אז רק רכיב המשקל במורד מאיץ." }),
      predict({ type: "prediction", skills: ["components", "kinematics"], text: "נבא: איפה התאוצה גדולה יותר, ב-15° או ב-45°? אחר כך תריץ בשתי הזוויות.",
        options: ["ב-15°", "ב-45°", "אותה תאוצה"],
        needs: (L, i) => { const rs = after(L, i).filter((r) => r.aFirst !== null); return rs.some((r) => Math.abs(r.P.th - 15) < 0.6) && rs.some((r) => Math.abs(r.P.th - 45) < 0.6); },
        needHint: "שים את הזווית על 15° ושחרר, ואז על 45° ושחרר.",
        truth: (L, i) => { const rs = after(L, i); const a15 = rs.find((r) => Math.abs(r.P.th - 15) < 0.6 && r.aFirst !== null).aFirst, a45 = rs.find((r) => Math.abs(r.P.th - 45) < 0.6 && r.aFirst !== null).aFirst; return Math.abs(a45) > Math.abs(a15) + 1e-9 ? 1 : Math.abs(a15) > Math.abs(a45) + 1e-9 ? 0 : 2; },
        learn: "sin45° גדול מ-sin15°, ולכן רכיב המשקל במורד גדול יותר." }),
      auto({ type: "manipulation", skills: ["newton2"], text: "הכפל את המסה (תרמיל במשקל הדמות) בלי לשנות זווית, ושחרר פעמיים. התאוצה השתנתה?",
        hint: "שחרר פעם בלי תרמיל, ופעם עם תרמיל שמכפיל את המסה. הזווית אותה זווית.",
        check: (L) => { const rs = runs(L).filter((r) => r.aFirst !== null); return rs.some((a) => rs.some((b) => b.m >= 1.9 * a.m && sameP(a.P, b.P, ["th", "muK"]))); },
        then: choice({ q: "השווית שתי ריצות: מסה כפולה, אותה זווית. התאוצה…", options: ["גדלה פי 2", "קטנה פי 2", "לא השתנתה"], right: () => 2 }),
        learn: "mg·sinθ גדל פי 2, אבל גם המסה שצריך להאיץ: a = g·sinθ בלי m." }),
      fbd({ type: "force_diagram", skills: ["components", "normal"], text: "שרטט: לאן מצביע כל חץ על הדמות שעל הרמפה החלקה?",
        rows: [{ label: "כובד mg", opts: SLOPE_DIRS, truth: () => "down" }, { label: "נורמל N", opts: SLOPE_DIRS, truth: () => "out" },
               { label: "רכיב המשקל mg·sinθ", opts: SLOPE_DIRS, truth: () => "downslope" }, { label: "חיכוך", opts: SLOPE_DIRS, truth: (L) => (L.P.muK > 0 ? "upslope" : "none") }],
        learn: "mg תמיד אנכי, N תמיד ניצב למשטח. mg·sinθ הוא חלק מ-mg, לא כוח נוסף." }),
      numeric({ type: "calculation", skills: ["normal", "newton2"], text: "חשב לזווית ולמסה שעכשיו: התאוצה ונורמל. (+ = במעלה)",
        fields: [{ k: "a", he: "תאוצה a", unit: "m/s²", value: (L) => -g * sin(L.P.th) }, { k: "N", he: "נורמל N", unit: "N", value: (L) => mOf(L) * g * cos(L.P.th) }],
        learn: "a = −g·sinθ, N = mg·cosθ. המדידה החיה במסך מראה את אותם מספרים." })
    ]
  });

  // ---------------- S02 ----------------
  add({
    id: "S02", tier: 1, title: "רגע לפני ההחלקה", rig: "ramp", icon: "gauge", desc: "מגדילים זווית עד שהחיכוך הסטטי נכנע.",
    defaults: { th: 8, load: 0, muS: 0.5, muK: 0.35 }, controls: [C.th(0, 50, 0.5), C.muS(), C.muK()], surface: "wood", gauge: true, live: true,
    build: (P, mc) => single(P, mc, { s0: RAMP_L * 0.55 }),
    missions: [
      choice({ type: "experiment", skills: ["static", "rest"], text: "התחל בזווית קטנה (מעל 3°) והסבר למה הדמות לא זזה.",
        gate: (L) => L.P.th >= 3 && R0(L).mode === "static", gateHint: "שים זווית של כמה מעלות, מתחת לזווית הסף.",
        q: "למה הדמות לא זזה?", options: ["החיכוך הסטטי מתאים את עצמו ושווה בדיוק ל-mg·sinθ", "החיכוך תמיד שווה ל-μs·N", "אין כוח במורד כשהזווית קטנה"], right: () => 0,
        learn: "f_s = mg·sinθ, לא μs·N. המקסימום רק אומר עד כמה הוא יכול לגדול." }),
      auto({ type: "prediction", skills: ["static"], text: "הגדל את השיפוע לאט (צעדי חצי מעלה) עד שהחלקה מתחילה.",
        hint: "השתמש ב-+ או גרור לאט. כשהמד האדום מתמלא, אתה קרוב.",
        check: (L) => runs(L).some((r) => r.moved && r.startDir < 0 && r.P.th <= RP.criticalAngle(r.P.muS) + 2.5 && r.P.th > RP.criticalAngle(r.P.muS) - 1e-9),
        learn: "ההחלקה מתחילה רק כש-mg·sinθ עובר את μs·N, כלומר tanθ > μs." }),
      numeric({ type: "manipulation", skills: ["static"], text: "בזווית שבה הדמות עוד עומדת (לפחות 8°): כמה חיכוך סטטי יש באמת, ומה המקסימום?",
        gate: (L) => L.P.th >= 8 && R0(L).mode === "static", gateHint: "שים זווית של 8° ומעלה שבה הדמות עדיין לא מחליקה.",
        fields: [{ k: "fs", he: "f_s בפועל", unit: "N", value: (L) => mOf(L) * g * sin(L.P.th) }, { k: "max", he: "μs·N המקסימום", unit: "N", value: (L) => L.P.muS * mOf(L) * g * cos(L.P.th) }],
        learn: "בפועל f_s = mg·sinθ, והוא קטן מהמקסימום μs·N. רק בסף הם שווים." }),
      numeric({ type: "force_diagram", skills: ["static", "inference"], text: "נבא מ-tanθ = μs את זווית הסף לחיכוך שעכשיו, ואז בדוק בניסוי.",
        fields: [{ k: "crit", he: "זווית סף", unit: "°", value: (L) => RP.criticalAngle(L.P.muS), tolAbs: 0.5 }],
        confirm: { check: (L, i) => after(L, i).some((r) => r.moved && r.startDir < 0), hint: "עכשיו הגדל את הזווית אל מעבר לסף ובדוק." },
        learn: "θ_c = arctan(μs). המסה לא נכנסת בכלל." }),
      numeric({ type: "calculation", skills: ["kinetic", "newton2"], text: "אחרי שהדמות התחילה להחליק: חשב את התאוצה. איזה μ נכנס לחישוב? (+ = במעלה)",
        gate: (L) => runs(L).some((r) => r.aFirst !== null && sameP(r.P, L.P, ["th", "muS", "muK"])), gateHint: "תן לדמות להחליק בזווית הנוכחית.",
        fields: [{ k: "a", he: "תאוצה a", unit: "m/s²", value: (L) => -g * (sin(L.P.th) - L.P.muK * cos(L.P.th)) }],
        learn: "בתנועה החיכוך קינטי: f_k = μk·N, קבוע. לכן a = −g(sinθ − μk·cosθ)." })
    ]
  });

  // ---------------- S03 ----------------
  add({
    id: "S03", tier: 1, title: "מי מחליק על מה?", rig: "ramp", icon: "swatch", desc: "אותה רמפה, משטחים שונים.",
    defaults: { th: 30, load: 0, mat: "ice", v0: 0, muS: MATS.ice.s, muK: MATS.ice.k }, controls: [C.th(5, 55), { k: "v0", he: "דחיפה התחלתית במורד", min: 0, max: 4, step: 0.1, unit: "m/s", d: 1 }], mats: true, finish: true,
    build: (P, mc) => single({ ...P, muS: MATS[P.mat].s, muK: MATS[P.mat].k }, mc, { s0: RAMP_L - 0.3, v0: -(P.v0 || 0) }),
    missions: [
      auto({ type: "experiment", skills: ["kinetic"], text: "החלק על קרח, ואז על משטח מחוספס (נייר זכוכית או גומי) באותה זווית.",
        hint: "בחר חומר, לחץ ▶. אחר כך חומר אחר.",
        check: (L) => { const rs = runs(L).filter((r) => r.t > 0.5); return rs.some((a) => a.P.mat === "ice" && rs.some((b) => (b.P.mat === "sand" || b.P.mat === "rubber") && Math.abs(a.P.th - b.P.th) < 0.6)); },
        learn: "על קרח μ קטן, החיכוך חלש והדמות מאיצה יותר. על משטח מחוספס היא אולי לא זזה בכלל." }),
      predict({ type: "prediction", skills: ["kinetic", "inference"], text: "נבא: מי מגיע לקו הסיום ראשון, קרח או עץ, באותה זווית ובאותה דחיפה?",
        options: ["הקרח", "העץ", "ביחד", "אף אחד לא יגיע"],
        needs: (L, i) => { const rs = after(L, i); return ["ice", "wood"].every((mt) => rs.some((r) => r.P.mat === mt && r.settled)) && sameRunsP(rs, ["th", "v0"]); },
        needHint: "הרץ פעם על קרח ופעם על עץ, באותה זווית ואותה דחיפה, עד הסוף.",
        truth: (L, i) => { const rs = after(L, i); const t = (mt) => { const r = rs.filter((x) => x.P.mat === mt && x.settled).slice(-1)[0]; return r.barrier === "bottom" ? r.tFinish : Infinity; }; const a = t("ice"), b = t("wood"); return a === Infinity && b === Infinity ? 3 : Math.abs(a - b) < 1e-6 ? 2 : a < b ? 0 : 1; },
        learn: "אותו שיפוע: מי שה-μk שלו קטן מאיץ יותר ומגיע קודם." }),
      choice({ type: "manipulation", skills: ["normal"], text: "החלף חומר כמה פעמים והסתכל על הנורמל N.",
        gate: (L) => new Set(runs(L).map((r) => r.P.mat)).size >= 2 || (L.matSeen && L.matSeen.size >= 2), gateHint: "נסה לפחות שני חומרים.",
        q: "מה קורה לנורמל כשמחליפים חומר?", options: ["גדל על משטח מחוספס", "לא משתנה: N = mg·cosθ", "קטן על קרח"], right: () => 1,
        learn: "החומר משנה את μ, לא את N. החיכוך משתנה כי μ משתנה." }),
      numeric({ type: "force_diagram", skills: ["kinetic"], text: "בזמן החלקה על החומר שבחרת: מה גודל החיכוך הקינטי?",
        gate: (L) => runs(L).some((r) => r.aFirst !== null && r.P.mat === L.P.mat && Math.abs(r.P.th - L.P.th) < 0.6), gateHint: "בחר חומר וזווית שבהם הדמות מחליקה, והרץ.",
        fields: [{ k: "fk", he: "f_k", unit: "N", value: (L) => MATS[L.P.mat].k * mOf(L) * g * cos(L.P.th) }],
        learn: "f_k = μk·N: אותו N, μk אחר, חיכוך אחר." }),
      auto({ type: "calculation", skills: ["kinematics", "kinetic", "inference"], text: "תכנן: בחר חומר, זווית ודחיפה כך שהדמות מאטה בדרך אבל עדיין חוצה את קו הסיום.",
        hint: "צריך חיכוך שמאט (μk > tanθ) ודחיפה מספיקה. נסה עץ בזווית קטנה עם דחיפה.",
        check: (L) => runs(L).some((r) => r.barrier === "bottom" && r.vFinish !== undefined && r.vFinish < (r.P.v0 || 0) - 0.05 && r.vFinish > 0.05),
        learn: "כש-μk > tanθ התאוצה במעלה (נגד התנועה): הדמות מאטה. הדחיפה צריכה להספיק: v² = v₀² − 2|a|d > 0." })
    ]
  });

  // ---------------- S04 ----------------
  add({
    id: "S04", tier: 1, title: "זריקה במעלה המדרון", rig: "ramp", icon: "launch", desc: "דוחפים למעלה: המהירות והכוח לא באותו כיוון.",
    defaults: { th: 25, load: 0, muS: 0.5, muK: 0.2, v0: 5 }, controls: [C.th(5, 50), C.v0(8), C.muK()], surface: "wood", launch: true,
    build: (P, mc) => single(P, mc, { s0: 0.3, v0: P.v0, L: 9 }), L: 9,
    missions: [
      auto({ type: "experiment", skills: ["kinematics"], text: "זרוק את הדמות במעלה וראה שהיא מאטה.", hint: "לחץ ▶ לזריקה.",
        check: (L) => runs(L).some((r) => r.tPeak !== null), learn: "בעלייה הכובד והחיכוך שניהם במורד: a = −g(sinθ + μk·cosθ)." }),
      fbd({ type: "prediction", skills: ["kinetic"], text: "בזמן העלייה, לאן מצביע כל כוח?",
        rows: [{ label: "חיכוך f", opts: SLOPE_DIRS, truth: () => "downslope" }, { label: "מהירות v", opts: ["upslope", "downslope", "none"], truth: () => "upslope" }, { label: "תאוצה a", opts: ["upslope", "downslope", "none"], truth: () => "downslope" }],
        learn: "החיכוך נגד המהירות, לא נגד התאוצה. עולה, אז החיכוך במורד." }),
      numeric({ type: "manipulation", skills: ["kinematics", "kinetic"], text: "נבא לפני הזריקה: איזה מרחק תעבור עד שתעצור רגעית? אחר כך זרוק ובדוק.",
        fields: [{ k: "d", he: "מרחק עצירה", unit: "m", value: (L) => RP.stopDistanceUphill({ speed: L.P.v0, angleDeg: L.P.th, muK: L.P.muK }) }],
        confirm: { check: (L, i) => after(L, i).some((r) => r.tPeak !== null && sameP(r.P, L.P, ["th", "v0", "muK"])), hint: "עכשיו זרוק באותם ערכים ובדוק מול סימון השיא." },
        learn: "d = v₀² / [2g(sinθ + μk·cosθ)]." }),
      predict({ type: "force_diagram", skills: ["static", "inference"], text: "נבא לפני הזריקה: ברגע העצירה, היא תחליק חזרה או תישאר?",
        options: ["תחליק חזרה למטה", "תישאר במקום"],
        needs: (L, i) => after(L, i).some((r) => r.tPeak !== null && r.t > r.tPeak + 0.4), needHint: "זרוק וחכה רגע אחרי העצירה.",
        truth: (L, i) => { const r = after(L, i).find((x) => x.tPeak !== null); return tan(r.P.th) > r.P.muS + 1e-9 ? 0 : 1; },
        learn: "בעצירה בודקים מחדש: אם tanθ ≤ μs, החיכוך הסטטי מחזיק. אחרת היא חוזרת עם a קטנה יותר." }),
      numeric({ type: "calculation", skills: ["graphs", "kinetic"], text: "בזווית שבה היא חוזרת: קרא מגרף v(t) את התאוצה בעלייה ובירידה. (+ = במעלה)",
        gate: (L) => runs(L).some((r) => r.aUp !== null && r.aDown !== null && sameP(r.P, L.P, ["th", "muK", "muS"])), gateHint: "הגדל זווית (tanθ > μs), זרוק, ותן לה לחזור.",
        fields: [{ k: "up", he: "a בעלייה", unit: "m/s²", value: (L) => -g * (sin(L.P.th) + L.P.muK * cos(L.P.th)), tol: 0.05 }, { k: "dn", he: "a בירידה", unit: "m/s²", value: (L) => -g * (sin(L.P.th) - L.P.muK * cos(L.P.th)), tol: 0.05 }],
        graph: "v", learn: "שני שיפועים שונים: החיכוך התהפך ברגע ש-v התהפכה, לא לפני." })
    ]
  });

  // ---------------- S05 ----------------
  const pulling = (L) => RP.staticForceRange({ m: mOf(L), angleDeg: L.P.th, muS: L.P.muS });
  add({
    id: "S05", tier: 2, title: "חבל המשיכה", rig: "ramp", icon: "rope", desc: "כוח מקביל למדרון: מאזן, מושך או מאיץ.",
    defaults: { th: 30, load: 0, muS: 0.4, muK: 0.25, F: 0 }, controls: [C.F(2.5), C.th(5, 50), C.muS(), C.muK()], surface: "wood", rope: "parallel", live: true,
    build: (P, mc) => single(P, mc, { s0: 0.8, F: P.F }),
    missions: [
      auto({ type: "experiment", skills: ["static", "external"], text: "משוך בעדינות: מצא כוח (לא 0) שבו הדמות עדיין במנוחה והחיכוך במעלה.",
        hint: "התחל מ-0 והגדל קצת. חץ החיכוך צריך להצביע במעלה.",
        check: (L) => { const R = R0(L); return L.P.F > 0 && R.mode === "static" && R.f > 1e-6; },
        learn: "F + f_s = mg·sinθ: החיכוך עוזר לחבל להחזיק." }),
      numeric({ type: "prediction", skills: ["static", "rest"], text: "מצא את טווח הכוחות שבו הדמות נשארת במנוחה.",
        fields: [{ k: "min", he: "F מינימלי", unit: "N", value: (L) => pulling(L).min }, { k: "max", he: "F מקסימלי", unit: "N", value: (L) => pulling(L).max }],
        learn: "mg·sinθ − μs·N ≤ F ≤ mg·sinθ + μs·N. בכל הטווח הזה החיכוך הסטטי מאזן." }),
      auto({ type: "manipulation", skills: ["external", "static"], text: "הגדל את הכוח עד שהדמות מתחילה לעלות.",
        check: (L) => runs(L).some((r) => r.moved && r.startDir > 0) || (R0(L).mode === "kinetic" && R0(L).a > 0 && L.liveMoved > 0),
        learn: "רק מעל mg·sinθ + μs·N. מתחת לזה החיכוך פשוט הופך כיוון ונשאר סטטי." }),
      fbd({ type: "force_diagram", skills: ["static", "kinetic"], text: "בחר את כיוון החיכוך בשני מצבים.",
        rows: [{ label: "f כשהחבל מושך חלש (F = ½·mg·sinθ) והדמות במנוחה", opts: ["upslope", "downslope", "none"], truth: (L) => dirOf(R0(L, { F: 0.5 * mOf(L) * g * sin(L.P.th) }).f) },
               { label: "f בזמן שהדמות עולה", opts: ["upslope", "downslope", "none"], truth: () => "downslope" }],
        learn: "סטטי: נגד הנטייה לזוז. קינטי: נגד המהירות." }),
      numeric({ type: "calculation", skills: ["newton2", "external"], text: "קבע כוח שמעלה את הדמות, וחשב את תאוצת העלייה.",
        gate: (L) => L.P.F > pulling(L).max + 0.1, gateHint: "הגדל את F מעל הטווח הסטטי.",
        fields: [{ k: "a", he: "a", unit: "m/s²", value: (L) => (L.P.F - mOf(L) * g * (sin(L.P.th) + L.P.muK * cos(L.P.th))) / mOf(L) }],
        learn: "a = [F − mg·sinθ − μk·mg·cosθ] / m." })
    ]
  });

  // ---------------- S06 ----------------
  add({
    id: "S06", tier: 2, title: "מושכים באלכסון", rig: "ramp", icon: "angle", desc: "זווית החבל משנה את הנורמל ואת החיכוך.",
    defaults: { th: 20, load: 0, muS: 0.4, muK: 0.25, F: 20, beta: 0 }, defaultsFn: (mc) => ({ F: Math.round(mc * g * 0.9 * 2) / 2 }), controls: [C.F(5), { k: "beta", he: "זווית החבל β", min: 0, max: 80, step: 1, unit: "°", d: 0 }, C.th(0, 45)],
    surface: "wood", rope: "angled", live: true, measure: true,
    build: (P, mc) => single(P, mc, { s0: 0.8, F: P.F, beta: P.beta }),
    measureRow: (L, sim) => { const R = sim.resolve(); return { F: L.P.F, beta: L.P.beta, th: L.P.th, N: R.N, a: R.a, mode: R.mode, lost: sim.lost }; },
    missions: [
      auto({ type: "experiment", skills: ["external", "normal"], text: "📌 מדוד משיכה מקבילה (β = 0), ואז אותו כוח מורם קצת (β ≥ 10°).",
        hint: "לחץ 📌 כדי לרשום מדידה. אותו F בשתיהן.",
        check: (L) => (L.meas || []).some((a) => a.beta === 0 && (L.meas || []).some((b) => b.beta >= 10 && Math.abs(b.F - a.F) < 1e-6 && Math.abs(b.th - a.th) < 1e-6)),
        learn: "ההרמה מורידה את N, ולכן גם את החיכוך." }),
      fbd({ type: "prediction", skills: ["components", "external"], text: "פרק את כוח החבל: לאן מצביע כל רכיב?",
        rows: [{ label: "F·cosβ", opts: SLOPE_DIRS, truth: () => "upslope" }, { label: "F·sinβ", opts: SLOPE_DIRS, truth: () => "out" }],
        learn: "F·cosβ מושך במעלה, F·sinβ מרים מהמשטח ומקטין את N." }),
      numeric({ type: "manipulation", skills: ["normal"], text: "הרם את החבל (β ≥ 10°) וחשב את הנורמל.",
        gate: (L) => L.P.beta >= 10 && fresh(L).resolve().mode !== "lost", gateHint: "שים β של 10° ומעלה.",
        fields: [{ k: "N", he: "N", unit: "N", value: (L) => mOf(L) * g * cos(L.P.th) - L.P.F * sin(L.P.beta) }],
        learn: "N = mg·cosθ − F·sinβ." }),
      auto({ type: "force_diagram", skills: ["external", "kinetic", "inference"], text: "📌 מצא זווית חבל שנותנת תאוצה גדולה יותר מ-β = 0, באותו כוח (כשהדמות עולה).",
        hint: "הגדל F כך שהיא עולה. רשום β = 0, ואז נסה זוויות.",
        check: (L) => (L.meas || []).some((a) => a.beta === 0 && a.mode === "kinetic" && a.a > 0 && (L.meas || []).some((b) => b.beta > 0 && b.mode === "kinetic" && Math.abs(b.F - a.F) < 1e-6 && Math.abs(b.th - a.th) < 1e-6 && b.a > a.a + 0.005)),
        learn: "ההרמה מאבדת קצת מהמשיכה במעלה, אבל מורידה חיכוך. השיא ב-tanβ = μk." }),
      choice({ type: "calculation", skills: ["normal", "inference"], text: "משוך חזק ובזווית גבוהה עד שהמודל מתריע.",
        gate: (L) => L.lostSeen, gateHint: "הגדל F ו-β עד ש-N מגיע לאפס.",
        q: "למה המודל עוצר?", options: ["כי N יורד לאפס: הדמות מתרוממת ואין יותר חיכוך או מגע", "כי החבל נקרע", "כי החיכוך נהיה שלילי"], right: () => 0,
        learn: "בלי מגע אין נורמל ואין חיכוך. צריך מודל מעוף דו-ממדי, לא מסילה." })
    ]
  });

  // ---------------- S07 ----------------
  add({
    id: "S07", tier: 2, title: "לחיצה לתוך המשטח", rig: "ramp", icon: "press", desc: "דוחפים בניצב: שולטים בנורמל ובחיכוך.",
    defaults: { th: 30, load: 0, muS: 0.5, muK: 0.3, Q: 0 }, controls: [{ k: "Q", he: "לחיצה ניצבת Q", min: 0, max: (mc) => Math.ceil(2 * mc * g / 5) * 5, step: 0.5, unit: "N", d: 1 }, C.th(5, 50)], surface: "wood", press: true,
    build: (P, mc) => single(P, mc, { s0: RAMP_L - 0.3, Q: P.Q }),
    missions: [
      auto({ type: "experiment", skills: ["normal", "kinetic"], text: "שחרר בלי לחיצה, ואז עם לחיצה. השווה.",
        check: (L) => { const rs = runs(L).filter((r) => r.t > 0.4); return rs.some((a) => a.P.Q === 0) && rs.some((b) => b.P.Q > 0); },
        learn: "הלחיצה מוסיפה לנורמל ולכן לחיכוך. במורד היא לא דוחפת." }),
      numeric({ type: "prediction", skills: ["normal"], text: "עם הלחיצה שעכשיו: מה הנורמל?",
        gate: (L) => L.P.Q > 0, gateHint: "הגדל את Q.",
        fields: [{ k: "N", he: "N", unit: "N", value: (L) => mOf(L) * g * cos(L.P.th) + L.P.Q }], learn: "N = mg·cosθ + Q." }),
      predict({ type: "manipulation", skills: ["kinetic"], text: "נבא: בזמן החלקה, לחיצה חזקה יותר עושה לחיכוך הקינטי…",
        options: ["מגדילה אותו", "מקטינה אותו", "לא משנה"],
        needs: (L, i) => { const rs = after(L, i).filter((r) => r.aFirst !== null); return rs.some((a) => rs.some((b) => b.P.Q > a.P.Q + 0.5)); },
        needHint: "הרץ שתי החלקות עם Q שונה (ששתיהן עדיין מחליקות).", truth: () => 0, learn: "f_k = μk(mg·cosθ + Q)." }),
      auto({ type: "force_diagram", skills: ["static", "normal"], text: "מצא לחיצה שמונעת את תחילת ההחלקה.",
        hint: "התחל מ-0 והגדל עד שהדמות נשארת אחרי השחרור.",
        check: (L) => runs(L).some((r) => r.P.Q > 0 && r.static0 && r.t > 0.8 && tan(r.P.th) > r.P.muS),
        learn: "צריך μs(mg·cosθ + Q) ≥ mg·sinθ, כלומר Q ≥ mg(sinθ/μs − cosθ)." }),
      numeric({ type: "calculation", skills: ["normal", "components"], text: "הוספת Q: בכמה גדל N, ובכמה השתנה רכיב המשקל במורד?",
        gate: (L) => L.P.Q > 0, gateHint: "שים Q גדול מ-0.",
        fields: [{ k: "dN", he: "ΔN", unit: "N", value: (L) => L.P.Q }, { k: "dpar", he: "Δ(mg·sinθ)", unit: "N", value: () => 0, tol: 0.01 }],
        learn: "Q ניצב למשטח: הוא נכנס רק ל-N. mg·sinθ לא זז." })
    ]
  });

  // ---------------- S08 ----------------
  const motorPeak = (L) => { const m = mOf(L), a1 = (L.P.F - m * g * (sin(L.P.th) + L.P.muK * cos(L.P.th))) / m, v = a1 * L.P.tOff, d1 = 0.5 * a1 * L.P.tOff ** 2, dec = g * (sin(L.P.th) + L.P.muK * cos(L.P.th)); return { a1, v, d1, t2: v / dec, d2: v * v / (2 * dec), a2: -dec }; };
  add({
    id: "S08", tier: 2, title: "המנוע שנכבה", rig: "ramp", icon: "motor", desc: "כוח שפועל רק חלק מהזמן: תנועה בשני שלבים.",
    defaults: { th: 37, load: 0, muS: 0, muK: 0, F: 45, tOff: 4 }, defaultsFn: (mc) => ({ F: Math.round(mc * (g * sin(37) + 1.5) * 2) / 2 }), controls: [C.F(2), { k: "tOff", he: "כיבוי אחרי", min: 0.5, max: 6, step: 0.1, unit: "s", d: 1 }, C.th(5, 45)],
    surface: "ice", motor: true, L: 30, ensure: (L) => motorPeak(L).a1 > 0,
    build: (P, mc) => single(P, mc, { s0: 0.2, F: P.F, forceOffAt: P.tOff, L: 30 }),
    missions: [
      auto({ type: "experiment", skills: ["external", "newton2"], text: "הפעל את המנוע ועקוב אחרי התאוצה במעלה.", hint: "הכוח צריך להיות גדול מ-mg·sinθ. לחץ ▶.",
        check: (L) => runs(L).some((r) => r.aFirst > 0 && r.t > 0.5), learn: "F − mg·sinθ = ma: כל עוד המנוע פועל." }),
      predict({ type: "prediction", skills: ["kinematics", "inference"], text: "נבא לפני ההרצה: מה יקרה למהירות כשהמנוע ייכבה?",
        options: ["תיפול מיד לאפס", "תמשיך במעלה ותאט", "תתחיל מיד לרדת"],
        needs: (L, i) => after(L, i).some((r) => r.vOff !== null && r.t > r.P.tOff + 0.3), needHint: "הרץ עד אחרי הכיבוי.",
        truth: (L, i) => { const r = after(L, i).find((x) => x.vOff !== null); return r.vOff > 1e-6 ? 1 : 0; },
        learn: "המהירות רציפה. רק התאוצה קופצת: מ-+ ל-−g·sinθ." }),
      numeric({ type: "manipulation", skills: ["graphs", "kinematics"], text: "כבה אחרי 4 שניות, ופתח את גרף v(t). קרא את שני השיפועים.",
        gate: (L) => runs(L).some((r) => Math.abs(r.P.tOff - 4) < 0.05 && r.t > 4.5 && sameP(r.P, L.P, ["F", "th", "tOff"])), gateHint: "שים כיבוי ב-4.0 s והרץ עד אחרי הכיבוי.",
        fields: [{ k: "a1", he: "שיפוע לפני", unit: "m/s²", value: (L) => motorPeak(L).a1, tol: 0.05 }, { k: "a2", he: "שיפוע אחרי", unit: "m/s²", value: (L) => motorPeak(L).a2, tol: 0.05 }],
        graph: "v", learn: "השבר בגרף הוא בדיוק ברגע הכיבוי." }),
      numeric({ type: "force_diagram", skills: ["kinematics"], text: "חשב כמה זמן אחרי הכיבוי היא מגיעה לשיא.",
        fields: [{ k: "t2", he: "זמן עד השיא", unit: "s", value: (L) => motorPeak(L).t2 }],
        confirm: { check: (L, i) => after(L, i).some((r) => r.tPeak !== null && sameP(r.P, L.P, ["F", "th", "tOff"])), hint: "הרץ ובדוק בסימון השיא." },
        learn: "t = v_כיבוי / (g·sinθ)." }),
      numeric({ type: "calculation", skills: ["kinematics", "inference"], text: "חשב את המרחק הכולל עד העצירה הרגעית (שני השלבים).",
        fields: [{ k: "d", he: "מרחק כולל", unit: "m", value: (L) => motorPeak(L).d1 + motorPeak(L).d2 }],
        learn: "d = ½·a₁·t₁² + v²/(2g·sinθ). אסור לשכוח את השלב השני." })
    ]
  });

  // ---------------- S09 ----------------
  const segsOf = (P) => [{ length: 3, angleDeg: P.th1, muS: 0.3, muK: 0.15 }, { length: P.flat, angleDeg: 0, muS: MATS[P.mat].s, muK: MATS[P.mat].k }, { length: 3, angleDeg: -P.th3, muS: 0.3, muK: 0.2 }];
  add({
    id: "S09", tier: 2, title: "מדרון, מישור, מדרון", rig: "track", icon: "track", desc: "הזווית והמשטח משתנים לאורך הדרך.",
    defaults: { th1: 25, flat: 2, th3: 15, mat: "wood", v0: 0.3, load: 0 },
    controls: [{ k: "th1", he: "ירידה בקטע 1", min: 10, max: 45, step: 1, unit: "°", d: 0 }, { k: "flat", he: "אורך המישור", min: 0.5, max: 4, step: 0.1, unit: "m", d: 1 }, { k: "th3", he: "עלייה בקטע 3", min: 5, max: 35, step: 1, unit: "°", d: 0 }, { k: "v0", he: "מהירות התחלתית", min: 0, max: 4, step: 0.1, unit: "m/s", d: 1 }],
    mats: ["ice", "wood", "rubber"], matLabel: "משטח המישור",
    build: (P, mc) => RP.makePiecewise({ m: mc + (P.load || 0), segments: segsOf(P), v0: P.v0 }),
    missions: [
      predict({ type: "experiment", skills: ["kinematics", "kinetic"], text: "נבא לכל קטע: הדמות מאיצה או מאטה? (בחר שלוש)",
        multi: [{ he: "קטע 1 (ירידה)" }, { he: "קטע 2 (מישור)" }, { he: "קטע 3 (עלייה)" }], options: ["מאיצה", "מאטה"],
        needs: (L, i) => after(L, i).some((r) => r.settled), needHint: "הרץ עד הסוף.",
        truth: (L) => { const s = segsOf(L.P); return [g * (sin(s[0].angleDeg) - s[0].muK * cos(s[0].angleDeg)) > 0 ? 0 : 1, 1, 1]; },
        learn: "בירידה מאיצה אם tanθ > μk; במישור החיכוך מאט; בעלייה גם הכובד וגם החיכוך מאטים." }),
      choice({ type: "prediction", skills: ["kinematics"], text: "העבר את הדמות מהשיפוע למישור.",
        gate: (L) => runs(L).some((r) => r.joints.includes("j1")), gateHint: "הרץ עד שהיא חוצה את המעבר הראשון.",
        q: "ברגע המעבר מהשיפוע למישור…", options: ["המהירות קופצת", "המהירות רציפה, התאוצה קופצת", "שתיהן לא משתנות"], right: () => 1,
        learn: "בחיבור מעוגל (בלי איבוד בפנייה) v רציפה. N ו-μ מתחלפים בבת אחת, ואיתם a." }),
      fbd({ type: "manipulation", skills: ["kinetic", "normal"], text: "כוחות בכל קטע, כשהדמות נעה קדימה: לאן החיכוך?",
        rows: [{ label: "חיכוך בקטע 1", opts: ["against", "with", "none"], truth: () => "against" }, { label: "חיכוך בקטע 2", opts: ["against", "with", "none"], truth: () => "against" }, { label: "חיכוך בקטע 3", opts: ["against", "with", "none"], truth: () => "against" }],
        then: choice({ q: "ובמישור, N שווה ל…", options: ["mg", "mg·cosθ₁", "0"], right: () => 0 }),
        learn: "החיכוך הקינטי תמיד נגד התנועה. N = mg·cos(הזווית של הקטע שבו היא נמצאת)." }),
      predict({ type: "force_diagram", skills: ["energy", "inference"], text: "נבא: עם הערכים שעכשיו, הדמות תגיע לקצה הקטע השלישי?",
        options: ["מגיעה לקצה", "נעצרת בדרך"],
        needs: (L, i) => after(L, i).some((r) => r.settled), needHint: "הרץ עד הסוף.",
        truth: (L, i) => (after(L, i).find((r) => r.settled).barrier === "top" ? 0 : 1),
        learn: "אפשר לחשב מראש: ½mv² בסוף = ½mv₀² + mgh − (חום מכל הקטעים)." }),
      numeric({ type: "calculation", skills: ["graphs", "kinetic"], text: "פתח גרף a(x). מה התאוצה במישור, ומה בעלייה?",
        gate: (L) => runs(L).some((r) => r.segA[1] !== undefined && r.segA[2] !== undefined && sameP(r.P, L.P, ["th1", "flat", "th3"]) && r.P.mat === L.P.mat), gateHint: "הרץ כך שהדמות מגיעה לקטע השלישי.",
        fields: [{ k: "a2", he: "a במישור", unit: "m/s²", value: (L) => -segsOf(L.P)[1].muK * g, tol: 0.05 }, { k: "a3", he: "a בעלייה", unit: "m/s²", value: (L) => -g * (sin(L.P.th3) + 0.2 * cos(L.P.th3)), tol: 0.05 }],
        graph: "ax", learn: "a(x) קבועה בכל קטע וקופצת בדיוק במעברים." })
    ]
  });

  // ---------------- S10 ----------------
  const hang = (L, over = {}) => { const P = { ...L.P, ...over }; return { mA: mOf(L, P), mB: P.mB, angleDeg: P.th, muS: P.muS, muK: Math.min(P.muK, P.muS), g }; };
  add({
    id: "S10", tier: 2, title: "משקולת מן התקרה", rig: "hang", icon: "pulley", desc: "משקולת תלויה מושכת את הדמות דרך גלגלת.",
    defaults: { th: 30, load: 0, mB: 1, muS: 0.25, muK: 0.2 }, defaultsFn: (mc) => ({ mB: Math.round(mc * 0.75 * 10) / 10 }), controls: [{ k: "mB", he: "המשקולת התלויה", min: 0.1, max: (mc) => Math.ceil(mc * 3), step: 0.1, unit: "kg", d: 1 }, C.th(0, 60), C.muS(), C.muK()],
    surface: "wood",
    build: (P, mc, L) => RP.makeHanging({ mA: mc + (P.load || 0), mB: P.mB, angleDeg: P.th, muS: P.muS, muK: Math.min(P.muK, P.muS), g, sMin: -1.3, sMax: 1.3 }),
    missions: [
      predict({ type: "experiment", skills: ["systems", "static"], text: "קבע משקולת ונבא: לאן המערכת תזוז?",
        options: ["הדמות עולה", "הדמות יורדת", "נשארת במנוחה"],
        needs: (L, i) => after(L, i).some((r) => r.t > 0.6), needHint: "שחרר (▶).",
        truth: (L, i) => { const r = after(L, i).find((x) => x.t > 0.6); return !r.moved ? 2 : r.startDir > 0 ? 0 : 1; },
        learn: "משווים mB·g מול mA·g·sinθ, ובודקים אם ההפרש עובר את μs·N." }),
      auto({ type: "prediction", skills: ["static", "systems"], text: "מצא משקולת שמשאירה את המערכת במנוחה.",
        check: (L) => runs(L).some((r) => !r.moved && r.t > 1 && r.P.mB > 0),
        learn: "במנוחה: mA·g·sinθ − μs·N ≤ mB·g ≤ mA·g·sinθ + μs·N." }),
      numeric({ type: "manipulation", skills: ["systems", "newton2"], text: "שחרר כך שהמערכת זזה, ומדוד את התאוצה המשותפת.",
        gate: (L) => runs(L).some((r) => r.aFirst !== null && sameP(r.P, L.P, ["mB", "th", "muK", "load"])), gateHint: "בחר משקולת שמזיזה, ושחרר.",
        fields: [{ k: "a", he: "|a|", unit: "m/s²", value: (L) => Math.abs(RP.hangingPulley(hang(L), 0).a || 0) }],
        learn: "אותו חבל, אותו גודל תאוצה לשני הגופים." }),
      fbd({ type: "force_diagram", skills: ["systems", "kinetic"], text: "כשהדמות עולה: הכוחות על כל גוף בנפרד.",
        rows: [{ label: "מתיחות על הדמות", opts: ["upslope", "downslope", "up", "down"], truth: () => "upslope" }, { label: "חיכוך על הדמות", opts: ["upslope", "downslope", "none"], truth: () => "downslope" },
               { label: "מתיחות על המשקולת", opts: ["up", "down"], truth: () => "up" }, { label: "כובד על המשקולת", opts: ["up", "down"], truth: () => "down" }],
        learn: "החבל מושך כל גוף לכיוון הגלגלת. החיכוך על הדמות נגד התנועה." }),
      numeric({ type: "calculation", skills: ["systems", "newton2"], text: "משתי משוואות ניוטון: חשב את התאוצה ואת המתיחות (המערכת בתנועה).",
        gate: (L) => RP.hangingPulley(hang(L), 0).mode === "kinetic", gateHint: "בחר משקולת שמזיזה את המערכת.",
        fields: [{ k: "a", he: "|a|", unit: "m/s²", value: (L) => Math.abs(RP.hangingPulley(hang(L), 0).a) }, { k: "T", he: "T", unit: "N", value: (L) => RP.hangingPulley(hang(L), 0).T }],
        learn: "mB·g − T = mB·a ;  T − mA·g·sinθ ∓ μk·N = mA·a." })
    ]
  });

  // ---------------- S11 ----------------
  const dbl = (L) => ({ mA: mOf(L), mB: L.P.mB, angleA: L.P.thA, angleB: L.P.thB, muSA: L.P.mu + 0.05, muSB: L.P.mu + 0.05, muKA: L.P.mu, muKB: L.P.mu, g });
  add({
    id: "S11", tier: 2, title: "שתי פסגות וגלגלת", rig: "double", icon: "peaks", desc: "שני גופים על שני שיפועים, חבל אחד.",
    defaults: { thA: 20, thB: 45, mB: 2, mu: 0.05, load: 0 }, defaultsFn: (mc) => ({ mB: Math.round(mc * 1.5 * 10) / 10 }), controls: [{ k: "thA", he: "שיפוע הדמות θA", min: 5, max: 70, step: 1, unit: "°", d: 0 }, { k: "thB", he: "שיפוע המשקולת θB", min: 5, max: 70, step: 1, unit: "°", d: 0 }, { k: "mB", he: "המשקולת", min: 0.2, max: 8, step: 0.1, unit: "kg", d: 1 }, { k: "mu", he: "μk בשני הצדדים", min: 0, max: 0.6, step: 0.01, unit: "", d: 2 }],
    build: (P, mc, L) => RP.makeDouble({ mA: mc + (P.load || 0), mB: P.mB, angleA: P.thA, angleB: P.thB, muSA: P.mu + 0.05, muSB: P.mu + 0.05, muKA: P.mu, muKB: P.mu, g }),
    missions: [
      predict({ type: "experiment", skills: ["systems", "components"], text: "נבא: לאיזה צד המערכת תזוז?",
        options: ["לצד הדמות", "לצד המשקולת", "לא תזוז"], needs: (L, i) => after(L, i).some((r) => r.t > 0.6), needHint: "שחרר (▶).",
        truth: (L, i) => { const r = after(L, i).find((x) => x.t > 0.6); return !r.moved ? 2 : r.startDir > 0 ? 1 : 0; },
        learn: "משווים mB·g·sinθB מול mA·g·sinθA, לא את המסות עצמן." }),
      auto({ type: "prediction", skills: ["components", "inference"], text: "שנה רק שיפוע אחד, ומצא מצב שבו כיוון התנועה מתהפך.",
        check: (L) => { const rs = runs(L).filter((r) => r.moved); return rs.some((a) => rs.some((b) => a.startDir !== b.startDir && a.P.mB === b.P.mB && a.P.mu === b.P.mu && (a.P.thA === b.P.thA) !== (a.P.thB === b.P.thB))); },
        learn: "הכיוון נקבע מסימן ההפרש mB·sinθB − mA·sinθA." }),
      auto({ type: "manipulation", skills: ["static", "rest"], text: "מצא צירוף שבו המערכת בשיווי משקל.",
        check: (L) => runs(L).some((r) => !r.moved && r.t > 1), learn: "שיווי משקל: |הפרש רכיבי המשקל| ≤ סכום שני החיכוכים הסטטיים." }),
      fbd({ type: "force_diagram", skills: ["systems", "kinetic"], text: "כשהמשקולת יורדת: לאן החיכוך והמתיחות על כל גוף?",
        rows: [{ label: "חיכוך על הדמות", opts: ["upslope", "downslope", "none"], truth: () => "downslope" }, { label: "מתיחות על הדמות", opts: ["upslope", "downslope"], truth: () => "upslope" },
               { label: "חיכוך על המשקולת", opts: ["upslope", "downslope", "none"], truth: (L) => (L.P.mu > 0 ? "upslope" : "none") }, { label: "מתיחות על המשקולת", opts: ["upslope", "downslope"], truth: () => "upslope" }],
        learn: "על כל צד החיכוך נגד תנועת אותו גוף; המתיחות מושכת כל גוף אל הפסגה." }),
      numeric({ type: "calculation", skills: ["systems", "newton2", "kinetic"], text: "חשב את התאוצה המשותפת (המערכת בתנועה; + = המשקולת יורדת).",
        gate: (L) => RP.doubleInclinePulley(dbl(L), 0).mode === "kinetic", gateHint: "בחר ערכים שבהם המערכת זזה.",
        fields: [{ k: "a", he: "a", unit: "m/s²", value: (L) => RP.doubleInclinePulley(dbl(L), 0).a }],
        learn: "a = [mB·g·sinθB − mA·g·sinθA − μk(N_A + N_B)] / (mA + mB)." })
    ]
  });

  // ---------------- S12 ----------------
  const lk = (L) => ({ A: { m: mOf(L), muS: MATS[L.P.matA].s, muK: MATS[L.P.matA].k }, B: { m: L.P.mB, muS: MATS[L.P.matB].s, muK: MATS[L.P.matB].k } });
  const linkedSolve = (L) => { const { A, B } = lk(L), up = L.P.swap ? B : A, dn = L.P.swap ? A : B; const th = L.P.th * DEG, M = up.m + dn.m; const a = g * Math.sin(th) - g * Math.cos(th) * (up.m * up.muK + dn.m * dn.muK) / M; const T = dn.m * g * Math.sin(th) - dn.muK * dn.m * g * Math.cos(th) - dn.m * a; return { a, T, up, dn }; };
  add({
    id: "S12", tier: 3, title: "שני חברים על הרמפה", rig: "linked", icon: "pair", desc: "שני גופים בחבל אחד, חיכוך שונה לכל אחד.",
    defaults: { th: 30, mB: 2, matA: "sand", matB: "ice", swap: 0, load: 0 }, defaultsFn: (mc) => ({ mB: Math.round(mc * 10) / 10 }), controls: [C.th(15, 60), { k: "mB", he: "מסת הקופסה", min: 0.5, max: 6, step: 0.1, unit: "kg", d: 1 }],
    pairMats: true, swapBtn: true,
    build: (P, mc, L) => { const A = { m: mc + (P.load || 0), muS: MATS[P.matA].s, muK: MATS[P.matA].k }, B = { m: P.mB, muS: MATS[P.matB].s, muK: MATS[P.matB].k }; const s = RP.makeLinked({ angleDeg: P.th, A, B, rope: 0.7, swap: !!P.swap, L: 3.6 }); s.xUp = 0.3; s.xDn = 1.0; return s; },
    missions: [
      auto({ type: "experiment", skills: ["systems"], text: "שחרר את שני הגופים הקשורים (המחוספס למעלה) ותאר: הם זזים יחד?",
        check: (L) => runs(L).some((r) => r.taut > 0.8), then: choice({ q: "כשהחבל מתוח, שני הגופים…", options: ["באותה מהירות ובאותה תאוצה", "העליון מהיר יותר", "התחתון מהיר יותר"], right: () => 0 }),
        learn: "חבל מתוח ולא נמתח: אותה תנועה." }),
      fbd({ type: "prediction", skills: ["systems"], text: "החבל מתוח: לאן המתיחות על כל גוף?",
        rows: [{ label: "T על הגוף העליון", opts: ["upslope", "downslope", "none"], truth: () => "downslope" }, { label: "T על הגוף התחתון", opts: ["upslope", "downslope", "none"], truth: () => "upslope" }],
        learn: "אותו T, בכיוונים מנוגדים: החבל מושך כל גוף לעבר השני." }),
      numeric({ type: "manipulation", skills: ["systems", "newton2"], text: "חשב את התאוצה המשותפת (חבל מתוח; + = במורד).",
        gate: (L) => linkedSolve(L).T > 0 && linkedSolve(L).a > 0, gateHint: "שים את המחוספס למעלה ובחר זווית שבה הם מחליקים.",
        fields: [{ k: "a", he: "a", unit: "m/s²", value: (L) => linkedSolve(L).a }], learn: "a = g·sinθ − g·cosθ·(m₁μ₁ + m₂μ₂)/(m₁ + m₂)." }),
      numeric({ type: "force_diagram", skills: ["systems"], text: "חשב את מתיחות החבל.",
        gate: (L) => linkedSolve(L).T > 0 && linkedSolve(L).a > 0, gateHint: "החבל צריך להיות מתוח והגופים בתנועה.",
        fields: [{ k: "T", he: "T", unit: "N", value: (L) => linkedSolve(L).T }], learn: "מהמשוואה של גוף אחד: T = m·g·sinθ − f − m·a." }),
      auto({ type: "calculation", skills: ["systems", "inference"], text: "החלף את סדר הגופים (החלק למעלה) ושחרר: מה קורה לחבל?",
        check: (L) => runs(L).some((r) => r.slack), then: choice({ q: "החבל עכשיו…", options: ["דוחף את הגוף התחתון", "רפוי: חבל לא יכול לדחוף", "מתוח יותר"], right: () => 1 }),
        learn: "אם החישוב נותן T < 0 החבל מתרופף. כל גוף לבד, עד שהם נוגעים." })
    ]
  });

  // ---------------- S13 ----------------
  add({
    id: "S13", tier: 2, title: "מסה כפולה, אותה פיזיקה?", rig: "ramp", icon: "scale", desc: "מסה משנה כוחות, לא בהכרח תאוצה.",
    defaults: { th: 30, load: 0, muS: 0.3, muK: 0.2, Fx: 0 }, controls: [C.load(8), C.th(10, 55), { k: "Fx", he: "כוח קבוע במעלה", min: 0, max: (mc) => Math.ceil(mc * g * 0.6), step: 0.5, unit: "N", d: 1 }], surface: "wood", backpack: true,
    build: (P, mc) => single(P, mc, { s0: RAMP_L - 0.3, F: P.Fx }),
    missions: [
      auto({ type: "experiment", skills: ["newton2"], text: "השווה: שחרר בלי תרמיל ועם תרמיל (פי 2 במסה לפחות), בלי כוח חיצוני.",
        check: (L) => { const rs = runs(L).filter((r) => r.aFirst !== null && !r.P.Fx); return rs.some((a) => rs.some((b) => b.m >= 2 * a.m - 1e-9 && sameP(a.P, b.P, ["th", "muK"]))); },
        learn: "המדידות שוות: אותה זווית, אותו μ, אותה תאוצה." }),
      numeric({ type: "prediction", skills: ["components", "normal"], text: "עם המסה שעכשיו: כמה המשקל וכמה הנורמל?",
        fields: [{ k: "W", he: "W", unit: "N", value: (L) => mOf(L) * g }, { k: "N", he: "N", unit: "N", value: (L) => mOf(L) * g * cos(L.P.th) }], learn: "שניהם פרופורציוניים למסה." }),
      predict({ type: "manipulation", skills: ["newton2", "inference"], text: "נבא: אם מגדילים מסה (בלי כוח חיצוני), התאוצה…",
        options: ["גדלה", "קטנה", "לא משתנה"], needs: (L, i) => { const rs = after(L, i).filter((r) => r.aFirst !== null && !r.P.Fx); return rs.some((a) => rs.some((b) => b.m > a.m + 0.4 && sameP(a.P, b.P, ["th"]))); },
        needHint: "הרץ פעמיים עם מסות שונות.", truth: () => 2, learn: "ma = mg·sinθ − μk·mg·cosθ: m מצטמצמת." }),
      auto({ type: "force_diagram", skills: ["external", "newton2"], text: "הוסף כוח קבוע במעלה, והשווה שוב בין שתי מסות.",
        check: (L) => { const rs = runs(L).filter((r) => r.aFirst !== null && r.P.Fx > 0); return rs.some((a) => rs.some((b) => b.m > a.m + 0.4 && a.P.Fx === b.P.Fx && sameP(a.P, b.P, ["th"]) && Math.abs(a.aFirst - b.aFirst) > 0.01)); },
        learn: "עכשיו התאוצות שונות: F/m משתנה עם המסה." }),
      choice({ type: "calculation", skills: ["inference", "external"], text: "הסבר את ההבדל.", gate: (L) => L.done("S13-M04"), gateHint: "קודם השלם את המשימה הקודמת.",
        q: "למה עם כוח קבוע התוצאה תלויה במסה?", options: ["כי הכוח הקבוע לא גדל עם המסה, אז F/m קטן בגוף הכבד", "כי החיכוך גדל רק בגוף הכבד", "כי g תלוי במסה"], right: () => 0,
        learn: "כובד וחיכוך פרופורציוניים ל-m, והם מצטמצמים. כוח חיצוני קבוע לא." })
    ]
  });

  // ---------------- S14 ----------------
  const brakeMu = (P) => ({ s: Math.min(1.2, P.brake + 0.2), k: P.brake });
  add({
    id: "S14", tier: 3, title: "בלמי חירום", rig: "ramp", icon: "brake", desc: "החיכוך משתנה ברגע שלוחצים בלם.",
    defaults: { th: 15, load: 0, muS: 0.2, muK: 0.1, brake: 0.65 }, controls: [{ k: "brake", he: "עוצמת הבלם μk", min: 0.05, max: 1, step: 0.01, unit: "", d: 2 }, C.th(8, 40)], surface: "ice", brakeBtn: true, obstacle: 1.0, L: 9,
    build: (P, mc) => single(P, mc, { s0: 8.7, L: 9, sMin: 1.0, brake: { on: false, muS: brakeMu(P).s, muK: brakeMu(P).k } }),
    missions: [
      auto({ type: "experiment", skills: ["kinematics"], text: "תן לדמות לצבור מהירות במורד (לפחות 2 m/s).", check: (L) => runs(L).some((r) => r.vMax >= 2),
        learn: "μk·cosθ < sinθ: הכובד מנצח והמהירות גדלה." }),
      predict({ type: "prediction", skills: ["kinetic", "inference"], text: "לפני הלחיצה: אחרי הבלם, הדמות…",
        options: ["מאטה", "ממשיכה להאיץ, אבל פחות", "נעצרת מיד"],
        needs: (L, i) => after(L, i).some((r) => r.braked && r.t > r.braked.t + 0.3), needHint: "הרץ ולחץ על הבלם בזמן התנועה.",
        truth: (L, i) => { const r = after(L, i).find((x) => x.braked); return r.P.brake > tan(r.P.th) ? 0 : 1; },
        learn: "אם μk·cosθ < sinθ גם עם הבלם, התאוצה עדיין במורד: המהירות ממשיכה לגדול." }),
      auto({ type: "manipulation", skills: ["kinetic", "kinematics"], text: "עצור את הדמות לפני הסלע: בחר בלם ותזמון.",
        check: (L) => runs(L).some((r) => r.braked && r.endMode === "static" && r.barrier === null && r.settled),
        learn: "מרחק עצירה v²/(2|a|) עם a = g(μk·cosθ − sinθ)." }),
      choice({ type: "force_diagram", skills: ["graphs"], text: "הרץ עם בלם ופתח את גרף v(t).", graph: "v",
        gate: (L) => runs(L).some((r) => r.braked && r.t > r.braked.t + 0.3), gateHint: "הרץ, לחץ בלם, ופתח גרפים.",
        q: "ברגע הבלימה, בגרף v(t)…", options: ["v רציפה והשיפוע משתנה", "v קופצת לאפס", "v קופצת למטה ונשארת שם"], right: () => 0,
        learn: "μ משתנה בבת אחת, אז a קופצת; המהירות לא יכולה לקפוץ." }),
      predict({ type: "calculation", skills: ["static"], text: "נבא: אחרי שנעצרה עם הבלם, תישאר?", options: ["תישאר", "תחליק שוב"],
        needs: (L, i) => after(L, i).some((r) => r.braked && r.endMode === "static" && r.settled), needHint: "עצור אותה עם הבלם.",
        truth: (L, i) => { const r = after(L, i).find((x) => x.braked && x.endMode === "static"); return tan(r.P.th) <= brakeMu(r.P).s ? 0 : 1; },
        learn: "בעצירה בודקים μs של הבלם מול tanθ." })
    ]
  });

  // ---------------- S15 ----------------
  add({
    id: "S15", tier: 3, title: "לאן נעלמה האנרגיה?", rig: "ramp", icon: "energy", desc: "גובה, תנועה וחום.",
    defaults: { th: 30, load: 0, len: 4, muS: 0.25, muK: 0.2 }, controls: [C.th(10, 60), { k: "len", he: "אורך המסלול", min: 1, max: 6, step: 0.1, unit: "m", d: 1 }, { k: "muK", he: "μk", min: 0, max: 0.5, step: 0.01, unit: "", d: 2 }, C.load(6)],
    surface: "wood", energy: true, L: 6.2,
    build: (P, mc) => single({ ...P, muS: Math.max(P.muK, Math.min(1, P.muK + 0.05)) }, mc, { s0: P.len, L: 6.2 }),
    missions: [
      auto({ type: "experiment", skills: ["energy"], text: "בלי חיכוך (μk = 0): שחרר וצפה בעמודות הגובה והתנועה.",
        check: (L) => runs(L).some((r) => r.P.muK === 0 && r.barrier === "bottom"), learn: "בלי חיכוך: כל U הופכת ל-K." }),
      choice({ type: "prediction", skills: ["energy"], text: "עכשיו עם חיכוך: שחרר עד למטה.",
        gate: (L) => runs(L).some((r) => r.P.muK > 0 && r.barrier === "bottom"), gateHint: "הגדל μk ושחרר.",
        q: "חלק מאנרגיית הגובה לא הפך לתנועה. לאן הוא הלך?", options: ["לחום", "נעלם", "חזר לגובה"], right: () => 0, learn: "חיכוך הופך אנרגיה לחום. הסכום נשמר." }),
      numeric({ type: "manipulation", skills: ["energy"], text: "בנה את עמודות הריצה האחרונה (עם חיכוך): U בהתחלה, K בסוף, ואנרגיה שהתפזרה.",
        gate: (L) => runs(L).some((r) => r.P.muK > 0 && r.barrier === "bottom" && sameP(r.P, L.P, ["th", "len", "muK", "load"])), gateHint: "הרץ עד למטה עם חיכוך (בערכים שעכשיו).",
        fields: [{ k: "U", he: "U התחלה", unit: "J", value: (L) => mOf(L) * g * L.P.len * sin(L.P.th) }, { k: "K", he: "K סוף", unit: "J", value: (L) => RP.descentEnergy({ m: mOf(L), angleDeg: L.P.th, muK: L.P.muK, s: L.P.len }).deltaK }, { k: "Q", he: "חום", unit: "J", value: (L) => RP.descentEnergy({ m: mOf(L), angleDeg: L.P.th, muK: L.P.muK, s: L.P.len }).dissipated }],
        learn: "U = K + Q." }),
      numeric({ type: "force_diagram", skills: ["energy", "kinetic"], text: "חשב את עבודת החיכוך על כל המסלול (שים לב לסימן).",
        fields: [{ k: "W", he: "W_f", unit: "J", value: (L) => -RP.descentEnergy({ m: mOf(L), angleDeg: L.P.th, muK: L.P.muK, s: L.P.len }).dissipated }],
        learn: "W_f = −μk·mg·cosθ·d: שלילית, כי החיכוך נגד התנועה." }),
      auto({ type: "calculation", skills: ["energy", "inference"], text: "השווה שני מדרונות באותו גובה, באורכים שונים (עם חיכוך).",
        hint: "גובה = אורך × sinθ. למשל 2 m ב-60° ו-3.46 m ב-30°.",
        check: (L) => { const rs = runs(L).filter((r) => r.P.muK > 0 && r.barrier === "bottom"); const h = (r) => r.P.len * sin(r.P.th); return rs.some((a) => rs.some((b) => Math.abs(h(a) - h(b)) < 0.05 && Math.abs(a.P.len - b.P.len) > 0.5 && a.P.muK === b.P.muK)); },
        then: choice({ q: "באותו גובה ואותו μk, המסלול הארוך…", options: ["מגיע עם פחות K, יותר חום", "מגיע עם אותה K", "מגיע עם יותר K"], right: () => 0 }),
        learn: "Q = μk·mg·cosθ·d = μk·mg·(אורך אופקי). מדרון ארוך ומתון מתפזר יותר." })
    ]
  });

  // ---------------- S16 ----------------
  const springMax = (L) => { const s = fresh(L); RP.simulate(s, { tMax: 8, until: (t) => t.events.some((e) => e.type === "v_zero" && e.s < L.P.at) }); const e = s.events.find((x) => x.type === "v_zero" && x.s < L.P.at); return e ? L.P.at - e.s : 0; };
  add({
    id: "S16", tier: 4, title: "קפיץ בקצה הרמפה", rig: "ramp", icon: "spring", desc: "העשרה: דחיסת קפיץ, כוחות ואנרגיה.",
    defaults: { th: 25, load: 0, muS: 0.4, muK: 0.2, k: 100, d: 2.5, at: 0.8 }, controls: [{ k: "k", he: "קבוע הקפיץ k", min: 30, max: 500, step: 5, unit: "N/m", d: 0 }, { k: "d", he: "מרחק מהקפיץ", min: 0.3, max: 3, step: 0.1, unit: "m", d: 1 }, C.muK(), C.th(10, 45)],
    surface: "wood", spring: true, L: 4.2, enrichment: true,
    build: (P, mc) => single({ ...P, muS: Math.max(P.muS, P.muK) }, mc, { s0: P.at + P.d, L: 4.2, spring: { k: P.k, at: P.at } }),
    missions: [
      auto({ type: "experiment", skills: ["energy"], text: "שחרר כך שהדמות מגיעה לקפיץ.", check: (L) => runs(L).some((r) => r.contact), learn: "הקפיץ דוחף רק כשהוא נדחס." }),
      numeric({ type: "prediction", skills: ["graphs", "energy"], text: "מדוד בסרגל את הדחיסה המרבית בריצה האחרונה.",
        gate: (L) => runs(L).some((r) => r.contact && r.settled && sameP(r.P, L.P, ["k", "d", "muK", "th"])), gateHint: "הרץ עד שהדמות נעצרת.",
        fields: [{ k: "x", he: "x מרבי", unit: "m", value: (L) => springMax(L), tol: 0.05 }], learn: "בדחיסה המרבית v = 0 לרגע, וזה לא בהכרח שיווי משקל." }),
      choice({ type: "manipulation", skills: ["graphs"], text: "פתח את גרף F(x) של הקפיץ בריצה עם מגע.", graph: "Fx",
        gate: (L) => runs(L).some((r) => r.contact), gateHint: "הרץ כך שהדמות דוחסת את הקפיץ, ופתח גרפים.",
        q: "כשהדחיסה גדלה פי 2, כוח הקפיץ…", options: ["גדל פי 2", "גדל פי 4", "לא משתנה"], right: () => 0, learn: "F = k·x: קו ישר." }),
      numeric({ type: "force_diagram", skills: ["energy", "kinetic"], text: "מאזן אנרגיה עד הדחיסה המרבית: כמה אנרגיה בקפיץ, וכמה הפכה לחום?",
        gate: (L) => runs(L).some((r) => r.contact && sameP(r.P, L.P, ["k", "d", "muK", "th"])), gateHint: "הרץ בערכים שעכשיו.",
        fields: [{ k: "Es", he: "½kx²", unit: "J", value: (L) => 0.5 * L.P.k * springMax(L) ** 2 }, { k: "Q", he: "חום", unit: "J", value: (L) => L.P.muK * mOf(L) * g * cos(L.P.th) * (L.P.d + springMax(L)) }],
        learn: "mg(d + x)·sinθ = ½kx² + μk·mg·cosθ·(d + x)." }),
      predict({ type: "calculation", skills: ["static", "inference"], text: "נבא: הקפיץ יצליח לדחוף את הדמות חזרה במעלה?", options: ["כן", "לא, היא נתקעת דחוסה"],
        needs: (L, i) => after(L, i).some((r) => r.contact && r.settled), needHint: "הרץ עד הסוף.",
        truth: (L, i) => (after(L, i).find((r) => r.contact && r.settled).bounced ? 0 : 1),
        learn: "בדחיסה המרבית: אם k·x > mg·sinθ + μs·N היא חוזרת; אחרת החיכוך הסטטי מחזיק אותה." })
    ]
  });

  // ---------------- S17 ----------------
  const est = (r, P) => { const a = Math.abs(r.meas.a), th = r.P.th; const mu = (sin(th) - a / g) / cos(th), du = (a * 0.02 / g) / cos(th); return { mu, du }; };
  add({
    id: "S17", tier: 3, title: "המעבדה הסודית", rig: "ramp", icon: "envelope", desc: "μk מוסתר במעטפה. גלה אותו ממדידות.",
    defaults: { th: 30, load: 0 }, controls: [C.th(15, 60)], surface: "secret", secret: true,
    build: (P, mc, L) => single({ ...P, muS: L.secret.muS, muK: L.secret.muK }, mc, { s0: RAMP_L - 0.3 }),
    missions: [
      auto({ type: "experiment", skills: ["inference", "kinematics"], text: "מדוד תאוצה במורד (הדמות צריכה להחליק).", check: (L) => runs(L).some((r) => r.meas),
        learn: "המדידה כוללת ±2% רעש מכשיר. היא נרשמת בטבלה." }),
      numeric({ type: "prediction", skills: ["inference", "kinetic"], text: "מהמדידה האחרונה: הערך את μk.", gate: (L) => runs(L).some((r) => r.meas), gateHint: "קודם מדידה.",
        fields: [{ k: "mu", he: "μk", unit: "", value: (L) => est(runs(L).filter((r) => r.meas).slice(-1)[0]).mu, tolAbs: (L) => Math.max(0.01, 1.5 * est(runs(L).filter((r) => r.meas).slice(-1)[0]).du) }],
        learn: "μk = (sinθ − |a|/g) / cosθ." }),
      auto({ type: "manipulation", skills: ["inference"], text: "מדוד שוב בזווית אחרת (הפרש של 8° לפחות) והצלב.",
        check: (L) => { const ms = runs(L).filter((r) => r.meas); return ms.some((a) => ms.some((b) => Math.abs(a.P.th - b.P.th) >= 8 && Math.abs(est(a).mu - est(b).mu) <= est(a).du + est(b).du + 0.01)); },
        learn: "שתי זוויות, אותו μk בתוך אי-הוודאות: המודל עובד." }),
      choice({ type: "force_diagram", skills: ["newton2", "inference"], text: "שאלה למעבדה.", q: "למה לא צריך לדעת את המסה כדי למצוא את μk?",
        options: ["כי a = g(sinθ − μk·cosθ) לא תלויה במסה", "כי המסה תמיד 1 kg", "כי החיכוך לא תלוי בנורמל"], right: () => 0, learn: "כל הכוחות פרופורציוניים ל-m." }),
      numeric({ type: "calculation", skills: ["inference", "graphs"], text: "אחרי 3 מדידות לפחות: מה התשובה הסופית? (הממוצע נבדק מול אי-הוודאות)",
        gate: (L) => runs(L).filter((r) => r.meas).length >= 3, gateHint: "צריך שלוש מדידות.",
        fields: [{ k: "mu", he: "μk", unit: "", value: (L) => L.secret.muK, tolAbs: (L) => { const ms = runs(L).filter((r) => r.meas); return Math.max(0.01, ms.reduce((s, r) => s + est(r).du, 0) / ms.length * 1.5); } }],
        reveal: true, learn: "המעטפה נפתחת. מדידה עם רעש נותנת תחום, לא מספר מדויק." })
    ]
  });

  // ---------------- S18 ----------------
  add({
    id: "S18", tier: 5, title: "בגרות: שינוי סיטואציה", rig: "phases", icon: "exam", desc: "שאלה אחת, שלוש תצורות. כל פעם מחדש.",
    phases: { A: "מנוע שנכבה", B: "גוף תלוי", C: "כוח במנוחה" },
    defaults: { phase: "A", th: 37, load: 0, muS: 0, muK: 0, F: 45, tOff: 4, mB: 3, muS2: 0.5, muK2: 0.3, F2: 10 },
    defaultsFn: (mc) => ({ F: Math.round(mc * (g * sin(37) + 1.5) * 2) / 2, mB: Math.round(mc * 1.2 * 10) / 10, F2: Math.round(mc * g * sin(37) * 0.5 * 2) / 2 }),
    controlsFor: (P) => P.phase === "A" ? [C.F(2), { k: "tOff", he: "כיבוי אחרי", min: 1, max: 6, step: 0.1, unit: "s", d: 1 }] : P.phase === "B" ? [{ k: "mB", he: "המשקולת", min: 0.2, max: (mc) => Math.ceil(mc * 3), step: 0.1, unit: "kg", d: 1 }] : [{ k: "F2", he: "כוח מקביל F", min: 0, max: (mc) => Math.ceil(mc * g * 1.6), step: 0.5, unit: "N", d: 1 }],
    build: (P, mc) => {
      const m = mc + (P.load || 0);
      if (P.phase === "B") return RP.makeHanging({ mA: m, mB: P.mB, angleDeg: P.th, muS: 0, muK: 0, g, sMin: -1.3, sMax: 1.3 });
      if (P.phase === "C") return RP.makeSingle({ m, angleDeg: P.th, muS: P.muS2, muK: P.muK2, g, L: RAMP_L, s0: 1.2, F: P.F2 });
      return RP.makeSingle({ m, angleDeg: P.th, muS: 0, muK: 0, g, L: 30, s0: 0.2, F: P.F, forceOffAt: P.tOff });
    },
    measure: true, measureRow: (L, sim) => { const R = sim.resolve(); return { phase: L.P.phase, F: L.P.F2, f: R.f, mode: R.mode }; },
    missions: [
      numeric({ type: "experiment", skills: ["external", "kinematics"], text: "תצורה א: מנוע עד זמן הכיבוי. חשב את התאוצה ואת המהירות ברגע הכיבוי.", phase: "A",
        gate: (L) => L.P.phase === "A" && motorPeak(L).a1 > 0, gateHint: "תצורה א, עם כוח שמעלה.",
        fields: [{ k: "a", he: "a₁", unit: "m/s²", value: (L) => motorPeak(L).a1 }, { k: "v", he: "v בכיבוי", unit: "m/s", value: (L) => motorPeak(L).v }],
        learn: "a₁ = (F − mg·sinθ)/m, v = a₁·t." }),
      numeric({ type: "prediction", skills: ["kinematics", "energy"], text: "תצורה א: כמה גבוה (אנכית) מעל נקודת ההתחלה היא מגיעה?", phase: "A",
        gate: (L) => L.P.phase === "A" && motorPeak(L).a1 > 0, gateHint: "תצורה א.",
        fields: [{ k: "h", he: "גובה שיא", unit: "m", value: (L) => (motorPeak(L).d1 + motorPeak(L).d2) * sin(L.P.th) }],
        confirm: { check: (L, i) => after(L, i).some((r) => r.phase === "A" && r.tPeak !== null), hint: "הרץ ובדוק." },
        learn: "h = (d₁ + d₂)·sinθ. אחרי הכיבוי a = −g·sinθ." }),
      numeric({ type: "manipulation", skills: ["systems", "newton2"], text: "תצורה ב: המנוע הוחלף במשקולת תלויה (בלי חיכוך). חשב את התאוצה.", phase: "B",
        gate: (L) => L.P.phase === "B" && runs(L).some((r) => r.phase === "B" && r.t > 0.5), gateHint: "עבור לתצורה ב ושחרר.",
        fields: [{ k: "a", he: "a (+ = הדמות עולה)", unit: "m/s²", value: (L) => (L.P.mB * g - mOf(L) * g * sin(L.P.th)) / (mOf(L) + L.P.mB) }],
        learn: "עכשיו המסה הנגררת היא mA + mB, וה'כוח' משתנה: T = mB(g − a), לא קבוע." }),
      auto({ type: "force_diagram", skills: ["static", "external"], text: "תצורה ג: 📌 רשום שתי מדידות במנוחה שבהן החיכוך בכיוונים הפוכים.", phase: "C",
        hint: "עבור לתצורה ג. כוח חלש: רשום. כוח חזק (אבל עדיין במנוחה): רשום.",
        check: (L) => { const m = (L.meas || []).filter((r) => r.phase === "C" && r.mode === "static"); return m.some((a) => a.f > 1e-6) && m.some((b) => b.f < -1e-6); },
        learn: "החיכוך הסטטי משנה גם גודל וגם כיוון לפי F." }),
      fbd({ type: "calculation", skills: ["inference", "components", "static"], text: (L) => `פתרון מלא לתצורה ג עם F = ${examF(L)} N: לאן כל כוח, ומה גודל החיכוך?`, phase: "C",
        rows: [{ label: "mg", opts: SLOPE_DIRS, truth: () => "down" }, { label: "N", opts: SLOPE_DIRS, truth: () => "out" }, { label: "F", opts: SLOPE_DIRS, truth: () => "upslope" },
               { label: "f", opts: SLOPE_DIRS, truth: (L) => dirOf(R0(L, { phase: "C", F2: examF(L) }).f) }],
        then: numeric({ fields: [{ k: "f", he: "|f|", unit: "N", value: (L) => Math.abs(R0(L, { phase: "C", F2: examF(L) }).f) }], gate: (L) => R0(L, { phase: "C", F2: examF(L) }).mode === "static" }),
        learn: "במנוחה: f = mg·sinθ − F (אם יוצא שלילי, החיכוך במורד). בודקים מול μs·N." })
    ]
  });


  // ======================================================================
  //  running a lab (shared by the screen and the tests)
  // ======================================================================
  const isLive = (L) => !!L.scene.live;
  function rebuild(L, keep) {
    const old = L.sim, sim = L.scene.build(L.P, L.mc, L);
    if (keep && old && old.s !== undefined) { sim.s = Math.max(sim.lo, Math.min(sim.hi, old.s)); sim.v = old.v; sim.t = old.t; sim.heat = old.heat; sim.events = old.events.slice(); sim.peak = old.peak; sim.trough = old.trough; sim.stopped = old.stopped; }
    L.sim = sim; return sim;
  }
  function idle(L) { if (L.cur) finishRun(L); rebuild(L, false); L.running = false; if (isLive(L)) startRun(L, true); }
  function startRun(L, keep) {
    if (L.cur) finishRun(L);
    if (!keep || !L.sim) rebuild(L, false);
    L.cur = newRun(L, L.sim, L.nextId = (L.nextId || 0) + 1);
    L.running = true;
    return L.cur;
  }
  function finishRun(L) { if (!L.cur) return; L.cur.done = true; L.runs.push(L.cur); if (L.runs.length > 40) L.runs.shift(); L.cur = null; }
  // advance simulation time (slow motion = smaller dt: the same physics)
  function stepRun(L, dt) {
    if (!L.running || !L.sim) return null;
    L.sim.advance(dt);
    const R = track(L.cur, L.sim, L);
    if (L.sim.lost) L.lostSeen = true;
    if (!isLive(L) && L.cur.settled && L.cur.t > 0.6) { finishRun(L); L.running = false; }
    return R;
  }
  function setParam(L, k, v) {
    if (L.P[k] === v) return;
    L.P[k] = v;
    if (k === "muS" && L.P.muK > v) L.P.muK = v;
    if (k === "muK" && L.P.muS !== undefined && L.P.muS < v) L.P.muS = v;
    if (k === "mat") L.matSeen.add(v);
    if (isLive(L)) {
      const moved = L.cur && L.cur.moved;
      rebuild(L, true);
      if (L.cur && !moved) { L.cur.P = { ...L.P }; L.cur.m = mOf(L); L.cur.static0 = L.sim.resolve().mode === "static"; }
      else startRun(L, true);
      L.running = true;
    } else idle(L);
  }
  function addMeasure(L) { if (!L.scene.measureRow || !L.sim) return null; const row = L.scene.measureRow(L, L.sim); row.n = L.measCount = (L.measCount || 0) + 1; (L.meas = L.meas || []).push(row); if (L.meas.length > 12) L.meas.shift(); return row; }

  // ---------- checking missions ----------
  const okField = (L, f, v) => {
    const t = f.value(L);
    const abs = typeof f.tolAbs === "function" ? f.tolAbs(L) : f.tolAbs !== undefined ? f.tolAbs : 0.02;
    return { ok: Number.isFinite(v) && Math.abs(v - t) <= Math.max(abs, (f.tol || 0.02) * Math.abs(t)), truth: t };
  };
  const gateOk = (L, m) => !m.gate || !!m.gate(L);
  function checkNumeric(L, m, vals) { const res = m.fields.map((f) => okField(L, f, vals[f.k])); return { ok: res.every((r) => r.ok), res }; }
  function checkFbd(L, m, picks) { const res = m.rows.map((r, i) => ({ ok: picks[i] === r.truth(L), truth: r.truth(L) })); return { ok: res.every((r) => r.ok), res }; }
  function checkChoice(L, m, i) { const r = m.right(L); return { ok: i === r, right: r }; }
  // a prediction is locked before the experiment; afterwards the runs decide
  function lockPrediction(L, m, pick) { L.pred[m.id] = { pick, at: (L.nextId || 0) + (L.cur && !L.cur.moved && isLive(L) ? 0 : 1) }; if (L.cur && isLive(L) && !L.cur.moved) L.pred[m.id].at = L.cur.id; }
  function predictionResult(L, m) {
    const pr = L.pred[m.id]; if (!pr) return null;
    if (!m.needs(L, pr.at)) return { ready: false };
    const t = m.truth(L, pr.at);
    const ok = Array.isArray(t) ? t.every((x, i) => x === pr.pick[i]) : t === pr.pick;
    return { ready: true, ok, truth: t, pick: pr.pick };
  }
  function confirmResult(L, m) { const c = L.confirm && L.confirm[m.id]; if (c === undefined) return null; return m.confirm.check(L, c) ? { ok: true } : { ok: false }; }
  function armConfirm(L, m) { (L.confirm = L.confirm || {})[m.id] = (L.nextId || 0) + (L.cur && isLive(L) ? 0 : 1); }

  // a force for the exam question that keeps the body at rest with friction DOWN the slope (so the sign matters)
  function examF(L) { const m = mOf(L), th = L.P.th; return Math.round((m * g * sin(th) + 0.6 * L.P.muS2 * m * g * cos(th)) * 2) / 2; }
  // an "auto" mission only counts what the player does while it is the current mission
  function activate(L, m) { (L.since = L.since || {}); if (L.since[m.id] === undefined) L.since[m.id] = { run: L.cur && !L.cur.moved ? L.cur.id : (L.nextId || 0) + 1, meas: (L.measCount || 0) }; }
  function viewSince(L, m) {
    const sn = (L.since || {})[m.id]; if (!sn) return L;
    const V = Object.create(L);
    V.runs = L.runs.filter((r) => r.id >= sn.run); V.cur = L.cur && L.cur.id >= sn.run ? L.cur : (L.cur && S_LIVE(L) ? L.cur : null);
    V.meas = (L.meas || []).filter((r) => r.n > sn.meas);
    return V;
  }
  const S_LIVE = (L) => !!L.scene.live;
  function autoCheck(L, m) { return !!m.check(viewSince(L, m)); }
  const textOf = (L, m) => (typeof m.text === "function" ? m.text(L) : m.text);
  function startValues(scene, mc) { return { ...scene.defaults, ...(scene.defaultsFn ? scene.defaultsFn(mc) : {}) }; }
  const maxOf = (c, mc) => (typeof c.max === "function" ? c.max(mc) : c.max);

  function sameRunsP(rs, keys) { const ice = rs.filter((r) => r.P.mat === "ice").slice(-1)[0], wood = rs.filter((r) => r.P.mat === "wood").slice(-1)[0]; return ice && wood && sameP(ice.P, wood.P, keys); }
  function dirOf(f) { return f > 1e-9 ? "upslope" : f < -1e-9 ? "downslope" : "none"; }

  // mission ids, the pack's prompt type, and skill weights
  for (const s of SCENES) s.missions.forEach((m, i) => { m.id = s.id + "-M0" + (i + 1); m.scene = s.id; });
  const ALL = SCENES.flatMap((s) => s.missions);
  const TIERS = { 1: "יסודות", 2: "ביניים", 3: "מתקדם", 4: "העשרה", 5: "אתגר בגרות" };

  // ---------- the topic meter: first mastery per skill, weighted, not a click count ----------
  function skillPoints(completed, legacyDone) {
    const have = {}, avail = {};
    for (const k in SKILLS) { have[k] = 0; avail[k] = 0; }
    for (const m of ALL) { const w = 1 / m.skills.length; for (const k of m.skills) { avail[k] += w; if (completed.includes(m.id)) have[k] += w; } }
    // a legacy stage mapped onto a mission counts through that mission only (never twice)
    for (const id in LEGACY) { const l = LEGACY[id]; if (l.mission) continue; for (const k of l.skills) { avail[k] += 1; if (legacyDone.includes(id)) have[k] += 1; } }
    return { have, avail };
  }
  // a skill is mastered at 80% of what the chapter offers for it
  function coverage(completed, legacyDone) {
    const { have, avail } = skillPoints(completed, legacyDone);
    let s = 0; const per = {};
    for (const k in SKILLS) { per[k] = Math.min(1, have[k] / (0.8 * avail[k])); s += per[k]; }
    return { total: s / Object.keys(SKILLS).length, per };
  }
  // which tiers are open
  function unlocked(tier, completed) {
    const n = completed.length;
    return tier === 1 || (tier === 2 && n >= 4) || ((tier === 3 || tier === 4) && n >= 12) || (tier === 5 && n >= 25);
  }
  const UNLOCK_HE = { 2: "נפתח אחרי 4 משימות", 3: "נפתח אחרי 12 משימות", 4: "נפתח אחרי 12 משימות", 5: "נפתח אחרי 25 משימות" };

  // ---------- a lab: the state one situation screen works with ----------
  function newLab(scene, mc, saved = {}, secret) {
    const L = {
      scene, mc, P: { ...startValues(scene, mc), ...(saved.P || {}) }, runs: [], cur: null, pred: {}, meas: [], phase: null,
      secret: secret || { muK: 0.25, muS: 0.4 }, lostSeen: false, liveMoved: 0, matSeen: new Set(), completed: saved.completed || [],
      done(id) { return this.completed.includes(id); }
    };
    if (scene.defaults.mat) L.matSeen.add(L.P.mat);
    return L;
  }
  // a secret μ for the closed lab, from the player's id (same until "ניסוי חדש")
  function makeSecret(seed) {
    let h = 2166136261; for (const c of String(seed)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    const r = ((h >>> 0) % 10000) / 10000, muK = Math.round((0.12 + r * 0.33) * 100) / 100;
    return { muK, muS: Math.round((muK + 0.15) * 100) / 100 };
  }
  // a measured acceleration with honest ±2% instrument noise (deterministic per run)
  function noisy(a, runId, seed) { let h = 2166136261; for (const c of seed + ":" + runId) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } const e = (((h >>> 0) % 2001) / 1000 - 1) * 0.02; return a * (1 + e); }

  return { SKILLS, LEGACY, MATS, DIRS, SCENES, ALL, TIERS, UNLOCK_HE, newRun, track, rebuild, idle, startRun, finishRun, stepRun, setParam, addMeasure, gateOk, checkNumeric, checkFbd, checkChoice, lockPrediction, activate, autoCheck, textOf, startValues, maxOf, examF, predictionResult, confirmResult, armConfirm, isLive, coverage, skillPoints, unlocked, newLab, makeSecret, noisy, runs, mOf, near, motorPeak, segsOf, brakeMu, linkedSolve, springMax };
})();
if (typeof module !== "undefined") module.exports = RampScenes;
