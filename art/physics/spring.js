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

  // ---------------------------------------------------------------------
  //  Horizontal spring fixed to a wall, the creature on a floor with friction.
  //  x = stretch from the natural length (m), + away from the wall.
  //  Moving:   m x'' = -k x - μk m g · sign(v)
  //  At rest:  stays wherever k|x| ≤ μs m g (static friction holds it), so it
  //            often stops before reaching x = 0. Each half swing loses 2μk m g / k.
  // ---------------------------------------------------------------------
  function hparams(m, k, mus, muk, g = G_EARTH) {
    positive("m", m); positive("k", k); positive("g", g);
    if (!(Number.isFinite(mus) && mus >= 0 && Number.isFinite(muk) && muk >= 0)) throw new Error("friction must be ≥ 0");
    return { m, k, mus, muk, g };
  }
  const stickZone = (p) => p.mus * p.m * p.g / p.k;            // |x| within this: static friction can hold it
  const halfSwingLoss = (p) => 2 * p.muk * p.m * p.g / p.k;
  function hstep(st, p, dt = DT) {
    let { x, v, moving } = st;
    if (!moving) {
      if (p.k * Math.abs(x) <= p.mus * p.m * p.g + 1e-12) return { x, v: 0, moving: false, stopped: false };
      moving = true; v = 0;
    }
    const dir = v !== 0 ? Math.sign(v) : -Math.sign(x);       // friction opposes the (coming) motion
    const a = (-p.k * x - dir * p.muk * p.m * p.g) / p.m;
    const vn = v + a * dt;
    // it turned around: friction gets a chance to hold (no friction: nothing can hold it, keep going)
    if ((p.mus > 0 || p.muk > 0) && ((v !== 0 && vn * v < 0) || (v === 0 && vn * dir < 0))) {
      return { x, v: 0, moving: false, stopped: true };
    }
    return { x: x + vn * dt, v: vn, moving: true, stopped: false };
  }
  class HSim {
    constructor(p, x0 = 0) { this.reset(p, x0); }
    reset(p, x0 = 0) { this.p = p; this.st = { x: x0, v: 0, moving: false }; this.acc = 0; this.t = 0; this.held = false; this.turns = []; this.rested = !(p.k * Math.abs(x0) > p.mus * p.m * p.g); }
    hold(x) { this.held = true; this.st = { x, v: 0, moving: false }; }
    release() { this.held = false; this.acc = 0; this.t = 0; this.turns = []; this.rested = false; }
    advance(elapsed) {
      if (this.held) return 0;
      this.acc += Math.min(elapsed, 0.25);
      let n = 0;
      while (this.acc >= DT) {
        const was = this.st.moving;
        const st = hstep(this.st, this.p, DT);
        this.acc -= DT; this.t += DT; n++;
        if (st.stopped) this.turns.push({ t: this.t, x: st.x });
        this.st = { x: st.x, v: st.v, moving: st.moving };
        if (!st.moving && !was) { this.rested = this.turns.length > 0 || this.rested; }
      }
      return n;
    }
    // at rest for good: not moving, and the spring cannot beat static friction
    get stuck() { return !this.held && !this.st.moving && this.p.k * Math.abs(this.st.x) <= this.p.mus * this.p.m * this.p.g + 1e-12; }
  }

  return { G_EARTH, DT, params, equilibrium, period, omega, springForce, elasticEnergy, accel, totalEnergy, underdamped, step, fromEquilibrium, Sim,
    hparams, stickZone, halfSwingLoss, hstep, HSim };
})();
if (typeof module !== "undefined") module.exports = SpringPhys;
