// Run: node tests/worlds-engine.test.js
// Part 1: the 32 reference checks of the mechanics-worlds pack (art/source/worlds/tests/test_physics.mjs), same meaning.
// Part 2: the "hard acceptance" list of docs/PHYSICS_CONSTRAINTS_HE.md, run on the time simulators.
global.RampPhys = require("../art/physics/ramp-engine.js");
const W = require("../art/physics/worlds-engine.js"), fs = require("fs");
const { evaluate } = W;
let n = 0, fails = 0;
const ok = (name, c, d = "") => { n++; if (c) console.log("PASS", name, d); else { fails++; console.log("FAIL", name, d); } };
const near = (a, b, eps = 1e-8) => Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));
const T = (name, f) => { let r; try { r = f(); } catch (e) { r = false; name += " (" + e.message + ")"; } ok(name, r !== false); };
T("unit conversion", () => near(evaluate("units", { value: 500, factor: 0.001 }).baseSI, 0.5));
T("vectors Pythagoras", () => near(evaluate("vectors", { ax: 3, ay: 0, bx: 0, by: 4 }).magnitude, 5));
T("signed uniform displacement", () => near(evaluate("uniform", { x0: 5, v: -3, t: 2 }).x, -1));
T("meet with opposite direction", () => near(evaluate("meeting", { x1: 0, x2: 20, v1: 2, v2: -3 }).tMeeting, 4));
T("no meeting if slower behind", () => evaluate("meeting", { x1: 0, x2: 20, v1: 1, v2: 3 }).tMeeting === null);
T("constant acceleration exact displacement", () => near(evaluate("acceleration", { v0: 0, a: 2, t: 3 }).dx, 9));
T("vertical launch apex", () => near(evaluate("vertical", { v0: 10, g: 10, h: 0, t: 1 }).maxY, 5));
T("vertical ground clamp", () => near(evaluate("vertical", { v0: 10, g: 10, h: 0, t: 20 }).y, 0));
T("horizontal projectile time independent of speed", () => near(evaluate("projectile", { v0: 6, angle: 0, h: 5, g: 10, t: 1 }).tLand, evaluate("projectile", { v0: 12, angle: 0, h: 5, g: 10, t: 1 }).tLand));
T("static incline force adapts to gravity", () => { const a = evaluate("incline", { m: 2, angle: 15, muS: 0.6, muK: 0.3, F: 0, v0: 0, g: 10 }); return near(a.a, 0) && near(a.friction, 20 * Math.sin(15 * Math.PI / 180)); });
T("incline moving uphill has friction downhill", () => evaluate("incline", { m: 2, angle: 20, muS: 0.5, muK: 0.25, F: 0, v0: 3, g: 10 }).friction < 0);
T("incline moving downhill friction uphill", () => evaluate("incline", { m: 2, angle: 20, muS: 0.5, muK: 0.25, F: 0, v0: -3, g: 10 }).friction > 0);
T("pulley balanced static", () => near(evaluate("pulley", { mA: 2, mB: 1, angle: 30, muS: 0.5, muK: 0.3, g: 10 }).a, 0));
T("spring equilibrium force sign", () => near(evaluate("spring", { k: 100, x: -0.2, m: 2 }).F, 20));
T("spring stored energy", () => near(evaluate("spring", { k: 100, x: 0.2, m: 2 }).E, 2));
T("energy no friction recovered speed", () => near(evaluate("energy", { m: 2, v0: 0, h: 5, mu: 0, d: 10, g: 10 }).endV, 10));
T("energy stops on strip", () => evaluate("energy", { m: 2, v0: 0, h: 1, mu: 0.4, d: 8, g: 10 }).endV === 0);
T("circular acceleration 4 squared / 2", () => near(evaluate("circle", { m: 2, v: 4, r: 2, mu: 0.9, g: 10 }).aC, 8));
T("ideal bank correct formula", () => near(evaluate("bank", { r: 10, angle: 45, g: 10 }).idealV, 10));
T("loop threshold", () => near(evaluate("loop", { m: 2, r: 2, vTop: Math.sqrt(20), g: 10 }).NTop, 0));
T("impulse and average force", () => near(evaluate("impulse", { m: 2, v0: 4, v1: -1, dt: 0.5 }).Favg, -20));
T("elastic equal masses exchange velocities", () => { const a = evaluate("collision", { m1: 2, m2: 2, u1: 4, u2: 0, e: 1 }); return near(a.v1, 0) && near(a.v2, 4) && near(a.lostK, 0); });
T("sticky equal masses common velocity", () => { const a = evaluate("collision", { m1: 2, m2: 2, u1: 4, u2: 0, e: 0 }); return near(a.v1, 2) && near(a.v2, 2); });
T("recoil preserves momentum", () => near(evaluate("recoil", { m1: 2, m2: 4, v1: 10 }).pTotal, 0));
T("gravity 1/r²", () => { const p = { M: 5e24, r: 7e6, m: 1 }; return near(evaluate("gravity", p).g / evaluate("gravity", { ...p, r: 14e6 }).g, 4); });
T("orbital escape speed sqrt 2", () => { const a = evaluate("gravity", { M: 5e24, r: 7e6, m: 1 }); return near(a.vEscape / a.vOrbit, Math.SQRT2); });
T("oscillator period scales sqrt mass", () => near(evaluate("oscillator", { m: 4, k: 60, A: 0.2, t: 0, phase: 0 }).period / evaluate("oscillator", { m: 1, k: 60, A: 0.2, t: 0, phase: 0 }).period, 2));
T("capstone positive energy yields positive compression", () => evaluate("capstone", { m: 2, angle: 35, d: 4, mu: 0.2, k: 100, v0: 0, g: 10 }).compression > 0);
T("capstone impossible stops", () => evaluate("capstone", { m: 2, angle: 10, d: 4, mu: 0.7, k: 100, v0: 0, g: 10 }).compression === 0);
const data = JSON.parse(fs.readFileSync(__dirname + "/../art/source/worlds/content/worlds_and_scenes.json"));
T("exactly 12 worlds, 84 scenes, 336 missions", () => data.worlds.length === 12 && data.scenes.length === 84 && data.scenes.flatMap((s) => s.missions).length === 336);
T("valid model evaluation for EVERY scene", () => data.scenes.every((s) => W.modelNames.includes(s.family) && Object.values(evaluate(s.family, s.params)).every((v) => typeof v !== "number" || Number.isFinite(v))));
T("every scene has a title, objective, story", () => data.scenes.every((s) => s.title.length > 6 && s.objective.length > 12 && s.story.length > 25));

