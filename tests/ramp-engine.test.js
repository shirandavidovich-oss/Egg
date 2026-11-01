// Run: node tests/ramp-engine.test.js
// Part 1: the 18 reference checks from the incline_friction pack (tests/test_physics.mjs), unchanged in meaning.
// Part 2: the behaviour checks from docs/INTEGRATION_AND_ACCEPTANCE_HE.md, run on the event integrator.
const R = require("../art/physics/ramp-engine.js");
let n = 0, fails = 0;
const ok = (name, c, d = "") => { n++; if (c) console.log("PASS", name, d); else { fails++; console.log("FAIL", name, d); } };
const near = (a, b, t = 1e-7) => Math.abs(a - b) <= t;
const throws = (f) => { try { f(); return false; } catch (e) { return true; } };

// ---------------- reference ----------------
const p = { m: 2, g: 10, angleDeg: 30, muS: 0.4, muK: 0.3 };
let r = R.singleBlockForces(p);
ok("ref 1: insufficient static friction -> a = −5 + 3cos30", near(r.acceleration, -5 + 0.3 * 10 * Math.cos(Math.PI / 6)));
r = R.singleBlockForces({ ...p, muS: 0.6, muK: 0.4 });
ok("ref 2: rests, static friction exactly 10 N", r.mode === "static" && near(r.friction, 10) && near(r.acceleration, 0));
r = R.singleBlockForces({ ...p, muS: 0.6 }, { velocity: 2 });
ok("ref 3: moving up -> friction down", r.friction < 0 && r.acceleration < 0);
r = R.singleBlockForces({ ...p, muS: 1, muK: 0.4 }, { fApplied: 16 });
ok("ref 4: pulled at rest, friction −6 N (down the slope)", r.mode === "static" && near(r.friction, -6));
ok("ref 5: mass doubles, smooth ramp a unchanged = −5", near(R.singleBlockForces({ ...p, muS: 0, muK: 0 }).acceleration, R.singleBlockForces({ ...p, m: 4, muS: 0, muK: 0 }).acceleration) && near(R.singleBlockForces({ ...p, muS: 0, muK: 0 }).acceleration, -5));
ok("ref 6: N = mg cosθ", near(R.singleBlockForces(p).N, 20 * Math.cos(Math.PI / 6)));
ok("ref 7: pressing in raises kinetic friction", Math.abs(R.singleBlockForces(p, { velocity: -2, fInto: 12 }).friction) > Math.abs(R.singleBlockForces(p, { velocity: -2 }).friction));
ok("ref 8: lifting off loses contact", R.singleBlockForces(p, { fInto: -25 }).contact === false);
r = R.stepSingle({ m: 1, g: 10, angleDeg: 20, muS: 0.8, muK: 0.3 }, { s: 2, v: 0.01 }, 0.05);
ok("ref 9: stops on a sticky ramp, stays", r.v === 0 && r.forces.mode === "static");
r = R.hangingPulley({ mA: 4, mB: 3, angleDeg: 30, muS: 0.25, muK: 0.2, g: 10 });
ok("ref 10: hanging pulley a and T", near(r.a, (30 - 20 - 0.2 * 40 * Math.cos(Math.PI / 6)) / 7) && near(r.T, 3 * (10 - r.a)));
ok("ref 11: pulley static if imbalance small", R.hangingPulley({ mA: 4, mB: 3, angleDeg: 30, muS: 0.4, muK: 0.2 }).mode === "static");
ok("ref 12: same mass same slope -> static", R.doubleInclinePulley({ mA: 2, mB: 2, angleA: 30, angleB: 30, muSA: 0.1, muSB: 0.1, muKA: 0.1, muKB: 0.1 }).mode === "static");
ok("ref 13: steeper B side falls", R.doubleInclinePulley({ mA: 2, mB: 3, angleA: 20, angleB: 45, muSA: 0.1, muSB: 0.1, muKA: 0.05, muKB: 0.05 }).a > 0);
r = R.descentEnergy({ m: 2, angleDeg: 30, muK: 0.2, s: 10 });
ok("ref 14: energy on a 10 m descent", near(r.lostPotential, 100) && near(r.dissipated, 0.2 * 20 * Math.cos(Math.PI / 6) * 10) && near(r.deltaK + r.dissipated, r.lostPotential));
ok("ref 15: uphill stop distance 10 m", near(R.stopDistanceUphill({ speed: 10, angleDeg: 30, muK: 0 }), 10));
r = R.linkedBlocksSameRamp({ mA: 2, mB: 2, angleDeg: 30, muKA: 0.3, muKB: 0.1 });
ok("ref 16: rough above smooth -> taut, T", r.mode === "taut" && near(r.T, 0.2 * 20 * Math.cos(Math.PI / 6) / 2));
ok("ref 17: reversed -> rope slack", R.linkedBlocksSameRamp({ mA: 2, mB: 2, angleDeg: 30, muKA: 0.1, muKB: 0.3 }).mode === "rope_slack");
ok("ref 18: μk > μs rejected", throws(() => R.singleBlockForces({ ...p, muS: 0.1, muK: 0.3 })));

