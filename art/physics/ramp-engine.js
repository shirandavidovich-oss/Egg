// ======================================================================
//  "הרפתקאות על המדרון": physics for the 18 inclined-plane situations.
//  SI units, g = 10 by default. Every model is a 1-D track: one coordinate s,
//  one velocity v, an inertial mass M, and at each moment a driving force
//  (everything but friction, along +s), a static-friction limit and a
//  kinetic-friction size. The integrator steps exactly between events:
//    v crossing zero  -> static friction gets re-evaluated (no flip-flop)
//    a time event     -> engine off, brake on (split the step there)
//    a position event -> track joint, barrier, spring contact
//  Static friction is only as large as needed; kinetic friction opposes v.
//  (spec: incline_friction_claude_pack/docs/PHYSICS_SPEC_HE.md)
// ======================================================================
const RampPhys = (() => {
  "use strict";
  const EPS = 1e-9, DEG = Math.PI / 180, G = 10;
  const rad = (d) => d * DEG;
  const sgn = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);
  const fin = (o) => { for (const k in o) if (typeof o[k] === "number" && !Number.isFinite(o[k])) throw new Error("invalid " + k + ": " + o[k]); };

  // ---------- reference kernel (same contract as engine.mjs in the pack) ----------
  function validateSingle(p) {
    fin({ m: p.m, angleDeg: p.angleDeg, muS: p.muS, muK: p.muK, g: p.g });
    if (p.m <= 0 || p.g <= 0 || p.angleDeg < 0 || p.angleDeg >= 90 || p.muS < 0 || p.muK < 0) throw new Error("Invalid plane input");
    if (p.muK > p.muS + EPS) throw new Error("Presets require muS >= muK");
  }
  // fApplied: along the plane, + is UP. fInto: pressing into the plane (+) or lifting off it (−).
  function singleBlockForces(p, { velocity = 0, fApplied = 0, fInto = 0 } = {}) {
    validateSingle(p);
    const { m, angleDeg, muS, muK, g } = p, th = rad(angleDeg);
    const N = m * g * Math.cos(th) + fInto;
    if (N <= EPS) return { contact: false, reason: "contact_lost_requires_2d_model", N: Math.max(0, N) };
    const gravParallel = -m * g * Math.sin(th), driving = fApplied + gravParallel, maxStatic = muS * N;
    let friction, mode, acceleration;
    if (Math.abs(velocity) < EPS && Math.abs(driving) <= maxStatic + EPS) { friction = -driving; mode = "static"; acceleration = 0; }
    else {
      const dir = Math.abs(velocity) >= EPS ? Math.sign(velocity) : Math.sign(driving);
      friction = -dir * muK * N; mode = "kinetic"; acceleration = (driving + friction) / m;
    }
    return { contact: true, N, gravParallel, driving, maxStatic, friction, mode, acceleration, netParallel: driving + friction, fApplied, fInto };
  }
  function stepSingle(p, state, dt, applied = {}) {
    if (!(dt > 0 && dt <= 0.1)) throw new Error("dt must be >0 and <= 0.1s");
    const tr = makeSingle({ ...p, F: applied.fApplied || 0, beta: 0, Q: applied.fInto || 0, L: Infinity, sMin: -Infinity });
    tr.s = state.s; tr.v = state.v; tr.advance(dt);
    return { s: tr.s, v: tr.v, forces: singleBlockForces(p, { velocity: tr.v, ...applied }) };
  }
  function hangingPulley({ mA, mB, angleDeg, muS, muK, g = G }, velocity = 0) {
    validateSingle({ m: mA, angleDeg, muS, muK, g });
    if (!(mB > 0)) throw new Error("mB must be positive");
    const N = mA * g * Math.cos(rad(angleDeg)), drive = mB * g - mA * g * Math.sin(rad(angleDeg)), maxStatic = muS * N;
    if (Math.abs(velocity) < EPS && Math.abs(drive) <= maxStatic + EPS) return { mode: "static", a: 0, drive, N, friction: -drive, T: mB * g, maxStatic };
    const dir = Math.abs(velocity) >= EPS ? Math.sign(velocity) : Math.sign(drive);
    const friction = -dir * muK * N, a = (drive + friction) / (mA + mB), T = mB * (g - a);
    if (T < -EPS) return { mode: "invalid_rope_slack", a, T };
    return { mode: "kinetic", a, T, friction, N, drive, maxStatic };
  }
  function doubleInclinePulley({ mA, mB, angleA, angleB, muSA, muSB, muKA, muKB, g = G }, velocity = 0) {
    validateSingle({ m: mA, angleDeg: angleA, muS: muSA, muK: muKA, g });
    validateSingle({ m: mB, angleDeg: angleB, muS: muSB, muK: muKB, g });
    const NA = mA * g * Math.cos(rad(angleA)), NB = mB * g * Math.cos(rad(angleB));
    const drive = mB * g * Math.sin(rad(angleB)) - mA * g * Math.sin(rad(angleA)), maxStatic = muSA * NA + muSB * NB;
    if (Math.abs(velocity) < EPS && Math.abs(drive) <= maxStatic + EPS) return { mode: "static", a: 0, drive, NA, NB, maxStatic };
    const dir = Math.abs(velocity) >= EPS ? Math.sign(velocity) : Math.sign(drive);
    const frictionA = -dir * muKA * NA, frictionB = -dir * muKB * NB, a = (drive + frictionA + frictionB) / (mA + mB);
    // rope tension from B's equation (B moves +s down its ramp)
    const T = mB * g * Math.sin(rad(angleB)) + frictionB - mB * a;
    return { mode: "kinetic", a, drive, NA, NB, frictionA, frictionB, maxStatic, T };
  }
  function descentEnergy({ m, angleDeg, muK, s, g = G }) {
    if (m <= 0 || s < 0 || muK < 0 || angleDeg < 0 || angleDeg >= 90 || g <= 0) throw new Error("Invalid energy parameters");
    const lostPotential = m * g * s * Math.sin(rad(angleDeg)), dissipated = muK * m * g * Math.cos(rad(angleDeg)) * s;
    return { lostPotential, dissipated, deltaK: lostPotential - dissipated };
  }
  function stopDistanceUphill({ speed, angleDeg, muK, g = G }) {
    if (speed < 0 || g <= 0 || muK < 0 || angleDeg < 0 || angleDeg >= 90) throw new Error("Invalid stop parameters");
    const dec = g * (Math.sin(rad(angleDeg)) + muK * Math.cos(rad(angleDeg)));
    return dec < EPS ? Infinity : speed * speed / (2 * dec);
  }
  // A uphill, B downhill, both sliding down, rope from A down to B
  function linkedBlocksSameRamp({ mA, mB, angleDeg, muKA, muKB, g = G }) {
    if (mA <= 0 || mB <= 0 || g <= 0 || angleDeg < 0 || angleDeg >= 90 || muKA < 0 || muKB < 0) throw new Error("Invalid block inputs");
    const th = rad(angleDeg);
    const driveA = mA * g * Math.sin(th) - muKA * mA * g * Math.cos(th), driveB = mB * g * Math.sin(th) - muKB * mB * g * Math.cos(th);
    const a = (driveA + driveB) / (mA + mB), T = mA * a - driveA;
    return T < 0 ? { mode: "rope_slack", a, T, aA: driveA / mA, aB: driveB / mB } : { mode: "taut", a, T };
  }
  const criticalAngle = (muS) => Math.atan(muS) / DEG;
  // range of parallel pulls (up = +) that keep a body at rest
  function staticForceRange({ m, angleDeg, muS, g = G, Q = 0 }) {
    const th = rad(angleDeg), par = m * g * Math.sin(th), lim = muS * (m * g * Math.cos(th) + Q);
    return { min: Math.max(0, par - lim), max: par + lim, par, lim };
  }

  // ======================================================================
  //  The 1-D track integrator. def.forces(s, v, t) returns
  //   { drive, maxS, fk, contact=true, smooth=false, ...anything for drawing }
  //  drive: all non-friction forces along +s; maxS = μs·ΣN; fk = μk·ΣN.
  //  def.timeEvents: sorted times where forces jump; def.posEvents(s) -> sorted
  //  positions where forces jump (joints) ; def.sMin / def.sMax: barriers.
  // ======================================================================
  class Track {
    constructor(def) {
      this.def = def; this.M = def.M;
      this.s = def.s0 || 0; this.v = def.v0 || 0; this.t = 0;
      this.heat = 0; this.work = 0;                 // friction heat (≥0), work by the applied/external force
      this.events = []; this.stopped = null; this.lost = false;
      this.peak = this.s; this.trough = this.s;
    }
    // forces at the current moment, with friction resolved
    resolve(s = this.s, v = this.v, t = this.t) {
      const F = this.def.forces(s, v, t, this);
      if (F.contact === false) return { ...F, mode: "lost", a: 0, f: 0 };
      if (Math.abs(v) < EPS && Math.abs(F.drive) <= F.maxS + EPS) return { ...F, mode: "static", f: -F.drive, a: 0, need: Math.abs(F.drive) };
      const dir = Math.abs(v) >= EPS ? sgn(v) : sgn(F.drive);
      // resting against an end stop and pushed into it: the stop holds it (not friction)
      if (Math.abs(v) < EPS && ((dir < 0 && s <= this.lo + 1e-9) || (dir > 0 && s >= this.hi - 1e-9))) return { ...F, mode: "wall", f: 0, a: 0, dir };
      const f = -dir * F.fk;
      return { ...F, mode: "kinetic", f, a: (F.drive + f) / this.M, dir };
    }
    get lo() { return this.def.lo === undefined ? -Infinity : this.def.lo; }
    get hi() { return this.def.hi === undefined ? Infinity : this.def.hi; }
    log(type, extra = {}) { this.events.push({ type, t: this.t, s: this.s, v: this.v, ...extra }); }
    advance(dt) {
      let rem = dt, guard = 0;
      while (rem > 1e-12 && guard++ < 400) {
        if (this.lost) { this.t += rem; return; }
        const R = this.resolve();
        if (R.mode === "lost") { this.lost = true; this.v = 0; this.log("lost_contact"); continue; }
        // window until the next time event
        let tau = rem;
        const te = (this.def.timeEvents || []).find((x) => x > this.t + 1e-12);
        if (te !== undefined && te - this.t < tau) tau = te - this.t;
        if (R.mode === "static" || R.mode === "wall") {
          if (this.v !== 0) { this.v = 0; }
          if (!this.stopped) { this.stopped = { t: this.t, s: this.s }; }
          this.t += tau; rem -= tau; continue;
        }
        if (this.stopped) { this.log("start", { dir: R.dir }); this.stopped = null; }
        const a = R.a, v = this.v;

        // v reaching zero
        let stopAt = Infinity;
        if (Math.abs(v) > EPS && sgn(a) === -sgn(v)) stopAt = -v / a;
        if (stopAt <= tau + 1e-12) tau = stopAt;
        // position events (joints, barriers, contacts)
        const marks = (this.def.marks ? this.def.marks(this) : []).slice();
        if (Number.isFinite(this.lo)) marks.push({ s: this.lo, kind: "barrier", name: "bottom" });
        if (Number.isFinite(this.hi)) marks.push({ s: this.hi, kind: "barrier", name: "top" });
        let hit = null;
        for (const mk of marks) {
          const d = mk.s - this.s;
          if (Math.abs(d) < 1e-10) continue;
          const tt = firstHit(v, a, d);
          if (tt !== null && tt < tau - 1e-12) { tau = tt; hit = mk; }
        }
        let ds, stoppedNow = tau === stopAt;
        if (R.harm) {
          // in contact with a spring: m s'' = A − k s exactly (friction direction fixed inside the window)
          const r = harmonic(this.s, v, R.harm, this.M, R.f, tau);
          tau = r.tau; ds = r.s - this.s; this.v = r.v; stoppedNow = r.stop; if (r.left) hit = { s: r.s, kind: "contact", name: "spring_off" };
          this.s = r.s;
        } else { ds = v * tau + 0.5 * a * tau * tau; this.s += ds; this.v = v + a * tau; }
        this.t += tau; rem -= tau;
        this.heat += Math.abs(R.f) * Math.abs(ds);
        this.work += (R.Fwork || 0) * ds;
        if (stoppedNow) { this.v = 0; this.log("v_zero"); }
        if (hit) {
          this.s = hit.s;
          if (hit.kind === "barrier") { this.log("barrier", { at: hit.name || "" }); this.v = 0; this.stopped = { t: this.t, s: this.s, barrier: true }; }
          else this.log(hit.kind, { at: hit.name || "" });
        }
        this.peak = Math.max(this.peak, this.s); this.trough = Math.min(this.trough, this.s);
        if (this.def.after) this.def.after(this);
      }
    }
    atEnd() { return this.s <= this.lo + 1e-9 ? "bottom" : this.s >= this.hi - 1e-9 ? "top" : null; }
  }
  // spring contact: drive = A0 − k·s (A0 includes gravity, applied force and k·at), friction f fixed.
  // Exact solution; stops at v = 0 or when the body leaves the spring (s = at).
  function harmonic(s0, v0, H, M, f, tau) {
    const w = Math.sqrt(H.k / M), seq = (H.A0 + f) / H.k, X = s0 - seq;
    const pos = (t) => seq + X * Math.cos(w * t) + (v0 / w) * Math.sin(w * t);
    const vel = (t) => -X * w * Math.sin(w * t) + v0 * Math.cos(w * t);
    // first time v = 0 (if moving): tan(wt) = v0 / (w X)
    let tz = Infinity;
    if (Math.abs(v0) > EPS) { let t = Math.atan2(v0, w * X) / w; if (t <= 1e-14) t += Math.PI / w; tz = t; }
    // first time s = at (leaving the spring), scan then bisect
    let tl = Infinity; const N = 64, end = Math.min(tau, tz);
    let prev = pos(0) - H.at;
    for (let i = 1; i <= N; i++) {
      const t = end * i / N, cur = pos(t) - H.at;
      if (cur >= 0 && prev < 0) { let lo = end * (i - 1) / N, hi = t; for (let j = 0; j < 60; j++) { const m = (lo + hi) / 2; if (pos(m) - H.at >= 0) hi = m; else lo = m; } tl = hi; break; }
      prev = cur;
    }
    if (tl <= end) return { tau: tl, s: H.at, v: vel(tl), stop: false, left: true };
    if (tz <= tau) return { tau: tz, s: pos(tz), v: 0, stop: true, left: false };
    return { tau, s: pos(tau), v: vel(tau), stop: false, left: false };
  }
  // smallest τ>0 with v τ + ½ a τ² = d
  function firstHit(v, a, d) {
    if (Math.abs(a) < 1e-14) { if (Math.abs(v) < 1e-14) return null; const t = d / v; return t > 1e-14 ? t : null; }
    const disc = v * v + 2 * a * d;
    if (disc < 0) return null;
    const r = Math.sqrt(disc), t1 = (-v - r) / a, t2 = (-v + r) / a;
    const c = [t1, t2].filter((t) => t > 1e-14).sort((x, y) => x - y);
    return c.length ? c[0] : null;
  }

  // ---------- one body on a ramp ----------
  // p: m, angleDeg, muS, muK, g, F (rope force, N), beta (rope angle above the surface, deg),
  //    Q (press into the surface, N), forceOffAt (s), brake {at, muS, muK, on}, spring {k, at},
  //    L (ramp length; s from the bottom, + up), s0, v0, sMin
  function makeSingle(p) {
    const g = p.g || G, th = rad(p.angleDeg), c = Math.cos(th), sn = Math.sin(th);
    const L = p.L === undefined ? 4 : p.L, sMin = p.sMin === undefined ? 0 : p.sMin;
    const tr = new Track({
      M: p.m, s0: p.s0 === undefined ? L * 0.8 : p.s0, v0: p.v0 || 0,
      timeEvents: [p.forceOffAt, p.brake && p.brake.at].filter((x) => Number.isFinite(x)).sort((a, b) => a - b),
      forces(s, v, t, me) {
        const on = !(Number.isFinite(p.forceOffAt) && t >= p.forceOffAt - 1e-12);
        const F = on ? (p.F || 0) : 0, beta = rad(p.beta || 0);
        const Fpar = F * Math.cos(beta), Flift = F * Math.sin(beta), Q = p.Q || 0;
        const N = p.m * g * c - Flift + Q;
        const braking = p.brake && (p.brake.on || (Number.isFinite(p.brake.at) && t >= p.brake.at - 1e-12));
        const muS = braking ? p.brake.muS : p.muS, muK = braking ? p.brake.muK : p.muK;
        let spring = 0, x = 0;
        if (p.spring && s < p.spring.at) { x = p.spring.at - s; spring = p.spring.k * x; }
        const grav = -p.m * g * sn;
        if (N <= EPS) return { contact: false, N: 0, grav, Fpar, Flift, Q, F, on };
        const inSpring = p.spring && (x > 1e-12 || (Math.abs(s - p.spring.at) <= 1e-10 && v <= 0));
        return { drive: Fpar + grav + spring, maxS: muS * N, fk: muK * N, N, grav, Fpar, Flift, Q, F, on, muS, muK, braking, spring, x, springK: p.spring ? p.spring.k : 0,
          harm: inSpring ? { k: p.spring.k, A0: Fpar + grav + p.spring.k * p.spring.at, at: p.spring.at } : null, Fwork: Fpar };
      },
      lo: sMin, hi: L, marks: () => (p.spring ? [{ s: p.spring.at, kind: "contact", name: "spring" }] : [])
    });
    tr.kind = "single"; tr.p = p;
    tr.height = (s) => s * sn;                                         // above the bottom end
    tr.energy = () => {
      const R = tr.resolve(), x = R.x || 0;
      return { K: 0.5 * p.m * tr.v * tr.v, U: p.m * g * tr.height(tr.s), Es: p.spring ? 0.5 * p.spring.k * x * x : 0, Q: tr.heat, W: tr.work };
    };
    return tr;
  }

  // ---------- a track of segments (slope, flat, slope) ----------
  // segments: [{ length, angleDeg (+ = going DOWN in the forward direction), muS, muK }]
  function makePiecewise(p) {
    const g = p.g || G, segs = p.segments, ends = [];
    let acc = 0; for (const sg of segs) { acc += sg.length; ends.push(acc); }
    const total = acc;
    const segAt = (s, v) => {
      // on a joint, use the segment the body is heading into
      for (let i = 0; i < segs.length; i++) {
        const a = i ? ends[i - 1] : 0, b = ends[i];
        if (s > a + 1e-10 && s < b - 1e-10) return i;
        if (Math.abs(s - b) <= 1e-10) return v < -EPS ? i : Math.min(i + 1, segs.length - 1);
        if (Math.abs(s - a) <= 1e-10 && i === 0) return 0;
      }
      return s <= 0 ? 0 : segs.length - 1;
    };
    // height of the path above its lowest point
    const hAt = (s) => { let h = 0, a = 0; for (const sg of segs) { const d = Math.max(0, Math.min(sg.length, s - a)); h -= d * Math.sin(rad(sg.angleDeg)); a += sg.length; } return h; };
    const tr = new Track({
      M: p.m, s0: 0, v0: p.v0 || 0,
      forces(s, v, t, me) {
        const i = segAt(s, Math.abs(v) < EPS ? (p.dirHint || 1) : v), sg = segs[i], ph = rad(sg.angleDeg);
        const N = p.m * g * Math.cos(ph);
        return { drive: p.m * g * Math.sin(ph), maxS: sg.muS * N, fk: sg.muK * N, N, seg: i, grav: p.m * g * Math.sin(ph), muS: sg.muS, muK: sg.muK };
      },
      lo: 0, hi: total, marks: () => ends.slice(0, -1).map((e, i) => ({ s: e, kind: "joint", name: "j" + (i + 1) }))
    });
    tr.kind = "piecewise"; tr.p = p; tr.ends = ends; tr.total = total; tr.segAt = segAt; tr.hAt = hAt;
    const hmin = Math.min(0, ...ends.map(hAt));
    tr.energy = () => ({ K: 0.5 * p.m * tr.v * tr.v, U: p.m * g * (hAt(tr.s) - hmin), Es: 0, Q: tr.heat, W: 0 });
    return tr;
  }

  // ---------- body on a ramp, rope over a pulley at the top, hanging weight ----------
  // s: how far A moved UP the ramp (= how far B moved down)
  function makeHanging(p) {
    const g = p.g || G, th = rad(p.angleDeg);
    const NA = p.mA * g * Math.cos(th);
    const tr = new Track({
      M: p.mA + p.mB, s0: 0, v0: p.v0 || 0,
      forces() { return { drive: p.mB * g - p.mA * g * Math.sin(th), maxS: p.muS * NA, fk: p.muK * NA, N: NA, WB: p.mB * g, WA: p.mA * g, gravA: -p.mA * g * Math.sin(th) }; },
      lo: p.sMin === undefined ? -1.2 : p.sMin, hi: p.sMax === undefined ? 1.2 : p.sMax
    });
    tr.kind = "hanging"; tr.p = p;
    // tension from B's own equation: mB g − T = mB a ; at rest T balances what is needed
    tr.tension = () => { const R = tr.resolve(); return R.mode === "static" ? p.mB * g : p.mB * (g - R.a); };
    tr.energy = () => ({ K: 0.5 * (p.mA + p.mB) * tr.v * tr.v, U: p.mA * g * tr.s * Math.sin(th) - p.mB * g * tr.s, Es: 0, Q: tr.heat, W: 0 });
    return tr;
  }

  // ---------- two ramps back to back, a pulley on the peak ----------
  // s: how far B moved DOWN its ramp (= A moved up)
  function makeDouble(p) {
    const g = p.g || G, tA = rad(p.angleA), tB = rad(p.angleB);
    const NA = p.mA * g * Math.cos(tA), NB = p.mB * g * Math.cos(tB);
    const tr = new Track({
      M: p.mA + p.mB, s0: 0, v0: 0,
      forces() { return { drive: p.mB * g * Math.sin(tB) - p.mA * g * Math.sin(tA), maxS: p.muSA * NA + p.muSB * NB, fk: p.muKA * NA + p.muKB * NB, NA, NB, parA: p.mA * g * Math.sin(tA), parB: p.mB * g * Math.sin(tB) }; },
      lo: p.sMin === undefined ? -1.1 : p.sMin, hi: p.sMax === undefined ? 1.1 : p.sMax
    });
    tr.kind = "double"; tr.p = p;
    tr.split = () => {                                   // friction on each side and the tension
      const R = tr.resolve();
      if (R.mode === "static") {
        // statically indeterminate: share in proportion to each side's limit (a common model choice; shown as such)
        const share = R.maxS > 0 ? -R.drive / R.maxS : 0;
        const fA = share * p.muSA * NA, fB = share * p.muSB * NB;
        return { mode: "static", fA, fB, T: p.mB * g * Math.sin(tB) + fB };
      }
      const fA = -R.dir * p.muKA * NA, fB = -R.dir * p.muKB * NB;
      return { mode: "kinetic", fA, fB, a: R.a, T: p.mB * g * Math.sin(tB) + fB - p.mB * R.a };
    };
    tr.energy = () => ({ K: 0.5 * (p.mA + p.mB) * tr.v * tr.v, U: p.mA * g * tr.s * Math.sin(tA) - p.mB * g * tr.s * Math.sin(tB), Es: 0, Q: tr.heat, W: 0 });
    return tr;
  }

  // ---------- two bodies on the same ramp, joined by a rope that can go slack ----------
  // positions measured DOWN the ramp. "up" is the body nearer the top. gap ∈ [0, rope]:
  // gap = rope -> the rope can pull; gap = 0 -> the bodies touch and can push; between: free.
  class Linked {
    constructor(p) {
      this.p = p; const g = this.g = p.g || G, th = rad(p.angleDeg);
      this.sn = Math.sin(th); this.cs = Math.cos(th);
      this.rope = p.rope || 0.5;
      this.xUp = 0; this.xDn = this.rope; this.vUp = 0; this.vDn = 0; this.t = 0; this.L = p.L || 3.4;
      this.events = []; this.heat = 0; this.mode = "taut";
    }
    // body i = { m, muS, muK } ; returns free acceleration at velocity v (down = +)
    free(b, v) {
      const g = this.g, drive = b.m * g * this.sn, N = b.m * g * this.cs;
      if (Math.abs(v) < EPS && drive <= b.muS * N + EPS) return { a: 0, f: -drive, mode: "static", N };
      const dir = Math.abs(v) >= EPS ? sgn(v) : 1, f = -dir * b.muK * N;
      return { a: (drive + f) / b.m, f, mode: "kinetic", N };
    }
    bodies() { return this.p.swap ? { up: this.p.B, dn: this.p.A } : { up: this.p.A, dn: this.p.B }; }
    // the joined system (same velocity) and the internal force (+ = rope tension, − = contact push)
    joined(v) {
      const { up, dn } = this.bodies(), g = this.g, M = up.m + dn.m;
      const drive = M * g * this.sn, Nu = up.m * g * this.cs, Nd = dn.m * g * this.cs;
      let a, fu, fd;
      if (Math.abs(v) < EPS && drive <= up.muS * Nu + dn.muS * Nd + EPS) {
        a = 0; const share = drive / (up.muS * Nu + dn.muS * Nd || 1); fu = -share * up.muS * Nu; fd = -share * dn.muS * Nd;
      } else { const dir = Math.abs(v) >= EPS ? sgn(v) : 1; fu = -dir * up.muK * Nu; fd = -dir * dn.muK * Nd; a = (drive + fu + fd) / M; }
      // the lower body: m a = m g sinθ + f − T  →  T = m g sinθ + f − m a
      const T = dn.m * g * this.sn + fd - dn.m * a;
      return { a, T, fu, fd, Nu, Nd, mode: a === 0 && Math.abs(v) < EPS ? "static" : "kinetic" };
    }
    state() {
      const { up, dn } = this.bodies(), gap = this.xDn - this.xUp;
      const together = Math.abs(this.vUp - this.vDn) < 1e-7;
      if (together && (gap >= this.rope - 1e-9 || gap <= 1e-9)) {
        const J = this.joined(this.vUp);
        if (gap >= this.rope - 1e-9 && J.T >= -1e-9) return { kind: "taut", ...J };
        if (gap <= 1e-9 && J.T <= 1e-9) return { kind: "contact", ...J };
      }
      const fu = this.free(up, this.vUp), fd = this.free(dn, this.vDn);
      return { kind: "slack", aUp: fu.a, aDn: fd.a, fu: fu.f, fd: fd.f, Nu: fu.N, Nd: fd.N, T: 0 };
    }
    advance(dt) {
      const h = 1 / 2000; let rem = dt;
      while (rem > 1e-12) {
        const step = Math.min(h, rem); rem -= step;
        const S = this.state();
        if (S.kind === "slack") {
          this.mode = "slack";
          const vu = this.vUp + S.aUp * step, vd = this.vDn + S.aDn * step;
          const du = (this.vUp + vu) / 2 * step, dd = (this.vDn + vd) / 2 * step;
          this.heat += Math.abs(S.fu * du) + Math.abs(S.fd * dd);
          this.xUp += du; this.xDn += dd; this.vUp = vu; this.vDn = vd;
          // a velocity crossing zero stops at zero (static gets re-checked next step)
          if (Math.abs(this.vUp) < 1e-6 && S.aUp === 0) this.vUp = 0;
          if (Math.abs(this.vDn) < 1e-6 && S.aDn === 0) this.vDn = 0;
          const gap = this.xDn - this.xUp;
          if (gap >= this.rope || gap <= 0) {            // the rope snaps taut / the bodies bump: perfectly inelastic
            const M = this.bodies().up.m + this.bodies().dn.m, vc = (this.bodies().up.m * this.vUp + this.bodies().dn.m * this.vDn) / M;
            if (gap >= this.rope) { this.xDn = this.xUp + this.rope; this.events.push({ type: "taut", t: this.t }); }
            else { this.xUp = this.xDn; this.events.push({ type: "touch", t: this.t }); }
            this.vUp = this.vDn = vc;
          }
        } else {
          this.mode = S.kind;
          const v = this.vUp, vn = v + S.a * step;
          const d = (v + vn) / 2 * step;
          this.heat += (Math.abs(S.fu) + Math.abs(S.fd)) * Math.abs(d);
          this.xUp += d; this.xDn += d; this.vUp = this.vDn = vn;
        }
        this.t += step;
        if (this.xDn >= this.L) { this.xDn = this.L; this.vDn = 0; if (this.xUp > this.xDn) this.xUp = this.xDn; this.vUp = Math.min(this.vUp, 0); this.ended = true; }
      }
    }
  }
  const makeLinked = (p) => new Linked(p);

  // ---------- run a track to the end of its motion (for answers computed at run time) ----------
  function simulate(tr, { tMax = 30, dt = 1 / 240, until } = {}) {
    const out = [];
    for (let i = 0; tr.t < tMax; i++) {
      tr.advance(dt);
      const R = tr.resolve ? tr.resolve() : null;
      out.push({ t: tr.t, s: tr.s, v: tr.v, a: R ? R.a : 0 });
      if (until && until(tr)) break;
      if (tr.stopped && tr.t > (tr.stopped.t + 0.25) && !(tr.def.timeEvents || []).some((x) => x > tr.t)) break;
      if (tr.lost) break;
    }
    return out;
  }

  return {
    EPS, DEG, G, rad, validateSingle, singleBlockForces, stepSingle, hangingPulley, doubleInclinePulley, descentEnergy,
    stopDistanceUphill, linkedBlocksSameRamp, criticalAngle, staticForceRange,
    Track, makeSingle, makePiecewise, makeHanging, makeDouble, makeLinked, simulate, firstHit
  };
})();
if (typeof module !== "undefined") module.exports = RampPhys;
