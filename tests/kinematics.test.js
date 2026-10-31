// Cookie Chase acceptance numbers (docs/ACCEPTANCE_TESTS.md) on the engine the app really uses
const K = require("../art/physics/kinematics.js");
let pass = 0, fail = 0;
const ok = (n, c, e = "") => { if (c) pass++; else { fail++; console.log("FAIL", n, e); } };
const near = (a, b, t = 1e-6) => Math.abs(a - b) <= t;
const run = (st, b, c, secs) => { for (let i = 0, n = Math.round(secs / K.DT); i < n; i++) st = K.step(st, b, c); return st; };
const b = K.body(1.4);                                         // + board 0.6 = 2 kg
ok("total mass 2 kg", near(K.mTotal(b), 2));
{ const s = run(K.start(0, 5), b, {}, 2); ok("ideal track: 5 m/s for 2 s → 10 m", near(s.x, 10, 1e-9) && near(s.v, 5)); ok("F = 0 → a = 0", s.a === 0); }
{ let s = run(K.start(), b, { push: true }, 2); ok("8 N on 2 kg for 2 s: v = 8", near(s.v, 8, 1e-9), s.v); ok("… and x = 8", near(s.x, 8, 1e-6), s.x); ok("a = 4", near(s.a, 4));
  s = run(s, b, {}, 1); ok("coast 1 s: x = 16, v = 8", near(s.x, 16, 1e-6) && near(s.v, 8, 1e-9)); }
{ const s = run(K.start(0, 8), b, { pad: true, Fpad: 8 }, 3); ok("pad 8 N from 8 m/s: stops in 8 m", near(s.x, 8, 1e-6), s.x); ok("never goes negative", s.v === 0);
  let t = K.start(0, 8), tStop = null; for (let i = 0; i < 400; i++) { t = K.step(t, b, { pad: true, Fpad: 8 }); if (t.v === 0 && tStop === null) tStop = t.t; } ok("stop time 2 s (to a step)", Math.abs(tStop - 2) <= K.DT + 1e-9, tStop); }
{ const s = run(K.start(), b, { pad: true }, 1); ok("braking at rest does not move", s.x === 0 && s.v === 0); }
{ const s = run(K.start(0, -3), b, { pad: true, Fpad: 4 }, 2); ok("brake works for v < 0 too", s.v === 0 && near(s.x, -2.25, 1e-6), s.x); }
{ const s = run(K.start(0, -2), b, { given: -2 }, 1); ok("v < 0 and a < 0 speeds up", near(s.v, -4) && Math.abs(s.v) > 2); }
// foot brake uses μk of the shoe on this surface, the board alone does not
{ const bw = K.body(1.4, { muk: 0.35 }), bi = K.body(1.4, { muk: 0.05 });
  const sw = run(K.start(0, 4), bw, { foot: true }, 6), si = run(K.start(0, 4), bi, { foot: true }, 6);
  ok("foot brake stops sooner on a grippy surface", sw.x < si.x);
  const d = 0.35 * 0.5 * 1.4 * 9.81 / 2; ok("foot brake distance v²/2a", near(sw.x, 16 / (2 * d), 1e-6), sw.x);
  const roll = run(K.start(0, 4), bw, {}, 1); ok("rolling with the foot up ignores μ", near(roll.x, 4)); }
// a different body with the same force accelerates differently
{ const heavy = run(K.start(), K.body(3.4), { push: true }, 1), light = run(K.start(), K.body(1.4), { push: true }, 1); ok("same F, bigger m → smaller a", heavy.v < light.v && near(heavy.v, 8 / 4)); }
// frame rate does not matter
{ const b2 = K.body(1.1); let a = K.start(), c = K.start(); for (let i = 0; i < 240; i++) a = K.step(a, b2, { push: i < 120 }, 1 / 120); for (let i = 0; i < 480; i++) c = K.step(c, b2, { push: i < 240 }, 1 / 240); ok("same result at 120 and 240 steps/s", near(a.x, c.x, 1e-9) && near(a.v, c.v, 1e-9)); }
// distance vs displacement across a turnaround
{ let s = K.start(0, 5); s = run(s, b, { given: -2.5 }, 4); ok("displacement 0, distance 10", near(s.x, 0, 1e-6) && near(s.dist, 10, 1e-6), `${s.x} ${s.dist}`); }
// drops every 0.5 s of physical time
{ let s = K.start(0, 2), drops = []; for (let i = 0; i < 240; i++) { const n = K.step(s, b, {}); drops.push(...K.dropsBetween(s, n)); s = n; }
  const uniq = [...new Map(drops.map((d) => [d.t.toFixed(3), d])).values()];
  ok("5 drops in 2 s (0, .5, 1, 1.5, 2)", uniq.length === 5, uniq.length); ok("equal spacing at constant v", uniq.every((d, i) => !i || near(d.x - uniq[i - 1].x, 1, 1e-9))); }
// catching the cookie between two steps
{ const ck = { x0: 2, v: 1.2 }; let s = K.start(0, 3), tc = null; for (let i = 0; i < 600 && tc === null; i++) { const n = K.step(s, b, {}); tc = K.catchTime(s, n, ck, 0.1); s = n; }
  ok("catch time exact: (2 − 0.1) / (3 − 1.2)", near(tc, 1.9 / 1.8, 1e-9), tc); }
ok("stopping distance formula", near(K.stopping(8, 4).d, 8) && near(K.stopping(8, 4).t, 2));
console.log(`${pass}/${pass + fail} passed`); if (fail) process.exit(1);
