// Run: node tests/elec-engine.test.js
// Part 1: the electricity pack's own 71 reference validations (art/source/elec/tests/test_physics.mjs),
//         run unchanged against the game's port (ElecPhys.evaluate).
// Part 2: the acceptance list of docs/ACCEPTANCE_HE.md on the time simulators.
const fs = require("fs"), assert = require("assert/strict");
const E = require("../art/physics/elec-engine.js");
let n = 0, fails = 0;
const ok = (name, c, d = "") => { n++; if (c) { if (process.env.V) console.log("PASS", name, d); } else { fails++; console.log("FAIL", name, d); } };
{ let src = fs.readFileSync(__dirname + "/../art/source/elec/tests/test_physics.mjs", "utf8");
  src = src.replace(/^import .*$/mg, "").replace("new URL('../content/worlds_and_scenes.json', import.meta.url)", "__dirname + '/../art/source/elec/content/worlds_and_scenes.json'");
  try { new Function("assert", "fs", "evaluate", "constants", "__dirname", "console", src)(assert, fs, E.evaluate, { K: E.K, EPS0: E.EPS0, MU0: E.MU0 }, __dirname, { log: (m) => ok("pack reference: " + m, true), error: (m) => console.log(m) }); }
  catch (e) { ok("pack reference validations", false, e.message); } }
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));
const run = (f, p) => E.runToEnd(E.makeSim(f, p));
// 1. double the distance: force /4; one sign flips attraction ↔ repulsion; released balloons move accordingly
{ const a = run("coulomb", { q1: 3, q2: 3, r: 0.5 }), b = run("coulomb", { q1: 3, q2: -3, r: 0.5 });
  ok("1. like charges fly apart, unlike ones meet (forces on both bodies every step)", a.events.some((e) => e.type === "apart") && b.events.some((e) => e.type === "touch"));
  const s = E.makeSim("coulomb", { q1: 3, q2: 3, r: 0.5 }); const U0 = s.st.F * 0.5; for (let i = 0; i < 60; i++) s.step(1 / 120);
  ok("1b. released balloons: K + U conserved", near(s.st.K + s.st.U, 8.9875517923e9 * 9e-12 / 0.5, 1e-6)); }
// 2. a negative charge feels a force opposite to the field
{ const p = { q1: 3, q2: 0, x1: -0.6, y1: 0, x2: 0.65, y2: 0.2, xProbe: 0.1, yProbe: 0.15 };
  const pos = E.evaluate("forcePair2D", { ...p, qProbe: 2 }), neg = E.evaluate("forcePair2D", { ...p, qProbe: -2 });
  ok("2. negative probe: force opposite to E", near(pos.Fx, -neg.Fx) && Math.sign(neg.Fx) === -Math.sign(neg.Ex)); }
// 3. midway between equal charges E = 0 but V ≠ 0
{ const f = E.evaluate("field2D", { q1: 2, q2: 2, x: 0, y: 0, x1: -1, y1: 0, x2: 1, y2: 0 }), V = 2 * E.evaluate("potential", { qSource: 2, r: 1, qTest: 1 }).potentialV;
  ok("3. E = 0 at the middle, potential is not", near(f.E, 0) && V > 0); }
// 5. Kirchhoff: symmetric bridge zero; reversed source can give a negative (opposite) current
{ ok("5. bridge balanced → 0, reversed source → negative bridge current", near(E.evaluate("kirchhoff", { E1: 12, E2: 12, R1: 5, R2: 5, Rshared: 8 }).Ishared, 0) && E.evaluate("kirchhoff", { E1: 2, E2: 20, R1: 5, R2: 5, Rshared: 8 }).Ishared < 0); }
// 6. RC: the clock passes τ exactly at 63.2%; pausing (stepping in pieces) changes nothing
{ const p = { E: 10, R: 10, CmicroF: 100, tms: 2000 }, a = E.makeSim("rcCharge", p), b = E.makeSim("rcCharge", p);
  for (let i = 0; i < 300; i++) a.step(1 / 100); for (let i = 0; i < 100; i++) b.step(3 / 100);
  ok("6. RC: same state whatever the frame size", near(a.st.Vc, b.st.Vc, 1e-9));
  const s = run("rcCharge", p), tau = s.events.find((e) => e.type === "tau"); ok("6b. RC reaches τ = R·C", tau && near(tau.tms, 1000)); }