// ---------------- acceptance on the integrator ----------------
const run = (tr, T, dt = 1 / 120) => { const out = []; for (let t = 0; t < T - 1e-9; t += dt) { tr.advance(dt); out.push({ t: tr.t, s: tr.s, v: tr.v, R: tr.resolve() }); } return out; };

// S01: 2 kg, 30°, smooth: a = −5, N ≈ 17.32
{ const tr = R.makeSingle({ m: 2, angleDeg: 30, muS: 0, muK: 0, g: 10, L: 10, s0: 9 }); const F = tr.resolve();
  ok("S01 a = −5, N = 17.32", near(F.a, -5) && near(F.N, 17.3205, 1e-3)); run(tr, 1); ok("S01 after 1 s v = −5, s = 6.5", near(tr.v, -5, 1e-9) && near(tr.s, 6.5, 1e-9)); }

// S02: below arctan μs no motion at all; above it slides; at exactly the angle "on the edge"
{ const crit = R.criticalAngle(0.5);
  ok("S02 critical angle 26.565°", near(crit, 26.56505, 1e-4));
  const a = R.makeSingle({ m: 2, angleDeg: crit - 0.05, muS: 0.5, muK: 0.35, L: 4, s0: 3 }); run(a, 3);
  const b = R.makeSingle({ m: 2, angleDeg: crit + 0.05, muS: 0.5, muK: 0.35, L: 4, s0: 3 }); run(b, 0.5);
  const e = R.makeSingle({ m: 2, angleDeg: crit, muS: 0.5, muK: 0.35, L: 4, s0: 3 });
  ok("S02 below: not a millimetre; f_s < μsN", a.s === 3 && a.resolve().mode === "static" && a.resolve().f < a.resolve().maxS);
  ok("S02 above: slides", b.s < 3 && b.resolve().mode === "kinetic");
  ok("S02 exactly at the edge: static, f_s = μsN", e.resolve().mode === "static" && near(e.resolve().f, e.resolve().maxS, 1e-9)); }

// S04: launched up, friction points down while rising and slowing; stop distance; static check at v = 0
{ const v0 = 5, th = 25, tr = R.makeSingle({ m: 2, angleDeg: th, muS: 0.5, muK: 0.2, L: 20, s0: 0.5, v0 });
  const F0 = tr.resolve(); ok("S04 rising: f down, a down, v up", F0.f < 0 && F0.a < 0 && tr.v > 0);
  const out = run(tr, 4); const d = R.stopDistanceUphill({ speed: v0, angleDeg: th, muK: 0.2 });
  ok("S04 peak = v0²/2g(sinθ+μk cosθ)", near(tr.peak - 0.5, d, 1e-6), (tr.peak - 0.5).toFixed(5) + " vs " + d.toFixed(5));
  const stays = Math.tan(th * R.DEG) <= 0.5;
  ok("S04 after the stop: tanθ ≤ μs so it stays, no velocity jump", stays && tr.v === 0 && tr.resolve().mode === "static" && out.every((o, i) => !i || Math.abs(o.v - out[i - 1].v) < 0.2));
  const tr2 = R.makeSingle({ m: 2, angleDeg: 40, muS: 0.5, muK: 0.2, L: 20, s0: 0.5, v0 }); const o2 = run(tr2, 3);
  const after = o2.find((o) => o.v < -0.01);
  ok("S04 steep (tanθ > μs): slides back with a smaller |a| than on the way up", after && near(after.R.a, -10 * (Math.sin(40 * R.DEG) - 0.2 * Math.cos(40 * R.DEG)), 1e-9) && Math.abs(after.R.a) < Math.abs(tr2.def.forces(1, 1, 0).grav / 2 - 0.2 * tr2.resolve(1, 1).N / 2) + 1e-9); }

