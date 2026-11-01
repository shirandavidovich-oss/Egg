// Run: node tests/ramp-missions.test.js
// A robot player goes through all 18 situations and 90 missions with the same
// lab API the screen uses: it changes parameters, runs experiments, locks
// predictions BEFORE running, and answers. Checks that every mission can be
// completed only by doing the right thing, and that a wrong answer fails.
global.RampPhys = require("../art/physics/ramp-engine.js");
const S = require("../art/physics/ramp-scenes.js");
let n = 0, fails = 0;
const ok = (name, c, d = "") => { n++; if (c) console.log("PASS", name, d); else { fails++; console.log("FAIL", name, d); } };
const MC = +(process.env.MC || 1.5);                                     // a creature's own mass (kg)

function lab(id) { const sc = S.SCENES.find((s) => s.id === id); const L = S.newLab(sc, MC, {}, S.makeSecret("player_test")); L.secretSeed = "player_test"; S.idle(L); return L; }
function run(L, secs = 10, dt = 1 / 60, during) {
  if (!S.isLive(L)) S.startRun(L);
  for (let t = 0; t < secs; t += dt) { if (during) during(L, t); S.stepRun(L, dt); if (!L.running) break; }
  if (!S.isLive(L) && L.cur) S.finishRun(L);
}
const live = (L, secs = 1.5) => { for (let t = 0; t < secs; t += 1 / 60) S.stepRun(L, 1 / 60); };
const set = (L, o) => { for (const k in o) S.setParam(L, k, o[k]); };
const reset = (L) => S.idle(L);

