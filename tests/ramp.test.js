// energy track: spring → flat → ramp → platform; energy is conserved once heat is counted
const SP = require("../art/physics/spring.js");
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { if (cond) pass++; else { fail++; console.log("FAIL", name, extra); } };
const T = SP.track();
function run(p, c, secs = 12) {
  let st = { s: -c, v: 0, moving: false }, heat = 0, maxY = 0, worst = 0;
  const E0 = 0.5 * p.k * c * c;
  for (let i = 0; i < secs / SP.DT; i++) {
    const r = SP.rstep(st, p, T, SP.DT); st = r.st; heat += r.heat;
    const e = SP.rEnergy(st, p, T); maxY = Math.max(maxY, SP.trackAt(T, st.s).y);
    worst = Math.max(worst, Math.abs(e.el + e.k + e.g + heat - E0) / E0);
  }
  return { st, heat, maxY, worst, E0 };
}
// frictionless: reaches the height ½kc²/(mg) at most, and never loses energy
{
  const p = SP.rparams(1.4, 300, 0, 0), c = 0.15, r = run(p, c, 6);
  ok("energy kept without friction", r.worst < 0.02, r.worst);
  const top = T.rampLen * Math.sin(T.deg * Math.PI / 180);
  ok("reaches the platform when ½kc² > mg·h", 0.5 * 300 * c * c > 1.4 * 9.81 * top ? r.maxY >= top - 1e-9 : true);
}
// with friction: total (with heat) still kept, and it ends at rest
{
  const p = SP.rparams(1.4, 300, 0.4, 0.3), c = 0.2, r = run(p, c, 20);
  ok("energy + heat kept with friction", r.worst < 0.03, r.worst);
  ok("comes to rest", !r.st.moving && r.st.v === 0);
  ok("heat equals what is missing", Math.abs(r.heat + SP.rEnergy(r.st, p, T).g + SP.rEnergy(r.st, p, T).el - r.E0) / r.E0 < 0.03);
}
// weak push: does not reach the top; max height below energy height
{
  const p = SP.rparams(1.4, 300, 0, 0), c = 0.08, r = run(p, c, 6);
  ok("weak push stays below the energy height", r.maxY <= 0.5 * 300 * c * c / (1.4 * 9.81) + 1e-3, r.maxY);
}
// stuck: spring too weak to beat static friction
{
  const p = SP.rparams(1.4, 30, 0.9, 0.6), r = run(p, 0.05, 2);
  ok("static friction holds a weak spring", r.st.s === -0.05);
}
console.log(`${pass}/${pass + fail} passed`); if (fail) process.exit(1);
