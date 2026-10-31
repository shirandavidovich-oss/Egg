// incline spring, two bodies and spring
const SP = require("../art/physics/spring.js");
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { if (cond) pass++; else { fail++; console.log("FAIL", name, extra); } };
const near = (a, b, t) => Math.abs(a - b) <= t;
// incline: frictionless equilibrium x = mg sinθ / k, period unchanged
{
  const p = SP.iparams(1.4, 120, 0, 0, 30), xe = SP.inclineEq(p);
  ok("equilibrium on the slope", near(xe, 1.4 * 9.81 * 0.5 / 120, 1e-12));
  const s = new SP.HSim(p, 0.1); s.release();
  let last = s.st.x, ups = [];
  for (let i = 0; i < 1200; i++) { s.advance(SP.DT); if (last < 0 && s.st.x >= 0) ups.push(i * SP.DT); last = s.st.x; }
  const T = ups.length > 1 ? ups[ups.length - 1] - ups[ups.length - 2] : 0;
  ok("period 2π√(m/k) on the slope", near(T, 2 * Math.PI * Math.sqrt(1.4 / 120), 0.02), T);
}
{
  const p = SP.iparams(1.4, 120, 0.5, 0.4, 30);
  ok("friction uses N = mg cosθ", near(p.mus * p.m * p.g, 0.5 * 1.4 * 9.81 * Math.cos(Math.PI / 6), 1e-9));
  ok("flat slope: no equilibrium shift", SP.inclineEq(SP.iparams(1, 100, 0, 0, 0)) === 0);
}
// two bodies: total momentum stays zero, energy goes to motion
{
  const p = { k: 400, L0: 0.2, m1: 1.4, m2: 2.8 }, c = 0.08;
  let st = { x1: 0, x2: p.L0 - c, v1: 0, v2: 0 };
  for (let i = 0; i < 240; i++) st = SP.twoStep(st, p, SP.DT);
  ok("momentum stays zero", Math.abs(p.m1 * st.v1 + p.m2 * st.v2) < 1e-9);
  const id = SP.twoSpeeds(p, c);
  ok("speeds match energy + momentum", near(st.v1, id.v1, 0.01) && near(st.v2, id.v2, 0.01), `${st.v1} ${st.v2} vs ${id.v1} ${id.v2}`);
  ok("lighter one is faster", Math.abs(st.v1) > Math.abs(st.v2));
  ok("energy kept", near(0.5 * p.m1 * st.v1 ** 2 + 0.5 * p.m2 * st.v2 ** 2, 0.5 * p.k * c * c, 0.01));
}
console.log(`${pass}/${pass + fail} passed`); if (fail) process.exit(1);