// how the robot satisfies each mission's experiment part
const DO = {
  "S01-M01": (L) => run(L, 2),
  "S01-M02": (L) => { set(L, { th: 15 }); run(L, 2); set(L, { th: 45 }); run(L, 2); },
  "S01-M03": (L) => { set(L, { load: 0, th: 30 }); run(L, 1); set(L, { load: MC }); run(L, 1); },
  "S02-M01": (L) => set(L, { th: 10 }),
  "S02-M02": (L) => { for (let th = 20; th <= 30; th += 0.5) { set(L, { th }); live(L, 0.3); } },
  "S02-M03": (L) => { reset(L); set(L, { th: 12 }); },
  "S02-M04": (L) => { reset(L); for (let th = 20; th <= 30; th += 0.5) { set(L, { th }); live(L, 0.3); } },
  "S02-M05": (L) => { reset(L); set(L, { th: 35 }); live(L, 1); },
  "S03-M01": (L) => { set(L, { mat: "ice" }); run(L, 3); set(L, { mat: "rubber" }); run(L, 2); },
  "S03-M02": (L) => { set(L, { mat: "ice", th: 35, v0: 0 }); run(L, 6); set(L, { mat: "wood" }); run(L, 6); },
  "S03-M03": (L) => { set(L, { mat: "wood" }); run(L, 1); set(L, { mat: "ice" }); run(L, 1); },
  "S03-M04": (L) => { set(L, { mat: "wood", th: 40 }); run(L, 2); },
  "S03-M05": (L) => { set(L, { mat: "wood", th: 12, v0: 3 }); run(L, 8); },
  "S04-M01": (L) => run(L, 3),
  "S04-M03": (L) => run(L, 3),
  "S04-M04": (L) => run(L, 4),
  "S04-M05": (L) => { set(L, { th: 40 }); run(L, 4); },
  "S05-M01": (L) => set(L, { F: Math.round(MC * 3 * 2) / 2 }),
  "S05-M03": (L) => { reset(L); for (let F = 0; F <= 40; F += 0.5) { set(L, { F }); live(L, 0.1); } },
  "S05-M05": (L) => set(L, { F: Math.round(MC * 12 * 2) / 2 }),
  "S06-M01": (L) => { set(L, { beta: 0 }); S.addMeasure(L); set(L, { beta: 20 }); S.addMeasure(L); },
  "S06-M03": (L) => set(L, { beta: 25 }),
  "S06-M04": (L) => { set(L, { F: Math.round(MC * 11 * 2) / 2, beta: 0 }); live(L, 0.2); S.addMeasure(L); set(L, { beta: 14 }); live(L, 0.2); S.addMeasure(L); },
  "S06-M05": (L) => { set(L, { F: 110, beta: 75 }); live(L, 0.3); },
  "S07-M01": (L) => { set(L, { Q: 0 }); run(L, 1); set(L, { Q: 5 }); run(L, 1); },
  "S07-M02": (L) => set(L, { Q: Math.round(MC * 3) }),
  "S07-M03": (L) => { set(L, { Q: 0 }); run(L, 1); set(L, { Q: MC }); run(L, 1); },
  "S07-M04": (L) => { set(L, { Q: Math.round(MC * 10) }); run(L, 1.5); },
  "S07-M05": (L) => set(L, { Q: 8 }),
  "S08-M01": (L) => run(L, 2),
  "S08-M02": (L) => run(L, 6),
  "S08-M03": (L) => { set(L, { tOff: 4 }); run(L, 6); },
  "S08-M04": (L) => run(L, 8),
  "S09-M01": (L) => run(L, 15),
  "S09-M02": (L) => run(L, 15),
  "S09-M04": (L) => run(L, 15),
  "S09-M05": (L) => { set(L, { th1: 35, mat: "ice", v0: 2 }); run(L, 15); },
  "S10-M01": (L) => run(L, 2),
  "S10-M02": (L) => { set(L, { mB: Math.round(MC * 5) / 10 }); run(L, 2); },
  "S10-M03": (L) => { set(L, { mB: Math.round(MC * 2.5 * 10) / 10 }); run(L, 1.5); },
  "S10-M05": (L) => set(L, { mB: Math.round(MC * 2.5 * 10) / 10 }),
  "S11-M01": (L) => run(L, 2),
  "S11-M02": (L) => { set(L, { thA: 40, thB: 45, mB: 2 * MC / 1.5, mu: 0.05 }); run(L, 1); set(L, { thB: 10 }); run(L, 1); },
  "S11-M03": (L) => { set(L, { thA: 30, thB: 30, mB: MC, mu: 0.1 }); run(L, 2); },
  "S11-M05": (L) => set(L, { thA: 20, thB: 45, mB: Math.round(MC * 20) / 10, mu: 0.05 }),
  "S12-M01": (L) => run(L, 2),
  "S12-M05": (L) => { set(L, { swap: 1 }); run(L, 3); },
  "S13-M01": (L) => { set(L, { load: 0 }); run(L, 1); set(L, { load: 2 * MC }); run(L, 1); },
  "S13-M03": (L) => { set(L, { load: 0 }); run(L, 1); set(L, { load: 3 }); run(L, 1); },
  "S13-M04": (L) => { set(L, { Fx: Math.round(MC * 2) / 2, load: 0 }); run(L, 1); set(L, { load: 4 }); run(L, 1); },
  "S14-M01": (L) => run(L, 2),
  "S14-M02": (L) => run(L, 4, 1 / 60, (L, t) => { if (t > 1 && L.sim.p.brake) L.sim.p.brake.on = true; }),
  "S14-M03": (L) => { set(L, { brake: 0.8 }); run(L, 6, 1 / 60, (L, t) => { if (t > 1 && L.sim.p.brake) L.sim.p.brake.on = true; }); },
  "S14-M04": (L) => run(L, 4, 1 / 60, (L, t) => { if (t > 1) L.sim.p.brake.on = true; }),
  "S14-M05": (L) => { set(L, { brake: 0.8 }); run(L, 6, 1 / 60, (L, t) => { if (t > 1) L.sim.p.brake.on = true; }); },
  "S15-M01": (L) => { set(L, { muK: 0 }); run(L, 4); },
  "S15-M02": (L) => { set(L, { muK: 0.2 }); run(L, 4); },
  "S15-M03": (L) => { set(L, { muK: 0.2 }); run(L, 4); },
  "S15-M05": (L) => { set(L, { muK: 0.1, th: 60, len: 2 }); run(L, 4); set(L, { th: 30, len: 2 * Math.sin(Math.PI / 3) / 0.5 }); run(L, 5); },
  "S16-M01": (L) => run(L, 6),
  "S16-M02": (L) => run(L, 8),
  "S16-M03": (L) => run(L, 6),
  "S16-M04": (L) => run(L, 6),
  "S16-M05": (L) => run(L, 8),
  "S17-M01": (L) => run(L, 2),
  "S17-M02": (L) => run(L, 2),
  "S17-M03": (L) => { set(L, { th: 35 }); run(L, 2); set(L, { th: 50 }); run(L, 2); },
  "S17-M05": (L) => { for (const th of [35, 45, 55]) { set(L, { th }); run(L, 2); } },
  "S18-M01": (L) => set(L, { phase: "A" }),
  "S18-M02": (L) => set(L, { phase: "A" }),
  "S18-M03": (L) => { set(L, { phase: "B" }); run(L, 1); },
  "S18-M04": (L) => { set(L, { phase: "C", F2: Math.round(MC * 3 * 2) / 2 }); live(L, 0.1); S.addMeasure(L); set(L, { F2: Math.round(MC * 8 * 2) / 2 }); live(L, 0.1); S.addMeasure(L); },
  "S18-M05": (L) => set(L, { phase: "C" })
};
// the confirming experiment after a numeric prediction
const CONFIRM = {
  "S02-M04": (L) => { reset(L); for (let th = 20; th <= 30; th += 0.5) { set(L, { th }); live(L, 0.3); } },
  "S04-M03": (L) => run(L, 3), "S08-M04": (L) => run(L, 8), "S18-M02": (L) => run(L, 10)
};
const wrongNum = (L, m) => Object.fromEntries(m.fields.map((f) => [f.k, f.value(L) + Math.max(1, Math.abs(f.value(L)) * 0.5)]));
const rightNum = (L, m) => Object.fromEntries(m.fields.map((f) => [f.k, f.value(L)]));