// S05: static friction up for a weak pull, down for a strong pull, still at rest; range
{ const base = { m: 3, angleDeg: 30, muS: 0.4, muK: 0.25, L: 4, s0: 2 };
  const rg = R.staticForceRange(base);
  const weak = R.makeSingle({ ...base, F: rg.par - 0.5 * rg.lim }).resolve(), strong = R.makeSingle({ ...base, F: rg.par + 0.5 * rg.lim }).resolve();
  ok("S05 weak pull: at rest, friction up", weak.mode === "static" && weak.f > 0);
  ok("S05 strong pull: at rest, friction down", strong.mode === "static" && strong.f < 0);
  ok("S05 just beyond the range it climbs", R.makeSingle({ ...base, F: rg.max + 0.01 }).resolve().a > 0 && R.makeSingle({ ...base, F: rg.max - 0.01 }).resolve().mode === "static"); }

// S06: an angled pull lowers N; too much loses contact (no fake friction)
{ const b = { m: 3, angleDeg: 20, muS: 0.4, muK: 0.25, L: 4, s0: 2 };
  const n0 = R.makeSingle({ ...b, F: 20, beta: 0 }).resolve().N, n1 = R.makeSingle({ ...b, F: 20, beta: 30 }).resolve().N;
  ok("S06 N = mg cosθ − F sinβ", near(n1, 30 * Math.cos(20 * R.DEG) - 20 * Math.sin(30 * R.DEG), 1e-9) && n1 < n0);
  const lost = R.makeSingle({ ...b, F: 80, beta: 60 }); lost.advance(0.1);
  ok("S06 contact lost -> model warning, no motion", lost.lost && lost.events.some((e) => e.type === "lost_contact") && lost.s === 2); }

// S07: pressing in adds to N only
{ const b = { m: 2, angleDeg: 25, muS: 0.5, muK: 0.3, L: 4, s0: 2 };
  const a = R.makeSingle({ ...b }).resolve(), q = R.makeSingle({ ...b, Q: 10 }).resolve();
  ok("S07 N + Q, parallel weight unchanged", near(q.N - a.N, 10, 1e-9) && near(q.grav, a.grav, 1e-12)); }

// S08: the engine stops at exactly 4 s; two slopes in v(t)
{ const th = Math.asin(0.6) / R.DEG;               // the textbook 37° with sin = 0.6 exactly
  const tr = R.makeSingle({ m: 6, angleDeg: th, muS: 0, muK: 0, g: 10, F: 45, forceOffAt: 4, L: 100, s0: 0 });
  ok("S08 a = +1.5 while on", near(tr.resolve().a, 1.5, 1e-9));
  tr.advance(4); ok("S08 at 4 s: v = 6, s = 12", near(tr.v, 6, 1e-9) && near(tr.s, 12, 1e-9));
  tr.advance(0.001); ok("S08 after off: a = −6", near(tr.resolve().a, -6, 1e-9));
  let tr2 = R.makeSingle({ m: 6, angleDeg: th, muS: 0, muK: 0, g: 10, F: 45, forceOffAt: 4, L: 100, s0: 0 });
  for (let i = 0; i < 700; i++) tr2.advance(1 / 120);
  const top = tr2.events.find((e) => e.type === "v_zero");
  ok("S08 peak after 1 more second, 3 more metres (15 m)", top && near(top.t, 5, 1e-9) && near(top.s, 15, 1e-9));
  const odd = R.makeSingle({ m: 6, angleDeg: th, F: 45, forceOffAt: 1.003, muS: 0, muK: 0, L: 100, s0: 0 }); odd.advance(1 / 60); while (odd.t < 1.003 - 1e-12) odd.advance(1 / 60);
  ok("S08 the off-time is hit exactly even between frames", near(odd.v, 1.5 * 1.003 - 6 * (odd.t - 1.003), 1e-9)); }

