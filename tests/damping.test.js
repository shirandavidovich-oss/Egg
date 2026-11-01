// Run: node tests/damping.test.js   (media around the hanging spring: acceptance tests from the spring_damping pack)
const P = require("../art/physics/spring.js");
let n = 0, fails = 0;
const ok = (name, c, d = "") => { n++; if (c) console.log("PASS", name, d); else { fails++; console.log("FAIL", name, d); } };
const M = (id) => P.MEDIA.find((x) => x.id === id);
const k = 200, m = 2, bOf = (id) => P.dampingFor(M(id).zeta, k, m);

ok("x = 15 cm, k = 200: |F| = 30 N, E = 2.25 J", Math.abs(Math.abs(P.springForce(0.15, 200)) - 30) < 1e-12 && Math.abs(P.elasticEnergy(0.15, 200) - 2.25) < 1e-12);
ok("water b = 2·0.32·√(k·m) = 12.8 N·s/m", Math.abs(bOf("water") - 12.8) < 1e-9);
ok("the slider names its medium", P.mediumOf(0, k, m).id === "air" && P.mediumOf(12.8, k, m).id === "water" && P.mediumOf(31.2, k, m).id === "oil" && P.mediumOf(66, k, m).id === "honey");

// release from u0 and record the swing peaks of |u|
function peaks(id, u0 = 0.15, secs = 4, chunk = 1 / 120) {
  const sim = new P.Sim(P.params(m, k, bOf(id)), u0); sim.release();
  const out = []; let prev = sim.u, prev2 = sim.u, crossings = 0, lastSign = Math.sign(sim.u);
  for (let i = 0, N = Math.round(secs / chunk); i < N; i++) {
    sim.advance(chunk); const u = sim.u;
    if (Math.abs(prev) > Math.abs(prev2) && Math.abs(prev) > Math.abs(u)) out.push(Math.abs(prev));
    if (Math.sign(u) !== 0 && Math.sign(u) !== lastSign) { crossings++; lastSign = Math.sign(u); }
    prev2 = prev; prev = u;
  }
  return { peaks: out, crossings, end: Math.abs(sim.u) };
}
const air = peaks("air"), water = peaks("water"), honey = peaks("honey");
ok("water dies away faster than air", water.peaks[0] < air.peaks[0] * 0.5 && water.end < air.peaks[air.peaks.length - 1], `air ${air.peaks[0]?.toFixed(3)} water ${water.peaks[0]?.toFixed(3)}`);
ok("water still swings at least once (not an instant stop)", water.crossings >= 2);
ok("honey goes back without crossing equilibrium", honey.crossings === 0, "crossings " + honey.crossings);

// a finger pulls down 15 cm: the body follows late in honey, almost at once in air
function follow(id, after) {
  const sim = new P.Sim(P.params(m, k, bOf(id)), 0); sim.pull(0.15);
  for (let t = 0; t < after; t += 1 / 120) sim.advance(1 / 120);
  return sim.u;
}
ok("dragging in air follows the finger quickly", follow("air", 0.25) > 0.12, follow("air", 0.25).toFixed(3));
ok("dragging in honey lags behind", follow("honey", 0.1) < follow("water", 0.1) && follow("water", 0.1) < follow("air", 0.1));
ok("held still, it ends at the finger (grip wins over the spring)", Math.abs(follow("water", 3) - 0.15) < 0.002, follow("water", 3).toFixed(3));
{
  const sim = new P.Sim(P.params(m, k, bOf("water")), 0); sim.pull(0.15);
  for (let i = 0; i < 6; i++) sim.advance(1 / 120);
  const v = sim.st.v; sim.release();
  ok("letting go keeps the speed it had", sim.st.v === v && v !== 0);
}
// same physics at 30, 60 and 120 Hz
const at = (hz) => peaks("water", 0.15, 2, 1 / hz).end;
ok("damping does not depend on the screen's frame rate", Math.abs(at(30) - at(120)) < 1e-9 && Math.abs(at(60) - at(120)) < 1e-9);

console.log(`${n - fails}/${n} passed`);
if (fails) process.exit(1);
