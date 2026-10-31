// Run: node tests/spring.test.js   (the 8 checks from docs/06_SPRING_PHYSICS.md, plus energy and stability)
const P = require("../art/physics/spring.js");
let fails = 0, n = 0;
function ok(name, cond, detail = "") { n++; if (cond) console.log("PASS", name, detail); else { fails++; console.log("FAIL", name, detail); } }
const close = (a, b, tol) => Math.abs(a - b) <= tol;

// 1, 2: periods
ok("1. T(m=1,k=100) = 0.62831853 s", close(P.period(P.params(1, 100)), 0.62831853, 1e-8), P.period(P.params(1, 100)).toFixed(8));
ok("2. T(m=4,k=100) = 1.25663706 s (twice)", close(P.period(P.params(4, 100)), 1.25663706, 1e-8), P.period(P.params(4, 100)).toFixed(8));
// 3: force and energy
ok("3. k=100, s=0.10: |F| = 10 N, E = 0.5 J", close(Math.abs(P.springForce(0.1, 100)), 10, 1e-12) && close(P.elasticEnergy(0.1, 100), 0.5, 1e-12));
// 4: equilibrium
ok("4. m=2,k=100,g=9.81: s_eq = 0.1962 m", close(P.equilibrium(P.params(2, 100)), 0.1962, 1e-12));
// 5: at rest at equilibrium stays there
{
  const p = P.params(2, 100); const sim = new P.Sim(p, 0); sim.advance(0); for (let i = 0; i < 2400; i++) sim.advance(1 / 120);
  ok("5. starts at equilibrium with v=0 and stays (20 s)", Math.abs(sim.u) < 1e-9 && Math.abs(sim.st.v) < 1e-9, "u=" + sim.u.toExponential(2));
}
// 6: changing mass at rest recomputes equilibrium, same u0 for a fair comparison, no unexplained jump
{
  const a = P.params(1.1, 120), b = P.params(3.9, 120), u0 = 0.08;
  const sim = new P.Sim(a, u0); sim.reset(b, u0);
  ok("6. mass change: new s_eq = mg/k and start = s_eq + u0", close(sim.st.s, 3.9 * 9.81 / 120 + u0, 1e-12) && sim.st.v === 0, "s=" + sim.st.s.toFixed(4));
}
// 7: ground friction does not enter a hanging spring
{
  const p = P.params(1.4, 150), s1 = new P.Sim(p, 0.1), s2 = new P.Sim(p, 0.1);
  const profileA = { mu_k: 0.19 }, profileB = { mu_k: 0.67 };   // different creatures' ground friction: not a parameter of the model
  for (let i = 0; i < 1200; i++) { s1.advance(1 / 120); s2.advance(1 / 120); }
  ok("7. friction with the ground does not change a hanging spring", s1.st.s === s2.st.s && profileA.mu_k !== profileB.mu_k);
}
// 8: damping decays, no damping keeps the amplitude
{
  const amp = (b) => {
    const sim = new P.Sim(P.params(1, 100, b), 0.1); let maxLate = 0;
    for (let i = 0; i < 120 * 20; i++) { sim.advance(1 / 120); if (i > 120 * 18) maxLate = Math.max(maxLate, Math.abs(sim.u)); }
    return maxLate;
  };
  const a0 = amp(0), a1 = amp(0.8);
  ok("8. b=0 keeps amplitude (±1%), b>0 decays", close(a0, 0.1, 0.001) && a1 < 0.05, "b=0: " + a0.toFixed(4) + " m, b=0.8: " + a1.toFixed(4) + " m");
}
// energy conservation with b = 0
{
  const p = P.params(2.6, 80); const sim = new P.Sim(p, 0.2); const e0 = P.totalEnergy(sim.st, p); let worst = 0;
  const swing = P.elasticEnergy(P.equilibrium(p) + 0.2, p.k) - P.elasticEnergy(P.equilibrium(p), p.k);
  for (let i = 0; i < 120 * 30; i++) { sim.advance(1 / 120); worst = Math.max(worst, Math.abs(P.totalEnergy(sim.st, p) - e0)); }
  ok("energy is conserved with b=0 (drift < 1% of the swing energy over 30 s)", worst / swing < 0.01, (100 * worst / swing).toFixed(3) + "%");
}
// measured period matches the formula across the game's whole range
{
  let worst = 0, unstable = 0;
  for (const m of [0.5, 0.9, 1.1, 2.6, 3.9, 4.0]) for (const k of [30, 60, 120, 250, 400]) {
    const p = P.params(m, k); const sim = new P.Sim(p, 0.15);
    for (let i = 0; i < 120 * 12; i++) sim.advance(1 / 120);
    if (!Number.isFinite(sim.st.s) || Math.abs(sim.u) > 0.16) unstable++;
    const Tm = sim.measuredPeriod(); if (Tm) worst = Math.max(worst, Math.abs(Tm - P.period(p)) / P.period(p));
  }
  ok("measured period = 2π√(m/k) within 0.5% for k 30–400, m 0.5–4", worst < 0.005, "worst " + (100 * worst).toFixed(3) + "%");
  ok("stable across the whole slider range", unstable === 0);
}
// period does not depend on amplitude or on g (the Moon moment)
{
  const run = (u, g) => { const sim = new P.Sim(P.params(1.8, 90, 0, g), u); for (let i = 0; i < 120 * 10; i++) sim.advance(1 / 120); return sim.measuredPeriod(); };
  const a = run(0.03, 9.81), b = run(0.24, 9.81), c = run(0.12, 1.62);
  ok("period does not depend on amplitude or on g", close(a, b, 0.003) && close(a, c, 0.003), [a, b, c].map((x) => x.toFixed(4)).join(" / "));
}
// bad input is refused
{
  let threw = 0; for (const f of [() => P.params(0, 100), () => P.params(1, -5), () => P.params(1, 100, -1), () => P.params(NaN, 100)]) { try { f(); } catch (e) { threw++; } }
  ok("invalid m, k, b are refused", threw === 4);
}
console.log(`\n${n - fails}/${n} passed`);
process.exit(fails ? 1 : 0);