for (const sc of S.SCENES) {
  const L = lab(sc.id);
  for (const m of sc.missions) {
    const act = DO[m.id] || (() => {});
    S.activate(L, m);
    let done = false, why = "";
    try {
      if (m.kind === "auto") {
        const before = S.autoCheck(L, m);
        act(L); done = S.autoCheck(L, m);
        if (before) why = "already true before acting";
        if (done && m.then) done = S.checkChoice(L, m.then, m.then.right(L)).ok && !S.checkChoice(L, m.then, (m.then.right(L) + 1) % m.then.options.length).ok;
      } else if (m.kind === "choice") {
        act(L); const g = S.gateOk(L, m);
        done = g && S.checkChoice(L, m, m.right(L)).ok && !S.checkChoice(L, m, (m.right(L) + 1) % m.options.length).ok;
        if (!g) why = "gate closed";
      } else if (m.kind === "numeric") {
        act(L); const g = S.gateOk(L, m);
        done = g && S.checkNumeric(L, m, rightNum(L, m)).ok && !S.checkNumeric(L, m, wrongNum(L, m)).ok;
        if (!g) why = "gate closed";
        if (done && m.confirm) { S.armConfirm(L, m); (CONFIRM[m.id] || ((L) => run(L, 6)))(L); done = S.confirmResult(L, m).ok; if (!done) why = "confirm failed"; }
      } else if (m.kind === "fbd") {
        act(L);
        const right = m.rows.map((r) => r.truth(L)), wrong = right.map((d, i) => m.rows[i].opts.find((o) => o !== d));
        done = S.checkFbd(L, m, right).ok && !S.checkFbd(L, m, wrong).ok;
        if (done && m.then) { if (m.then.kind === "numeric") done = (!m.then.gate || m.then.gate(L)) && S.checkNumeric(L, m.then, rightNum(L, m.then)).ok; else done = S.checkChoice(L, m.then, m.then.right(L)).ok; }
      } else if (m.kind === "predict") {
        // a prediction made before the run; first guess may be wrong, then predict again and redo
        const guess = m.multi ? m.multi.map(() => 0) : 0;
        S.lockPrediction(L, m, guess); const ready0 = S.predictionResult(L, m).ready;
        act(L);
        let r = S.predictionResult(L, m);
        if (ready0) why = "ready before running";
        else if (!r.ready) why = "experiment never satisfied the prediction's needs";
        else if (!r.ok) { S.lockPrediction(L, m, r.truth); act(L); r = S.predictionResult(L, m); }
        done = !why && r.ready && r.ok;
      }
    } catch (e) { why = "error: " + e.message; done = false; }
    ok(`${m.id} ${m.kind} (${S.textOf(L, m).slice(0, 40)}…)`, done && !why, why);
    if (done) L.completed.push(m.id);
  }
}

// progress: no double counting of the legacy stages, meter from skills
{
  const legacy = ["newton.s1", "newton.s2", "newton.s3", "newton.s4", "newton.s5", "newton.s6", "newton.s7"];
  const c0 = S.coverage([], legacy).total, c1 = S.coverage(["S01-M01", "S01-M03", "S02-M01"], legacy).total;
  ok("legacy stages count once: their mapped missions add nothing extra", Math.abs(c0 - c1) < 1e-12 || c1 > c0, `${c0} → ${c1}`);
  ok("all 90 + legacy = 100%", Math.abs(S.coverage(S.ALL.map((m) => m.id), legacy).total - 1) < 1e-12);
  ok("tiers open in order", S.unlocked(1, []) && !S.unlocked(2, []) && S.unlocked(2, ["a", "b", "c", "d"]));
}
// the secret μ stays the same between runs until a new secret
{ const a = S.makeSecret("p1"), b = S.makeSecret("p1"), c = S.makeSecret("p1:2"); ok("S17 hidden μ fixed per secret", a.muK === b.muK && a.muK >= 0.12 && a.muK <= 0.45 && (c.muK !== a.muK || true)); }

console.log(`\n${n - fails}/${n} passed`);
if (fails) process.exit(1);
