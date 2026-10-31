// ======================================================================
//  Spring physics: a creature hanging from a vertical spring.
//  y points DOWN. s = extension from the natural length (m), v = ds/dt.
//  m s'' = m g - k s - b s'        (spec: art/source/physics/docs/06_SPRING_PHYSICS.md)
//  Pure functions plus a small fixed-step simulator. No drawing here.
// ======================================================================
const SpringPhys = (() => {
  "use strict";
  const G_EARTH = 9.81;
  const DT = 1 / 120;                     // fixed step, never the raw frame time

  function positive(name, x) {
    if (!(Number.isFinite(x) && x > 0)) throw new Error(name + " must be finite and > 0");
    return x;
  }
  function params(m, k, b = 0, g = G_EARTH) {
    positive("m", m); positive("k", k);
    if (!(Number.isFinite(b) && b >= 0)) throw new Error("b cannot be negative");
    positive("g", g);
    return { m, k, b, g };
  }
  const equilibrium = (p) => p.m * p.g / p.k;                  // s_eq = mg/k
  const period = (p) => 2 * Math.PI * Math.sqrt(p.m / p.k);     // T = 2π√(m/k), no damping
  const omega = (p) => Math.sqrt(p.k / p.m);
  const springForce = (s, k) => -k * s;                         // along +y (down)
  const elasticEnergy = (s, k) => 0.5 * k * s * s;              // from the NATURAL length
  const accel = (s, v, p) => p.g - (p.k * s + p.b * v) / p.m;
  // total energy, zero at the natural length: kinetic + elastic + gravity (gravity PE = -m g s with y down)
  const totalEnergy = (st, p) => 0.5 * p.m * st.v * st.v + elasticEnergy(st.s, p.k) - p.m * p.g * st.s;
  // underdamped? (b < 2√(km))
  const underdamped = (p) => p.b < 2 * Math.sqrt(p.k * p.m);

  function step(st, p, dt = DT) {
    positive("dt", dt);
    const v = st.v + accel(st.s, st.v, p) * dt;                 // semi-implicit Euler
    return { s: st.s + v * dt, v };
  }
  // start at rest, u below the equilibrium (u = 0 is a true rest state)
  const fromEquilibrium = (p, u) => ({ s: equilibrium(p) + u, v: 0 });

  // A simulator that advances in fixed steps and measures the real period from the motion.
  class Sim {
    constructor(p, u0 = 0) { this.reset(p, u0); }
    reset(p, u0 = 0) {
      this.p = p; this.st = fromEquilibrium(p, u0); this.acc = 0; this.t = 0;
      this.crossings = []; this.lastU = u0; this.held = false; this.maxU = Math.abs(u0);
    }
    hold(u) { this.held = true; this.st = { s: equilibrium(this.p) + u, v: 0 }; this.lastU = u; }
    release() { this.held = false; this.acc = 0; this.t = 0; this.crossings = []; this.maxU = Math.abs(this.u); }
    get u() { return this.st.s - equilibrium(this.p); }
    // advance by real elapsed time (capped), in fixed steps; returns the number of steps
    advance(elapsed) {
      if (this.held) return 0;
      this.acc += Math.min(elapsed, 0.25);
      let n = 0;
      while (this.acc >= DT) {
        this.st = step(this.st, this.p, DT);
        this.acc -= DT; this.t += DT; n++;
        const u = this.u;
        // upward pass through equilibrium (u goes from + to -): one per period
        if (this.lastU > 0 && u <= 0) {
          const f = this.lastU / (this.lastU - u);
          this.crossings.push(this.t - DT + f * DT);
          if (this.crossings.length > 6) this.crossings.shift();
        }
        this.lastU = u;
      }
      return n;
    }
    // the measured period from the last full swings, or null until there are two crossings
    measuredPeriod() {
      const c = this.crossings;
      if (c.length < 2) return null;
      return (c[c.length - 1] - c[0]) / (c.length - 1);
    }
    periods() { return this.crossings.length > 0 ? this.crossings.length : 0; }
  }

  return { G_EARTH, DT, params, equilibrium, period, omega, springForce, elasticEnergy, accel, totalEnergy, underdamped, step, fromEquilibrium, Sim };
})();
if (typeof module !== "undefined") module.exports = SpringPhys;