// S09: coefficients change exactly at the joint; the end stop is not friction
{ const segs = [{ length: 3, angleDeg: 25, muS: 0.3, muK: 0.15 }, { length: 2, angleDeg: 0, muS: 0.4, muK: 0.25 }, { length: 3, angleDeg: -15, muS: 0.3, muK: 0.2 }];
  const tr = R.makePiecewise({ m: 2, segments: segs, v0: 0.01 });
  const out = run(tr, 6, 1 / 240), j = tr.events.find((e) => e.type === "joint");
  const v1 = Math.sqrt(0.01 ** 2 + 2 * 10 * (Math.sin(25 * R.DEG) - 0.15 * Math.cos(25 * R.DEG)) * 3);
  ok("S09 at the first joint, v from the first segment exactly", j && near(j.v, v1, 1e-9) && near(j.s, 3, 1e-12));
  const onFlat = out.find((o) => o.s > 3.01 && o.s < 4.9);
  ok("S09 on the flat a = −μk g", onFlat && near(onFlat.R.a, -2.5, 1e-9));
  const sv = R.makePiecewise({ m: 2, segments: [{ length: 1, angleDeg: 40, muS: 0, muK: 0 }, { length: 1, angleDeg: 0, muS: 0, muK: 0 }], v0: 0 }); run(sv, 4);
  ok("S09 reaching the end is a stop at the barrier, not static friction", sv.events.some((e) => e.type === "barrier") && sv.stopped && sv.stopped.barrier); }

// S10: same |a| both bodies; T from both equations; static first
{ const tr = R.makeHanging({ mA: 4, mB: 3, angleDeg: 30, muS: 0.25, muK: 0.2 }); const F = tr.resolve();
  ok("S10 a ≈ 0.439, T ≈ 28.68", near(F.a, 0.4391, 1e-3) && near(tr.tension(), 28.68, 0.01));
  ok("S10 A's equation agrees: T − mA g sinθ − f = mA a", near(tr.tension() - 20 - 0.2 * 40 * Math.cos(30 * R.DEG), 4 * F.a, 1e-9)); }

// S11: direction from the equation, not from which side the creature is on
{ const tr = R.makeDouble({ mA: 3, mB: 2, angleA: 45, angleB: 20, muSA: 0.1, muSB: 0.1, muKA: 0.05, muKB: 0.05 });
  ok("S11 heavier steep side A pulls: s < 0", tr.resolve().a < 0); run(tr, 0.5); ok("S11 moves toward A", tr.s < 0);
  const sp = tr.split(); ok("S11 tension positive", sp.T > 0); }

// S12: taut when rough is above; swap -> slack, never a pushing rope
{ const A = { m: 2, muS: 0.35, muK: 0.3 }, B = { m: 2, muS: 0.15, muK: 0.1 };
  const tr = R.makeLinked({ angleDeg: 30, A, B, rope: 0.5 }); tr.vUp = tr.vDn = 0.001; tr.advance(0.5);
  const ref = R.linkedBlocksSameRamp({ mA: 2, mB: 2, angleDeg: 30, muKA: 0.3, muKB: 0.1 });
  ok("S12 taut, a and T as the reference", tr.mode === "taut" && near(tr.state().a, ref.a, 1e-9) && near(tr.state().T, ref.T, 1e-9));
  const sw = R.makeLinked({ angleDeg: 30, A, B, rope: 0.5, swap: true }); sw.vUp = sw.vDn = 0.001; sw.advance(0.05);
  ok("S12 swapped: slack, gap closes, T = 0", sw.mode === "slack" && sw.state().T === 0 && sw.xDn - sw.xUp < 0.5);
  sw.advance(3); ok("S12 swapped: bodies end up touching (push by contact, not rope)", sw.events.some((e) => e.type === "touch")); }

// S13: double the mass, no external force -> same a; constant external F -> F/m differs
{ const b = { angleDeg: 30, muS: 0.3, muK: 0.2, L: 4, s0: 3 };
  const a1 = R.makeSingle({ ...b, m: 1 }).resolve().a, a4 = R.makeSingle({ ...b, m: 4 }).resolve().a;
  const f1 = R.makeSingle({ ...b, m: 1, F: 1 }).resolve().a, f4 = R.makeSingle({ ...b, m: 4, F: 1 }).resolve().a;
  ok("S13 same a without a fixed force", near(a1, a4, 1e-12));
  ok("S13 a fixed force changes a by F/m", near(f1 - a1, 1, 1e-9) && near(f4 - a4, 1 / 4, 1e-9)); }

