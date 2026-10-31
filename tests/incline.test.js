// Run: node tests/incline.test.js   (the checks in art/source/incline/docs/07_DEVELOPMENT_TESTS.md that are about physics)
const I = require("../art/physics/incline.js");
const S = require("../art/physics/spring.js");
let n = 0, fails = 0;
const ok = (name, c, d = "") => { n++; if (c) console.log("PASS", name, d); else { fails++; console.log("FAIL", name, d); } };
const near = (a, b, e = 1e-3) => Math.abs(a - b) <= e;
let f = I.forces({ m: 2, deg: 0, mus: 0.6, muk: 0.4, g: 10 });
ok("1. θ=0: W=20, N=20, parallel 0, no friction, a=0", near(f.W, 20) && near(f.N, 20) && near(f.par, 0) && near(f.f, 0) && f.a === 0 && f.holds);
f = I.forces({ m: 2, deg: 30, mus: 0.6, muk: 0.4, g: 10 });
ok("2. θ=30: holds, f_s = 10 N (not μsN), N = 17.3205, a = 0", f.holds && near(f.f, 10) && near(f.N, 17.320508) && f.a === 0 && f.f < f.fsMax);
f = I.forces({ m: 2, deg: 40, mus: 0.6, muk: 0.4, g: 10 });
ok("3. θ=40: slides, f_k ≈ 6.128 N, a ≈ 3.3637", f.sliding && near(f.fk, 6.128355) && near(f.a, 3.3637));
const crit = Math.atan(0.6) / I.DEG;
ok("4. at θ = atan(μs) it may stay; just beyond it slides", I.forces({ m: 2, deg: crit, mus: 0.6, muk: 0.4 }).holds && !I.forces({ m: 2, deg: crit + 0.01, mus: 0.6, muk: 0.4 }).holds);
f = I.forces({ m: 2, deg: 25, mus: 0, muk: 0, g: 9.81 });
ok("5. no friction: slides at any angle, a = g sinθ", f.sliding && near(f.a, 9.81 * Math.sin(25 * I.DEG), 1e-9));
const a1 = I.forces({ m: 1, deg: 40, mus: 0.6, muk: 0.4 }), a4 = I.forces({ m: 4, deg: 40, mus: 0.6, muk: 0.4 });
ok("6. mass 1 vs 4, same μ: same a and threshold, forces ×4", near(a1.a, a4.a, 1e-12) && near(a1.criticalDeg, a4.criticalDeg, 1e-12) && near(a4.W, 4 * a1.W) && near(a4.N, 4 * a1.N));
ok("7. same ramp, different μs: one stays, one slides (mass is not why)", I.forces({ m: 1, deg: 40, mus: 1.2, muk: 0.4 }).holds && !I.forces({ m: 4, deg: 40, mus: 0.1, muk: 0.05 }).holds);
{
  const g = I.forces({ m: 2, deg: 40, mus: 0.6, muk: 0.4, g: 10 }), c = I.components(g.W, g.thetaRad);
  ok("8. components add back to mg exactly; only 3 real forces", near(c.par.x + c.perp.x, 0, 1e-9) && near(c.par.y + c.perp.y, g.W, 1e-9));
  // 9: mg is straight down at every angle; N is perpendicular to the ramp
  let worst = 0;
  for (let d = 0; d <= 55; d += 5) {
    const th = d * I.DEG, cc = I.components(1, th);
    const up = { x: Math.cos(th), y: -Math.sin(th) }, nOut = { x: -Math.sin(th), y: -Math.cos(th) };
    worst = Math.max(worst, Math.abs(cc.g.x), Math.abs(up.x * nOut.x + up.y * nOut.y));
  }
  ok("9. gravity stays vertical, N ⟂ ramp at every angle", worst < 1e-12);
}
{
  let st = { d: 0, v: 0 }, pen = 0;
  for (let i = 0; i < 120; i++) { st = I.step(st, { m: 2, deg: 40, mus: 0.6, muk: 0.4, g: 10 }, 1 / 120, 100); if (st.d < 0) pen++; }
  ok("10. 1 s of sliding: v ≈ 3.36 m/s, d ≈ 1.69 m, never through the ramp", near(st.v, 3.3637, 0.04) && near(st.d, 1.695, 0.05) && pen === 0, `v=${st.v.toFixed(3)} d=${st.d.toFixed(3)}`);
  let b = { d: 0, v: 0 }; for (let i = 0; i < 1200; i++) b = I.step(b, { m: 2, deg: 40, mus: 0.6, muk: 0.4 }, 1 / 120, 1.8);
  ok("10b. stops at the bottom mat, no bounce", b.d === 1.8 && b.v === 0 && b.bottom);
}
{
  // lowering the angle while sliding: it slows, stops, and static friction holds again
  let st = { d: 0, v: 2 };
  for (let i = 0; i < 120 * 30; i++) st = I.step(st, { m: 1.4, deg: 10, mus: 0.3, muk: 0.19 }, 1 / 120);
  ok("12b. slower slope while sliding: it stops and stays (static friction holds)", st.v === 0 && st.fr.holds);
}
// ---- the horizontal spring with friction ----
{
  const p = S.hparams(1, 100, 0.3, 0.2, 9.81), sim = new S.HSim(p, 0.2); sim.release();
  let firstTurn = null; for (let i = 0; i < 1200 && !firstTurn; i++) { sim.advance(1 / 120); if (sim.turns.length) firstTurn = sim.turns[0]; }
  const expect = -(0.2 - S.halfSwingLoss(p));
  ok("wall spring: each half swing loses 2μk mg/k", firstTurn && near(firstTurn.x, expect, 0.004) && near(firstTurn.t, Math.PI * Math.sqrt(1 / 100), 0.02), `x=${firstTurn && firstTurn.x.toFixed(4)} expected ${expect.toFixed(4)}`);
  for (let i = 0; i < 2400; i++) sim.advance(1 / 120);
  ok("wall spring: it ends at rest inside the stick zone |x| ≤ μs mg/k", sim.stuck && Math.abs(sim.st.x) <= S.stickZone(p) + 1e-9, `x=${sim.st.x.toFixed(4)} zone=${S.stickZone(p).toFixed(4)}`);
  const held = new S.HSim(S.hparams(1, 100, 0.3, 0.2), 0.02); held.release(); for (let i = 0; i < 600; i++) held.advance(1 / 120);
  ok("wall spring: a small stretch inside the zone does not move at all", held.st.x === 0.02 && !held.st.moving);
  const free = new S.HSim(S.hparams(1, 100, 0, 0), 0.15); free.release(); let mx = 0;
  for (let i = 0; i < 120 * 10; i++) { free.advance(1 / 120); if (i > 120 * 9) mx = Math.max(mx, Math.abs(free.st.x)); }
  ok("wall spring without friction keeps its amplitude", near(mx, 0.15, 0.002), mx.toFixed(4));
}
{
  let threw = 0; for (const fn of [() => I.forces({ m: 0, deg: 10, mus: 0.5, muk: 0.3 }), () => I.forces({ m: 1, deg: -1, mus: 0.5, muk: 0.3 }), () => S.hparams(1, 100, -0.1, 0.2)]) { try { fn(); } catch (e) { threw++; } }
  ok("invalid inputs are refused", threw === 3);
}
console.log(`\n${n - fails}/${n} passed`);
process.exit(fails ? 1 : 0);
