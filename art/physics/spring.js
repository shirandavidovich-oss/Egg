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

  // ---------------- floor launcher: a body resting on a vertical spring, NOT attached ----------------
  // y = position of the body's base relative to the spring's natural length, + up (y < 0: spring compressed).
  // In contact (y <= 0) the spring pushes up with k·(−y); once y reaches 0 the contact ends and only gravity acts.
  const lparams = (m, k, g = G_EARTH) => ({ m, k, g });
  const restCompression = (p) => p.m * p.g / p.k;                       // sits compressed by mg/k
  // leaves the spring only if ½k·c² > m·g·c, i.e. compressed more than 2mg/k
  const detachCompression = (p) => 2 * p.m * p.g / p.k;
  const launchSpeed = (p, c) => Math.sqrt(Math.max(0, p.k * c * c / p.m - 2 * p.g * c));      // at the natural length
  const launchApex = (p, c) => c > detachCompression(p) ? launchSpeed(p, c) ** 2 / (2 * p.g) : 0; // above the natural length
  const riseFromStart = (p, c) => p.k * c * c / (2 * p.m * p.g);                              // apex above the start point
  function lstep(st, p, dt, damp = 0) {
    const touching = st.y <= 0;
    const a = (touching ? (-p.k * st.y - damp * st.v) / p.m : 0) - p.g;
    const v = st.v + a * dt, y = st.y + v * dt;
    return { y, v, touching: y <= 0 };
  }
  class LSim {
    constructor(p) { this.reset(p); }
    reset(p) { this.p = p; this.st = { y: -restCompression(p), v: 0, touching: true }; this.acc = 0; this.t = 0; this.held = false; this.flights = 0; this.apex = null; this.flying = false; this.landed = false; this.peak = -Infinity; }
    hold(c) { this.held = true; this.st = { y: -c, v: 0, touching: true }; }
    release() { this.held = false; this.acc = 0; this.t = 0; this.apex = null; this.flying = false; this.landed = false; this.peak = -Infinity; this.c0 = -this.st.y; }
    advance(elapsed) {
      if (this.held) return 0;
      this.acc += Math.min(elapsed, 0.25);
      let n = 0;
      while (this.acc >= DT) {
        // after a flight it lands and grabs on: a soft catch (damping only after landing), so it comes to rest
        const damp = this.landed ? 2 * Math.sqrt(this.p.k * this.p.m) * 0.35 : 0;
        const before = this.st;
        this.st = lstep(this.st, this.p, DT, damp);
        if (before.touching && !this.st.touching) { this.flying = true; this.flights++; }
        if (this.flying) this.peak = Math.max(this.peak, this.st.y);
        if (this.flying && before.v > 0 && this.st.v <= 0) this.apex = this.st.y;
        if (this.flying && this.st.touching) { this.flying = false; this.landed = true; }
        this.acc -= DT; this.t += DT; n++;
      }
      return n;
    }
  }

  // ---------------- energy track: spring (contact only) → flat → ramp → upper platform with an end wall ----------------
  // s = distance along the track from the spring's natural end (s < 0: spring compressed). Friction from the surface.
  const track = (o = {}) => ({ flat: 0.6, rampLen: 0.8, deg: 25, top: 1.0, ...o });
  function trackAt(T, s) {
    const th = T.deg * Math.PI / 180, r0 = T.flat, r1 = T.flat + T.rampLen;
    if (s <= r0) return { y: 0, th: 0, x: s };
    if (s <= r1) return { y: (s - r0) * Math.sin(th), th, x: r0 + (s - r0) * Math.cos(th) };
    return { y: T.rampLen * Math.sin(th), th: 0, x: r0 + T.rampLen * Math.cos(th) + (s - r1) };
  }
  const trackEnd = (T) => T.flat + T.rampLen + T.top;
  // one fixed step; returns the new state and the heat made by friction in this step
  // stiff spring + kinks in the track: integrate in 8 sub-steps so the energy books balance to ~1%
  function rstep(st, p, T, dt) {
    let heat = 0;
    for (let i = 0; i < 8; i++) { const r = rsub(st, p, T, dt / 8); st = r.st; heat += r.heat; }
    return { st, heat };
  }
  function rsub(st, p, T, dt) {
    const at = trackAt(T, st.s), N = p.m * p.g * Math.cos(at.th), drive = (st.s < 0 ? -p.k * st.s : 0) - p.m * p.g * Math.sin(at.th);
    if (!st.moving) {
      if (Math.abs(drive) <= p.mus * N + 1e-12) return { st: { ...st, v: 0 }, heat: 0 };
      st = { ...st, moving: true };
    }
    const dir = Math.abs(st.v) > 1e-9 ? Math.sign(st.v) : Math.sign(drive);
    const a = (drive - dir * p.muk * N) / p.m;
    let v = st.v + a * dt;
    // friction can stop it but never push it backwards
    if (Math.abs(st.v) > 1e-9 && Math.sign(v) !== Math.sign(st.v)) {
      const stopped = Math.abs(drive) <= p.mus * N;
      if (stopped) return { st: { s: st.s, v: 0, moving: false }, heat: 0 };
    }
    let s = st.s + v * dt;
    const end = trackEnd(T);
    if (s > end) { s = end - (s - end); v = -v; }                 // elastic bounce off the end wall
    const ds = Math.abs(s - st.s);
    return { st: { s, v, moving: true }, heat: p.muk * N * ds };
  }
  const rparams = (m, k, mus, muk, g = G_EARTH) => ({ m, k, mus, muk, g });
  const rEnergy = (st, p, T) => ({ el: st.s < 0 ? 0.5 * p.k * st.s * st.s : 0, k: 0.5 * p.m * st.v * st.v, g: p.m * p.g * trackAt(T, st.s).y });

  // ---------------- spring on an incline ----------------
  // x = stretch along the slope (+ down the slope). m·x'' = m·g·sinθ − k·x − friction, with N = m·g·cosθ.
  // In u = x − m·g·sinθ/k this is exactly the wall spring with g → g·cosθ, so HSim does the work.
  const iparams = (m, k, mus, muk, deg, g = G_EARTH) => ({ ...hparams(m, k, mus, muk, g * Math.cos(deg * Math.PI / 180)), deg, gTrue: g });
  const inclineEq = (p) => p.m * p.gTrue * Math.sin(p.deg * Math.PI / 180) / p.k;

  // ---------------- two bodies pushed apart by a compressed spring (frictionless) ----------------
  // the spring is not attached: it pushes while compressed, then both coast. Momentum stays zero.
  function twoStep(st, p, dt) {
    let { x1, x2, v1, v2 } = st;
    for (let i = 0; i < 8; i++) {
      const h = dt / 8, comp = Math.max(0, p.L0 - (x2 - x1)), F = p.k * comp;     // pushes 1 left, 2 right
      v1 -= F / p.m1 * h; v2 += F / p.m2 * h; x1 += v1 * h; x2 += v2 * h;
    }
    return { x1, x2, v1, v2, touching: x2 - x1 < p.L0 };
  }
  // ideal result: momentum 0, all spring energy to motion
  function twoSpeeds(p, c) {
    const E = 0.5 * p.k * c * c, v2 = Math.sqrt(2 * E * p.m1 / (p.m2 * (p.m1 + p.m2)));
    return { v1: -p.m2 * v2 / p.m1, v2 };
  }

  return { G_EARTH, DT, params, equilibrium, period, omega, springForce, elasticEnergy, accel, totalEnergy, underdamped, step, fromEquilibrium, Sim,
    hparams, stickZone, halfSwingLoss, hstep, HSim,
    lparams, restCompression, detachCompression, launchSpeed, launchApex, riseFromStart, lstep, LSim,
    track, trackAt, trackEnd, rstep, rparams, rEnergy,
    iparams, inclineEq, twoStep, twoSpeeds };
})();
if (typeof module !== "undefined") module.exports = SpringPhys;