// S14: v continuous through the brake; a weak brake still lets it speed up
{ const b = { m: 2, angleDeg: 15, muS: 0.2, muK: 0.1, L: 60, s0: 59 };
  const tr = R.makeSingle({ ...b, brake: { at: 2, muS: 0.9, muK: 0.65 } }); tr.advance(2); const vb = tr.v; tr.advance(1e-6);
  ok("S14 v continuous at the brake", near(tr.v, vb, 1e-4) && tr.resolve().a > 0 && R.makeSingle(b).resolve().a < 0 || (near(tr.v, vb, 1e-4) && tr.resolve().f !== 0));
  const weak = R.makeSingle({ ...b, brake: { at: 2, muS: 0.25, muK: 0.2 } }); weak.advance(2.5);
  ok("S14 weak brake (μk < tanθ): still speeding up", weak.resolve().a < 0 && weak.v < 0);
  const st = R.makeSingle({ ...b, brake: { at: 1, muS: 0.9, muK: 0.65 } }); st.advance(5);
  ok("S14 strong brake stops it, static holds (tanθ < μs)", st.v === 0 && st.resolve().mode === "static"); }

// S15: ΔK = −ΔU + Wf exactly; no heat while static
{ const tr = R.makeSingle({ m: 2, angleDeg: 30, muS: 0.25, muK: 0.2, L: 5, s0: 4 }); const e0 = tr.energy(); run(tr, 1.5);
  const e1 = tr.energy(); const drop = 4 - tr.s;
  ok("S15 K + U + Q conserved", near(e0.K + e0.U + e0.Q, e1.K + e1.U + e1.Q, 1e-9));
  ok("S15 heat = μk mg cosθ · s", near(e1.Q, 0.2 * 20 * Math.cos(30 * R.DEG) * drop, 1e-9));
  const still = R.makeSingle({ m: 2, angleDeg: 10, muS: 0.5, muK: 0.3, L: 5, s0: 4 }); run(still, 2); ok("S15 static: no heat", still.heat === 0); }

// S16: spring only on contact; energy incl. spring and friction
{ const tr = R.makeSingle({ m: 2, angleDeg: 25, muS: 0.4, muK: 0.2, L: 5, s0: 4, spring: { k: 100, at: 1 }, sMin: 0 });
  ok("S16 no spring force before contact", tr.resolve().spring === 0);
  const e0 = tr.energy(); let minS = 9, out = [];
  for (let i = 0; i < 1200; i++) { tr.advance(1 / 240); minS = Math.min(minS, tr.s); out.push(tr.energy()); }
  const e1 = tr.energy();
  ok("S16 total energy incl. spring + heat conserved", near(e0.K + e0.U + e0.Es + e0.Q, e1.K + e1.U + e1.Es + e1.Q, 1e-4), `${(e0.K + e0.U + e0.Es + e0.Q).toFixed(6)} vs ${(e1.K + e1.U + e1.Es + e1.Q).toFixed(6)}`);
  ok("S16 compressed, then v = 0 at the deepest point", minS < 1 && tr.events.some((e) => e.type === "v_zero" && e.s < 1)); }

// S17 is data handling (hidden μ stays fixed); S18 reuses the models above.
// timing: slow motion is a smaller dt, same physics
{ const a = R.makeSingle({ m: 2, angleDeg: 35, muS: 0.3, muK: 0.2, L: 9, s0: 8 }), b = R.makeSingle({ m: 2, angleDeg: 35, muS: 0.3, muK: 0.2, L: 9, s0: 8 });
  for (let i = 0; i < 60; i++) a.advance(1 / 60); for (let i = 0; i < 240; i++) b.advance(1 / 240);
  ok("slow motion changes only the frame size, not the result", near(a.s, b.s, 1e-9) && near(a.v, b.v, 1e-9)); }
// g = 9.8 scales everything in proportion
{ const a = R.makeSingle({ m: 2, angleDeg: 30, muS: 0.2, muK: 0.1, g: 10 }).resolve().a, b = R.makeSingle({ m: 2, angleDeg: 30, muS: 0.2, muK: 0.1, g: 9.8 }).resolve().a;
  ok("g = 9.8 scales a by 0.98", near(b / a, 0.98, 1e-12)); }

console.log(`\n${n - fails}/${n} passed`);
if (fails) process.exit(1);
