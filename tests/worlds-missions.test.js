// Run: node tests/worlds-missions.test.js
// A robot player goes through all 84 situations and 336 missions with the same lab API as the screen:
// it searches slider values (on the sliders' own steps) until the situation's goal is reached by a real run,
// locks predictions before running, answers explanations, and computes then runs each transfer task.
global.RampPhys = require("../art/physics/ramp-engine.js");
global.WorldPhys = require("../art/physics/worlds-engine.js");
global.WorldsCore = require("../art/physics/worlds-core.js");
const S = require("../art/physics/worlds-scenes.js");
let n = 0, fails = 0;
const ok = (name, c, d = "") => { n++; if (c) { if (process.env.V) console.log("PASS", name, d); } else { fails++; console.log("FAIL", name, d); } };

function run(L, P) { if (P) { L.P = S.clampP(L.scene, { ...P }); S.idle(L); } if (!S.startRun(L)) return null; let g = 0; while (L.running && g++ < 4000) S.stepRun(L, 1 / 60); return L.runs[L.runs.length - 1]; }
function grid(sc, k, n = 24) { const [, lo, hi, st] = sc.knobs[k]; const steps = Math.round((hi - lo) / st), out = new Set(); for (let i = 0; i <= n; i++) out.add(+(lo + Math.round(i * steps / n) * st).toFixed(6)); out.add(sc.start[k]); return [...out]; }
function fine(sc, k) { const [, lo, hi, st] = sc.knobs[k]; const steps = Math.round((hi - lo) / st); return steps <= 1000 ? Array.from({ length: steps + 1 }, (_, i) => +(lo + i * st).toFixed(6)) : grid(sc, k, 200); }

function solveGoal(L, m) {
  const sc = L.scene, keys = Object.keys(sc.knobs), g = m.goal;
  if (g.kind === "one") {
    // one knob over its whole slider, then pairs of knobs on a grid
    for (const k of keys) for (const v of fine(sc, k)) { run(L, { ...sc.start, [k]: v }); if (S.goalReached(L, m)) return true; }
    const g2 = (k, o) => (fine(sc, k).length * fine(sc, o).length <= 12000 ? fine(sc, k) : grid(sc, k, 30));
    for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) for (const a of g2(keys[i], keys[j])) for (const b of g2(keys[j], keys[i])) {
      run(L, { ...sc.start, [keys[i]]: a, [keys[j]]: b }); if (S.goalReached(L, m)) return true; }
    return false;
  }
  const vary = g.keys || keys;
  const bases = [{ ...sc.start }]; for (const k of keys) if (!vary.includes(k)) for (const v of grid(sc, k, 12)) bases.push({ ...sc.start, [k]: v });
  for (const B of bases) {
    run(L, B);
    for (const k of vary) for (const v of fine(sc, k)) {
      const Q = { ...B, [k]: v }; if (k === "muK" && Q.muS < v) Q.muS = v; if (k === "muS" && Q.muK > v) Q.muK = v;
      run(L, Q); if (S.goalReached(L, m)) return true; L.runs.pop();
    }
    // goals that need several knobs moved together (e.g. both coordinates of a sensor)
    if (vary.length > 1) for (const a of grid(sc, vary[0], 12)) for (const b of grid(sc, vary[1], 12)) { run(L, { ...B, [vary[0]]: a, [vary[1]]: b }); if (S.goalReached(L, m)) return true; L.runs.pop(); }
  }
  return false;
}

const t0 = Date.now();
for (const sc of S.SCENES) {
  const L = S.newLab(sc);
  const [m1, m2, m3, m4] = sc.missions;
  // M1: lock first, then the run decides; a wrong guess can be retried with a new prediction and a new run
  { S.activate(L, m1); const q = S.predQuestion(L, m1); S.lockPrediction(L, m1, 0); const r0 = S.predictionResult(L, m1);
    run(L); let r = S.predictionResult(L, m1);
    if (r.ready && !r.ok) { S.lockPrediction(L, m1, r.truth); run(L); r = S.predictionResult(L, m1); }
    ok(`${m1.id} prediction`, !r0.ready && r.ready && r.ok && q.opts.length >= 2, r0.ready ? "decided before the run" : ""); }
  // M2: not reached before acting; reachable with slider values and real runs
  { S.activate(L, m2); const before = S.goalReached(L, m2); const got = solveGoal(L, m2);
    ok(`${m2.id} goal: ${m2.goal.text}`, !before && got, before ? "reached before acting" : got ? "" : "no slider values reach it"); }
  // M3: closed before any run (fresh lab), right answer only
  { const F = S.newLab(sc); ok(`${m3.id} explain`, !S.explainOpen(F) && S.explainOpen(L) && m3.opts[m3.right] && m3.opts.length >= 3); }
  // M4: compute, then a run with the new values confirms (not before)
  { S.activate(L, m4); const task = S.transferTask(L, m4);
    const good = S.checkTransfer(L, m4, task.truth, task).ok, bad = S.checkTransfer(L, m4, task.truth + Math.max(1, Math.abs(task.truth) * 0.5), task).ok;
    S.armTransfer(L, m4, task); const pre = S.transferConfirmed(L, m4); const r = run(L);
    ok(`${m4.id} transfer: ${task.text}`, Number.isFinite(task.truth) && good && !bad && !pre && r && S.transferConfirmed(L, m4), `truth=${task.truth}`); }
}
// progress: topics, weights, no 100% from predictions alone
{ const predsOnly = S.ALL.filter((m) => m.kind === "predict").map((m) => m.id), ev = S.topicEvidence(predsOnly);
  ok("predictions alone never give more than 10% of a topic", Object.values(ev).every((o) => o.frac <= 0.1000001));
  const all = S.topicEvidence(S.ALL.map((m) => m.id)); ok("everything done = 100% of each fed topic", Object.values(all).every((o) => Math.abs(o.frac - 1) < 1e-12));
  ok("12 worlds × 7 situations, 336 missions", S.DATA.worlds.length === 12 && S.DATA.worlds.every((w) => w.sceneIds.length === 7) && S.ALL.length === 336 && new Set(S.ALL.map((m) => m.id)).size === 336); }
console.log(`\n${n - fails}/${n} passed (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
if (fails) process.exit(1);