// 7. Lorentz: v ∥ B → straight; flipping q flips the bend; magnetic force does no work
{ const z = run("lorentz", { q: 2, v: 8, B: 1.5, angle: 0 }), a = E.makeSim("lorentz", { q: 2, v: 8, B: 1.5, angle: 90 }), b = E.makeSim("lorentz", { q: -2, v: 8, B: 1.5, angle: 90 });
  for (let i = 0; i < 40; i++) { a.step(1 / 60); b.step(1 / 60); }
  ok("7. v ∥ B: no magnetic force, no bend", Math.abs(z.st.y) < 1e-12);
  ok("7b. opposite charge bends the other way", Math.sign(a.st.y) === -Math.sign(b.st.y) && Math.abs(a.st.y) > 1e-3);
  ok("7c. kinetic energy unchanged by the magnetic force", near(a.st.K, 0.5 * E.LAB_M * 64, 1e-6)); }
{ const p = { mNanoKg: 2, qMicroC: 3, v: 8, B: 1.2 }, s = E.makeSim("gyroradius", p), r = E.evaluate("gyroradius", p).radiusM; let maxD = 0;
  for (let i = 0; i < 400; i++) { s.step(1 / 60); maxD = Math.max(maxD, Math.hypot(s.st.x, s.st.y)); } ok("7d. gyro: the path is a circle of diameter 2mv/(|q|B)", near(maxD, 2 * r, 1e-3)); }
{ const p = { E: 24, B: 3, v: 8, q: -2 }, s = run("selector", p); ok("7e. selector at v = E/B goes straight (either sign of q)", Math.abs(s.st.y) < 1e-9 && s.events.some((e) => e.type === "exit"));
  const t = run("selector", { ...p, v: 5 }); ok("7f. off-balance: it is deflected", Math.abs(t.st.y) > 1e-3); }
// 8. parallel wires
{ ok("8. same direction attract, opposite repel; bows follow", run("parallelWires", { I1: 4, I2: 4, dCm: 5, L: 1 }).st.bow < 0 && run("parallelWires", { I1: 4, I2: -4, dCm: 5, L: 1 }).st.bow > 0); }
// 9. induction: constant flux → no emf; emf only while B changes
{ const s = E.makeSim("faraday", { N: 100, A: 0.1, Bstart: 0, Bend: 2, dt: 1, angle: 0, R: 5 }); const seen = [];
  for (let i = 0; i < 300; i++) { s.step(1 / 100); seen.push([s.t, s.st.emf]); }
  ok("9. emf only during the change (−20 V), zero before and after", seen.filter(([t]) => t < 0.49).every(([, e]) => e === 0) && seen.filter(([t]) => t > 0.55 && t < 1.45).every(([, e]) => near(e, -20)) && seen.filter(([t]) => t > 1.55).every(([, e]) => e === 0)); }
// 10. the rod: the hand's work equals the heat in R
{ const s = run("motionalEMF", { B: 3, L: 0.5, v: 4, R: 2 }); ok("10. hand work = I²R heat (Lenz brake)", near(s.st.handWork, s.st.heat, 1e-9)); }
// capacitors: joined isolated capacitors — the heat in the joining resistance equals the energy missing
{ const p = { C1: 4, C2: 6, V1: 20, V2: -10 }, s = run("capacitorShare", p), e = E.evaluate("capacitorShare", p);
  ok("capacitors joined: final V and heat = lost energy (to 0.1%)", near(s.st.V1, e.Vfinal, 2e-3) && near(s.st.heat, e.lostJ, 2e-3)); }
{ const s = run("plate", { V: 48, d: 0.12, q: 2, m: 0.003 }); ok("plate: speck released at rest ends on the plate its force points to", s.events[0].type === "hit_top"); }
{ const p = { qSource: 3, r: 0.6, qTest: -1 }, s = run("potential", p); ok("potential: an opposite test charge falls toward the source", s.events.some((e) => e.type === "hit_source")); }
console.log(`\n${n - fails}/${n} passed`); if (fails) process.exit(1);
