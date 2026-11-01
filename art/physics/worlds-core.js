// ======================================================================
//  The shared core of the "worlds" (mechanics, electricity): builds the
//  situations from a domain's content, runs labs, checks the four missions
//  and measures topic evidence. A domain supplies its data, its physics
//  (evaluate, makeSim) and its per-situation goals and family templates.
// ======================================================================
const WorldsCore = (() => {
  "use strict";
  function make(cfg) {
    const { D, evaluate, makeSim, SETUP, FAM, WHY, TOPIC_OF, ICON_OF_FAMILY } = cfg;
    const EXTRA_KNOBS = cfg.EXTRA_KNOBS || {}, EXTRA_DEFAULTS = cfg.EXTRA_DEFAULTS || {};
    const W = { makeSim };
    const SCENE_ID = cfg.sceneId || ((id) => id);
    const LABEL = cfg.label || ((sc, model) => model.label);
    // ---------------- the 84 situations ----------------
    const SCENES = D.scenes.map((sc) => {
      const setup = SETUP[sc.id] || {};
      const model = D.models[sc.family];
      const knobs = { ...model.knobs, ...(EXTRA_KNOBS[sc.family] || {}) };
      const start = { ...sc.params, ...(EXTRA_DEFAULTS[sc.family] || {}), ...(setup.start || {}) };
      const s = { ...sc, setup, knobs, start, topic: TOPIC_OF[sc.family], icon: ICON_OF_FAMILY[sc.family], readouts: model.readouts, label: model.label };
      const pr = (P) => FAM[sc.family].pred(P, s);
      s.missions = [
        { id: sc.id + "-M1", scene: sc.id, kind: "predict", type: "predict", text: "תחזית לפני הניסוי", pred: pr, weight: 0.1, coins: 3 },
        { id: sc.id + "-M2", scene: sc.id, kind: "goal", type: "manipulate", text: sc.objective, goal: setup.goal, weight: 0.35, coins: 5 },
        { id: sc.id + "-M3", scene: sc.id, kind: "choice", type: "explain", text: "הסבר", ...(WHY[sc.id] || FAM[sc.family].why), weight: 0.25, coins: 5 },
        { id: sc.id + "-M4", scene: sc.id, kind: "transfer", type: "transfer", text: "העברה: תנאי חדש", xfer: (P) => FAM[sc.family].xfer(P, s), weight: 0.3, coins: 5 }
      ];
      return s;
    });
    const ALL = SCENES.flatMap((s) => s.missions);
    const byId = (id) => SCENES.find((s) => s.id === id);

    // ======================================================================
    //  a lab: one situation's live state (shared by the screen and the tests)
    // ======================================================================
    function newLab(scene, saved = {}) {
      return { scene, P: { ...scene.start, ...(saved.P || {}) }, runs: [], cur: null, sim: null, nextId: 0, pred: {}, since: {}, xfer: {}, running: false };
    }
    const simOpts = cfg.simOpts || ((sc, P) => ({ brake: !!sc.setup.brake, gap: sc.setup.gap, v: P.v, vf: P.vf }));
    function evalP(sc, P) { try { const r = evaluate(sc.family, P); if (r && r.valid === false) return { invalid: r.error }; return r; } catch (e) { return { invalid: e.message }; } }
    function clampP(sc, P) {
      for (const k in sc.knobs) { const [, lo, hi] = sc.knobs[k]; if (typeof P[k] === "number") P[k] = Math.min(hi, Math.max(lo, P[k])); }
      if (P.muK !== undefined && P.muS !== undefined && P.muK > P.muS) P.muK = P.muS;
      if (sc.family === "bank" && P.angle <= 0) P.angle = 1;
      return P;
    }
    function idle(L) { finishRun(L); L.sim = null; L.running = false; }
    function startRun(L) {
      finishRun(L);
      const sc = L.scene, P = { ...L.P }, e = evalP(sc, P);
      if (e.invalid) return null;
      L.sim = W.makeSim(sc.family, P, simOpts(sc, P));
      L.cur = { id: ++L.nextId, P, ev: e, events: [], end: {}, moved: false, dir: 0, a0: null, changed: changedCount(sc, P) };
      L.running = true;
      return L.cur;
    }
    function stepRun(L, dt) {
      if (!L.running || !L.sim) return;
      L.sim.step(dt);
      const r = L.cur, s = L.sim;
      for (const e of s.events.slice(r.events.length)) r.events.push(e.type);
      r.end = { ...s.st };
      if (s.tr) { const R = s.tr.resolve(); if (r.a0 === null && R.mode === "kinetic") r.a0 = R.a; if (!r.moved && Math.abs(s.tr.s - (s.tr.def.s0 || 0)) > 1e-4) { r.moved = true; r.dir = Math.sign(s.tr.s - (s.tr.def.s0 || 0)); } }
      if (s.done) { finishRun(L); L.running = false; }
    }
    function finishRun(L) { if (!L.cur) return; L.cur.done = true; L.runs.push(L.cur); if (L.runs.length > 40) L.runs.shift(); L.cur = null; }
    const runsOf = (L) => (L.cur ? L.runs.concat([L.cur]) : L.runs);
    function setParam(L, k, v) { L.P[k] = v; clampP(L.scene, L.P); idle(L); }
    function changedCount(sc, P) { return Object.keys(sc.knobs).filter((k) => Math.abs((P[k] || 0) - (sc.start[k] || 0)) > 1e-9).length; }
    // the run must come from the player's own change (a goal that keeps other values fixed may need only one)
    const needChanges = () => 1;
    function activate(L, m) { if (L.since[m.id] === undefined) L.since[m.id] = L.nextId + 1; }
    const since = (L, m) => runsOf(L).filter((r) => r.done && r.id >= (L.since[m.id] || 1));

    // M2: the situation's goal
    function goalReached(L, m) {
      const g = m.goal, rs = since(L, m);
      if (!g) return false;
      if (g.kind === "one") return rs.some((r) => r.changed >= needChanges(L.scene) && g.check(r));
      const only = (a, b) => { const diff = Object.keys(L.scene.knobs).filter((k) => Math.abs((a.P[k] || 0) - (b.P[k] || 0)) > 1e-9); return g.keys ? diff.length > 0 && diff.every((k) => g.keys.includes(k)) : diff.length === 1; };
      for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) if (only(rs[i], rs[j]) && g.check(rs[i], rs[j])) return true;
      return false;
    }
    // M1: the question is asked about the values on screen; the run with those values decides
    function predQuestion(L, m) { return m.pred(L.P); }
    function lockPrediction(L, m, pick) { L.pred[m.id] = { pick, P: { ...L.P }, at: L.nextId + 1, q: m.pred(L.P) }; }
    function predictionResult(L, m) {
      const pr = L.pred[m.id]; if (!pr) return null;
      const r = runsOf(L).find((x) => x.done && x.id >= pr.at && Object.keys(L.scene.knobs).every((k) => Math.abs((x.P[k] || 0) - (pr.P[k] || 0)) < 1e-9));
      if (!r) return { ready: false, changed: Object.keys(L.scene.knobs).some((k) => Math.abs((L.P[k] || 0) - (pr.P[k] || 0)) > 1e-9) };
      const t = pr.q.truth(r);
      return { ready: true, ok: t === pr.pick, truth: t };
    }
    // M3: open after at least one run
    const explainOpen = (L) => runsOf(L).some((r) => r.done);
    // M4: compute for the new condition, then the run with it confirms
    function transferTask(L, m) { const x = m.xfer(L.P); const Q = clampP(L.scene, { ...L.P, ...x.change }); return { text: x.text, field: x.field, Q, truth: x.field.value(Q) }; }
    function checkTransfer(L, m, value, task) {
      const t = task.truth, tol = Math.max(0.02, 0.02 * Math.abs(t));
      return { ok: Number.isFinite(value) && Number.isFinite(t) && Math.abs(value - t) <= tol, truth: t };
    }
    function armTransfer(L, m, task) { L.xfer[m.id] = { Q: task.Q, at: L.nextId + 1 }; L.P = { ...task.Q }; idle(L); }
    function transferConfirmed(L, m) {
      const x = L.xfer[m.id]; if (!x) return false;
      return runsOf(L).some((r) => r.done && r.id >= x.at && Object.keys(L.scene.knobs).every((k) => Math.abs((r.P[k] || 0) - (x.Q[k] || 0)) < 1e-9));
    }

    // ---------------- progress: evidence per topic, weighted by mission type ----------------
    // a situation's four missions weigh 0.1 / 0.35 / 0.25 / 0.3: one lucky prediction is never mastery
    function topicEvidence(done) {
      const out = {};
      for (const sc of SCENES) {
        const o = out[sc.topic] || (out[sc.topic] = { have: 0, total: 0 });
        for (const m of sc.missions) { o.total += m.weight; if (done.includes(m.id)) o.have += m.weight; }
      }
      for (const k in out) out[k].frac = out[k].have / out[k].total;
      return out;
    }
    const worldDone = (w, done) => { const ids = SCENES.filter((s) => s.w === w).flatMap((s) => s.missions.map((m) => m.id)); return ids.filter((id) => done.includes(id)).length / ids.length; };

    return { DATA: D, SCENES, ALL, byId, TOPIC_OF, newLab, startRun, stepRun, finishRun, idle, setParam, clampP, evalP, runsOf, activate, goalReached, predQuestion, lockPrediction, predictionResult,
      explainOpen, transferTask, checkTransfer, armTransfer, transferConfirmed, topicEvidence, worldDone, needChanges, changedCount };
  }
  return { make };
})();
if (typeof module !== "undefined") module.exports = WorldsCore;