// ---------------- acceptance on the simulators ----------------
const run = (f, p, o) => W.runToEnd(W.makeSim(f, p, o));
{ const s = run("incline", { m: 2, angle: 20, muS: 0.5, muK: 0.3, F: 0, v0: 0, g: 10 }); ok("1. at rest below the static threshold: never moves", s.st.s === 3 && s.st.mode === "static"); }
{ const s = W.makeSim("incline", { m: 2, angle: 20, muS: 0.5, muK: 0.3, F: 0, v0: 3, g: 10 }); s.step(0.05); ok("2. moving up: friction points down while a points down", s.st.f < 0 && s.st.a < 0 && s.st.v > 0); }
{ const a = run("incline", { m: 2, angle: 20, muS: 0.5, muK: 0.3, F: 0, v0: 3, g: 10 }), b = run("incline", { m: 2, angle: 35, muS: 0.5, muK: 0.3, F: 0, v0: 3, g: 10 });
  ok("3. slowing up the slope: stays if tanθ ≤ μs, slides back otherwise", a.st.mode === "static" && a.st.v === 0 && a.tr.trough >= 3 - 1e-9 && b.tr.trough < 2.5); }
{ const s = W.makeSim("incline", { m: 2, angle: 35, muS: 0.5, muK: 0.3, F: 0, v0: 3, g: 10 }); let prev = { s: s.st.s, t: 0 }, jump = 0;
  for (let i = 0; i < 300; i++) { s.step(1 / 120); if (Math.abs(s.st.s - prev.s) > 0.1 || s.t < prev.t) jump++; prev = { s: s.st.s, t: s.t }; } ok("4. turning around: no jumps in place or time", jump === 0); }
{ const a = run("projectile", { v0: 4, angle: 0, h: 5, g: 10 }), b = run("projectile", { v0: 12, angle: 0, h: 5, g: 10 }); ok("5. horizontal launch: landing time does not depend on vx", near(a.t, b.t, 1e-9) && near(a.t, 1, 1e-9) && a.st.y === 0); }
{ const s = run("collision", { m1: 2, m2: 5, u1: 6, u2: 0, e: 0 }); ok("6. plastic collision: same momentum, less kinetic energy", near(s.st.p, 12, 1e-9) && s.st.K < 0.5 * 2 * 36 && near(s.st.v1, s.st.v2, 1e-12)); }
{ const s = run("circle", { m: 1, r: 1, v: 4, mu: 0.5, g: 10 }), k = run("circle", { m: 1, r: 1, v: 2, mu: 0.5, g: 10 }); ok("7. turntable: too fast slides off, slow enough stays on the circle", s.events.some((e) => e.type === "slip") && s.events.some((e) => e.type === "off_plate") && !k.events.length && near(Math.hypot(k.st.x, k.st.y), 1, 1e-9)); }
{ const s = run("loop", { m: 1, r: 2, vTop: 2, g: 10 }), k = run("loop", { m: 1, r: 2, vTop: 6, g: 10 });
  ok("8. loop: no contact at the top means leaving the track (ballistic), enough speed goes around", s.events.some((e) => e.type === "lost_contact") && !s.events.some((e) => e.type === "full_loop") && k.events.some((e) => e.type === "full_loop") && !k.events.some((e) => e.type === "lost_contact"));
  const top = k.events.find((e) => e.type === "top"); ok("8b. loop: speed at the top is vTop (energy)", top && near(top.v, 6, 2e-3), top && top.v.toFixed(4)); }
{ const a = evaluate("gravity", { M: 5e24, r: 8e6, m: 1 }).g, b = evaluate("gravity", { M: 5e24, r: 16e6, m: 1 }).g; ok("9. gravity at double distance: g/4", near(a / b, 4)); }
{ const s = W.makeSim("gravity", { M: 5.97e24, r: 7e6, m: 1 }, { vf: 1 }); let dev = 0; for (let i = 0; i < 600; i++) { s.step(1 / 60); dev = Math.max(dev, Math.abs(s.st.r / 7e6 - 1)); } ok("9b. v = v_orbit gives a circle", dev < 1e-6, dev.toExponential(2));
  const e = W.runToEnd(W.makeSim("gravity", { M: 5.97e24, r: 7e6, m: 1 }, { vf: 1.45 })), c = W.runToEnd(W.makeSim("gravity", { M: 5.97e24, r: 7e6, m: 1 }, { vf: 0.6 }));
  ok("9c. above v_escape it leaves, far below it falls in", e.events.some((x) => x.type === "escape") && c.events.some((x) => x.type === "crash")); }
{ const s = run("acceleration", { v0: 11, a: -2.5, t: 8 }, { brake: true }), f = run("acceleration", { v0: 11, a: -2.5, t: 8 });
  ok("brake: stops at v0/|a| and stays (no driving backwards); a force turns it around", s.st.v === 0 && near(s.st.x, 11 * 11 / 5, 1e-9) && f.st.v < 0); }
{ const s = run("vertical", { v0: 12, g: 10, h: 3 }); ok("vertical: lands, never below the ground, at tLand", s.st.y === 0 && near(s.t, evaluate("vertical", { v0: 12, g: 10, h: 3, t: 0 }).tLand, 1e-9)); }
{ const p = { m: 2, v0: 0, h: 1, mu: 0.4, d: 8, g: 10 }, s = run("energy", p); const r = s.tr.energy();
  ok("energy: stops on the strip at the stop distance; heat never more than the energy there was", s.tr.v === 0 && near(s.tr.s - s.stripStart, evaluate("energy", p).stopDistance, 1e-6) && r.Q <= evaluate("energy", p).initialE + 1e-9); }
{ const p = { m: 2, angle: 35, d: 4, mu: 0.15, k: 140, v0: 2, g: 10 }, s = run("capstone", p); ok("capstone: maximum compression equals the energy answer", near(s.st.xMax, evaluate("capstone", p).compression, 1e-9) && s.events.some((e) => e.type === "max"));
  const st = run("capstone", { m: 2, angle: 10, d: 4, mu: 0.7, k: 100, v0: 0, g: 10 }); ok("capstone: μ ≥ tanθ and no push: it stays", st.events.some((e) => e.type === "stays")); }
{ const s = run("meeting", { x1: 0, x2: 20, v1: 2, v2: -3 }); ok("meeting: exact time and place", s.events[0] && near(s.events[0].t, 4) && near(s.events[0].x, 8)); }
{ const s = run("impulse", { m: 2, v0: 4, v1: -1, dt: 0.5 }); ok("impulse: after contact v = v1", near(s.st.v, -1) && s.events.length === 2); }
{ const s = run("recoil", { m1: 2, m2: 4, v1: 10 }); ok("recoil: total momentum stays 0", near(s.st.p, 0) && near(s.st.v2, -5)); }
{ const s = run("oscillator", { m: 2, k: 50, A: 0.3, t: 0, phase: 0 }); ok("oscillator: energy constant", near(s.st.K + s.st.U, 0.5 * 50 * 0.09, 1e-9)); }
{ const lo = run("bank", { r: 20, angle: 20, g: 10 }, { v: 3 }), hi = run("bank", { r: 20, angle: 20, g: 10 }, { v: 15 }), id = run("bank", { r: 20, angle: 20, g: 10 });
  ok("bank (no friction): slow slides down, fast drifts up, ideal stays level", lo.st.drift < 0 && hi.st.drift > 0 && Math.abs(id.st.drift) < 1e-9); }
console.log(`\n${n - fails}/${n} passed`); if (fails) process.exit(1);
